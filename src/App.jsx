import React, { Component, useState } from 'react';
import Login from './components/Login';
import Layout from './components/_layaout';
import { Toaster, sileo } from 'sileo';
import 'sileo/styles.css';

class ErrorBoundary extends Component {
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

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-100 text-slate-800 font-sans">
          <div className="bg-white p-6 rounded-2xl shadow-xl max-w-md text-center border border-slate-200">
            <h2 className="text-base font-bold text-red-600 mb-2">Aviso del Sistema</h2>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              {this.state.error?.message || 'Ocurrió un error al renderizar la interfaz'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              Recargar Aplicación
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('isAuth') === 'true';
  });

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('userData');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleLoginSuccess = (userData) => {
    setCurrentUser(userData);
    setIsAuthenticated(true);
    localStorage.setItem('isAuth', 'true');
    localStorage.setItem('userData', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('isAuth');
    localStorage.removeItem('userData');
    sileo.info({
      title: 'Sesión Finalizada',
      description: 'Has salido del sistema de forma segura.',
    });
  };

  return (
    <ErrorBoundary>
      <div className="w-full min-h-screen">
        {/* Contenedor global de notificaciones Sileo */}
        <Toaster position="top-right" theme="light" />

        {!isAuthenticated ? (
          <Login onLoginSuccess={handleLoginSuccess} />
        ) : (
          <Layout user={currentUser} onLogout={handleLogout} onUpdateUserData={setCurrentUser} />
        )}
      </div>
    </ErrorBoundary>
  );
}

export default App;
