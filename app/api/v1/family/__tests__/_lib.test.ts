import { describe, expect, it } from 'vitest';
import {
  assertBindParticipant,
  assertCanManagePermissions,
  assertExpectedRole,
  toBindResponse,
  type FamilyBindRow,
} from '../_lib';

const bind = {
  id: 'bind-1',
  elder_id: 'elder-1',
  family_id: 'family-1',
  relation: '父亲',
  status: 'active',
  bind_code: null,
  can_view_health: true,
  can_edit_health: true,
  can_edit_medication: true,
  can_receive_emergency: true,
  bound_at: null,
  created_at: null,
  expires_at: null,
} satisfies FamilyBindRow;

describe('family domain authorization helpers', () => {
  it('只允许绑定参与方操作', () => {
    expect(() => assertBindParticipant(bind, 'stranger')).toThrow('无权操作该绑定关系');
    expect(() => assertBindParticipant(bind, 'family-1')).not.toThrow();
  });

  it('只有长辈能调整监护权限', () => {
    expect(() => assertCanManagePermissions(bind, 'family-1')).toThrow(
      '只有长辈本人可以调整监护权限',
    );
    expect(() => assertCanManagePermissions(bind, 'elder-1')).not.toThrow();
  });

  it('校验数据库权威角色', () => {
    expect(() => assertExpectedRole('family', 'elder')).toThrow('仅长辈账号可执行此操作');
    expect(() => assertExpectedRole('elder', 'family')).toThrow('仅家属账号可执行此操作');
  });

  it('响应携带真实联系人资料与新增权限', () => {
    const response = toBindResponse(bind, {
      id: 'family-1',
      name: '小明',
      phone: null,
      avatar_url: null,
      last_active_at: null,
      role: 'family',
    });
    expect(response.peer?.name).toBe('小明');
    expect(response.can_edit_health).toBe(true);
  });
});
