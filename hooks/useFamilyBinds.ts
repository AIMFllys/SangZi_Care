'use client';

import { useEffect } from 'react';
import { useUserStore } from '@/stores/userStore';
import { useFamilyStore } from '@/stores/familyStore';

/**
 * 共用 Hook：自动拉取家庭绑定列表
 * 替代 4 个页面重复的 fetchBinds useEffect 模式
 */
export function useFamilyBinds() {
    const user = useUserStore((s) => s.user);
    const binds = useFamilyStore((s) => s.binds);
    const fetchBinds = useFamilyStore((s) => s.fetchBinds);
    const isLoading = useFamilyStore((s) => s.isLoading);

    useEffect(() => {
        if (user?.id && binds.length === 0) {
            fetchBinds();
        }
    }, [user?.id, binds.length, fetchBinds]);

    return { binds, isLoading };
}
