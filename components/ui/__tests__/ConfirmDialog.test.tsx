import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from '../ConfirmDialog';

describe('ConfirmDialog', () => {
  it('挂到 document.body，确认栏不被页面底栏挡住', () => {
    const onCancel = vi.fn();
    render(
      <div id="page-root">
        <ConfirmDialog
          open
          title="退出登录"
          description="确定要退出登录吗？"
          confirmLabel="退出登录"
          cancelLabel="取消"
          onConfirm={vi.fn()}
          onCancel={onCancel}
        />
      </div>,
    );

    const dialog = screen.getByRole('dialog', { name: '退出登录' });
    expect(dialog.parentElement).toBe(document.body);
    expect(dialog.className).toContain('overlay');
    fireEvent.click(screen.getByRole('button', { name: '取消' }));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
