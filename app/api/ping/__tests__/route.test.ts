// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GET } from '../route';

const originalRevision = process.env.APP_GIT_REVISION;
const revision = 'a'.repeat(40);

describe('GET /api/ping', () => {
  beforeEach(() => {
    process.env.APP_GIT_REVISION = revision;
  });

  afterEach(() => {
    if (originalRevision === undefined) delete process.env.APP_GIT_REVISION;
    else process.env.APP_GIT_REVISION = originalRevision;
  });

  it('返回当前部署 revision 且禁止缓存', async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      service: 'sangzi-smart-care',
      version: '1.2.0',
      revision,
    });
  });
});
