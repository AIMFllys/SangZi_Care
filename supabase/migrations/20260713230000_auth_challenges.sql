begin;

-- CAPTCHA 与邮箱 OTP 的服务端挑战存储。
-- OTP lookup_key 与所有 secret_digest 都由 Next.js 服务端使用派生 pepper
-- 做 HMAC；CAPTCHA lookup_key 是随机 UUID。表内不保存邮箱、答案或 OTP 明文。
create table public.oc_auth_challenges (
  challenge_kind text not null,
  lookup_key text not null,
  secret_digest text not null,
  version uuid not null default pg_catalog.gen_random_uuid(),
  state text not null,
  expires_at timestamptz not null,
  reserved_at timestamptz,
  activated_at timestamptz,
  attempt_count integer not null default 0,
  created_at timestamptz not null default pg_catalog.clock_timestamp(),
  updated_at timestamptz not null default pg_catalog.clock_timestamp(),
  constraint oc_auth_challenges_pkey primary key (challenge_kind, lookup_key),
  constraint oc_auth_challenges_kind_check
    check (challenge_kind in ('captcha', 'otp')),
  constraint oc_auth_challenges_state_check
    check (state in ('reserved', 'active', 'consumed', 'locked')),
  constraint oc_auth_challenges_digest_check
    check (secret_digest ~ '^[0-9a-f]{64}$'),
  constraint oc_auth_challenges_attempt_count_check
    check (attempt_count >= 0),
  constraint oc_auth_challenges_lookup_key_check
    check (
      (
        challenge_kind = 'captcha'
        and lookup_key ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      )
      or (
        challenge_kind = 'otp'
        and lookup_key ~ '^[0-9a-f]{64}$'
      )
    )
);

create index oc_auth_challenges_expires_at_idx
  on public.oc_auth_challenges (expires_at);

alter table public.oc_auth_challenges enable row level security;
alter table public.oc_auth_challenges force row level security;

-- 即使 service_role 绕过 RLS，也不允许它直接读写挑战表；只能调用下方 RPC。
revoke all on table public.oc_auth_challenges
  from public, anon, authenticated, service_role;

create or replace function public.oc_auth_challenge_put_captcha(
  p_lookup_key text,
  p_secret_digest text,
  p_ttl_seconds integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz;
begin
  if p_lookup_key is null
    or p_secret_digest is null
    or p_ttl_seconds is null
    or p_ttl_seconds <= 0
  then
    raise exception 'captcha arguments are invalid' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('oc-auth-captcha:' || p_lookup_key, 0)
  );

  -- 未被消费的过期挑战按访问机会做有界清理；跳过其他事务锁定的行。
  with expired as (
    select challenge_kind, lookup_key
    from public.oc_auth_challenges
    where expires_at < pg_catalog.clock_timestamp() - interval '1 day'
    order by expires_at
    limit 100
    for update skip locked
  )
  delete from public.oc_auth_challenges as challenge
  using expired
  where challenge.challenge_kind = expired.challenge_kind
    and challenge.lookup_key = expired.lookup_key;

  v_now := pg_catalog.clock_timestamp();

  insert into public.oc_auth_challenges (
    challenge_kind,
    lookup_key,
    secret_digest,
    version,
    state,
    expires_at,
    reserved_at,
    activated_at,
    attempt_count,
    created_at,
    updated_at
  )
  values (
    'captcha',
    p_lookup_key,
    p_secret_digest,
    pg_catalog.gen_random_uuid(),
    'active',
    v_now + p_ttl_seconds * interval '1 second',
    null,
    v_now,
    0,
    v_now,
    v_now
  )
  on conflict (challenge_kind, lookup_key) do update
  set secret_digest = excluded.secret_digest,
      version = excluded.version,
      state = excluded.state,
      expires_at = excluded.expires_at,
      reserved_at = excluded.reserved_at,
      activated_at = excluded.activated_at,
      attempt_count = 0,
      created_at = excluded.created_at,
      updated_at = excluded.updated_at;
end;
$$;

