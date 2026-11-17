import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const items = JSON.stringify([{ id: 1, name: '蛋餅', price: 35, qty: 1 }]);
const receiptFor = (n) => String(n % 10).repeat(64);

function uuid(n) {
  return `30000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
}

test('pickup schedule exposes slots and enforces slot capacity for scheduled orders', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated;
      create schema auth;
      create table auth.users (id uuid primary key);
      create table auth.identities (user_id uuid, provider text);
      create function auth.uid() returns uuid language sql as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;`);
    await db.exec(await readFile(new URL('../../supabase/schema.sql', import.meta.url), 'utf8'));

    await db.exec('reset role');
    await db.exec('set role anon');
    const rpc = async (name, args = []) => (await db.query(
      `select public.${name}(${args.map((_, i) => `$${i + 1}`).join(',')}) as data`, args)).rows[0].data;

    const schedule = await rpc('pickup_schedule');
    assert.match(schedule.estimatedReadyAt, /^\d{2}:\d{2}$/);
    assert.ok(Array.isArray(schedule.slots) && schedule.slots.length > 0);
    schedule.slots.forEach((slot) => {
      assert.match(slot.time, /^\d{2}:\d{2}$/);
      assert.ok(slot.remaining >= 0 && slot.remaining <= 6);
    });

    const slot = schedule.slots.find((entry) => entry.remaining > 0);
    const pickup = async (n, mode, ref, time) => rpc('submit_guest_order', [
      uuid(n), receiptFor(n), '外帶', time, items, 'takeout', null, mode, ref,
    ]);

    const first = await pickup(1, 'scheduled', '小明', slot.time);
    assert.equal(first.pickupType, 'scheduled');
    assert.equal(first.pickupRef, '小明');
    assert.equal(first.pickupTime, slot.time);

    // Retrying the same receipt must not consume a second slot or fail when full.
    const retried = await pickup(1, 'scheduled', '小明', slot.time);
    assert.equal(retried.orderId, first.orderId);

    for (let n = 2; n <= 6; n++) await pickup(n, 'scheduled', null, slot.time);
    await assert.rejects(() => pickup(7, 'scheduled', null, slot.time), /該時段已滿/);

    const updated = await rpc('pickup_schedule');
    assert.equal(updated.slots.find((entry) => entry.time === slot.time).remaining, 0);

    const asap = await pickup(8, 'asap', '小華', '10:30');
    assert.equal(asap.pickupType, 'asap');
    assert.equal(asap.pickupRef, '小華');
    assert.equal(asap.pickupTime, updated.estimatedReadyAt);
  } finally { await db.close(); }
});
