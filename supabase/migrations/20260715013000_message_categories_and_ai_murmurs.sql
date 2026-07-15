-- v1.1：消息分类与 AI 碎碎念持久化。

alter table public.oc_elder_care_messages
  add column if not exists category text not null default 'chat';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.oc_elder_care_messages'::regclass
      and conname = 'oc_elder_care_messages_category_check'
  ) then
    alter table public.oc_elder_care_messages
      add constraint oc_elder_care_messages_category_check
      check (category in ('chat', 'murmur', 'system'));
  end if;
end
$$;

comment on column public.oc_elder_care_messages.category is
  '消息语义分类：chat 普通聊天、murmur 经同意分享的碎碎念、system 系统通知';

create index if not exists oc_messages_receiver_category_unread_idx
  on public.oc_elder_care_messages (receiver_id, category, created_at desc)
  where is_read is not true;

create table if not exists public.oc_ai_murmurs (
  id uuid primary key default gen_random_uuid(),
  elder_id uuid not null references public.oc_users(id) on delete cascade,
  source_text text not null,
  summary text not null,
  share_status text not null default 'private'
    check (share_status in ('private', 'shared')),
  shared_message_ids uuid[] not null default '{}'::uuid[],
  shared_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(source_text) between 1 and 4000),
  check (char_length(summary) between 1 and 1000)
);

comment on table public.oc_ai_murmurs is
  'AI 陪伴从长辈对话中整理的私密碎碎念；仅在长辈明确同意后分享给 active 家属';

create index if not exists oc_ai_murmurs_elder_created_idx
  on public.oc_ai_murmurs (elder_id, created_at desc);

alter table public.oc_ai_murmurs enable row level security;
alter table public.oc_ai_murmurs force row level security;

revoke all on table public.oc_ai_murmurs from public, anon, authenticated;
grant select, insert, update, delete on table public.oc_ai_murmurs to service_role;

create or replace function public.oc_share_ai_murmur(
  p_murmur_id uuid,
  p_elder_id uuid,
  p_summary text
)
returns uuid[]
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_message_ids uuid[] := '{}'::uuid[];
begin
  if not exists (
    select 1
    from public.oc_ai_murmurs
    where id = p_murmur_id
      and elder_id = p_elder_id
      and share_status = 'private'
  ) then
    raise exception 'murmur_not_shareable';
  end if;

  with active_family as (
    select distinct family_id
    from public.oc_elder_family_binds
    where elder_id = p_elder_id
      and family_id is not null
      and status = 'active'
  ), inserted as (
    insert into public.oc_elder_care_messages (
      sender_id,
      receiver_id,
      type,
      category,
      content,
      is_ai_generated,
      is_read,
      created_at
    )
    select
      p_elder_id,
      family_id,
      'text',
      'murmur',
      p_summary,
      true,
      false,
      now()
    from active_family
    returning id
  )
  select coalesce(array_agg(id), '{}'::uuid[])
  into v_message_ids
  from inserted;

  if coalesce(array_length(v_message_ids, 1), 0) > 0 then
    update public.oc_ai_murmurs
    set share_status = 'shared',
        shared_message_ids = v_message_ids,
        shared_at = now(),
        updated_at = now()
    where id = p_murmur_id;
  end if;

  return v_message_ids;
end;
$$;

revoke all on function public.oc_share_ai_murmur(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.oc_share_ai_murmur(uuid, uuid, text)
  to service_role;
