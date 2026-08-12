import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

const mockCreateRecordsBatch = vi.fn();
const mockCreateRecord = vi.fn();
vi.mock('@/stores/healthStore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/stores/healthStore')>();
  return {
    ...actual,
    useHealthStore: (selector: (state: Record<string, unknown>) => unknown) =>
      selector({ createRecord: mockCreateRecord, createRecordsBatch: mockCreateRecordsBatch }),
  };
});

vi.mock('@/stores/userStore', () => ({
  useUserStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({ user: { id: 'user-1', role: 'elder', name: '李奶奶' } }),
}));

const careRecipient = {
  recipient: { id: 'user-1', name: '李奶奶', permissions: { canEditHealth: true } },
  recipients: [], targetUserId: 'user-1', isSelf: true, isFamily: false,
  isLoading: false, selectRecipient: vi.fn(),
};
vi.mock('@/hooks/useCareRecipient', () => ({ useCareRecipient: () => careRecipient }));

vi.mock('@/hooks/useVoiceRecognition', () => ({
  useVoiceRecognition: () => ({
    phase: 'idle', error: null, startListening: vi.fn(), stopListening: vi.fn(),
    cancelListening: vi.fn(), resetTranscript: vi.fn(),
  }),
}));

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));

const { default: HealthInputPage } = await import('../page');

describe('Issue #5 健康草稿与离开保护', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateRecordsBatch.mockResolvedValue([]);
    careRecipient.targetUserId = 'user-1';
    careRecipient.recipient = { id: 'user-1', name: '李奶奶', permissions: { canEditHealth: true } };
  });

  it('切换记录类型后恢复各自的数值和备注草稿', () => {
    render(<HealthInputPage />);
    fireEvent.change(screen.getByLabelText('收缩压'), { target: { value: '135' } });
    fireEvent.change(screen.getByPlaceholderText(/添加备注信息/), { target: { value: '晨起' } });

    fireEvent.click(screen.getByRole('button', { name: '心率' }));
    fireEvent.change(screen.getByLabelText('心率值'), { target: { value: '72' } });
    fireEvent.click(screen.getByRole('button', { name: '血压' }));

    expect(screen.getByLabelText('收缩压')).toHaveValue(135);
    expect(screen.getByPlaceholderText(/添加备注信息/)).toHaveValue('晨起');
    fireEvent.click(screen.getByRole('button', { name: '心率' }));
    expect(screen.getByLabelText('心率值')).toHaveValue(72);
  });

  it('校验所有草稿后展示类型和时间摘要，并确认后只调用一次批量接口', async () => {
    render(<HealthInputPage />);
    fireEvent.change(screen.getByLabelText('收缩压'), { target: { value: '120' } });
    fireEvent.change(screen.getByLabelText('舒张压'), { target: { value: '80' } });
    fireEvent.click(screen.getByRole('button', { name: '心率' }));
    fireEvent.change(screen.getByLabelText('心率值'), { target: { value: '72' } });
    fireEvent.click(screen.getByRole('button', { name: /保存记录/ }));

    expect(screen.getByRole('dialog')).toHaveTextContent('确认保存健康记录');
    expect(screen.getByRole('dialog')).toHaveTextContent('血压');
    expect(screen.getByRole('dialog')).toHaveTextContent('心率');
    expect(mockCreateRecordsBatch).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '确认保存' }));
    });
    expect(mockCreateRecordsBatch).toHaveBeenCalledTimes(1);
    expect(mockCreateRecordsBatch.mock.calls[0][0].records).toHaveLength(2);
  });

  it('批量保存进行中重复点击确认只发起一次请求并禁用操作按钮', async () => {
    let resolveBatch: ((value: unknown) => void) | undefined;
    mockCreateRecordsBatch.mockImplementation(() => new Promise((resolve) => {
      resolveBatch = resolve;
    }));

    render(<HealthInputPage />);
    fireEvent.change(screen.getByLabelText('收缩压'), { target: { value: '120' } });
    fireEvent.change(screen.getByLabelText('舒张压'), { target: { value: '80' } });
    fireEvent.click(screen.getByRole('button', { name: /保存记录/ }));

    const confirmButton = screen.getByRole('button', { name: '确认保存' });
    fireEvent.click(confirmButton);
    await waitFor(() => expect(confirmButton).toBeDisabled());
    fireEvent.click(confirmButton);

    expect(mockCreateRecordsBatch).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolveBatch?.([]);
    });
  });

  it('任一草稿非法时定位到对应 Tab 且不发起批量写入', () => {
    render(<HealthInputPage />);
    fireEvent.change(screen.getByLabelText('收缩压'), { target: { value: '120' } });
    fireEvent.click(screen.getByRole('button', { name: '心率' }));
    fireEvent.change(screen.getByLabelText('心率值'), { target: { value: '72' } });
    fireEvent.click(screen.getByRole('button', { name: /保存记录/ }));

    expect(screen.getByLabelText('舒张压')).toBeInTheDocument();
    expect(screen.getByText('请输入有效的舒张压')).toBeInTheDocument();
    expect(mockCreateRecordsBatch).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('只有备注的 dirty 草稿也必须校验并阻止静默漏提交', () => {
    render(<HealthInputPage />);
    fireEvent.change(screen.getByPlaceholderText(/添加备注信息/), { target: { value: '仅备注' } });
    fireEvent.click(screen.getByRole('button', { name: /保存记录/ }));

    expect(screen.getByText('请输入有效的收缩压')).toBeInTheDocument();
    expect(screen.getByText('请输入有效的舒张压')).toBeInTheDocument();
    expect(mockCreateRecordsBatch).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('dirty cancel and browser back both require discard confirmation', async () => {
    render(<HealthInputPage />);
    fireEvent.change(screen.getByLabelText('收缩压'), { target: { value: '135' } });
    fireEvent.click(screen.getByText('取消'));
    expect(screen.getByRole('dialog')).toHaveTextContent('放弃未保存的健康草稿');
    fireEvent.click(screen.getByRole('button', { name: '继续编辑' }));
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.change(screen.getByLabelText('收缩压'), { target: { value: '136' } });
    act(() => window.dispatchEvent(new PopStateEvent('popstate')));
    expect(screen.getByRole('dialog')).toHaveTextContent('放弃未保存的健康草稿');
    fireEvent.click(screen.getByRole('button', { name: '放弃离开' }));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/health'));
  });

  it('dirty refresh registers a native beforeunload guard', () => {
    render(<HealthInputPage />);
    fireEvent.change(screen.getByLabelText('收缩压'), { target: { value: '135' } });
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });
});
