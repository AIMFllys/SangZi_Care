'use client';

import { useState, useRef, useCallback } from 'react';
import { jsBridge } from '@/lib/jsbridge';
import { fetchApi } from '@/lib/api';
import { useFamilyStore } from '@/stores/familyStore';

// ------ 状态机类型 ------

export type EmergencyState =
  | 'idle'
  | 'confirming'       // 3秒确认倒计时
  | 'calling_family'   // 正在拨打家属电话
  | 'waiting_110'      // 5秒倒计时后拨打110
  | 'calling_110'      // 正在拨打110
  | 'completed'        // 流程完成，显示求助提示
  | 'cancelled'        // 用户取消
  | 'no_permission';   // 无SIM卡/无权限

export interface UseEmergencyReturn {
  state: EmergencyState;
  countdown: number;
  trigger: () => void;
  cancel: () => void;
  confirmNow: () => void;
  reset: () => void;
}

// ------ 常量 ------

const CONFIRM_SECONDS = 3;
const WAIT_110_SECONDS = 5;
const POLICE_NUMBER = '110';

// ------ Hook ------

export function useEmergency(): UseEmergencyReturn {
  const [state, setState] = useState<EmergencyState>('idle');
  const [countdown, setCountdown] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);
  const emergencyIdRef = useRef<string | null>(null);

  // ---- 工具函数 ----

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  /** 获取第一个有紧急通知权限的家属电话 */
  const getEmergencyFamilyPhone = useCallback((): string | null => {
    const { binds } = useFamilyStore.getState();
    const emergencyBind = binds.find(
      (b) =>
        b.bind.status === 'active' && b.bind.can_receive_emergency && b.user.phone,
    );
    return emergencyBind?.user.phone ?? null;
  }, []);

  /** 通知后端触发紧急呼叫 */
  const notifyTrigger = useCallback(async (method: 'button' | 'voice' = 'button') => {
    try {
      const res = await fetchApi<{ id: string }>('/api/v1/emergency/trigger', {
        method: 'POST',
        body: { trigger_method: method },
      });
      emergencyIdRef.current = res.id;
    } catch {
      // 后端通知失败不阻塞紧急呼叫流程
    }
  }, []);

  /** 通知后端取消紧急呼叫 */
  const notifyCancel = useCallback(async () => {
    try {
      await fetchApi('/api/v1/emergency/cancel', {
        method: 'POST',
        body: { id: emergencyIdRef.current },
      });
    } catch {
      // 静默失败
    }
  }, []);

  /** 拨打电话，返回是否成功 */
  const makeCall = useCallback(async (phone: string): Promise<boolean> => {
    try {
      return await jsBridge.makePhoneCall(phone);
    } catch {
      return false;
    }
  }, []);

  // ---- 拨打110流程 ----

  const call110 = useCallback(async () => {
    if (cancelledRef.current) return;

    setState('calling_110');
    const success = await makeCall(POLICE_NUMBER);

    if (cancelledRef.current) return;

    if (success) {
      setState('completed');
    } else {
      // 无SIM卡或无权限
      setState('no_permission');
    }
  }, [makeCall]);

  // ---- 5秒倒计时后拨打110 ----

  const startWait110Countdown = useCallback(() => {
    if (cancelledRef.current) return;

    setState('waiting_110');
    setCountdown(WAIT_110_SECONDS);

    let remaining = WAIT_110_SECONDS;
    timerRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);

      if (remaining <= 0) {
        clearTimer();
        call110();
      }
    }, 1000);
  }, [clearTimer, call110]);

  // ---- 拨打家属流程 ----

  const callFamily = useCallback(async () => {
    if (cancelledRef.current) return;

    const familyPhone = getEmergencyFamilyPhone();

    if (!familyPhone) {
      // 未绑定家属，直接拨打110
      await call110();
      return;
    }

    setState('calling_family');
    const success = await makeCall(familyPhone);

    if (cancelledRef.current) return;

    if (success) {
      // 拨打家属后，等5秒再拨打110
      startWait110Countdown();
    } else {
      // 拨打家属失败，直接进入110倒计时
      startWait110Countdown();
    }
  }, [getEmergencyFamilyPhone, makeCall, call110, startWait110Countdown]);

  // ---- 确认后执行呼叫 ----

  const executeEmergency = useCallback(async () => {
    clearTimer();
    await notifyTrigger('button');
    await callFamily();
  }, [clearTimer, notifyTrigger, callFamily]);

  // ---- 3秒确认倒计时 ----

  const startConfirmCountdown = useCallback(() => {
    cancelledRef.current = false;
    setState('confirming');
    setCountdown(CONFIRM_SECONDS);

    let remaining = CONFIRM_SECONDS;
    timerRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);

      if (remaining <= 0) {
        clearTimer();
        executeEmergency();
      }
    }, 1000);
  }, [clearTimer, executeEmergency]);

  // ---- 公开方法 ----

  const trigger = useCallback(() => {
    if (state !== 'idle' && state !== 'cancelled' && state !== 'completed' && state !== 'no_permission') {
      return; // 已在流程中，忽略重复触发
    }
    startConfirmCountdown();
  }, [state, startConfirmCountdown]);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    clearTimer();
    setState('cancelled');
    setCountdown(0);
    notifyCancel();
  }, [clearTimer, notifyCancel]);

  const confirmNow = useCallback(() => {
    if (state !== 'confirming') return;
    clearTimer();
    setCountdown(0);
    executeEmergency();
  }, [state, clearTimer, executeEmergency]);

  const reset = useCallback(() => {
    cancelledRef.current = true;
    clearTimer();
    setState('idle');
    setCountdown(0);
    emergencyIdRef.current = null;
  }, [clearTimer]);

  return { state, countdown, trigger, cancel, confirmNow, reset };
}
