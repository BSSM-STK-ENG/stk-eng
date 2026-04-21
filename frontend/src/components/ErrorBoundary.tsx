import React from 'react';

interface State {
  hasError: boolean;
  error?: Error | null;
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
    this.reset = this.reset.bind(this);
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(_error: Error, _info: React.ErrorInfo) {
    // Optional: send to monitoring service
    // console.error('Uncaught error:', _error, _info);
  }

  reset() {
    this.setState({ hasError: false, error: null });
    // optionally reload the page to ensure a clean state
    // window.location.reload();
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-xl w-full bg-white rounded shadow p-6 text-center">
            <h2 className="text-lg font-semibold mb-2">오류가 발생했습니다.</h2>
            <p className="text-sm text-slate-600 mb-4">예상치 못한 문제가 발생했습니다. 새로고침하거나 관리자에게 문의하세요.</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={this.reset}
                className="px-3 py-1 rounded bg-slate-100 hover:bg-slate-200"
              >
                닫기
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                새로고침
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children as React.ReactElement;
  }
}

export default ErrorBoundary;
