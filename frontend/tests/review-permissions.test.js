import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('database enforces guest receipts, Google identity, review ownership and owner-only replies', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated;
      create schema auth;
      create table auth.users (id uuid primary key);
      create table auth.identities (user_id uuid, provider text);
      create function auth.uid() returns uuid language sql as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;`);
    await db.exec(await readFile(new URL('../../supabase/schema.sql', import.meta.url), 'utf8'));
    const a = '10000000-0000-4000-8000-000000000001';
    const b = '10000000-0000-4000-8000-000000000002';
    const owner = '10000000-0000-4000-8000-000000000003';
    const nongoogle = '10000000-0000-4000-8000-000000000004';
    const order = '20000000-0000-4000-8000-000000000001';
    const token = 'a'.repeat(64);
    await db.query('insert into auth.users values ($1),($2),($3),($4)', [a,b,owner,nongoogle]);
    await db.query("insert into auth.identities values ($1,'google'),($2,'google'),($3,'google')", [a,b,owner]);
    await db.query('insert into private.owners values ($1)', [owner]);
    const asUser = async (id) => {
      await db.exec('reset role');
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id || '']);
      await db.exec(`set role ${id ? 'authenticated' : 'anon'}`);
    };
    const rpc = async (name, args = []) => (await db.query(
      `select public.${name}(${args.map((_,i)=>`$${i+1}`).join(',')}) as data`, args)).rows[0].data;
    const denied = async (fn) => assert.rejects(fn);
    await asUser(null);
    await denied(() => db.query('select * from private.orders'));
    await denied(() => rpc('submit_guest_order', [order,token,'A-01','99:99',JSON.stringify([{name:'蛋餅',price:35,qty:1}])]));
    await denied(() => rpc('submit_guest_order', [order,token,'A-01','10:30',JSON.stringify([{name:'蛋餅',price:35,qty:100}])]));
    await rpc('submit_guest_order', [order,token,'A-01','10:30',JSON.stringify([{id:1,name:'蛋餅',price:35,qty:2}])]);
    await denied(() => rpc('submit_guest_order', [order,'b'.repeat(64),'A-01','10:30',JSON.stringify([{name:'蛋餅',price:35,qty:2}])]));
    await rpc('submit_guest_order', [order,token,'A-01','10:30',JSON.stringify([{id:1,name:'蛋餅',price:35,qty:2}])]);
    assert.equal((await rpc('guest_order', [order,token])).totalPrice,70);
    await denied(() => rpc('guest_order', [order,'b'.repeat(64)]));
    await denied(() => rpc('set_order_status', [order,'completed']));
    await asUser(a);
    await denied(() => rpc('claim_order', [order,token]));
    await denied(() => rpc('set_order_status', [order,'completed']));
    await asUser(owner);
    await rpc('set_order_status', [order,'accepted']);
    await rpc('set_order_status', [order,'completed']);
    await denied(() => rpc('claim_order', [order,token]));
    await asUser(nongoogle);
    await denied(() => rpc('claim_order', [order,token]));
    await asUser(a);
    await rpc('claim_order', [order,token]);
    assert.equal((await rpc('my_review_orders')).length,1);
    await rpc('save_review', [order,5,'早餐很好吃','顧客甲']);
    await rpc('save_review', [order,4,'修改後的評論','顧客甲']);
    await denied(() => rpc('save_review', [order,6,'無效星等','顧客甲']));
    const review = (await rpc('list_reviews'))[0];
    assert.equal(review.rating,4);
    await asUser(b);
    await denied(() => rpc('claim_order', [order,token]));
    await denied(() => rpc('save_review', [order,1,'冒充','顧客乙']));
    await denied(() => rpc('delete_review', [review.id]));
    await denied(() => rpc('reply_review', [review.id,'冒充店家']));
    await asUser(owner);
    await denied(() => rpc('save_review', [order,1,'覆寫','店家']));
    await denied(() => rpc('delete_review', [review.id]));
    await rpc('reply_review', [review.id,'謝謝您的回饋！']);
    await rpc('reply_review', [review.id,'歡迎再來！']);
    await asUser(null);
    await denied(() => rpc('save_review', [order,1,'guest','guest']));
    await denied(() => rpc('reply_review', [review.id,'guest reply']));
    await denied(() => db.query('select * from private.reviews'));
    const publicReview = (await rpc('list_reviews'))[0];
    assert.equal(publicReview.reply.body,'歡迎再來！');
    assert.equal(publicReview.body,'修改後的評論');
    assert.equal(publicReview.customer_id,undefined);
    assert.equal(publicReview.order_id,undefined);
    await asUser(a);
    assert.equal((await rpc('my_review_orders'))[0].review_id,review.id);
    await denied(() => rpc('reply_review', [review.id,'不是店家']));
    await rpc('delete_review', [review.id]);
    assert.deepEqual(await rpc('list_reviews'),[]);
    // Deleting a review permits writing a new one for the same genuine order.
    await rpc('save_review', [order,5,'重新撰寫','顧客甲']);
    // Promotion to owner must not grant permission to modify even a previously owned review.
    await db.exec('reset role');
    await db.query('insert into private.owners values ($1)', [a]);
    await asUser(a);
    await denied(() => rpc('save_review', [order,1,'owner change','甲']));
    const promotedReview = (await rpc('list_reviews'))[0];
    await denied(() => rpc('delete_review', [promotedReview.id]));
  } finally { await db.close(); }
});
