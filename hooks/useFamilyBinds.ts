'use client';

import { useCallback, useEffect } from 'react';
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
    const error = useFamilyStore((s) => s.error);
    const ownerUserId = useFamilyStore((s) => s.ownerUserId);

    useEffect(() => {
        // ownerUserId 在请求开始时即写入，可同时表示“已为该账号初始化”。
        // 不能以 binds.length===0 判断未加载，否则合法空列表会在每次挂载时重复请求。
        if (user?.id && ownerUserId !== user.id) {
            void fetchBinds(user.id);
        }
    }, [user?.id, fetchBinds, ownerUserId]);

    const ownsCache = Boolean(user?.id && ownerUserId === user.id);
    const retry = useCallback(() => {
        if (user?.id) void fetchBinds(user.id);
    }, [fetchBinds, user?.id]);
    return {
        binds: ownsCache ? binds : [],
        isLoading: Boolean(user?.id) && (!ownsCache || isLoading),
        error: ownsCache ? error : null,
        retry,
    };
}
