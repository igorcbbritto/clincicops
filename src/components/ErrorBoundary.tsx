import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State;
  props: Props;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    const { hasError, error } = this.state;
    const { children } = this.props;

    if (hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center space-y-6 border border-gray-100">
            <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 mx-auto border border-rose-100">
              <AlertTriangle size={40} />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">Ops! Algo deu errado.</h1>
              <p className="text-gray-500 text-sm font-medium">
                Ocorreu um erro inesperado na aplicação. Nossa equipe técnica já foi notificada.
              </p>
            </div>
            {error && (
              <div className="p-4 bg-gray-50 rounded-2xl text-left overflow-hidden">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Detalhes do Erro</p>
                <p className="text-xs font-mono text-rose-600 break-words">{error.message}</p>
              </div>
            )}
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-sm tracking-wide shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw size={18} />
              RECARREGAR PÁGINA
            </button>
          </div>
        </div>
      );
    }

    return children;
  }
}
