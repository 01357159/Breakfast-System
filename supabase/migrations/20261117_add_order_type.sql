-- 2026-11-17：顧客端內用／外帶分流 + 外帶取餐排程
-- 既有資料庫請在 Supabase SQL Editor 執行本檔一次（全新安裝直接跑 schema.sql 即可）。
begin;

-- 1. 取餐方式、取餐識別、外帶排程
alter table private.orders add column if not exists order_type text not null default 'dine-in';
alter table private.orders add column if not exists pickup_type text not null default 'asap';
alter table private.orders add column if not exists pickup_ref text;

-- 舊版 migration 曾使用 customer_name，資料搬移到 pickup_ref 後移除。
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'private' and table_name = 'orders' and column_name = 'customer_name'
  ) then
    execute 'update private.orders set pickup_ref = coalesce(pickup_ref, customer_name) where customer_name is not null';
    execute 'alter table private.orders drop column customer_name';
  end if;
end;
$$;

update private.orders set order_type = 'dine-in' where order_type is null;
update private.orders set pickup_type = 'asap' where pickup_type is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'private.orders'::regclass and conname = 'orders_order_type_check'
  ) then
    alter table private.orders
      add constraint orders_order_type_check check (order_type in ('dine-in','takeout'));
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'private.orders'::regclass and conname = 'orders_pickup_type_check'
  ) then
    alter table private.orders
      add constraint orders_pickup_type_check check (pickup_type in ('asap','scheduled'));
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'private.orders'::regclass and conname = 'orders_pickup_ref_check'
  ) then
    alter table private.orders
      add constraint orders_pickup_ref_check
      check (pickup_ref is null or length(trim(pickup_ref)) between 1 and 20);
  end if;
end;
$$;

-- 2. 回傳給前端的訂單 JSON
create or replace function private.order_json(o private.orders) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'orderId',o.id,'seat',o.seat,'items',o.items,'totalPrice',o.total,
    'orderType',o.order_type,'pickupType',o.pickup_type,'pickupRef',o.pickup_ref,
    'pickupTime',o.pickup_time,'status',o.status,
    'createdDate',to_char(o.created_at at time zone 'Asia/Taipei','YYYY-MM-DD'),
    'createdAt',to_char(o.created_at at time zone 'Asia/Taipei','HH24:MI')
  );
$$;

-- 3. 取餐排程（10 分鐘一檔、每檔 6 單）
create or replace function private.pickup_estimate() returns timestamptz
language sql stable set search_path = '' as $$
  select date_trunc('minute', now() + interval '15 min')
    + make_interval(mins => (5 - extract(minute from now() + interval '15 min')::integer % 5) % 5);
$$;

drop function if exists public.pickup_schedule();
drop function if exists private.pickup_schedule();
create function private.pickup_schedule() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  now_local timestamp := now() at time zone 'Asia/Taipei';
  estimate timestamptz := private.pickup_estimate();
  first_slot timestamp;
  slot_at timestamp;
  used integer;
  slots jsonb := '[]';
  capacity constant integer := 6;
begin
  first_slot := date_trunc('minute', now_local + interval '30 min');
  first_slot := first_slot + make_interval(
    mins => (10 - extract(minute from first_slot)::integer % 10) % 10
  );
  for i in 0..23 loop
    slot_at := first_slot + make_interval(mins => i * 10);
    exit when slot_at::date <> now_local::date;
    select count(*) into used from private.orders o
      where o.pickup_type = 'scheduled'
        and o.pickup_time = to_char(slot_at, 'HH24:MI')
        and (o.created_at at time zone 'Asia/Taipei')::date = slot_at::date
        and o.status <> 'rejected';
    slots := slots || jsonb_build_array(jsonb_build_object(
      'time', to_char(slot_at, 'HH24:MI'),
      'remaining', greatest(capacity - used, 0)
    ));
  end loop;
  return jsonb_build_object(
    'estimatedReadyAt', to_char(estimate at time zone 'Asia/Taipei', 'HH24:MI'),
    'slots', slots
  );
end;
$$;

create function public.pickup_schedule() returns jsonb
language sql stable security invoker set search_path='' as $$ select private.pickup_schedule(); $$;

-- 4. 送出訂單：新增取餐模式與取餐識別；ASAP 由後端計算時間，預約時段重新校驗名額。
drop function if exists public.submit_guest_order(uuid,text,text,text,jsonb);
drop function if exists public.submit_guest_order(uuid,text,text,text,jsonb,text,text);
drop function if exists private.submit_guest_order(uuid,text,text,text,jsonb);
drop function if exists private.submit_guest_order(uuid,text,text,text,jsonb,text,text);

