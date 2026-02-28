// ============================================================
// 桑梓智护 — Realtime 数据同步 Hook
// 在首页挂载，自动订阅相关表的实时变更并更新 Store
// ============================================================

import { useEffect, useRef } from 'react';
import { useUserStore } from '@/stores/userStore';
import { useHealthStore } from '@/stores/healthStore';
import { useMedicineStore } from '@/stores/medicineStore';
import { useMessageStore } from '@/stores/messageStore';
import {
  subscribeHealthRecords,
  subscribeMedicationRecords,
  subscribeMedicationPlans,
  subscribeMessages,
  subscribeEmergencyCalls,
  unsubscribeAll,
} from '@/lib/realtimeSubscriptions';

/**
 * 实时数据同步 Hook
 * - 老年人端：订阅用药计划变更、捂话消息
 * - 家属端：订阅健康数据、用药记录、捂话消息、紧急呼叫
 * - 登出时自动取消所有订阅
 */
export function useRealtimeSync(
  onEmergency?: (call: Record<string, unknown>) => void,
) {
  const user = useUserStore((s) => s.user);
  const isElder = useUserStore((s) => s.isElder);
  const subscribedRef = useRef(false);

  useEffect(() => {
    if (!user?.id || subscribedRef.current) return;
    subscribedRef.current = true;

    const userId = user.id;

    // 共同订阅：捂话消息
    subscribeMessages(userId, () => {
      // 收到新消息时刷新未读计数
      useMessageStore.getState().fetchUnreadCount();
    });

    if (isElder) {
      // 老年人端：订阅用药计划变更（家属设置的新计划）
      subscribeMedicationPlans(userId, () => {
        useMedicineStore.getState().fetchTodayTimeline();
      });
    } else {
      // 家属端：订阅健康数据变更
      subscribeHealthRecords(userId, () => {
        useHealthStore.getState().fetchLatest();
      });

      // 家属端：订阅用药记录变更
      subscribeMedicationRecords(userId, () => {
        useMedicineStore.getState().fetchTodayTimeline();
      });

      // 家属端：订阅紧急呼叫
      if (onEmergency) {
        subscribeEmergencyCalls(userId, onEmergency);
      }
    }

    return () => {
      unsubscribeAll();
      subscribedRef.current = false;
    };
  }, [user?.id, isElder, onEmergency]);
}
