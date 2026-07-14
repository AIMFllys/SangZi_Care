begin;

-- 任一长辈同一时刻只能有一个可兑换绑定码。
with ranked_pending as (
  select
    id,
    row_number() over (
      partition by elder_id
      order by created_at desc nulls last, id desc
    ) as row_number
  from public.oc_elder_family_binds
  where status = 'pending'
)
update public.oc_elder_family_binds as binds
set status = 'inactive'
from ranked_pending
where binds.id = ranked_pending.id
  and ranked_pending.row_number > 1;

create unique index if not exists oc_bind_single_pending_elder_unique
  on public.oc_elder_family_binds (elder_id)
  where status = 'pending';

create table if not exists public.oc_family_bind_attempt_limits (
  family_id uuid primary key references public.oc_users(id) on delete cascade,
  window_started_at timestamptz not null default now(),
  attempt_count integer not null default 0,
  blocked_until timestamptz,
  updated_at timestamptz not null default now(),
  constraint oc_family_bind_attempt_count_check check (attempt_count >= 0)
);

comment on table public.oc_family_bind_attempt_limits is
  '家属账号兑换绑定码的数据库原子限流状态，不保存绑定码或 IP 明文';

alter table public.oc_family_bind_attempt_limits enable row level security;
revoke all on table public.oc_family_bind_attempt_limits from anon, authenticated;
grant select, insert, update, delete on table public.oc_family_bind_attempt_limits to service_role;

create or replace function public.oc_reserve_family_bind_attempt(
  p_family_id uuid,
  p_window_seconds integer,
  p_max_attempts integer,
  p_lock_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_limit public.oc_family_bind_attempt_limits%rowtype;
  v_retry_after integer;
begin
  if p_family_id is null
    or p_window_seconds is null or p_window_seconds <= 0
    or p_max_attempts is null or p_max_attempts <= 0
    or p_lock_seconds is null or p_lock_seconds <= 0
  then
    raise exception 'invalid family bind rate-limit arguments';
  end if;

  insert into public.oc_family_bind_attempt_limits (
    family_id,
    window_started_at,
    attempt_count,
    updated_at
  ) values (
    p_family_id,
    v_now,
    0,
    v_now
  )
  on conflict (family_id) do nothing;

  select *
  into v_limit
  from public.oc_family_bind_attempt_limits
  where family_id = p_family_id
  for update;

  if v_limit.blocked_until is not null and v_limit.blocked_until > v_now then
    v_retry_after := greatest(
      1,
      ceil(extract(epoch from (v_limit.blocked_until - v_now)))::integer
    );
    return jsonb_build_object(
      'status', 'rate_limited',
      'retry_after', v_retry_after
    );
  end if;

  if v_limit.blocked_until is not null
    or v_limit.window_started_at + p_window_seconds * interval '1 second' <= v_now
  then
    update public.oc_family_bind_attempt_limits
    set
      window_started_at = v_now,
      attempt_count = 0,
      blocked_until = null,
      updated_at = v_now
    where family_id = p_family_id
    returning * into v_limit;
  end if;

  if v_limit.attempt_count >= p_max_attempts then
    update public.oc_family_bind_attempt_limits
    set
      blocked_until = v_now + p_lock_seconds * interval '1 second',
      updated_at = v_now
    where family_id = p_family_id
    returning * into v_limit;

    return jsonb_build_object(
      'status', 'rate_limited',
      'retry_after', p_lock_seconds
    );
  end if;

  update public.oc_family_bind_attempt_limits
  set
    attempt_count = attempt_count + 1,
    updated_at = v_now
  where family_id = p_family_id
  returning * into v_limit;

  return jsonb_build_object(
    'status', 'allowed',
    'remaining', greatest(0, p_max_attempts - v_limit.attempt_count)
  );
end;
$$;

create or replace function public.oc_create_family_bind_code(
  p_elder_id uuid,
  p_bind_code text,
  p_expires_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_elder_id is null
    or p_bind_code is null
    or p_bind_code !~ '^[0-9]{6}$'
    or p_expires_at is null
    or p_expires_at <= pg_catalog.clock_timestamp()
  then
    raise exception 'invalid family bind code arguments';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_elder_id::text, 117031)
  );

  update public.oc_elder_family_binds
  set status = 'inactive'
  where elder_id = p_elder_id
    and status = 'pending';

  insert into public.oc_elder_family_binds (
    elder_id,
    family_id,
    bind_code,
    status,
    relation,
    can_view_health,
    can_edit_health,
    can_edit_medication,
    can_receive_emergency,
    expires_at,
    created_at,
    bound_at
  ) values (
    p_elder_id,
    null,
    p_bind_code,
    'pending',
    null,
    true,
    true,
    true,
    true,
    p_expires_at,
    pg_catalog.clock_timestamp(),
    pg_catalog.clock_timestamp()
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.oc_reserve_family_bind_attempt(uuid, integer, integer, integer)
  from public, anon, authenticated;
grant execute on function public.oc_reserve_family_bind_attempt(uuid, integer, integer, integer)
  to service_role;

revoke all on function public.oc_create_family_bind_code(uuid, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.oc_create_family_bind_code(uuid, text, timestamptz)
  to service_role;

commit;