create function private.submit_guest_order(
  p_id uuid, p_receipt text, p_seat text, p_pickup text, p_items jsonb,
  p_type text default 'dine-in', p_name text default null,
  p_mode text default 'asap', p_ref text default null
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  o private.orders; item jsonb; total numeric := 0; normalized jsonb := '[]';
  pickup_mode text := coalesce(p_mode, 'asap');
  slot_at timestamp; used integer; capacity constant integer := 6;
begin
  if p_id is null or p_receipt is null or p_receipt !~ '^[a-f0-9]{64}$'
    or p_seat is null or length(trim(p_seat)) not between 1 and 30
    or p_pickup is null or p_pickup !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
    or p_items is null or jsonb_typeof(p_items) <> 'array'
    or p_type is null or p_type not in ('dine-in','takeout')
    or pickup_mode not in ('asap','scheduled')
    or (p_ref is not null and length(trim(p_ref)) > 20)
  then raise exception '訂單資料無效'; end if;
  if jsonb_array_length(p_items) not between 1 and 100 then raise exception '請選擇餐點'; end if;
  for item in select * from jsonb_array_elements(p_items) loop
    if item->>'name' is null or length(trim(item->>'name')) not between 1 and 100
      or jsonb_typeof(item->'qty') is distinct from 'number'
      or jsonb_typeof(item->'price') is distinct from 'number'
      or (item->>'qty')::numeric not between 1 and 99
      or (item->>'qty')::numeric <> trunc((item->>'qty')::numeric)
      or (item->>'price')::numeric not between 0 and 10000
    then raise exception '餐點資料無效'; end if;
    total := total + (item->>'price')::numeric * (item->>'qty')::numeric;
    normalized := normalized || jsonb_build_array(jsonb_build_object(
      'id',item->'id','name',trim(item->>'name'),'price',(item->>'price')::numeric,
      'qty',(item->>'qty')::integer,'subtotal',(item->>'price')::numeric * (item->>'qty')::numeric
    ));
  end loop;
  -- 重試同一個收據時直接回傳既有訂單，避免重複佔用時段名額。
  select * into o from private.orders where id = p_id
    and receipt_hash = encode(sha256(convert_to(p_receipt,'UTF8')),'hex');
  if found then return private.order_json(o); end if;
  if pickup_mode = 'scheduled' then
    slot_at := (now() at time zone 'Asia/Taipei')::date + p_pickup::time;
    if slot_at <= (now() at time zone 'Asia/Taipei') then
      raise exception '該時段已滿，請改選';
    end if;
    select count(*) into used from private.orders ord
      where ord.pickup_type = 'scheduled'
        and ord.pickup_time = p_pickup
        and (ord.created_at at time zone 'Asia/Taipei')::date = slot_at::date
        and ord.status <> 'rejected';
    if used >= capacity then raise exception '該時段已滿，請改選'; end if;
  else
    p_pickup := to_char(private.pickup_estimate() at time zone 'Asia/Taipei','HH24:MI');
  end if;
  insert into private.orders(
    id,receipt_hash,seat,pickup_time,order_type,pickup_type,pickup_ref,items,total
  )
    values(
      p_id,encode(sha256(convert_to(p_receipt,'UTF8')),'hex'),trim(p_seat),p_pickup,
      p_type,pickup_mode,nullif(trim(coalesce(p_ref,p_name,'')),''),normalized,total
    )
    on conflict(id) do nothing;
  select * into strict o from private.orders where id = p_id
    and receipt_hash = encode(sha256(convert_to(p_receipt,'UTF8')),'hex');
  return private.order_json(o);
end;
$$;

create function public.submit_guest_order(
  p_id uuid,p_receipt text,p_seat text,p_pickup text,p_items jsonb,
  p_type text default 'dine-in',p_name text default null,
  p_mode text default 'asap',p_ref text default null
) returns jsonb language sql security invoker set search_path='' as $$
  select private.submit_guest_order(p_id,p_receipt,p_seat,p_pickup,p_items,p_type,p_name,p_mode,p_ref);
$$;

-- 5. 權限
revoke all on function private.pickup_estimate() from public, anon, authenticated;
revoke all on function public.pickup_schedule() from public;
grant execute on function public.pickup_schedule() to anon, authenticated;
revoke all on function private.pickup_schedule() from public;
grant execute on function private.pickup_schedule() to anon, authenticated;

revoke all on function public.submit_guest_order(uuid,text,text,text,jsonb,text,text,text,text) from public;
grant execute on function public.submit_guest_order(uuid,text,text,text,jsonb,text,text,text,text) to anon, authenticated;

commit;
