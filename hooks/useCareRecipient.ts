'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { useFamilyBinds } from '@/hooks/useFamilyBinds';
import { useFamilyStore, type FamilyBindWithUser } from '@/stores/familyStore';
import { useUserStore } from '@/stores/userStore';

export interface CarePermissions {
  canViewHealth: boolean;
  canEditHealth: boolean;
  canEditMedication: boolean;
  canReceiveEmergency: boolean;
}

export interface CareRecipient {
  id: string;
  name: string;
  relation: string | null;
  avatarUrl: string | null;
  bind: FamilyBindWithUser['bind'] | null;
  permissions: CarePermissions;
}

const SELF_PERMISSIONS: CarePermissions = {
  canViewHealth: true,
  canEditHealth: true,
  canEditMedication: true,
  canReceiveEmergency: true,
};

function toRecipient(item: FamilyBindWithUser): CareRecipient {
  const bind = item.bind;
  return {
    id: item.user.id,
    name: item.user.name || '长辈',
    relation: bind.relation ?? null,
    avatarUrl: item.user.avatar_url ?? null,
    bind,
    permissions: {
      canViewHealth: Boolean(bind.can_view_health || bind.can_edit_health),
      canEditHealth: Boolean(bind.can_edit_health),
      canEditMedication: Boolean(bind.can_edit_medication),
      canReceiveEmergency: Boolean(bind.can_receive_emergency),
    },
  };
}

/**
 * 统一解析当前健康/用药目标：长辈端始终为本人，家属端只能来自当前
 * 账号的 active 绑定。selectedElderId 存在 Zustand 中，可跨页面复用。
 */
export function useCareRecipient() {
  const user = useUserStore((state) => state.user);
  const isElder = useUserStore((state) => state.isElder);
  const { binds, isLoading, error, retry } = useFamilyBinds();
  const selectedElderId = useFamilyStore((state) => state.selectedElderId);
  const setSelectedElderId = useFamilyStore((state) => state.setSelectedElderId);

  const recipients = useMemo(
    () => binds
      .filter((item) => (
        item.bind.status === 'active'
        && item.bind.family_id === user?.id
        && item.bind.elder_id === item.user.id
      ))
      .map(toRecipient),
    [binds, user?.id],
  );

  const selectedRecipient = recipients.find(
    (recipient) => recipient.id === selectedElderId,
  ) ?? recipients[0] ?? null;

  useEffect(() => {
    if (isElder || isLoading) return;
    const nextId = selectedRecipient?.id ?? null;
    if (selectedElderId !== nextId) setSelectedElderId(nextId);
  }, [
    isElder,
    isLoading,
    selectedElderId,
    selectedRecipient?.id,
    setSelectedElderId,
  ]);

  const selectRecipient = useCallback((elderId: string) => {
    if (recipients.some((recipient) => recipient.id === elderId)) {
      setSelectedElderId(elderId);
    }
  }, [recipients, setSelectedElderId]);

  const selfRecipient = useMemo<CareRecipient | null>(() => {
    if (!user || !isElder) return null;
    return {
      id: user.id,
      name: user.name || '我',
      relation: null,
      avatarUrl: user.avatar_url ?? null,
      bind: null,
      permissions: SELF_PERMISSIONS,
    };
  }, [isElder, user]);

  const recipient = isElder ? selfRecipient : selectedRecipient;

  return {
    recipient,
    recipients,
    targetUserId: recipient?.id ?? null,
    isSelf: Boolean(isElder && recipient),
    isFamily: Boolean(user && !isElder),
    isLoading: Boolean(user && !isElder && isLoading),
    error: user && !isElder ? error : null,
    retry,
    selectRecipient,
  };
}
