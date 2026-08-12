import { describe, expect, it } from 'vitest';
import { contactDisplayName, sortContacts } from '../contactPreferences';

describe('联系人展示与稳定排序', () => {
  it('备注、资料姓名和通用占位逐级回退，关系字段不冒充姓名', () => {
    expect(contactDisplayName(' 妈妈 ', '王女士', '家人')).toBe('妈妈');
    expect(contactDisplayName(null, ' 王女士 ', '家人')).toBe('王女士');
    expect(contactDisplayName(null, ' ', '家人')).toBe('家人');
    expect(contactDisplayName(null, '', '聊天')).toBe('聊天');
  });

  it('按置顶、有效最近时间、中文名、userId 完全稳定排序', () => {
    const contacts = [
      { userId: '4', name: '赵', isPinned: false },
      { userId: '2', name: '安', isPinned: true, lastMessage: { created_at: 'bad' } },
      { userId: '3', name: '李', isPinned: false, lastMessage: { created_at: '2026-01-02T00:00:00Z' } },
      { userId: '1', name: '安', isPinned: true, lastMessage: { created_at: 'bad' } },
    ];
    expect([...contacts].sort(sortContacts).map((item) => item.userId)).toEqual(['1', '2', '3', '4']);
  });

  it('有有效消息时间的联系人始终排在无消息联系人前，不退回姓名顺序', () => {
    const contacts = [
      { userId: 'no-message', name: '阿姨', isPinned: false },
      {
        userId: 'has-message',
        name: '周叔叔',
        isPinned: false,
        lastMessage: { created_at: '2026-08-13T01:00:00Z' },
      },
    ];

    expect([...contacts].sort(sortContacts).map((item) => item.userId))
      .toEqual(['has-message', 'no-message']);
  });
});
