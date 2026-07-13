import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

if (!process.env.MIMO_API_KEY?.trim()) {
  console.error('MiMo 实时测试需要在 .env.local 配置 MIMO_API_KEY。');
  process.exit(1);
}

const executable = resolve('node_modules/vitest/vitest.mjs');
const result = spawnSync(
  process.execPath,
  [executable, 'run', 'lib/server/__tests__/mimo.live.test.ts'],
  {
    env: { ...process.env, RUN_MIMO_LIVE: '1' },
    stdio: 'inherit',
  },
);

if (result.error) {
  console.error('无法启动 MiMo 实时测试。');
  process.exit(1);
}

process.exit(result.status ?? 1);
