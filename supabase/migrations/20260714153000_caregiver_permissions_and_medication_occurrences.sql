begin;

alter table public.oc_elder_family_binds
  add column if not exists can_edit_health boolean not null default true,
  add column if not exists expires_at timestamptz;

comment on column public.oc_elder_family_binds.relation is
  '长辈相对于家属的关系，例如父亲、母亲、爷爷、奶奶';
comment on column public.oc_elder_family_binds.can_edit_health is
  '长辈是否授权该家属代为记录健康数据';
comment on column public.oc_elder_family_binds.expires_at is
  '待兑换绑定码的失效时间；active 绑定保留原兑换时间用于审计';

-- 旧版绑定码没有失效时间，无法安全继续兑换。
update public.oc_elder_family_binds
set status = 'inactive'
where status = 'pending' and expires_at is null;

create unique index if not exists oc_bind_pending_code_unique
  on public.oc_elder_family_binds (bind_code)
  where status = 'pending' and bind_code is not null;

create unique index if not exists oc_bind_active_pair_unique
  on public.oc_elder_family_binds (elder_id, family_id)
  where status = 'active' and family_id is not null;

alter table public.oc_medication_records
  add column if not exists confirmed_by uuid references public.oc_users(id);

comment on column public.oc_medication_records.confirmed_by is
  '实际执行服药确认的账号；可为长辈本人或获授权家属';

create unique index if not exists oc_medication_occurrence_unique
  on public.oc_medication_records (plan_id, scheduled_time);

create index if not exists oc_health_records_user_type_measured_idx
  on public.oc_health_records (user_id, record_type, measured_at desc);

create index if not exists oc_medication_records_user_scheduled_idx
  on public.oc_medication_records (user_id, scheduled_time desc);

commit;
