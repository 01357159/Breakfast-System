-- Run once in a dedicated Supabase project's SQL Editor.
begin;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

create table private.owners (
  user_id uuid primary key references auth.users(id) on delete cascade
);
create table private.orders (
  id uuid primary key,
  receipt_hash text not null,
  customer_id uuid references auth.users(id),
  seat text not null,
  pickup_time text not null,
  order_type text not null default 'dine-in' check(order_type in ('dine-in','takeout')),
  pickup_type text not null default 'asap' check(pickup_type in ('asap','scheduled')),
  pickup_ref text check(pickup_ref is null or length(trim(pickup_ref)) between 1 and 20),
  items jsonb not null,
  total numeric not null check(total >= 0),
  status text not null default 'pending' check(status in ('pending','accepted','completed','rejected')),
  created_at timestamptz not null default now()
);
create index orders_customer_idx on private.orders(customer_id);
create index orders_created_idx on private.orders(created_at desc);
create table private.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references private.orders(id),
  customer_id uuid not null references auth.users(id),
  display_name text not null check(length(trim(display_name)) between 1 and 60),
  rating integer not null check(rating between 1 and 5),
  body text not null check(length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index reviews_customer_idx on private.reviews(customer_id);
create table private.replies (
  review_id uuid primary key references private.reviews(id) on delete cascade,
  owner_id uuid not null references auth.users(id),
  body text not null check(length(trim(body)) between 1 and 1000),
  updated_at timestamptz not null default now()
);
alter table private.owners enable row level security;
alter table private.orders enable row level security;
alter table private.reviews enable row level security;
alter table private.replies enable row level security;
revoke all on private.owners, private.orders, private.reviews, private.replies from public, anon, authenticated;

-- Privileged implementation functions live outside the exposed API schema.
-- Each checks its own caller; public wrappers are SECURITY INVOKER.
create function private.is_owner() returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists(
    select 1 from private.owners where user_id = auth.uid()
  );
$$;
create function private.require_customer() returns uuid
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or private.is_owner() or not exists (
    select 1 from auth.identities where user_id = auth.uid() and provider = 'google'
  ) then raise exception '請使用顧客 Google 帳號登入'; end if;
  return auth.uid();
end;
$$;
create function private.order_json(o private.orders) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'orderId',o.id,'seat',o.seat,'items',o.items,'totalPrice',o.total,
    'orderType',o.order_type,'pickupType',o.pickup_type,'pickupRef',o.pickup_ref,
    'pickupTime',o.pickup_time,'status',o.status,
    'createdDate',to_char(o.created_at at time zone 'Asia/Taipei','YYYY-MM-DD'),
    'createdAt',to_char(o.created_at at time zone 'Asia/Taipei','HH24:MI')
  );
$$;
-- 外帶取餐排程：固定 10 分鐘一檔、每檔 6 單，取餐識別與時段名額由後端提供。
create function private.pickup_estimate() returns timestamptz
language sql stable set search_path = '' as $$
  select date_trunc('minute', now() + interval '15 min')
    + make_interval(mins => (5 - extract(minute from now() + interval '15 min')::integer % 5) % 5);
$$;
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
create function private.guest_order(p_id uuid,p_receipt text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare o private.orders;
begin
  select * into strict o from private.orders where id=p_id
    and receipt_hash=encode(sha256(convert_to(p_receipt,'UTF8')),'hex');
  return private.order_json(o);
end;
$$;
create function private.owner_orders() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_owner() then raise exception '需要店家權限'; end if;
  return coalesce((select jsonb_agg(private.order_json(o) order by created_at desc) from private.orders o),'[]');
end;
$$;
create function private.set_order_status(p_id uuid,p_status text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_owner() then raise exception '需要店家權限'; end if;
  update private.orders set status=p_status where id=p_id and (
    (status='pending' and p_status in ('accepted','rejected')) or
    (status='accepted' and p_status='completed')
  );
  if not found then raise exception '訂單狀態已變更，請重新整理'; end if;
end;
$$;
create function private.claim_order(p_id uuid,p_receipt text) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := private.require_customer();
begin
  update private.orders set customer_id=uid where id=p_id and status='completed'
    and receipt_hash=encode(sha256(convert_to(p_receipt,'UTF8')),'hex')
    and (customer_id is null or customer_id=uid);
  if not found then raise exception '訂單尚未完成、收據無效或已由其他帳號認領'; end if;
end;
$$;
create function private.my_review_orders() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := private.require_customer();
begin
  return coalesce((select jsonb_agg(jsonb_build_object(
    'orderId',o.id,'createdDate',to_char(o.created_at at time zone 'Asia/Taipei','YYYY-MM-DD'),
    'review_id',r.id
  ) order by o.created_at desc) from private.orders o left join private.reviews r on r.order_id=o.id
    where o.customer_id=uid and o.status='completed'),'[]');
end;
$$;
create function private.list_reviews() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',r.id,'display_name',r.display_name,'rating',r.rating,'body',r.body,
    'created_at',r.created_at,'updated_at',r.updated_at,
    'reply',case when p.review_id is null then null else jsonb_build_object('body',p.body,'updated_at',p.updated_at) end
  ) order by r.created_at desc),'[]')
  from private.reviews r left join private.replies p on p.review_id=r.id;
