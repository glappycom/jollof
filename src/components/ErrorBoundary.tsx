import { Component, type ErrorInfo, type ReactNode } from "react";

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

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-cursor-editor p-6">
          <h1 className="text-lg font-semibold text-red-400">Something went wrong</h1>
          <pre className="max-w-2xl overflow-auto rounded bg-cursor-sidebar p-4 text-left text-sm text-cursor-text">
            {this.state.error.message}
          </pre>
          <button
            type="button"
            className="rounded bg-cursor-accent px-4 py-2 text-sm text-black hover:opacity-90"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
