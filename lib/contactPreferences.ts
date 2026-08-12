export interface ContactPreference {
  alias: string | null;
  is_pinned: boolean;
}

export interface SortableContact {
  userId: string;
  name: string;
  isPinned: boolean;
  lastMessage?: { created_at: string | null };
}

export function contactDisplayName(
  alias: string | null | undefined,
  peerName: string | null | undefined,
  relation: string | null | undefined,
): string {
  return alias?.trim() || peerName?.trim() || relation?.trim() || '家人';
}

function messageTimestamp(contact: SortableContact): number {
  const timestamp = contact.lastMessage?.created_at
    ? new Date(contact.lastMessage.created_at).getTime()
    : Number.NEGATIVE_INFINITY;
  return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY;
}

export function sortContacts(left: SortableContact, right: SortableContact): number {
  if (left.isPinned !== right.isPinned) return left.isPinned ? -1 : 1;
  const leftTimestamp = messageTimestamp(left);
  const rightTimestamp = messageTimestamp(right);
  if (leftTimestamp !== rightTimestamp) return leftTimestamp > rightTimestamp ? -1 : 1;
  const nameDifference = left.name.localeCompare(right.name, 'zh-CN');
  return nameDifference || left.userId.localeCompare(right.userId);
}
