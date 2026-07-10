'use client';

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * 全局错误边界 — 捕获 React 渲染错误，防止整个应用白屏
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            padding: '32px',
            textAlign: 'center',
            fontFamily: 'inherit',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>😔</div>
          <h2
            style={{
              fontSize: 'var(--font-heading, 22px)',
              fontWeight: 700,
              color: 'var(--text-primary, #2d2016)',
              marginBottom: '8px',
            }}
          >
            页面出了点问题
          </h2>
          <p
            style={{
              fontSize: 'var(--font-body, 18px)',
              color: 'var(--text-secondary, #8b7355)',
              marginBottom: '24px',
            }}
          >
            请尝试刷新页面
          </p>
          <button
            onClick={this.handleRetry}
            style={{
              padding: '12px 32px',
              fontSize: 'var(--font-body, 18px)',
              fontWeight: 600,
              color: '#fff',
              background: 'var(--accent, #f5923e)',
              border: 'none',
              borderRadius: 'var(--radius-md, 20px)',
              cursor: 'pointer',
            }}
          >
            重试
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
