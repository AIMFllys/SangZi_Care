'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchApi } from '@/lib/api';
import type { CareDashboardResponse } from '@/types/careDashboard';

export function useCareDashboard(targetUserId: string | null) {
  const [data, setData] = useState<CareDashboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stateTargetUserId, setStateTargetUserId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    if (!targetUserId) {
      setStateTargetUserId(null);
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setStateTargetUserId(targetUserId);
    setData((current) => (
      current?.target_user_id === targetUserId ? current : null
    ));
    setLoading(true);
    setError(null);

    void fetchApi<CareDashboardResponse>(
      `/api/v1/family/dashboard?user_id=${encodeURIComponent(targetUserId)}`,
      { signal: controller.signal },
    )
      .then((response) => {
        if (requestIdRef.current !== requestId) return;
        setData(response);
        setLoading(false);
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted || requestIdRef.current !== requestId) return;
        setError(reason instanceof Error ? reason.message : '加载照护看板失败');
        setLoading(false);
      });

    return () => controller.abort();
  }, [reloadKey, targetUserId]);

  const retry = useCallback(() => setReloadKey((value) => value + 1), []);

  const isCurrentTarget = stateTargetUserId === targetUserId;
  const visibleData = isCurrentTarget && data?.target_user_id === targetUserId
    ? data
    : null;

  return {
    data: visibleData,
    loading: isCurrentTarget ? loading : Boolean(targetUserId),
    error: isCurrentTarget ? error : null,
    retry,
  };
}
