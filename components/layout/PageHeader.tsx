'use client';

import { useRouter } from 'next/navigation';
import styles from './PageHeader.module.css';

interface PageHeaderProps {
    title?: string;
    fallbackUrl?: string;
    rightElement?: React.ReactNode;
    transparent?: boolean;
}

export default function PageHeader({ title, fallbackUrl = '/', rightElement, transparent = false }: PageHeaderProps) {
    const router = useRouter();

    const handleBack = () => {
        if (!fallbackUrl) {
            router.back();
            return;
        }
        if (typeof window !== 'undefined' && window.history.length > 2) {
            router.back();
        } else {
            router.push(fallbackUrl);
        }
    };

    return (
        <div className={`${styles.header} ${transparent ? styles.transparent : ''}`}>
            <div className={styles.inner}>
                <button onClick={handleBack} className={styles.backBtn} aria-label="返回">
                    <div className={styles.backCircle}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m15 18-6-6 6-6" />
                        </svg>
                    </div>
                </button>

                {title && (
                    <h1 className={styles.title}>{title}</h1>
                )}

                <div className={styles.right}>
                    {rightElement || <div className={styles.spacer} />}
                </div>
            </div>
        </div>
    );
}