$$;
create function private.save_review(p_order_id uuid,p_rating integer,p_body text,p_name text) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := private.require_customer();
begin
  if not exists(select 1 from private.orders where id=p_order_id and customer_id=uid and status='completed')
    then raise exception '僅能評論自己的已完成訂單'; end if;
  if p_rating is null or p_body is null or p_name is null then raise exception '請填寫星等、評論與顯示名稱'; end if;
  insert into private.reviews(order_id,customer_id,rating,body,display_name)
    values(p_order_id,uid,p_rating,trim(p_body),trim(p_name))
    on conflict(order_id) do update set rating=excluded.rating,body=excluded.body,
      display_name=excluded.display_name,updated_at=now()
    where private.reviews.customer_id=uid;
  if not found then raise exception '無法修改其他顧客的評論'; end if;
end;
$$;
create function private.delete_review(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := private.require_customer();
begin
  delete from private.reviews where id=p_id and customer_id=uid;
  if not found then raise exception '只能刪除自己的評論'; end if;
end;
$$;
create function private.reply_review(p_id uuid,p_body text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_owner() then raise exception '需要店家權限'; end if;
  insert into private.replies(review_id,owner_id,body) values(p_id,auth.uid(),trim(p_body))
    on conflict(review_id) do update set body=excluded.body,owner_id=excluded.owner_id,updated_at=now();
end;
$$;

-- Explicit public API: defaults do not grant execution to PUBLIC.
create function public.is_owner() returns boolean language sql stable security invoker set search_path='' as $$ select private.is_owner(); $$;
create function public.submit_guest_order(
  p_id uuid,p_receipt text,p_seat text,p_pickup text,p_items jsonb,
  p_type text default 'dine-in',p_name text default null,
  p_mode text default 'asap',p_ref text default null
) returns jsonb language sql security invoker set search_path='' as $$
  select private.submit_guest_order(p_id,p_receipt,p_seat,p_pickup,p_items,p_type,p_name,p_mode,p_ref);
$$;
create function public.pickup_schedule() returns jsonb language sql stable security invoker set search_path='' as $$ select private.pickup_schedule(); $$;
create function public.guest_order(p_id uuid,p_receipt text) returns jsonb language sql stable security invoker set search_path='' as $$ select private.guest_order(p_id,p_receipt); $$;
create function public.owner_orders() returns jsonb language sql stable security invoker set search_path='' as $$ select private.owner_orders(); $$;
create function public.set_order_status(p_id uuid,p_status text) returns void language sql security invoker set search_path='' as $$ select private.set_order_status(p_id,p_status); $$;
create function public.claim_order(p_id uuid,p_receipt text) returns void language sql security invoker set search_path='' as $$ select private.claim_order(p_id,p_receipt); $$;
create function public.my_review_orders() returns jsonb language sql stable security invoker set search_path='' as $$ select private.my_review_orders(); $$;
create function public.list_reviews() returns jsonb language sql stable security invoker set search_path='' as $$ select private.list_reviews(); $$;
create function public.save_review(p_order_id uuid,p_rating integer,p_body text,p_name text) returns void language sql security invoker set search_path='' as $$ select private.save_review(p_order_id,p_rating,p_body,p_name); $$;
create function public.delete_review(p_id uuid) returns void language sql security invoker set search_path='' as $$ select private.delete_review(p_id); $$;
create function public.reply_review(p_id uuid,p_body text) returns void language sql security invoker set search_path='' as $$ select private.reply_review(p_id,p_body); $$;

revoke all on function private.require_customer(), private.order_json(private.orders),
  private.pickup_estimate() from public, anon, authenticated;
-- Restrict only functions created here; leave any other public functions alone.
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname in ('public','private') and p.proname in (
      'is_owner','submit_guest_order','guest_order','owner_orders','set_order_status','claim_order',
      'my_review_orders','list_reviews','save_review','delete_review','reply_review','pickup_schedule')
  loop
    execute format('revoke all on function %s from public, anon, authenticated',f.signature);
    execute format('grant execute on function %s to authenticated',f.signature);
    if split_part(f.signature::text,'(',1) ~ '(submit_guest_order|guest_order|list_reviews|pickup_schedule)$' then
      execute format('grant execute on function %s to anon',f.signature);
    end if;
  end loop;
end;
$$;
commit;
