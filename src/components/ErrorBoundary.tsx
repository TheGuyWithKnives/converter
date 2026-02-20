import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    this.setState({
      errorInfo,
    });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-brand-dark flex items-center justify-center p-4">
          <div className="bg-brand-panel rounded-2xl shadow-elevated border border-brand-border p-8 max-w-2xl w-full">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-brand-accent rounded-full flex items-center justify-center shadow-glow">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-brand-light">Neco se pokazilo</h1>
                <p className="text-brand-muted">Aplikace narazila na neocekavanou chybu</p>
              </div>
            </div>

            <div className="bg-brand-dark rounded-xl p-4 mb-6 border border-brand-border">
              <p className="text-sm font-mono text-brand-accent mb-2">
                {this.state.error?.name}: {this.state.error?.message}
              </p>
              {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                <details className="mt-4">
                  <summary className="text-sm text-brand-muted cursor-pointer hover:text-brand-light">
                    Zobrazit detaily (pouze v dev modu)
                  </summary>
                  <pre className="mt-2 text-xs text-brand-muted-soft overflow-auto max-h-64">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 bg-brand-accent hover:opacity-90 text-brand-dark font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2 shadow-glow"
              >
                <RefreshCw className="w-4 h-4" />
                Zkusit znovu
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-brand-surface hover:bg-brand-border text-brand-light font-bold py-3 px-6 rounded-xl transition-all border border-brand-border"
              >
                Obnovit stranku
              </button>
            </div>

            <p className="text-xs text-brand-muted-soft mt-6 text-center">
              Pokud problem pretrvava, zkuste obnovit stranku nebo pouzit jiny prohlizec
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