create or replace function public.oc_auth_challenge_consume_captcha(
  p_lookup_key text,
  p_secret_digest text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_challenge public.oc_auth_challenges%rowtype;
  v_now timestamptz;
begin
  if p_lookup_key is null or p_secret_digest is null then
    return 'not_found';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('oc-auth-captcha:' || p_lookup_key, 0)
  );

  select *
  into v_challenge
  from public.oc_auth_challenges
  where challenge_kind = 'captcha'
    and lookup_key = p_lookup_key
  for update;

  v_now := pg_catalog.clock_timestamp();

  if not found or v_challenge.state <> 'active' then
    return 'not_found';
  end if;

  if v_challenge.expires_at <= v_now then
    update public.oc_auth_challenges
    set state = 'consumed', updated_at = v_now
    where challenge_kind = 'captcha' and lookup_key = p_lookup_key;
    return 'expired';
  end if;

  update public.oc_auth_challenges
  set state = 'consumed', updated_at = v_now
  where challenge_kind = 'captcha' and lookup_key = p_lookup_key;

  if v_challenge.secret_digest is distinct from p_secret_digest then
    return 'mismatch';
  end if;

  return 'ok';
end;
$$;

create or replace function public.oc_auth_challenge_reserve_otp(
  p_lookup_key text,
  p_secret_digest text,
  p_ttl_seconds integer,
  p_rate_limit_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_challenge public.oc_auth_challenges%rowtype;
  v_now timestamptz;
  v_retry_after integer;
  v_version uuid := pg_catalog.gen_random_uuid();
begin
  if p_lookup_key is null
    or p_secret_digest is null
    or p_ttl_seconds is null
    or p_rate_limit_seconds is null
    or p_ttl_seconds <= 0
    or p_rate_limit_seconds <= 0
  then
    raise exception 'otp reservation arguments are invalid'
      using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('oc-auth-otp:' || p_lookup_key, 0)
  );

  with expired as (
    select challenge_kind, lookup_key
    from public.oc_auth_challenges
    where expires_at < pg_catalog.clock_timestamp() - interval '1 day'
    order by expires_at
    limit 100
    for update skip locked
  )
  delete from public.oc_auth_challenges as challenge
  using expired
  where challenge.challenge_kind = expired.challenge_kind
    and challenge.lookup_key = expired.lookup_key;

  v_now := pg_catalog.clock_timestamp();

  select *
  into v_challenge
  from public.oc_auth_challenges
  where challenge_kind = 'otp'
    and lookup_key = p_lookup_key
  for update;

  if found
    and v_challenge.reserved_at is not null
    and v_challenge.reserved_at + p_rate_limit_seconds * interval '1 second' > v_now
  then
    v_retry_after := greatest(
      1,
      pg_catalog.ceil(
        extract(
          epoch from
          v_challenge.reserved_at
            + p_rate_limit_seconds * interval '1 second'
            - v_now
        )
      )::integer
    );

    return pg_catalog.jsonb_build_object(
      'status', 'rate_limited',
      'retry_after', v_retry_after
    );
  end if;

  insert into public.oc_auth_challenges (
    challenge_kind,
    lookup_key,
    secret_digest,
    version,
    state,
    expires_at,
    reserved_at,
    activated_at,
    attempt_count,
    created_at,
    updated_at
  )
  values (
    'otp',
    p_lookup_key,
    p_secret_digest,
    v_version,
    'reserved',
    v_now + p_ttl_seconds * interval '1 second',
    v_now,
    null,
    0,
    v_now,
    v_now
  )
  on conflict (challenge_kind, lookup_key) do update
  set secret_digest = excluded.secret_digest,
      version = excluded.version,
      state = excluded.state,
      expires_at = excluded.expires_at,
      reserved_at = excluded.reserved_at,
      activated_at = excluded.activated_at,
      attempt_count = 0,
      created_at = excluded.created_at,
      updated_at = excluded.updated_at;

  return pg_catalog.jsonb_build_object(
    'status', 'ok',
    'version', v_version::text
  );
end;
$$;

create or replace function public.oc_auth_challenge_activate_otp(
  p_lookup_key text,
  p_version text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz;
  v_activated boolean := false;
begin
  if p_lookup_key is null or p_version is null then
    return false;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('oc-auth-otp:' || p_lookup_key, 0)
  );

  v_now := pg_catalog.clock_timestamp();

  update public.oc_auth_challenges
  set state = 'active',
      activated_at = v_now,
      updated_at = v_now
  where challenge_kind = 'otp'
    and lookup_key = p_lookup_key
    and version::text = p_version
    and state = 'reserved'
    and expires_at > v_now
  returning true into v_activated;

  return coalesce(v_activated, false);
