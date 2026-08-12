-- 联系人备注与置顶是单账号私有视图，不写入双方共享的家庭绑定。
create table if not exists public.oc_contact_preferences (
  owner_id uuid not null references public.oc_users(id) on delete cascade,
  peer_id uuid not null references public.oc_users(id) on delete cascade,
  alias text,
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_id, peer_id),
  constraint oc_contact_preferences_different_users check (owner_id <> peer_id),
  constraint oc_contact_preferences_alias_check check (
    alias is null or (
      alias = btrim(alias)
      and char_length(alias) between 1 and 40
    )
  )
);

alter table public.oc_contact_preferences enable row level security;
alter table public.oc_contact_preferences force row level security;

revoke all on table public.oc_contact_preferences from public, anon, authenticated;
grant select, insert, update, delete on table public.oc_contact_preferences to service_role;
