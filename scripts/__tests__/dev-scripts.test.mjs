import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '..', '..');
const readScript = (name) =>
  readFileSync(resolve(root, 'scripts', 'dev', name), 'utf8');

describe('Windows 本地开发脚本', () => {
  const scripts = [
    'check-status.bat',
    'dev.bat',
    'start-dev.bat',
    'stop-dev.bat',
    'test-all.bat',
    'test-api.bat',
  ];

  it('只使用 Next.js 7742 端口，不再引用已删除的 Python 后端', () => {
    for (const name of scripts) {
      const content = readScript(name);
      expect(content).not.toContain(':3000');
      expect(content).not.toContain(':8000');
      expect(content.toLowerCase()).not.toContain('backend');
    }
  });

  it('从脚本位置稳定定位仓库根目录', () => {
    for (const name of ['dev.bat', 'start-dev.bat', 'test-all.bat']) {
      const content = readScript(name);
      expect(content).toContain('set "REPO_ROOT=%~dp0..\\.."');
      expect(content).toContain('cd /d "%REPO_ROOT%"');
    }
  });

  it('状态与 API 探针检查同源 Next 服务', () => {
    for (const name of ['check-status.bat', 'test-api.bat']) {
      const content = readScript(name);
      expect(content).toContain(':7742');
      expect(content).toContain('http://localhost:7742/api/ping');
    }
  });

  it('一键测试覆盖项目交付门禁', () => {
    const content = readScript('test-all.bat');
    for (const command of [
      'npm test',
      'npm run lint',
      'npm run tsc',
      'npm run build',
    ]) {
      expect(content).toContain(command);
    }
  });

  it('环境检查只验证当前 Next.js 单进程工具链', () => {
    const content = readFileSync(
      resolve(root, 'scripts', 'setup', 'test-env.bat'),
      'utf8',
    );

    expect(content).toContain('set "REPO_ROOT=%~dp0..\\.."');
    expect(content).toContain('.env.local');
    expect(content).toContain('scripts\\check-node-version.mjs');
    expect(content.toLowerCase()).not.toContain('python');
    expect(content).not.toContain('if exist ".env"');
  });
});