end;
$$;

create or replace function public.oc_auth_challenge_rollback_otp(
  p_lookup_key text,
  p_version text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz;
  v_rolled_back boolean := false;
begin
  if p_lookup_key is null or p_version is null then
    return false;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('oc-auth-otp:' || p_lookup_key, 0)
  );

  v_now := pg_catalog.clock_timestamp();

  -- 使本次版本不可消费，但保留 reserved_at，确保失败请求仍受全局冷却限制。
  update public.oc_auth_challenges
  set secret_digest = pg_catalog.repeat('0', 64),
      state = 'consumed',
      expires_at = v_now,
      updated_at = v_now
  where challenge_kind = 'otp'
    and lookup_key = p_lookup_key
    and version::text = p_version
  returning true into v_rolled_back;

  return coalesce(v_rolled_back, false);
end;
$$;

create or replace function public.oc_auth_challenge_consume_otp(
  p_lookup_key text,
  p_secret_digest text,
  p_max_attempts integer
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_challenge public.oc_auth_challenges%rowtype;
  v_now timestamptz;
begin
  if p_lookup_key is null
    or p_secret_digest is null
    or p_max_attempts is null
    or p_max_attempts <= 0
  then
    raise exception 'otp consumption arguments are invalid'
      using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('oc-auth-otp:' || p_lookup_key, 0)
  );

  select *
  into v_challenge
  from public.oc_auth_challenges
  where challenge_kind = 'otp'
    and lookup_key = p_lookup_key
  for update;

  v_now := pg_catalog.clock_timestamp();

  if not found then
    return 'not_found';
  end if;

  if v_challenge.state in ('active', 'locked')
    and v_challenge.expires_at <= v_now
  then
    update public.oc_auth_challenges
    set state = 'consumed', updated_at = v_now
    where challenge_kind = 'otp' and lookup_key = p_lookup_key;
    return 'expired';
  end if;

  if v_challenge.state = 'locked' then
    return 'locked';
  end if;

  if v_challenge.state <> 'active' then
    return 'not_found';
  end if;

  if v_challenge.secret_digest is not distinct from p_secret_digest then
    update public.oc_auth_challenges
    set state = 'consumed', updated_at = v_now
    where challenge_kind = 'otp' and lookup_key = p_lookup_key;
    return 'ok';
  end if;

  if v_challenge.attempt_count + 1 >= p_max_attempts then
    update public.oc_auth_challenges
    set attempt_count = attempt_count + 1,
        state = 'locked',
        updated_at = v_now
    where challenge_kind = 'otp' and lookup_key = p_lookup_key;
    return 'locked';
  end if;

  update public.oc_auth_challenges
  set attempt_count = attempt_count + 1,
      updated_at = v_now
  where challenge_kind = 'otp' and lookup_key = p_lookup_key;
  return 'mismatch';
end;
$$;

revoke all on function public.oc_auth_challenge_put_captcha(text, text, integer)
  from public, anon, authenticated, service_role;
revoke all on function public.oc_auth_challenge_consume_captcha(text, text)
  from public, anon, authenticated, service_role;
revoke all on function public.oc_auth_challenge_reserve_otp(text, text, integer, integer)
  from public, anon, authenticated, service_role;
revoke all on function public.oc_auth_challenge_activate_otp(text, text)
  from public, anon, authenticated, service_role;
revoke all on function public.oc_auth_challenge_rollback_otp(text, text)
  from public, anon, authenticated, service_role;
revoke all on function public.oc_auth_challenge_consume_otp(text, text, integer)
  from public, anon, authenticated, service_role;

grant execute on function public.oc_auth_challenge_put_captcha(text, text, integer)
  to service_role;
grant execute on function public.oc_auth_challenge_consume_captcha(text, text)
  to service_role;
grant execute on function public.oc_auth_challenge_reserve_otp(text, text, integer, integer)
  to service_role;
grant execute on function public.oc_auth_challenge_activate_otp(text, text)
  to service_role;
grant execute on function public.oc_auth_challenge_rollback_otp(text, text)
  to service_role;
grant execute on function public.oc_auth_challenge_consume_otp(text, text, integer)
  to service_role;

commit;
