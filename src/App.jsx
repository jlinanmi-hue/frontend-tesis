import React, { Component, useState, useEffect } from 'react';
import Login from './components/Login';
import Layout from './components/_layaout';
import { Toaster, sileo } from 'sileo';
import 'sileo/styles.css';
import api from './services/api';

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
    if (userData?.sessionToken) {
      localStorage.setItem('sessionToken', userData.sessionToken);
    }
    if (userData?.usuarioId) {
      localStorage.setItem('usuarioId', userData.usuarioId);
    }
  };

  const handleLogout = (customMsg = null) => {
    setCurrentUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('isAuth');
    localStorage.removeItem('userData');
    localStorage.removeItem('sessionToken');
    localStorage.removeItem('usuarioId');

    if (customMsg) {
      sileo.error({
        title: customMsg.title || 'Sesión Cerrada',
        description: customMsg.description || 'Has salido del sistema.',
      });
    } else {
      sileo.info({
        title: 'Sesión Finalizada',
        description: 'Has salido del sistema de forma segura.',
      });
    }
  };

  // 1. Escuchar evento de sesión superada por inicio en otro dispositivo
  useEffect(() => {
    const handleSessionSuperseded = (e) => {
      const detail = e.detail || {};
      const dev = detail.ultimo_dispositivo || 'otro dispositivo';
      handleLogout({
        title: 'Sesión Cerrada en este Dispositivo',
        description: `Tu cuenta ha sido abierta desde ${dev}. Por seguridad, solo se permite una sesión activa a la vez.`,
      });
    };

    window.addEventListener('valencia:session-superseded', handleSessionSuperseded);
    return () => window.removeEventListener('valencia:session-superseded', handleSessionSuperseded);
  }, []);

  // 2. Heartbeat de verificación de sesión única activa (cada 15 segundos)
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkSession = async () => {
      try {
        const uId = localStorage.getItem('usuarioId') || currentUser?.usuarioId;
        const sTok = localStorage.getItem('sessionToken') || currentUser?.sessionToken;
        if (!uId || !sTok) return;

        const res = await api.auth.verifySession(uId, sTok);
        if (res && res.active === false) {
          handleLogout({
            title: 'Sesión Transferida',
            description: res.message || 'Se ha iniciado sesión en otro dispositivo.',
          });
        }
      } catch (err) {
        if (err?.status === 401 && (err?.data?.code === 'SESSION_SUPERSEDED' || err?.data?.code === 'SESSION_INVALID')) {
          handleLogout({
            title: 'Sesión Cerrada en este Dispositivo',
            description: err.data?.message || 'Tu cuenta se abrió en otro dispositivo.',
          });
        }
      }
    };

    // Verificar a los 3 segundos del montado y luego periódicamente cada 15s
    const initialTimer = setTimeout(checkSession, 3000);
    const interval = setInterval(checkSession, 15000);
    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [isAuthenticated, currentUser]);

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
