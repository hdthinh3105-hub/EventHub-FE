import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="page">
          <div className="container" style={{ textAlign: 'center', padding: 60 }}>
            <h1 style={{ fontSize: 48, marginBottom: 12 }}>!</h1>
            <h2>Đã có lỗi xảy ra</h2>
            <p style={{ color: 'var(--color-text-soft)', marginBottom: 20 }}>
              Vui lòng thử lại hoặc quay về trang chủ.
            </p>
            <button
              className="btn btn-primary"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = '/';
              }}
            >
              Về trang chủ
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
