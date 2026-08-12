-- SOS 事件与家属消息原子扇出，并用客户端 request_id 保证重试幂等。

alter table public.oc_emergency_calls
  add column if not exists request_id uuid;

create unique index if not exists oc_emergency_calls_user_request_unique
  on public.oc_emergency_calls (user_id, request_id)
  where request_id is not null;

create or replace function public.oc_trigger_emergency(
  p_elder_id uuid,
  p_request_id uuid,
  p_trigger_method text,
  p_location jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_call public.oc_emergency_calls%rowtype;
  v_inserted boolean := false;
  v_family_ids uuid[] := '{}'::uuid[];
  v_called_contacts jsonb := '{}'::jsonb;
  v_recipient_count integer := 0;
  v_triggered_at timestamptz := now();
  v_message text;
begin
  if p_elder_id is null or p_request_id is null then
    raise exception 'invalid_emergency_request';
  end if;
  if not exists (
    select 1 from public.oc_users where id = p_elder_id and role = 'elder'
  ) then
    raise exception 'invalid_emergency_actor';
  end if;
  if p_trigger_method not in ('button', 'voice') then
    raise exception 'invalid_trigger_method';
  end if;
  if p_location is not null then
    if jsonb_typeof(p_location) <> 'object'
      or not (p_location ? 'latitude')
      or not (p_location ? 'longitude')
      or p_location - 'latitude' - 'longitude' - 'accuracy' <> '{}'::jsonb
      or jsonb_typeof(p_location -> 'latitude') <> 'number'
      or jsonb_typeof(p_location -> 'longitude') <> 'number'
      or ((p_location ? 'accuracy') and jsonb_typeof(p_location -> 'accuracy') <> 'number') then
      raise exception 'invalid_location';
    end if;
    begin
      if (p_location ->> 'latitude')::double precision not between -90 and 90
        or (p_location ->> 'longitude')::double precision not between -180 and 180
        or ((p_location ? 'accuracy') and (p_location ->> 'accuracy')::double precision < 0) then
        raise exception 'invalid_location';
      end if;
    exception when invalid_text_representation or numeric_value_out_of_range then
      raise exception 'invalid_location';
    end;
  end if;

  insert into public.oc_emergency_calls (
    user_id, request_id, trigger_method, status, triggered_at,
    notified_families, called_contacts, called_numbers, location
  ) values (
    p_elder_id, p_request_id, p_trigger_method, 'triggered', v_triggered_at,
    '{}'::uuid[], '{}'::jsonb, '{}'::text[], p_location
  )
  on conflict (user_id, request_id) where request_id is not null do nothing
  returning * into v_call;

  v_inserted := found;
  if not v_inserted then
    select * into v_call
    from public.oc_emergency_calls
    where user_id = p_elder_id and request_id = p_request_id;

    if v_call.trigger_method is distinct from p_trigger_method
      or v_call.location is distinct from p_location then
      raise exception 'emergency_request_conflict';
    end if;

    return jsonb_build_object(
      'call', to_jsonb(v_call),
      'notification_status', case
        when coalesce(array_length(v_call.notified_families, 1), 0) > 0 then 'sent'
        else 'no_recipients'
      end,
      'recipient_count', coalesce(array_length(v_call.notified_families, 1), 0),
      'replayed', true
    );
  end if;

  select
    coalesce(array_agg(recipient.family_id order by recipient.family_id), '{}'::uuid[]),
    coalesce(jsonb_object_agg(
      recipient.family_id::text,
      jsonb_build_object('family_id', recipient.family_id, 'relation', recipient.relation)
    ), '{}'::jsonb),
    count(*)::integer
  into v_family_ids, v_called_contacts, v_recipient_count
  from (
    select distinct on (family_id) family_id, relation
    from public.oc_elder_family_binds
    where elder_id = p_elder_id
      and family_id is not null
      and status = 'active'
      and can_receive_emergency is true
    order by family_id, id
  ) as recipient;

  update public.oc_emergency_calls
  set notified_families = v_family_ids,
      called_contacts = v_called_contacts,
      notification_sent_at = case when v_recipient_count > 0 then v_triggered_at else null end
  where id = v_call.id
  returning * into v_call;

  if v_recipient_count > 0 then
    v_message := '【SOS 紧急求助】您的家人正在紧急求助，请立即联系确认安全。触发时间：'
      || to_char(v_triggered_at at time zone 'Asia/Shanghai', 'YYYY-MM-DD HH24:MI:SS');
    if p_location is not null then
      v_message := v_message || format(
        '；位置：纬度 %s，经度 %s%s',
        p_location ->> 'latitude',
        p_location ->> 'longitude',
        case when p_location ? 'accuracy'
          then format('（精度约 %s 米）', p_location ->> 'accuracy')
          else ''
        end
      );
    end if;

    insert into public.oc_elder_care_messages (
      sender_id, receiver_id, type, category, content,
      is_ai_generated, is_read, created_at
    )
    select
      p_elder_id, family_id, 'text', 'system', v_message,
      false, false, v_triggered_at
    from unnest(v_family_ids) as family_id;
  end if;

  return jsonb_build_object(
    'call', to_jsonb(v_call),
    'notification_status', case when v_recipient_count > 0 then 'sent' else 'no_recipients' end,
    'recipient_count', v_recipient_count,
    'replayed', false
  );
end;
$$;

revoke all on function public.oc_trigger_emergency(uuid, uuid, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.oc_trigger_emergency(uuid, uuid, text, jsonb)
  to service_role;
