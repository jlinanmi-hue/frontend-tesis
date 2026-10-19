import React, { useEffect, useRef, useState } from 'react';
import {
  Building2,
  Check,
  Loader2,
  Megaphone,
  Search,
  Send,
  Shield,
  User,
  Users,
  X,
} from 'lucide-react';
import { sileo } from 'sileo';
import api from '../../services/api';

const PRIORIDADES_BASE = ['NORMAL', 'ALTA', 'URGENTE'];

const ESTILOS_PRIORIDAD = {
  NORMAL: 'border-blue-200 bg-blue-50 text-blue-700',
  ALTA: 'border-amber-200 bg-amber-50 text-amber-700',
  URGENTE: 'border-rose-200 bg-rose-50 text-rose-700',
};

const MODOS = [
  { key: 'usuarios', label: 'Usuario(s)', icon: User },
  { key: 'roles', label: 'Por rol', icon: Shield },
  { key: 'todos', label: 'Todos', icon: Building2 },
];

export default function CompositorNotificacion({ open, onClose, user, onSent }) {
  const [catalogo, setCatalogo] = useState({ motivos: [], prioridades: [], roles: [] });
  const [cargandoCatalogo, setCargandoCatalogo] = useState(false);
  const [modo, setModo] = useState('usuarios');
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [seleccionados, setSeleccionados] = useState([]);
  const [rolesSeleccionados, setRolesSeleccionados] = useState([]);
  const [motivo, setMotivo] = useState('GENERAL');
  const [titulo, setTitulo] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [prioridad, setPrioridad] = useState('NORMAL');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const busquedaTimerRef = useRef(null);

  const prioridades = catalogo.prioridades?.length ? catalogo.prioridades : PRIORIDADES_BASE;

  const resetear = () => {
    setModo('usuarios');
    setBusqueda('');
    setResultados([]);
    setSeleccionados([]);
    setRolesSeleccionados([]);
    setMotivo('GENERAL');
    setTitulo('');
    setMensaje('');
    setPrioridad('NORMAL');
    setError('');
  };

  // Catálogo de motivos, prioridades y roles
  useEffect(() => {
    if (!open) return;

    let activo = true;
    setCargandoCatalogo(true);

    api.notificaciones
      .motivos()
      .then((res) => {
        if (activo && res?.success) {
          setCatalogo(res.data || { motivos: [], prioridades: [], roles: [] });
        }
      })
      .catch((err) => console.error('Error al cargar catálogo de notificaciones:', err))
      .finally(() => {
        if (activo) setCargandoCatalogo(false);
      });

    return () => {
      activo = false;
    };
  }, [open]);

  // Limpiar el formulario al cerrar
  useEffect(() => {
    if (!open) resetear();
  }, [open]);

  // Cerrar con Escape
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !enviando) {
        onClose?.();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, enviando, onClose]);

  // Búsqueda de usuarios con debounce
  useEffect(() => {
    if (!open || modo !== 'usuarios') return;

    if (busquedaTimerRef.current) clearTimeout(busquedaTimerRef.current);

    setBuscando(true);
    busquedaTimerRef.current = setTimeout(async () => {
      try {
        const res = await api.notificaciones.buscarUsuarios(busqueda.trim());
        if (res?.success) {
          setResultados(res.data?.usuarios || []);
        }
      } catch (err) {
        console.error('Error al buscar usuarios:', err);
      } finally {
        setBuscando(false);
      }
    }, 300);

    return () => {
      if (busquedaTimerRef.current) clearTimeout(busquedaTimerRef.current);
    };
  }, [busqueda, open, modo]);

  const toggleUsuario = (usuario) => {
    setSeleccionados((prev) =>
      prev.some((item) => item.id === usuario.id)
        ? prev.filter((item) => item.id !== usuario.id)
        : [...prev, usuario]
    );
  };

  const toggleRol = (codigo) => {
    setRolesSeleccionados((prev) =>
      prev.includes(codigo) ? prev.filter((rol) => rol !== codigo) : [...prev, codigo]
    );
  };

  const handleMotivoChange = (key) => {
    const anterior = catalogo.motivos.find((item) => item.key === motivo);
    const nuevo = catalogo.motivos.find((item) => item.key === key);

    setMotivo(key);

    if (!nuevo) return;

    const tituloActual = titulo.trim();
    const mensajeActual = mensaje.trim();
    const tituloAnterior = (anterior?.titulo || '').trim();
    const mensajeAnterior = (anterior?.plantilla || '').trim();

    if (tituloActual === '' || tituloActual === tituloAnterior) {
      setTitulo(nuevo.titulo || '');
    }

    if (mensajeActual === '' || mensajeActual === mensajeAnterior) {
      setMensaje(nuevo.plantilla || '');
    }
  };

  const handleEnviar = async () => {
    setError('');

    if (!user?.usuarioId) {
      setError('No se pudo identificar tu usuario. Vuelve a iniciar sesión.');
      return;
    }

    const tituloLimpio = titulo.trim();
    const mensajeLimpio = mensaje.trim();

    if (modo === 'usuarios' && seleccionados.length === 0) {
      setError('Selecciona al menos un usuario destinatario.');
      return;
    }

    if (modo === 'roles' && rolesSeleccionados.length === 0) {
      setError('Selecciona al menos un rol destinatario.');
      return;
    }

    if (tituloLimpio.length < 3) {
      setError('El título debe tener al menos 3 caracteres.');
      return;
    }

    if (mensajeLimpio.length < 5) {
      setError('El mensaje debe tener al menos 5 caracteres.');
      return;
    }

    const destinatarios =
      modo === 'todos'
        ? { todos: true }
        : modo === 'roles'
          ? { roles: rolesSeleccionados }
          : { usuarios: seleccionados.map((item) => item.id) };

    setEnviando(true);

    try {
      const res = await api.notificaciones.enviarManual({
        enviado_por: user.usuarioId,
        destinatarios,
        motivo,
        titulo: tituloLimpio,
        mensaje: mensajeLimpio,
        prioridad,
      });

      if (!res?.success) {
        throw new Error(res?.message || 'No se pudo enviar la notificación.');
      }

      const enviadas = res.data?.enviadas ?? 0;

      sileo.success({
        title: 'Notificación enviada',
        description: `${enviadas} usuario(s) recibirán el comunicado.`,
      });

      onSent?.();
      onClose?.();
    } catch (err) {
      const mensajeError = err?.data?.message || err?.message || 'Error al enviar la notificación.';
      setError(mensajeError);
      sileo.error({
        title: 'No se pudo enviar',
        description: mensajeError,
      });
    } finally {
      setEnviando(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px]"
        onClick={() => !enviando && onClose?.()}
      />

      <div className="relative w-full max-w-2xl max-h-[92vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Cabecera */}
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-violet-50 text-violet-600 border border-violet-200">
              <Megaphone className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Nueva notificación manual</h2>
              <p className="text-[11px] text-slate-500">
                Envía un comunicado a un usuario, a un rol o a toda la PYME.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => !enviando && onClose?.()}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/70 rounded-lg transition cursor-pointer"
            title="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-5 space-y-5 overflow-y-auto">
          {/* Destinatarios */}
          <section>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-2">
              1. Destinatarios
            </label>

            <div className="grid grid-cols-3 gap-2">
              {MODOS.map(({ key, label, icon: Icono }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setModo(key)}
                  className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                    modo === key
                      ? 'border-violet-300 bg-violet-50 text-violet-700 shadow-2xs'
                      : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <Icono className="w-4 h-4" />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            {modo === 'usuarios' && (
              <div className="mt-3 space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={busqueda}
                    onChange={(event) => setBusqueda(event.target.value)}
                    placeholder="Buscar por nombre, usuario o correo..."
                    className="w-full pl-9 pr-9 py-2 text-xs rounded-xl border border-slate-200 focus:border-violet-300 focus:ring-2 focus:ring-violet-100 outline-none transition"
                  />
                  {buscando && (
                    <Loader2 className="w-4 h-4 text-violet-500 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
                  )}
                </div>

                {seleccionados.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {seleccionados.map((usuario) => (
                      <span
                        key={usuario.id}
                        className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-200 text-[11px] font-semibold"
                      >
                        {usuario.nombre}
                        <button
                          type="button"
                          onClick={() => toggleUsuario(usuario)}
                          className="p-0.5 rounded-full hover:bg-violet-200/70 cursor-pointer"
                          title="Quitar"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
                  {cargandoCatalogo || (buscando && resultados.length === 0) ? (
                    <div className="p-4 text-center text-[11px] text-slate-400">
                      Cargando usuarios...
                    </div>
                  ) : resultados.length === 0 ? (
                    <div className="p-4 text-center text-[11px] text-slate-400">
                      No se encontraron usuarios activos.
                    </div>
                  ) : (
                    resultados.map((usuario) => {
                      const elegido = seleccionados.some((item) => item.id === usuario.id);

                      return (
                        <button
                          key={usuario.id}
                          type="button"
                          onClick={() => toggleUsuario(usuario)}
                          className={`w-full text-left px-3 py-2 flex items-center justify-between gap-3 transition cursor-pointer ${
                            elegido ? 'bg-violet-50/60' : 'bg-white hover:bg-slate-50'
                          }`}
                        >
                          <span className="min-w-0">
                            <span className="block text-xs font-bold text-slate-700 truncate">
                              {usuario.nombre}
                            </span>
                            <span className="block text-[10px] text-slate-400 truncate">
                              {usuario.rol_nombre || usuario.rol || 'Sin rol'}
                              {usuario.email ? ` · ${usuario.email}` : ''}
                            </span>
                          </span>

                          <span
                            className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                              elegido
                                ? 'bg-violet-600 border-violet-600 text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {elegido && <Check className="w-3 h-3" />}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {modo === 'roles' && (
              <div className="mt-3 rounded-xl border border-slate-200 divide-y divide-slate-100 max-h-48 overflow-y-auto">
                {catalogo.roles.length === 0 ? (
                  <div className="p-4 text-center text-[11px] text-slate-400">
                    No hay roles disponibles.
                  </div>
                ) : (
                  catalogo.roles.map((rol) => {
                    const elegido = rolesSeleccionados.includes(rol.codigo);
                    const sinUsuarios = Number(rol.usuarios_count) === 0;

                    return (
                      <button
                        key={rol.id}
                        type="button"
                        disabled={sinUsuarios}
                        onClick={() => toggleRol(rol.codigo)}
                        className={`w-full text-left px-3 py-2 flex items-center justify-between gap-3 transition ${
                          sinUsuarios
                            ? 'opacity-50 cursor-not-allowed bg-white'
                            : elegido
                              ? 'bg-violet-50/60 cursor-pointer'
                              : 'bg-white hover:bg-slate-50 cursor-pointer'
                        }`}
                      >
                        <span>
                          <span className="block text-xs font-bold text-slate-700">
                            {rol.nombre || rol.codigo}
                          </span>
                          <span className="block text-[10px] text-slate-400">
                            {rol.codigo} · {rol.usuarios_count} usuario(s)
                          </span>
                        </span>

                        <span
                          className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                            elegido
                              ? 'bg-violet-600 border-violet-600 text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {elegido && <Check className="w-3 h-3" />}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            )}

            {modo === 'todos' && (
              <div className="mt-3 p-3 rounded-xl bg-violet-50/60 border border-violet-200 flex items-start gap-2">
                <Users className="w-4 h-4 text-violet-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-violet-800">
                  Se enviará el comunicado a <strong>todos los usuarios activos</strong> de la
                  PYME. Los usuarios inactivos o eliminados serán omitidos.
                </p>
              </div>
            )}
          </section>

          {/* Contenido */}
          <section className="space-y-3">
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide">
              2. Contenido del comunicado
            </label>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Motivo (opcional)
              </label>
              <select
                value={motivo}
                onChange={(event) => handleMotivoChange(event.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:border-violet-300 focus:ring-2 focus:ring-violet-100 outline-none transition"
              >
                {catalogo.motivos.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Título
              </label>
              <input
                type="text"
                value={titulo}
                onChange={(event) => setTitulo(event.target.value)}
                maxLength={100}
                placeholder="Ej. Alerta de ventas"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-violet-300 focus:ring-2 focus:ring-violet-100 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Mensaje
              </label>
              <textarea
                value={mensaje}
                onChange={(event) => setMensaje(event.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Escribe el mensaje que recibirán los destinatarios..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-violet-300 focus:ring-2 focus:ring-violet-100 outline-none transition resize-none"
              />
              <div className="text-right text-[10px] text-slate-400 mt-0.5">
                {mensaje.length}/500
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Prioridad
              </label>
              <div className="flex flex-wrap gap-2">
                {prioridades.map((valor) => (
                  <button
                    key={valor}
                    type="button"
                    onClick={() => setPrioridad(valor)}
                    className={`px-3 py-1.5 rounded-lg border text-[11px] font-bold transition cursor-pointer ${
                      prioridad === valor
                        ? ESTILOS_PRIORIDAD[valor] || ESTILOS_PRIORIDAD.NORMAL
                        : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {valor}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-[11px] font-semibold text-rose-700">
              {error}
            </div>
          )}
        </div>

        {/* Pie */}
        <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => !enviando && onClose?.()}
            className="px-3.5 py-2 text-xs font-bold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleEnviar}
            disabled={enviando || cargandoCatalogo}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-2xs transition cursor-pointer"
          >
            {enviando ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>{enviando ? 'Enviando...' : 'Enviar notificación'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
