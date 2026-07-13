export type ShellMode = 'tabbed' | 'detail' | 'immersive';

const IMMERSIVE = ['/login', '/onboarding', '/voice'] as const;
const DETAIL = [
  '/messages/',
  '/medicine/history',
  '/health/input',
  '/family/',
  '/settings/profile',
  '/settings/bind',
  '/settings/accessibility',
] as const;

export function getShellMode(pathname: string): ShellMode {
  if (
    IMMERSIVE.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`),
    )
  ) {
    return 'immersive';
  }

  if (DETAIL.some((route) => pathname === route || pathname.startsWith(route))) {
    return 'detail';
  }

  return 'tabbed';
}
