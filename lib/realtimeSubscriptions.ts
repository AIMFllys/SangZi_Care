// ============================================================
// 桑梓智护 — Supabase Realtime 订阅管理
// 监听 health_records, medication_records, medication_plans,
// elder_care_messages, emergency_calls 表的变更
// ============================================================

import { supabase } from '@/lib/supabase';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// ---------- 类型 ----------

type TableName =
  | 'health_records'
  | 'medication_records'
  | 'medication_plans'
  | 'elder_care_messages'
  | 'emergency_calls';

type ChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE';

export interface RealtimeCallback {
  (payload: RealtimePostgresChangesPayload<Record<string, unknown>>): void;
}

interface Subscription {
  table: TableName;
  channel: RealtimeChannel;
}

// ---------- 订阅管理器 ----------

let subscriptions: Subscription[] = [];

/**
 * 订阅指定表的实时变更
 * @param table 表名
 * @param userId 当前用户ID（用于过滤）
 * @param callback 变更回调
 * @param events 监听的事件类型，默认全部
 */
export function subscribeToTable(
  table: TableName,
  userId: string,
  callback: RealtimeCallback,
  events: ChangeEvent[] = ['INSERT', 'UPDATE', 'DELETE'],
): RealtimeChannel {
  // 避免重复订阅同一张表
  const existing = subscriptions.find((s) => s.table === table);
  if (existing) {
    existing.channel.unsubscribe();
    subscriptions = subscriptions.filter((s) => s.table !== table);
  }

  const channelName = `realtime:${table}:${userId}`;
  const channel = supabase.channel(channelName);

  for (const event of events) {
    channel.on(
      'postgres_changes' as const,
      { event, schema: 'public', table },
      callback,
    );
  }

  channel.subscribe();
  subscriptions.push({ table, channel });
  return channel;
}

/**
 * 取消指定表的订阅
 */
export function unsubscribeFromTable(table: TableName): void {
  const sub = subscriptions.find((s) => s.table === table);
  if (sub) {
    sub.channel.unsubscribe();
    subscriptions = subscriptions.filter((s) => s.table !== table);
  }
}

/**
 * 取消所有订阅（登出时调用）
 */
export function unsubscribeAll(): void {
  for (const sub of subscriptions) {
    sub.channel.unsubscribe();
  }
  subscriptions = [];
}

// ---------- 便捷订阅函数 ----------

/**
 * 订阅健康数据变更 — 家属端接收老人的健康数据更新
 */
export function subscribeHealthRecords(
  userId: string,
  onUpdate: (record: Record<string, unknown>) => void,
): RealtimeChannel {
  return subscribeToTable('health_records', userId, (payload) => {
    if (payload.new && typeof payload.new === 'object') {
      onUpdate(payload.new as Record<string, unknown>);
    }
  }, ['INSERT', 'UPDATE']);
}

/**
 * 订阅用药记录变更 — 家属端接收老人的服药状态更新
 */
export function subscribeMedicationRecords(
  userId: string,
  onUpdate: (record: Record<string, unknown>) => void,
): RealtimeChannel {
  return subscribeToTable('medication_records', userId, (payload) => {
    if (payload.new && typeof payload.new === 'object') {
      onUpdate(payload.new as Record<string, unknown>);
    }
  }, ['INSERT']);
}

/**
 * 订阅用药计划变更 — 老年人端接收家属设置的用药计划
 */
export function subscribeMedicationPlans(
  userId: string,
  onUpdate: (plan: Record<string, unknown>) => void,
): RealtimeChannel {
  return subscribeToTable('medication_plans', userId, (payload) => {
    if (payload.new && typeof payload.new === 'object') {
      onUpdate(payload.new as Record<string, unknown>);
    }
  }, ['INSERT', 'UPDATE', 'DELETE']);
}

/**
 * 订阅捂话消息 — 接收方实时收到新消息
 */
export function subscribeMessages(
  userId: string,
  onNewMessage: (message: Record<string, unknown>) => void,
): RealtimeChannel {
  return subscribeToTable('elder_care_messages', userId, (payload) => {
    if (payload.new && typeof payload.new === 'object') {
      const msg = payload.new as Record<string, unknown>;
      // 只处理发给当前用户的消息
      if (msg.receiver_id === userId) {
        onNewMessage(msg);
      }
    }
  }, ['INSERT']);
}

/**
 * 订阅紧急呼叫 — 家属端接收紧急呼叫通知
 */
export function subscribeEmergencyCalls(
  userId: string,
  onEmergency: (call: Record<string, unknown>) => void,
): RealtimeChannel {
  return subscribeToTable('emergency_calls', userId, (payload) => {
    if (payload.new && typeof payload.new === 'object') {
      onEmergency(payload.new as Record<string, unknown>);
    }
  }, ['INSERT']);
}
