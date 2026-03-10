'use client';

import { usePathname, useRouter } from 'next/navigation';

export default function TopNav() {
    const router = useRouter();
    const pathname = usePathname();

    // Do not show the top navigation on the home page or specific full-screen pages like login
    if (pathname === '/' || pathname === '/login' || pathname === '/onboarding') {
        return null;
    }

    return (
        <div className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-xl shadow-sm">
            <div className="flex items-center justify-between px-4 h-20">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 -ml-2 px-3 py-4 rounded-3xl interactive"
                    aria-label="返回上一页"
                >
                    {/* A massive, highly visible back arrow */}
                    <div className="w-12 h-12 flex items-center justify-center rounded-full bg-gray-100 text-gray-900">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m15 18-6-6 6-6" />
                        </svg>
                    </div>
                    <span className="text-2xl font-bold text-[#171717] tracking-tight">返回</span>
                </button>

                {/* We can dynamically inject page title here or leave it empty for minimalist look */}
                <div className="flex-1"></div>
            </div>
        </div>
    );
}
