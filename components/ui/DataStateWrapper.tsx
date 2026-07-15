'use client';

import { ReactNode } from 'react';
import { FileX, AlertCircle } from 'lucide-react';
import styles from './DataStateWrapper.module.css';

interface EmptyConfig {
    icon?: ReactNode;
    title?: string;
    description?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
}

interface DataStateWrapperProps {
    loading?: boolean;
    error?: string | null;
    empty?: EmptyConfig | false;
    onRetry?: () => void;
    children: ReactNode;
}

/**
 * 通用三态包装组件：加载中 / 出错 / 数据为空
 * 替代 5+ 个页面重复的 loading/error/empty 模板代码
 */
export default function DataStateWrapper({
    loading,
    error,
    empty,
    onRetry,
    children,
}: DataStateWrapperProps) {
    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loader}>
                    <div className={styles.dot} />
                    <div className={styles.dot} />
                    <div className={styles.dot} />
                </div>
                <p className={styles.text}>加载中...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.container}>
                <span className={styles.icon}><AlertCircle size={48} color="var(--color-danger)" /></span>
                <p className={styles.errorText}>{error}</p>
                {onRetry && (
                    <button className={styles.retryButton} onClick={onRetry}>
                        重新加载
                    </button>
                )}
            </div>
        );
    }

    if (empty) {
        return (
            <div className={styles.container}>
                <span className={styles.icon}>{empty.icon || <FileX size={48} color="var(--text-muted)" />}</span>
                <p className={styles.text}>{empty.title || '暂无数据'}</p>
                {empty.description && (
                    <p className={styles.description}>{empty.description}</p>
                )}
                {empty.action && (
                    <button
                        type="button"
                        className={styles.emptyAction}
                        onClick={empty.action.onClick}
                    >
                        {empty.action.label}
                    </button>
                )}
            </div>
        );
    }

    return <>{children}</>;
}
