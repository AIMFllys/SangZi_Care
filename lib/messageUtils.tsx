import React, { ReactNode } from 'react';
import { User, Users, Heart, UserRound, UsersRound, Handshake, Stethoscope, Home, Mic, Image as ImageIcon } from 'lucide-react';

/**
 * 消息相关工具函数
 * 从 messages/page.tsx 提取的纯逻辑函数
 */

/** 关系类型对应 icon */
export function getRelationIcon(relation: string): ReactNode {
    const map: Record<string, ReactNode> = {
        '家属': <Users size={28} />,
        '配偶': <Heart size={28} />,
        '父母': <Users size={28} />,
        '父亲': <Users size={28} />,
        '母亲': <Users size={28} />,
        '爷爷': <UserRound size={28} />,
        '奶奶': <UserRound size={28} />,
        '外公': <UserRound size={28} />,
        '外婆': <UserRound size={28} />,
        '其他长辈': <UserRound size={28} />,
        '兄弟姐妹': <UsersRound size={28} />,
        '朋友': <Handshake size={28} />,
        '护工': <Stethoscope size={28} />,
        '邻居': <Home size={28} />,
    };
    return map[relation] || <User size={28} />;
}

/** 格式化消息时间为友好文案 */
export function formatMessageTime(dateStr: string): string {
    if (!dateStr) return '';
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return '刚刚';
    if (diffMin < 60) return `${diffMin}分钟前`;

    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}小时前`;

    const diffDay = Math.floor(diffHour / 24);
    if (diffDay === 1) return '昨天';
    if (diffDay < 7) return `${diffDay}天前`;

    return `${date.getMonth() + 1}月${date.getDate()}日`;
}

/** 消息内容预览（截断 + 类型标识） */
export function getMessagePreview(
    type: 'text' | 'voice' | 'image',
    content: string
): ReactNode {
    if (type === 'voice') return <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Mic size={16} /> 语音消息</div>;
    if (type === 'image') return <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><ImageIcon size={16} /> 图片</div>;
    return content.length > 20 ? content.slice(0, 20) + '...' : content;
}
