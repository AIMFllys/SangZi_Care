/**
 * 消息相关工具函数
 * 从 messages/page.tsx 提取的纯逻辑函数
 */

/** 关系类型对应 emoji */
export function getRelationEmoji(relation: string): string {
    const map: Record<string, string> = {
        '子女': '👧',
        '配偶': '💑',
        '父母': '👨‍👩‍👧',
        '兄弟姐妹': '👫',
        '孙辈': '👶',
        '朋友': '🤝',
        '护工': '👩‍⚕️',
        '邻居': '🏘️',
    };
    return map[relation] || '👤';
}

/** 格式化消息时间为友好文案 */
export function formatMessageTime(dateStr: string): string {
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
): string {
    if (type === 'voice') return '🎤 语音消息';
    if (type === 'image') return '🖼️ 图片';
    return content.length > 20 ? content.slice(0, 20) + '...' : content;
}
