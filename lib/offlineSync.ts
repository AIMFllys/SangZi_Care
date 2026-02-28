// ============================================================
// 桑梓智护 — 离线数据同步
// 网络恢复后自动同步离线期间产生的数据
// ============================================================

import { fetchApi } from '@/lib/api';

// ---------- 类型 ----------

interface PendingAction {
  id: string;
  type: 'health_record' | 'medication_confirm' | 'message';
  payload: Record<string, unknown>;
  createdAt: number;
}

const STORAGE_KEY = 'sangzi_offline_queue';

// ---------- 离线队列管理 ----------

/**
 * 获取离线队列
 */
function getQueue(): PendingAction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * 保存离线队列
 */
function saveQueue(queue: PendingAction[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // 存储满时静默失败
  }
}

/**
 * 添加待同步操作到离线队列
 */
export function enqueueOfflineAction(
  type: PendingAction['type'],
  payload: Record<string, unknown>,
): void {
  const queue = getQueue();
  queue.push({
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    payload,
    createdAt: Date.now(),
  });
  saveQueue(queue);
}

/**
 * 同步所有离线数据
 * @returns 成功同步的数量
 */
export async function syncOfflineData(): Promise<number> {
  const queue = getQueue();
  if (queue.length === 0) return 0;

  let synced = 0;
  const failed: PendingAction[] = [];

  for (const action of queue) {
    try {
      switch (action.type) {
        case 'health_record':
          await fetchApi('/api/v1/health/records', {
            method: 'POST',
            body: action.payload,
          });
          break;
        case 'medication_confirm':
          await fetchApi('/api/v1/medicine/records', {
            method: 'POST',
            body: action.payload,
          });
          break;
        case 'message':
          await fetchApi('/api/v1/messages/send', {
            method: 'POST',
            body: action.payload,
          });
          break;
      }
      synced++;
    } catch {
      // 同步失败的操作保留在队列中
      failed.push(action);
    }
  }

  saveQueue(failed);
  return synced;
}

/**
 * 获取离线队列长度
 */
export function getOfflineQueueSize(): number {
  return getQueue().length;
}

/**
 * 清空离线队列
 */
export function clearOfflineQueue(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// ---------- 网络状态监听 ----------

let isListening = false;

/**
 * 启动网络恢复自动同步
 * 当网络从离线恢复为在线时，自动同步离线队列中的数据
 */
export function startOfflineSync(
  onSynced?: (count: number) => void,
): () => void {
  if (typeof window === 'undefined' || isListening) return () => {};

  isListening = true;

  const handleOnline = async () => {
    const count = await syncOfflineData();
    if (count > 0 && onSynced) {
      onSynced(count);
    }
  };

  window.addEventListener('online', handleOnline);

  return () => {
    window.removeEventListener('online', handleOnline);
    isListening = false;
  };
}

/**
 * 检查当前是否在线
 */
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}
