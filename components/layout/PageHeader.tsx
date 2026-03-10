'use client';

import { useRouter } from 'next/navigation';

interface PageHeaderProps {
    title?: string;
    /**
     * If provided, will force pushing to this URL instead of history.back().
     * Safer for App router where history can be unreliable.
     */
    fallbackUrl?: string;
    /** Optional right-side actions */
    rightElement?: React.ReactNode;
    /** Whether the header background is fully transparent */
    transparent?: boolean;
}

export default function PageHeader({ title, fallbackUrl = '/', rightElement, transparent = false }: PageHeaderProps) {
    const router = useRouter();

    const handleBack = () => {
        // To avoid white screen if history is empty or user landed directly,
        // we use a safe fallback URL if window.history.length <= 2
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
        <div className={`sticky top-0 z-50 w-full ${transparent ? 'bg-transparent' : 'bg-white/90 backdrop-blur-xl shadow-sm'} transition-colors duration-300`}>
            <div className="flex items-center justify-between px-4 h-20 md:h-24">
                {/* Back Button — 参考成品图大圆形返回按钮 */}
                <button
                    onClick={handleBack}
                    className="group flex items-center gap-1 -ml-2 px-2 py-4 rounded-3xl interactive focus:outline-none focus:ring-4 focus:ring-[var(--color-primary)]/30"
                    aria-label="返回"
                >
                    <div className="w-14 h-14 flex items-center justify-center rounded-full bg-gray-100 border border-gray-200 shadow-sm group-hover:bg-gray-200 transition-colors text-gray-900">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m15 18-6-6 6-6" />
                        </svg>
                    </div>
                </button>

                {/* Dynamic Title — 参考成品图居中大标题 */}
                {title && (
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                        <h1 className="text-2xl font-bold text-[var(--color-text)] tracking-tight truncate max-w-[200px]">
                            {title}
                        </h1>
                    </div>
                )}

                {/* Dynamic Right Element */}
                <div className="flex-shrink-0 z-10">
                    {rightElement || <div className="w-12" />} {/* Placeholder for balance if empty */}
                </div>
            </div>
        </div>
    );
}
