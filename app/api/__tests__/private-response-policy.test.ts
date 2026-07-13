// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const API_ROOT = join(process.cwd(), 'app', 'api');
const PUBLIC_ROUTES = new Set([
  'ping/route.ts',
  'v1/radio/categories/route.ts',
]);

function findRouteFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return findRouteFiles(path);
    return entry.name === 'route.ts' ? [path] : [];
  });
}

describe('private API response policy', () => {
  it('所有非公开路由显式使用共享 helper，且不存在裸成功 JSON 响应', () => {
    const privateRoutes = findRouteFiles(API_ROOT).filter((path) => {
      const route = relative(API_ROOT, path).replaceAll('\\', '/');
      return !PUBLIC_ROUTES.has(route);
    });

    expect(privateRoutes.length).toBeGreaterThan(0);
    for (const path of privateRoutes) {
      const route = relative(API_ROOT, path).replaceAll('\\', '/');
      const source = readFileSync(path, 'utf8');

      const usesPrivateResponseWrapper = source.includes('withPrivateNoStore(')
        || source.includes('finishVoiceResponse(');
      expect(usesPrivateResponseWrapper, `${route} 必须使用私有响应 wrapper`)
        .toBe(true);
      expect(source, `${route} 不得裸 return NextResponse.json`)
        .not.toMatch(/\breturn\s+NextResponse\.json\b/);
    }
  });
});
