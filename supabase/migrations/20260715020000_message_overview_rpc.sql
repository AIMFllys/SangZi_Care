-- v1.1：一次聚合全部 active 家庭联系人的最新消息与未读数。

create index if not exists oc_messages_sender_receiver_created_idx
  on public.oc_elder_care_messages (sender_id, receiver_id, created_at desc);

create index if not exists oc_messages_receiver_sender_created_idx
  on public.oc_elder_care_messages (receiver_id, sender_id, created_at desc);

create or replace function public.oc_get_message_overview(p_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with active_peers as (
    select distinct
      case
        when bind.elder_id = p_user_id then bind.family_id
        else bind.elder_id
      end as peer_id
    from public.oc_elder_family_binds as bind
    where bind.status = 'active'
      and (bind.elder_id = p_user_id or bind.family_id = p_user_id)
  ), ranked as (
    select
      peer.peer_id,
      message.*,
      row_number() over (
        partition by peer.peer_id
        order by message.created_at desc nulls last, message.id desc
      ) as row_number,
      count(*) filter (
        where message.receiver_id = p_user_id
          and message.is_read is not true
      ) over (partition by peer.peer_id) as unread_count
    from active_peers as peer
    join public.oc_elder_care_messages as message
      on (
        message.sender_id = p_user_id
        and message.receiver_id = peer.peer_id
      ) or (
        message.sender_id = peer.peer_id
        and message.receiver_id = p_user_id
      )
    where peer.peer_id is not null
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'peer_id', peer_id,
        'unread_count', unread_count,
        'last_message', jsonb_build_object(
          'id', id,
          'sender_id', sender_id,
          'receiver_id', receiver_id,
          'type', type,
          'category', coalesce(category, 'chat'),
          'content', content,
          'audio_url', null,
          'audio_duration', audio_duration,
          'is_ai_generated', is_ai_generated,
          'is_read', is_read,
          'read_at', read_at,
          'created_at', created_at
        )
      )
      order by created_at desc nulls last
    ),
    '[]'::jsonb
  )
  from ranked
  where row_number = 1;
$$;

revoke all on function public.oc_get_message_overview(uuid)
  from public, anon, authenticated;
grant execute on function public.oc_get_message_overview(uuid)
  to service_role;
