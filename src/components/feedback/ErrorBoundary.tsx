import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error inside ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/dashboard';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--background))] px-6">
          <div className="text-center max-w-md animate-scale-in">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-500/10">
              <AlertTriangle className="h-10 w-10 text-amber-500" />
            </div>
            <h1 className="text-3xl font-bold text-[hsl(var(--foreground))]">Something went wrong</h1>
            <p className="mt-3 text-[hsl(var(--muted-foreground))] leading-relaxed">
              An unexpected error occurred in the application. Details of the error have been logged.
            </p>
            {this.state.error?.message && (
              <div className="mt-4 p-3 bg-[hsl(var(--muted))] rounded-xl text-left border border-[hsl(var(--border))] max-h-[150px] overflow-y-auto">
                <code className="text-xs text-[hsl(var(--muted-foreground))] block break-words">
                  {this.state.error.message}
                </code>
              </div>
            )}
            <div className="mt-8 flex items-center justify-center gap-3">
              <Button
                variant="outline"
                onClick={this.handleReset}
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Reload App
              </Button>
              <Button
                onClick={this.handleGoHome}
                className="flex items-center gap-2"
              >
                <Home className="h-4 w-4" />
                Go Dashboard
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
export default ErrorBoundary;
