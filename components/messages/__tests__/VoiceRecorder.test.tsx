import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// ---------- Mock useVoiceRecognition ----------

const mockStartListening = vi.fn();
const mockStopListening = vi.fn();
const mockResetTranscript = vi.fn();
let mockIsListening = false;
let mockTranscript = '';

vi.mock('@/hooks/useVoiceRecognition', () => ({
  useVoiceRecognition: () => ({
    isListening: mockIsListening,
    transcript: mockTranscript,
    error: null,
    currentLevel: 'web' as const,
    startListening: mockStartListening,
    stopListening: mockStopListening,
    resetTranscript: mockResetTranscript,
  }),
}));

import VoiceRecorder from '../VoiceRecorder';

describe('VoiceRecorder 组件', () => {
  const mockOnSend = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsListening = false;
    mockTranscript = '';
  });

  it('空闲时只渲染紧凑的按住说话按钮', () => {
    render(<VoiceRecorder onSend={mockOnSend} onCancel={mockOnCancel} />);
    expect(screen.getByRole('button', { name: '按住说话' })).toBeDefined();
    expect(screen.queryByText('发送')).toBeNull();
    expect(screen.queryByText('取消')).toBeNull();
  });

  it('点击麦克风按钮调用 startListening', () => {
    render(<VoiceRecorder onSend={mockOnSend} onCancel={mockOnCancel} />);
    fireEvent.click(screen.getByTestId('mic-button'));
    expect(mockStartListening).toHaveBeenCalledTimes(1);
  });

  it('录音中点击麦克风按钮调用 stopListening', () => {
    mockIsListening = true;
    render(<VoiceRecorder onSend={mockOnSend} onCancel={mockOnCancel} />);
    fireEvent.click(screen.getByTestId('mic-button'));
    expect(mockStopListening).toHaveBeenCalledTimes(1);
  });

  it('无转写文本时不显示确认操作', () => {
    mockTranscript = '';
    render(<VoiceRecorder onSend={mockOnSend} onCancel={mockOnCancel} />);
    expect(screen.queryByText('发送')).toBeNull();
  });

  it('有转写文本时发送按钮可用', () => {
    mockTranscript = '你好';
    render(<VoiceRecorder onSend={mockOnSend} onCancel={mockOnCancel} />);
    const sendBtn = screen.getByText('发送');
    expect(sendBtn.hasAttribute('disabled')).toBe(false);
  });

  it('点击发送调用 onSend', () => {
    mockTranscript = '你好啊';
    render(<VoiceRecorder onSend={mockOnSend} onCancel={mockOnCancel} />);
    fireEvent.click(screen.getByText('发送'));
    expect(mockOnSend).toHaveBeenCalledWith(
      expect.objectContaining({ content: '你好啊' }),
    );
  });

  it('点击取消调用 onCancel', () => {
    mockTranscript = '不发送这段话';
    render(<VoiceRecorder onSend={mockOnSend} onCancel={mockOnCancel} />);
    fireEvent.click(screen.getByText('取消'));
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('显示实时转写文本', () => {
    mockTranscript = '正在说话';
    render(<VoiceRecorder onSend={mockOnSend} onCancel={mockOnCancel} />);
    expect(screen.getByText('正在说话')).toBeDefined();
  });
});
