begin;

-- 将“应服”发生项持久化到 medication_records。计划后续被停用或改时后，
-- 已经形成的历史分母仍然保留，照护看板不会用当前计划重写过去。
create index if not exists oc_medication_records_plan_status_scheduled_idx
  on public.oc_medication_records (plan_id, status, scheduled_time);

create or replace function public.oc_sync_medication_plan_occurrences()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (timezone('Asia/Shanghai', now()))::date;
  v_from date := greatest(new.start_date, v_today);
  v_to date := least(coalesce(new.end_date, v_today + 365), v_today + 365);
begin
  -- 只重建尚未发生且未被确认的未来项；历史及 taken/skipped/delayed 均保留。
  delete from public.oc_medication_records
  where plan_id = new.id
    and coalesce(status, 'pending') = 'pending'
    and scheduled_time >= now();

  if coalesce(new.is_active, false) and v_to >= v_from then
    insert into public.oc_medication_records (
      user_id,
      plan_id,
      scheduled_time,
      status,
      created_at
    )
    select
      new.user_id,
      new.id,
      ((day_value::date + plan_time::time) at time zone 'Asia/Shanghai'),
      'pending',
      now()
    from generate_series(v_from, v_to, interval '1 day') as days(day_value)
    cross join unnest(new.schedule_times) as times(plan_time)
    where (
      new.repeat_days is null
      or extract(isodow from day_value)::integer = any(new.repeat_days)
    )
      and ((day_value::date + plan_time::time) at time zone 'Asia/Shanghai') >= now()
    on conflict (plan_id, scheduled_time) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists oc_medication_plan_occurrences_sync
  on public.oc_medication_plans;
create trigger oc_medication_plan_occurrences_sync
after insert or update of
  user_id,
  schedule_times,
  repeat_days,
  start_date,
  end_date,
  is_active
on public.oc_medication_plans
for each row execute function public.oc_sync_medication_plan_occurrences();

-- 为现有计划补齐最近七天和未来一年。唯一约束会保留已有 taken 记录。
with bounds as (
  select (timezone('Asia/Shanghai', now()))::date as today
)
insert into public.oc_medication_records (
  user_id,
  plan_id,
  scheduled_time,
  status,
  created_at
)
select
  plan.user_id,
  plan.id,
  ((day_value::date + plan_time::time) at time zone 'Asia/Shanghai'),
  'pending',
  now()
from public.oc_medication_plans as plan
cross join bounds
cross join lateral generate_series(
  greatest(plan.start_date, bounds.today - 6),
  least(coalesce(plan.end_date, bounds.today + 365), bounds.today + 365),
  interval '1 day'
) as days(day_value)
cross join unnest(plan.schedule_times) as times(plan_time)
where coalesce(plan.is_active, false)
  and (
    plan.repeat_days is null
    or extract(isodow from day_value)::integer = any(plan.repeat_days)
  )
on conflict (plan_id, scheduled_time) do nothing;

-- 看板只返回最小统计集：发生项日聚合、每类最新健康值、七日心率和异常数。
create or replace function public.oc_get_care_dashboard_snapshot(
  p_user_id uuid,
  p_start timestamptz,
  p_end timestamptz,
  p_include_health boolean,
  p_include_medication boolean
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'medication_adherence',
      case when p_include_medication then coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'date', daily.local_date,
            'planned', daily.planned,
            'completed', daily.completed
          ) order by daily.local_date
        )
        from (
          select
            (record.scheduled_time at time zone 'Asia/Shanghai')::date as local_date,
            count(*)::integer as planned,
            count(*) filter (where record.status = 'taken')::integer as completed
          from public.oc_medication_records as record
          where record.user_id = p_user_id
            and record.scheduled_time >= p_start
            and record.scheduled_time < p_end
          group by local_date
        ) as daily
      ), '[]'::jsonb) else '[]'::jsonb end,
    'latest_vitals',
      case when p_include_health then coalesce((
        select jsonb_agg(to_jsonb(latest))
        from (
          select distinct on (record.record_type)
            record.id,
            record.record_type,
            record.values,
            record.measured_at,
            record.is_abnormal,
            record.abnormal_reason
          from public.oc_health_records as record
          where record.user_id = p_user_id
            and record.measured_at < p_end
            and record.record_type in (
              'blood_pressure', 'blood_sugar', 'heart_rate', 'weight', 'temperature'
            )
          order by record.record_type, record.measured_at desc
        ) as latest
      ), '[]'::jsonb) else '[]'::jsonb end,
    'heart_rate_daily',
      case when p_include_health then coalesce((
        select jsonb_agg(
          jsonb_build_object('date', daily.local_date, 'value', daily.value)
          order by daily.local_date
        )
        from (
          select distinct on (
            (record.measured_at at time zone 'Asia/Shanghai')::date
          )
            (record.measured_at at time zone 'Asia/Shanghai')::date as local_date,
            record.values -> 'value' as value
          from public.oc_health_records as record
          where record.user_id = p_user_id
            and record.record_type = 'heart_rate'
            and record.measured_at >= p_start
            and record.measured_at < p_end
          order by
            (record.measured_at at time zone 'Asia/Shanghai')::date,
            record.measured_at desc
        ) as daily
      ), '[]'::jsonb) else '[]'::jsonb end,
    'abnormal_count',
      case when p_include_health then (
        select count(*)::integer
        from public.oc_health_records as record
        where record.user_id = p_user_id
          and record.measured_at >= p_start
          and record.measured_at < p_end
          and record.is_abnormal is true
      ) else 0 end
  );
$$;

revoke all on function public.oc_sync_medication_plan_occurrences() from public;
revoke all on function public.oc_get_care_dashboard_snapshot(
  uuid, timestamptz, timestamptz, boolean, boolean
) from public, anon, authenticated;
grant execute on function public.oc_get_care_dashboard_snapshot(
  uuid, timestamptz, timestamptz, boolean, boolean
) to service_role;

commit;
