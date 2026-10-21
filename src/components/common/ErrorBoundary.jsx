import React, { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary capturó un error:', error, errorInfo);
  }

  componentDidUpdate(prevProps) {
    // Si cambia la vista (resetKey), restablecer el estado de error
    if (this.props.resetKey !== undefined && prevProps.resetKey !== this.props.resetKey) {
      if (this.state.hasError) {
        this.setState({ hasError: false, error: null });
      }
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 flex items-center justify-center">
          <div className="bg-white p-8 rounded-2xl shadow-sm max-w-lg w-full text-center border border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3.5 border border-rose-100">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-slate-800 mb-1">
              Problema al cargar la sección
            </h2>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed font-mono bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-left overflow-x-auto">
              {this.state.error?.message || 'Error inesperado de ejecución'}
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reintentar</span>
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Recargar Página
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
