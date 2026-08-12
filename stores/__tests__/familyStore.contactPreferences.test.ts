import { beforeEach, describe, expect, it } from 'vitest';
import { useFamilyStore } from '../familyStore';

const baseBind = {
  id: 'bind-1',
  elder_id: 'elder-1',
  family_id: 'family-1',
  relation: '母亲',
  status: 'active',
};

describe('familyStore 联系人偏好 owner 隔离', () => {
  beforeEach(() => useFamilyStore.getState().reset());

  it('只更新当前 owner 的目标 peer 缓存', () => {
    useFamilyStore.setState({
      ownerUserId: 'family-1',
      rawBinds: [baseBind],
      binds: [{ bind: baseBind, user: { id: 'elder-1', name: '王奶奶' } }],
    });

    useFamilyStore.getState().updateContactPreference(
      'family-1',
      'elder-1',
      { alias: '妈妈', is_pinned: true },
    );

    expect(useFamilyStore.getState().binds[0].bind.contact_preference)
      .toEqual({ alias: '妈妈', is_pinned: true });
    expect(useFamilyStore.getState().rawBinds[0].contact_preference)
      .toEqual({ alias: '妈妈', is_pinned: true });
  });

  it('账号切换后忽略旧 owner 请求的迟到成功', () => {
    useFamilyStore.setState({
      ownerUserId: 'other-owner',
      rawBinds: [baseBind],
      binds: [{ bind: baseBind, user: { id: 'elder-1', name: '王奶奶' } }],
    });

    useFamilyStore.getState().updateContactPreference(
      'family-1',
      'elder-1',
      { alias: '不应写入', is_pinned: true },
    );

    expect(useFamilyStore.getState().binds[0].bind.contact_preference).toBeUndefined();
    expect(useFamilyStore.getState().rawBinds[0].contact_preference).toBeUndefined();
  });
});
