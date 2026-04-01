import React, { ErrorInfo, ReactNode } from 'react';
import { logger } from '../services/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<any, any> {
  state: any;
  props: any;

  constructor(props: any) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public async componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    
    // Send error to monitoring service
    await logger.error('Uncaught error in ErrorBoundary', error, {
      componentStack: errorInfo.componentStack,
    });
  }

  public render() {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      if (fallback) {
        return fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-primary p-6 text-center">
          <div className="max-w-md w-full glass-card p-8 rounded-2xl border border-rose-500/20">
            <span className="material-symbols-outlined text-rose-500 text-6xl mb-4">error</span>
            <h2 className="font-headline text-2xl italic mb-4">Oops! Algo deu errado.</h2>
            <p className="text-surface/60 mb-6 text-sm">
              Ocorreu um erro inesperado. Por favor, tente recarregar a página ou entre em contato com o suporte se o problema persistir.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 rounded-xl bg-secondary text-primary font-bold uppercase tracking-widest text-xs hover:bg-secondary/90 transition-colors"
            >
              Recarregar Página
            </button>
            {import.meta.env.MODE === 'development' && (
              <pre className="mt-6 p-4 bg-black/40 rounded-lg text-left text-[10px] text-rose-300 overflow-auto max-h-40 font-mono">
                {error?.toString()}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;
