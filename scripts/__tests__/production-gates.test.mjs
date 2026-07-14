// @vitest-environment node
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

async function loadOptional(relativePath) {
  const absolutePath = resolve(root, relativePath);
  if (!existsSync(absolutePath)) return null;
  return import(pathToFileURL(absolutePath).href);
}

describe('生产构建门禁', () => {
  it('Node 门禁接受 22.13+ 并拒绝与构建依赖不兼容的运行时', async () => {
    const gate = await loadOptional('scripts/check-node-version.mjs');
    expect(gate).not.toBeNull();
    if (!gate) return;

    expect(gate.supportsNodeVersion('22.13.0')).toBe(true);
    expect(gate.supportsNodeVersion('24.0.0')).toBe(true);
    expect(gate.supportsNodeVersion('22.12.9')).toBe(false);
    expect(gate.supportsNodeVersion('20.19.0')).toBe(false);
    expect(gate.supportsNodeVersion('not-a-version')).toBe(false);
  });

  it('构建产物上限覆盖服务端与 public，并排除不会部署的缓存和开发产物', async () => {
    const budget = await loadOptional('scripts/check-build-budget.mjs');
    expect(budget?.collectDeploymentAssets).toBeTypeOf('function');
    if (!budget?.collectDeploymentAssets) return;

    const fixtureRoot = mkdtempSync(resolve(tmpdir(), 'sangzicare-budget-'));
    try {
      const nextDirectory = resolve(fixtureRoot, '.next');
      const publicDirectory = resolve(fixtureRoot, 'public');
      for (const directory of [
        resolve(nextDirectory, 'static'),
        resolve(nextDirectory, 'server'),
        resolve(nextDirectory, 'cache'),
        resolve(nextDirectory, 'dev'),
        publicDirectory,
      ]) {
        mkdirSync(directory, { recursive: true });
      }

      writeFileSync(resolve(nextDirectory, 'static', 'app.js'), 'static');
      writeFileSync(resolve(nextDirectory, 'server', 'route.js'), 'server');
      writeFileSync(resolve(nextDirectory, 'cache', 'webpack.bin'), 'cache');
      writeFileSync(resolve(nextDirectory, 'dev', 'trace.bin'), 'dev');
      writeFileSync(resolve(publicDirectory, 'logo.png'), 'public');

      const paths = budget.collectDeploymentAssets({
        nextDirectory,
        publicDirectory,
      }).map((asset) => asset.path);

      expect(paths).toContain('.next/static/app.js');
      expect(paths).toContain('.next/server/route.js');
      expect(paths).toContain('public/logo.png');
      expect(paths).not.toContain('.next/cache/webpack.bin');
      expect(paths).not.toContain('.next/dev/trace.bin');
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  it('静态资源预算同时约束 CSS、JS 与 EdgeOne 单文件上限', async () => {
    const budget = await loadOptional('scripts/check-build-budget.mjs');
    expect(budget).not.toBeNull();
    if (!budget) return;

    expect(budget.evaluateAssetBudget([
      { path: 'a.css', bytes: 80 * 1024 },
      { path: 'b.css', bytes: 40 * 1024 },
      { path: 'a.js', bytes: 220 * 1024 },
      { path: 'b.js', bytes: 230 * 1024 },
    ])).toEqual([]);
    expect(budget.evaluateAssetBudget([
      { path: 'oversize.css', bytes: 101 * 1024 },
      { path: 'extra.css', bytes: 100 * 1024 },
      { path: 'oversize.js', bytes: 251 * 1024 },
      { path: 'huge.bin', bytes: 25 * 1024 * 1024 + 1 },
    ])).toEqual(expect.arrayContaining([
      expect.stringContaining('CSS 单文件'),
      expect.stringContaining('CSS 总量'),
      expect.stringContaining('JS 单文件'),
      expect.stringContaining('EdgeOne 单文件'),
    ]));
  });

  it('npm build 自动执行 Node 与资源预算，并把本地生产端口固定为 7742', () => {
    const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));

    expect(pkg.engines?.node).toBe('>=22.13.0');
    expect(pkg.scripts?.prebuild).toBe('node scripts/check-node-version.mjs');
    expect(pkg.scripts?.postbuild).toBe('node scripts/check-build-budget.mjs');
    expect(pkg.scripts?.start).toBe('next start -p 7742');
    expect(pkg.devDependencies?.postcss).toBe('^8.5.19');
    expect(pkg.devDependencies?.vitest).toBe('^4.1.10');
    expect(pkg.overrides).toMatchObject({
      ws: '8.21.0',
      postcss: '$postcss',
      undici: '7.28.0',
      vite: '7.3.6',
    });
  });

  it('lockfile 实际解析到安全的 PostCSS 与 ws，而不是仅声明无效 override', () => {
    const lock = JSON.parse(readFileSync(resolve(root, 'package-lock.json'), 'utf8'));
    const packages = Object.entries(lock.packages ?? {});
    const postcssVersions = packages
      .filter(([path]) => /(^|node_modules\/)postcss$/.test(path))
      .map(([, metadata]) => metadata.version);
    const wsVersions = packages
      .filter(([path]) => /(^|node_modules\/)ws$/.test(path))
      .map(([, metadata]) => metadata.version);

    expect(new Set(postcssVersions)).toEqual(new Set(['8.5.19']));
    expect(new Set(wsVersions)).toEqual(new Set(['8.21.0']));
  });

  it('EdgeOne 使用可复现安装命令并固定兼容依赖的 Node 版本', () => {
    const edgeone = JSON.parse(readFileSync(resolve(root, 'edgeone.json'), 'utf8'));

    expect(edgeone.installCommand).toBe('npm ci');
    expect(edgeone.nodeVersion).toBe('22.17.1');
    expect(edgeone.outputDirectory).toBe('.next');
  });

  it('环境模板只列当前全栈服务，并让生产必需键可直接导入', () => {
    const template = readFileSync(resolve(root, '.env.example'), 'utf8');
    const agents = readFileSync(resolve(root, 'AGENTS.md'), 'utf8');

    for (const key of [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
      'SUPABASE_SECRET_KEY',
      'SUPABASE_VOICE_BUCKET',
      'JWT_SECRET',
      'SMTP_USER',
      'SMTP_PASS',
      'MIMO_API_KEY',
      'VOLCANO_ARK_API_KEY',
      'VOLCANO_ARK_MODEL_ENDPOINT',
    ]) {
      expect(template).toMatch(new RegExp(`^${key}=$`, 'm'));
    }

    expect(template).not.toContain('localhost:8000');
    expect(template).not.toContain('VOLCANO_APP_ID');
    expect(template).not.toContain('VOLCANO_ACCESS_TOKEN');
    expect(agents).toContain('旧 `lib/jsbridge.ts` 已移除');
    expect(agents).not.toContain('SangZiBridge` 命名不一致');
  });

  it('ESLint 不扫描 Android 与测试工具生成的 JavaScript 报告', () => {
    const config = readFileSync(resolve(root, 'eslint.config.js'), 'utf8');

    expect(config).toContain("'android/**/build/**'");
    expect(config).toContain("'coverage/**'");
  });

  it('Turbopack 锁定当前工作区，且没有重新启用静态导出', async () => {
    const { default: nextConfig } = await import('../../next.config.ts');

    expect(nextConfig.turbopack).toEqual({ root });
    expect(nextConfig).not.toHaveProperty('output');
  });

  it('首页按角色动态加载视图，避免两套看板同时进入首屏代码', () => {
    const source = readFileSync(resolve(root, 'app/page.tsx'), 'utf8');

    expect(source).toContain("dynamic(() => import('@/components/home/ElderHomeView'))");
    expect(source).toContain("dynamic(() => import('@/components/home/FamilyHomeView'))");
    expect(source).not.toMatch(/import ElderHomeView from/);
    expect(source).not.toMatch(/import FamilyHomeView from/);
  });

  it('全栈动态详情路由不再生成静态 placeholder 参数', () => {
    for (const page of [
      'app/messages/[id]/page.tsx',
      'app/family/[id]/page.tsx',
    ]) {
      const source = readFileSync(resolve(root, page), 'utf8');
      expect(source).not.toContain('generateStaticParams');
      expect(source).not.toContain("id: 'placeholder'");
    }
  });
});
