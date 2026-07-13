// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { resolveMessagePeer } from '../_lib';

function createBindingClient(data: Array<{ id: string }>) {
  const limit = vi.fn().mockResolvedValue({ data, error: null });
  const or = vi.fn(() => ({ limit }));
  const eq = vi.fn(() => ({ or }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  return { client: { from }, from, select, eq, or, limit };
}

describe('resolveMessagePeer', () => {
  it('拒绝把当前用户自己当作消息接收人', async () => {
    const client = { from: vi.fn() };

    await expect(resolveMessagePeer(client as never, 'user-1', 'user-1'))
      .rejects.toMatchObject({ status: 400 });
    expect(client.from).not.toHaveBeenCalled();
  });

  it('对合法对方仍只允许 active 家庭绑定', async () => {
    const active = createBindingClient([{ id: 'bind-1' }]);
    await expect(resolveMessagePeer(active.client as never, 'user-1', 'user-2'))
      .resolves.toBeUndefined();
    expect(active.from).toHaveBeenCalledWith('oc_elder_family_binds');
    expect(active.eq).toHaveBeenCalledWith('status', 'active');
    expect(active.or).toHaveBeenCalledWith(
      'and(family_id.eq.user-1,elder_id.eq.user-2),and(family_id.eq.user-2,elder_id.eq.user-1)',
    );

    const inactive = createBindingClient([]);
    await expect(resolveMessagePeer(inactive.client as never, 'user-1', 'user-2'))
      .rejects.toMatchObject({ status: 403 });
  });
});
