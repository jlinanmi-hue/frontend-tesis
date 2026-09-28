import { useState } from 'react';
import { ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import api from '../services/api';
import { sileo } from 'sileo';

export default function Login({ onLoginSuccess }) {
  const [usuario, setUsuario] = useState('admin');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1. Validación de campos con Sileo
    if (!usuario.trim() || !password.trim()) {
      sileo.warning({
        title: 'Campos requeridos',
        description: 'Por favor ingresa tu usuario y contraseña.',
      });
      return;
    }

    setIsLoading(true);
    setError('');

    let sessionData = null;

    // 2. Ejecución con sileo.promise (Cargando -> Éxito -> Error)
    try {
      await sileo.promise(
        api.auth.login(usuario, password),
        {
          loading: {
            title: 'Autenticando...',
            description: 'Verificando credenciales con el servidor seguro',
          },
          success: (response) => {
            if (!response?.success) {
              throw new Error(response?.message || 'Credenciales no válidas');
            }

            const { usuario: userObj, empleado } = response.data || {};
            sessionData = {
              usuario: userObj?.UsuarioUserName || usuario,
              nombreCompleto: empleado ? `${empleado.EmpleadoNombres} ${empleado.EmpleadoApellidos}` : usuario,
              correo: empleado?.EmpleadoCorreo || '',
              cargo: empleado?.cargo || 'Personal Autorizado',
              empleadoId: empleado?.EmpleadoId,
              usuarioId: userObj?.UsuarioId,
              timestamp: new Date().toISOString(),
            };

            return {
              title: '¡Ingreso Válido!',
              description: `Bienvenido al sistema, ${empleado?.EmpleadoNombres || usuario}`,
            };
          },
          error: (err) => {
            const errorMsg = err.data?.message || err.message || 'Credenciales incorrectas o error en el servidor';
            setError(errorMsg);
            return {
              title: 'Acceso Denegado',
              description: errorMsg,
            };
          },
        }
      );

      // Si fue exitoso, cambiar al dashboard tras permitir ver el toast
      if (sessionData && onLoginSuccess) {
        setTimeout(() => {
          onLoginSuccess(sessionData);
        }, 400);
      }
    } catch (err) {
      console.error('Fallo en autenticación:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#f0f4f9] px-4 py-8 font-sans notranslate" translate="no">
      {/* Tarjeta Principal de Login */}
      <div className="w-full max-w-[420px] bg-white rounded-3xl shadow-2xl shadow-slate-300/60 overflow-hidden border border-slate-100 transition-all">
        
        {/* Cabecera Azul Marino Oscuro */}
        <div className="bg-[#0b132b] px-8 pt-9 pb-8 text-center flex flex-col items-center justify-center relative">
          {/* Logo "C" */}
          <div className="w-16 h-16 bg-[#1a65ff] rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 mb-4 transform hover:scale-105 transition-transform">
            <span className="text-white text-3xl font-bold tracking-tight">C</span>
          </div>

          {/* Título de Empresa */}
          <h1 className="text-white text-2xl font-bold tracking-normal mb-1">
            <span>Comercial Valencia</span>
          </h1>

          {/* Subtítulo Tecnológico */}
          <p className="text-[#3b82f6] text-xs font-semibold tracking-wider uppercase">
            <span>IA GENERATIVA</span>
          </p>
        </div>

        {/* Formulario de Entrada */}
        <div className="p-8 pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Mensaje de Error en tarjeta (respaldo visual) */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start gap-2 leading-relaxed">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Campo: Usuario */}
            <div>
              <label className="block text-slate-700 text-sm font-medium mb-1.5">
                <span>Usuario</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  placeholder="Ingrese su usuario"
                  className="w-full px-4 py-3 bg-[#f8fafc] border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  required
                />
              </div>
            </div>

            {/* Campo: Contraseña */}
            <div>
              <label className="block text-slate-700 text-sm font-medium mb-1.5">
                <span>Contraseña</span>
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-[#f8fafc] border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  required
                />
              </div>
            </div>

            {/* Botón: Iniciar Sesión Segura */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#1e60ff] hover:bg-[#1554e0] active:bg-[#0f44bd] text-white font-medium py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition-all duration-150 cursor-pointer disabled:opacity-75"
              >
                {isLoading ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Autenticando...</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center justify-center gap-2">
                    <span>Iniciar Sesión Segura</span>
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </button>
            </div>

            {/* Distintivo de Conexión Protegida */}
            <div className="pt-1">
              <div className="w-full bg-[#ecfdf5] border border-[#a7f3d0] text-[#059669] rounded-xl py-2.5 px-4 flex items-center justify-center gap-2 text-xs font-medium">
                <ShieldCheck className="w-4 h-4 text-[#10b981]" />
                <span>Conexión Protegida </span>
              </div>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
