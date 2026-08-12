'use client';

import { useCallback, useRef, useState } from 'react';
import { ApiError, fetchApi } from '@/lib/api';

type FeedbackKind = 'success' | 'warning' | 'error';

interface EmergencyFeedback {
  kind: FeedbackKind;
  message: string;
}

interface EmergencyTriggerResponse {
  notification_status: 'sent' | 'no_recipients';
  recipient_count: number;
}

interface SafeLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

interface PendingEmergencyRequest {
  request_id: string;
  trigger_method: 'button' | 'voice';
  location?: SafeLocation;
}

async function readGrantedLocation(): Promise<SafeLocation | undefined> {
  if (
    typeof navigator === 'undefined'
    || !navigator.permissions
    || !navigator.geolocation
  ) return undefined;

  try {
    const permission = await Promise.race([
      navigator.permissions.query({ name: 'geolocation' }),
      new Promise<undefined>((resolve) => window.setTimeout(resolve, 100)),
    ]);
    if (permission?.state !== 'granted') return undefined;
    return await new Promise<SafeLocation | undefined>((resolve) => {
      let settled = false;
      const finish = (location?: SafeLocation) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(deadline);
        resolve(location);
      };
      const deadline = window.setTimeout(() => finish(), 750);
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => finish({
          latitude: coords.latitude,
          longitude: coords.longitude,
          ...(Number.isFinite(coords.accuracy) ? { accuracy: coords.accuracy } : {}),
        }),
        () => finish(),
        { enableHighAccuracy: false, timeout: 700, maximumAge: 60_000 },
      );
    });
  } catch {
    return undefined;
  }
}

export function useEmergencyTrigger(triggerMethod: 'button' | 'voice' = 'button') {
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<EmergencyFeedback | null>(null);
  const inFlightRef = useRef(false);
  const pendingRequestRef = useRef<PendingEmergencyRequest | null>(null);

  const trigger = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setIsLoading(true);
    setFeedback(null);
    try {
      let payload = pendingRequestRef.current;
      if (!payload) {
        const location = await readGrantedLocation();
        payload = {
          request_id: crypto.randomUUID(),
          trigger_method: triggerMethod,
          ...(location ? { location } : {}),
        };
        pendingRequestRef.current = payload;
      }
      const response = await fetchApi<EmergencyTriggerResponse>('/api/v1/emergency/trigger', {
        method: 'POST',
        body: payload,
      });
      pendingRequestRef.current = null;
      setFeedback(response.notification_status === 'sent'
        ? {
          kind: 'success',
          message: `紧急求助已发出，已通知 ${response.recipient_count} 位家属`,
        }
        : {
          kind: 'warning',
          message: '未找到可接收紧急通知的家属，请检查绑定设置，并立即拨打 120',
        });
    } catch (error) {
      if (error instanceof ApiError && error.status !== null && error.status >= 400 && error.status < 500) {
        pendingRequestRef.current = null;
      }
      setFeedback({
        kind: 'error',
        message: '紧急求助发送失败，请重试，并立即拨打 120',
      });
    } finally {
      inFlightRef.current = false;
      setIsLoading(false);
    }
  }, [triggerMethod]);

  return { trigger, isLoading, feedback };
}
