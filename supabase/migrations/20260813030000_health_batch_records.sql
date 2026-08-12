-- 健康记录批量写入：所有草稿在同一数据库函数中校验并提交，失败时整体回滚。
create or replace function public.oc_create_health_records_batch(
  p_target_user_id uuid,
  p_recorded_by uuid,
  p_records jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_record jsonb;
  v_type text;
  v_value numeric;
  v_count integer;
  v_result jsonb := '[]'::jsonb;
  v_row public.oc_health_records%rowtype;
begin
  if p_target_user_id is null or p_recorded_by is null then
    raise exception using errcode = 'P0001', message = 'invalid_health_batch_actor';
  end if;
  if jsonb_typeof(p_records) <> 'array'
    or jsonb_array_length(p_records) < 1
    or jsonb_array_length(p_records) > 5 then
    raise exception using errcode = 'P0001', message = 'invalid_health_batch_size';
  end if;
  if not exists (select 1 from public.oc_users where id = p_target_user_id)
    or not exists (select 1 from public.oc_users where id = p_recorded_by) then
    raise exception using errcode = 'P0001', message = 'invalid_health_batch_actor';
  end if;
  if p_target_user_id <> p_recorded_by and not exists (
    select 1
    from public.oc_elder_family_binds
    where elder_id = p_target_user_id
      and family_id = p_recorded_by
      and status = 'active'
      and can_edit_health is true
  ) then
    raise exception using errcode = 'P0001', message = 'health_batch_forbidden';
  end if;

  -- 先验证完整数组，再开始 insert，避免部分有效数据落库。
  for v_record in select value from jsonb_array_elements(p_records) loop
    if jsonb_typeof(v_record) <> 'object'
      or not (v_record ? 'record_type')
      or not (v_record ? 'values') then
      raise exception using errcode = 'P0001', message = 'invalid_health_batch_record';
    end if;

    v_type := v_record ->> 'record_type';
    if v_type not in ('blood_pressure', 'blood_sugar', 'heart_rate', 'weight', 'temperature') then
      raise exception using errcode = 'P0001', message = 'invalid_health_record_type';
    end if;
    if jsonb_typeof(v_record -> 'values') <> 'object' then
      raise exception using errcode = 'P0001', message = 'invalid_health_record_values';
    end if;

    if v_type = 'blood_pressure' then
      if jsonb_typeof(v_record -> 'values' -> 'systolic') <> 'number'
        or jsonb_typeof(v_record -> 'values' -> 'diastolic') <> 'number' then
        raise exception using errcode = 'P0001', message = 'invalid_health_record_values';
      end if;
      v_value := (v_record -> 'values' ->> 'systolic')::numeric;
      if v_value <= 0 then
        raise exception using errcode = 'P0001', message = 'invalid_health_record_values';
      end if;
      v_value := (v_record -> 'values' ->> 'diastolic')::numeric;
      if v_value <= 0 then
        raise exception using errcode = 'P0001', message = 'invalid_health_record_values';
      end if;
    else
      if jsonb_typeof(v_record -> 'values' -> 'value') <> 'number'
        or (v_record -> 'values' ->> 'value')::numeric <= 0 then
        raise exception using errcode = 'P0001', message = 'invalid_health_record_values';
      end if;
    end if;

    if (v_record ? 'input_method')
      and coalesce(v_record ->> 'input_method', '') not in ('manual', 'voice', 'family') then
      raise exception using errcode = 'P0001', message = 'invalid_health_input_method';
    end if;
    if v_record ? 'measured_at' then
      begin
        perform (v_record ->> 'measured_at')::timestamptz;
      exception when invalid_text_representation or datetime_field_overflow then
        raise exception using errcode = 'P0001', message = 'invalid_health_measured_at';
      end;
    end if;
  end loop;

  v_count := 0;
  for v_record in select value from jsonb_array_elements(p_records) loop
    insert into public.oc_health_records (
      user_id, record_type, values, measured_at, input_method,
      recorded_by, is_abnormal, abnormal_reason, notes, symptoms, created_at
    ) values (
      p_target_user_id,
      v_record ->> 'record_type',
      v_record -> 'values',
      coalesce((v_record ->> 'measured_at')::timestamptz, now()),
      nullif(v_record ->> 'input_method', ''),
      p_recorded_by,
      coalesce((v_record ->> 'is_abnormal')::boolean, false),
      nullif(v_record ->> 'abnormal_reason', ''),
      nullif(v_record ->> 'notes', ''),
      nullif(v_record ->> 'symptoms', ''),
      now()
    )
    returning * into v_row;

    v_result := v_result || jsonb_build_array(to_jsonb(v_row));
    v_count := v_count + 1;
  end loop;

  return v_result;
end;
$$;

revoke all on function public.oc_create_health_records_batch(uuid, uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.oc_create_health_records_batch(uuid, uuid, jsonb)
  to service_role;
