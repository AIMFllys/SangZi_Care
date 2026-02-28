import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatBubble, { formatTime, formatDuration } from '../ChatBubble';
import type { MessageResponse } from '@/stores/messageStore';

// ---------- 工具函数测试 ----------

describe('formatTime', () => {
  it('格式化时间为 HH:MM', () => {
    const result = formatTime('2024-06-15T09:05:00Z');
    // 本地时间可能不同，只验证格式
    expect(result).toMatch(/\d{2}:\d{2}/);
  });

  it('空字符串返回空', () => {
    expect(formatTime('')).toBe('');
  });
});

describe('formatDuration', () => {
  it('格式化秒数', () => {
    expect(formatDuration(5)).toBe('5″');
    expect(formatDuration(12.7)).toBe('13″');
  });

  it('null 返回 0″', () => {
    expect(formatDuration(null)).toBe('0″');
  });

  it('0 返回 0″', () => {
    expect(formatDuration(0)).toBe('0″');
  });
});

// ---------- 组件测试 ----------

function createMessage(overrides: Partial<MessageResponse> = {}): MessageResponse {
  return {
    id: 'msg-1',
    sender_id: 'user-a',
    receiver_id: 'user-b',
    type: 'text',
    content: '你好',
    audio_url: null,
    audio_duration: null,
    is_ai_generated: null,
    is_read: false,
    read_at: null,
    created_at: '2024-06-15T10:00:00Z',
    ...overrides,
  };
}

describe('ChatBubble 组件', () => {
  it('渲染文字消息内容', () => {
    render(<ChatBubble message={createMessage()} isMine={false} />);
    expect(screen.getByText('你好')).toBeDefined();
  });

  it('发送的消息（isMine=true）有正确的样式类', () => {
    const { container } = render(
      <ChatBubble message={createMessage()} isMine={true} />,
    );
    const wrapper = container.querySelector('[data-testid="chat-bubble"]');
    expect(wrapper?.className).toContain('wrapperMine');
  });

  it('接收的消息（isMine=false）有正确的样式类', () => {
    const { container } = render(
      <ChatBubble message={createMessage()} isMine={false} />,
    );
    const wrapper = container.querySelector('[data-testid="chat-bubble"]');
    expect(wrapper?.className).toContain('wrapperOther');
  });

  it('语音消息显示播放按钮和时长', () => {
    const voiceMsg = createMessage({
      type: 'voice',
      content: '语音转写文本',
      audio_url: 'https://example.com/audio.mp3',
      audio_duration: 5,
    });

    render(<ChatBubble message={voiceMsg} isMine={false} />);
    expect(screen.getByText('5″')).toBeDefined();
    expect(screen.getByText('▶')).toBeDefined();
  });

  it('语音消息点击触发 onPlayVoice', () => {
    const onPlayVoice = vi.fn();
    const voiceMsg = createMessage({
      type: 'voice',
      audio_url: 'https://example.com/audio.mp3',
      audio_duration: 3,
    });

    render(
      <ChatBubble message={voiceMsg} isMine={false} onPlayVoice={onPlayVoice} />,
    );

    const playBtn = screen.getByLabelText(/播放语音消息/);
    fireEvent.click(playBtn);
    expect(onPlayVoice).toHaveBeenCalledTimes(1);
  });

  it('AI 生成消息显示 AI 标记', () => {
    const aiMsg = createMessage({ is_ai_generated: true });
    render(<ChatBubble message={aiMsg} isMine={false} />);
    expect(screen.getByText('AI')).toBeDefined();
  });

  it('非 AI 消息不显示 AI 标记', () => {
    render(<ChatBubble message={createMessage()} isMine={false} />);
    expect(screen.queryByText('AI')).toBeNull();
  });

  it('显示时间戳', () => {
    render(<ChatBubble message={createMessage()} isMine={false} />);
    // 时间戳应该存在（格式取决于本地时区）
    const bubble = screen.getByTestId('chat-bubble');
    expect(bubble.textContent).toContain(':');
  });
});
