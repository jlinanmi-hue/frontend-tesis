import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bell,
  CheckCheck,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Layers,
  Inbox,
  X,
  RefreshCw,
} from 'lucide-react';
import api from '../../services/api';
import { getNotificacionStyle, formatearTiempoRelativo } from './notificacionHelpers.jsx';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';
// SSE desactivado por defecto: con `php artisan serve` (un solo hilo) una
// conexión SSE permanente bloquea TODAS las demás peticiones de la app.
// Activar solo con servidor multihilo (Octane/Nginx) vía VITE_ENABLE_SSE=true.
const SSE_ENABLED = import.meta.env.VITE_ENABLE_SSE === 'true';
const STREAM_URL = `${API_BASE_URL.replace(/\/$/, '')}/notificaciones/stream`;

const POLL_OK_MS = 60000;
const POLL_MAX_MS = 120000;

export default function NotificacionesDropdown({ onVerTabla, onNavigate }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notificaciones, setNotificaciones] = useState([]);
  const [totalNoLeidas, setTotalNoLeidas] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filtroTab, setFiltroTab] = useState('todas'); // 'todas' | 'no_leidas'
  const dropdownRef = useRef(null);

  // Cargar notificaciones del backend (retorna true si tuvo éxito)
  const failCountRef = useRef(0);
  const cargarRef = useRef(null);
  const cargarNotificaciones = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.notificaciones.listar({
        per_page: 10,
        solo_no_leidas: filtroTab === 'no_leidas' ? true : undefined,
      });

      if (res && res.success) {
        const items = res.data?.data || res.data || [];
        setNotificaciones(items);
        setTotalNoLeidas(res.total_no_leidas ?? 0);
        failCountRef.current = 0;
        return true;
      }
      throw new Error(res?.message || 'Respuesta inválida del servidor');
    } catch (err) {
      console.error('Error al cargar notificaciones:', err);
      failCountRef.current += 1;
      return false;
    } finally {
      setLoading(false);
    }
  }, [filtroTab]);
  cargarRef.current = cargarNotificaciones;

  // Carga inicial para el badge de la campana
  useEffect(() => {
    cargarNotificaciones();
  }, [cargarNotificaciones]);

  // Polling diferido: cada 60s, solo con pestaña visible y backoff ante fallos.
  // Tras 3 fallos seguidos se pausa solo (circuit breaker) hasta la próxima
  // acción manual, para no saturar un backend caído.
  useEffect(() => {
    let timer = null;
    let stopped = false;
    const schedule = (ms) => {
      if (!stopped) timer = setTimeout(tick, ms);
    };
    const tick = async () => {
      if (stopped) return;
      if (document.visibilityState === 'visible' && failCountRef.current < 3) {
        const ok = await cargarRef.current?.();
        schedule(ok ? POLL_OK_MS : Math.min(POLL_MAX_MS, 30000 * 2 ** failCountRef.current));
      } else {
        schedule(POLL_OK_MS);
      }
    };
    timer = setTimeout(tick, POLL_OK_MS);
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  // Soporte SSE (Server-Sent Events) para tiempo real — solo con flag explícito
  useEffect(() => {
    if (!SSE_ENABLED) return;
    let eventSource = null;
    let errorCount = 0;
    try {
      eventSource = new EventSource(STREAM_URL);

      eventSource.addEventListener('notificacion', (event) => {
        try {
          const nueva = JSON.parse(event.data);
          if (nueva) {
            cargarNotificaciones();
          }
        } catch (e) {
          console.warn('Error parseando evento SSE:', e);
        }
      });

      eventSource.onerror = () => {
        // Evita tormenta de reconexiones si el endpoint no existe o está caído
        errorCount += 1;
        if (errorCount >= 5 && eventSource) {
          eventSource.close();
        }
        // El navegador reconecta solo ante cortes temporales (< 5 fallos)
      };
    } catch {
      // Ignorar si SSE no está disponible
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [cargarNotificaciones]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Marcar una notificación individual como leída
  const handleMarcarLeida = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await api.notificaciones.marcarLeida(id);
      setNotificaciones((prev) =>
        prev.map((n) => (n.NotificacionId === id ? { ...n, NotificacionLeida: 'S' } : n))
      );
      setTotalNoLeidas((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error al marcar leída:', err);
    }
  };

  // Marcar todas como leídas
  const handleMarcarTodas = async () => {
    try {
      await api.notificaciones.marcarTodas();
      setNotificaciones((prev) => prev.map((n) => ({ ...n, NotificacionLeida: 'S' })));
      setTotalNoLeidas(0);
    } catch (err) {
      console.error('Error al marcar todas:', err);
    }
  };

  // Emitir notificación de prueba
  const handleEmitirTest = async (e) => {
    e.stopPropagation();
    try {
      await api.notificaciones.test({
        titulo: 'Alerta de Control de Stock',
        mensaje: 'Notificación emitida en tiempo real para verificación del sistema.',
        tipo: 'warning',
      });
      cargarNotificaciones();
    } catch (err) {
      console.error('Error al emitir test:', err);
    }
  };

  // Click en una notificación para ir al módulo
  const handleClickItem = async (notif) => {
    if (notif.NotificacionLeida !== 'S') {
      await handleMarcarLeida(notif.NotificacionId);
    }

    const accionUrl = notif.NotificacionDatos?.accion?.url;
    if (accionUrl && typeof onNavigate === 'function') {
      onNavigate(accionUrl);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botón de la Campana */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`relative p-2 rounded-xl transition cursor-pointer flex items-center justify-center border ${
          isOpen
            ? 'bg-blue-50 text-blue-600 border-blue-200 shadow-2xs'
            : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200/90 shadow-2xs'
        }`}
        title="Bandeja de Notificaciones del Sistema"
        aria-label="Notificaciones"
      >
        <Bell className="w-5 h-5" />

        {/* Badge de No Leídas */}
        {totalNoLeidas > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1 bg-rose-600 text-white text-[10px] font-extrabold rounded-full border-2 border-white shadow-2xs animate-in zoom-in-50 duration-200">
            {totalNoLeidas > 99 ? '99+' : totalNoLeidas}
          </span>
        )}

        {/* Punto pulsante sutil si hay alertas */}
        {totalNoLeidas > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 animate-ping pointer-events-none" />
        )}
      </button>

      {/* Menú Desplegable / Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-[360px] sm:w-[420px] bg-white rounded-2xl shadow-xl border border-slate-200/90 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          
          {/* Cabecera del Dropdown */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200/80">
                <Bell className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-xs font-bold text-slate-800">
                  Notificaciones del Sistema
                </h3>
                <span className="text-[10px] text-slate-400">
                  {totalNoLeidas > 0
                    ? `${totalNoLeidas} pendiente(s) por revisar`
                    : 'Bandeja al día'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {totalNoLeidas > 0 && (
                <button
                  type="button"
                  onClick={handleMarcarTodas}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-blue-600 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-lg shadow-2xs transition cursor-pointer"
                  title="Marcar todas como leídas"
                >
                  <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
                  <span>Marcar todas</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleEmitirTest}
                className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                title="Emitir alerta de prueba para validar tiempo real"
              >
                <Sparkles className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Filtros de Pestañas: Todas / Sin Leer */}
          <div className="flex border-b border-slate-100 px-4 pt-2 bg-white text-xs gap-3">
            <button
              type="button"
              onClick={() => setFiltroTab('todas')}
              className={`pb-2 font-bold transition border-b-2 cursor-pointer ${
                filtroTab === 'todas'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Todas
            </button>
            <button
              type="button"
              onClick={() => setFiltroTab('no_leidas')}
              className={`pb-2 font-bold transition border-b-2 cursor-pointer flex items-center gap-1.5 ${
                filtroTab === 'no_leidas'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <span>Sin leer</span>
              {totalNoLeidas > 0 && (
                <span className="px-1.5 py-0.2 bg-rose-50 text-rose-600 border border-rose-200 rounded-full text-[10px] font-extrabold font-mono">
                  {totalNoLeidas}
                </span>
              )}
            </button>
          </div>

          {/* Lista de Notificaciones */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
            {loading && notificaciones.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                <span>Cargando notificaciones...</span>
              </div>
            ) : notificaciones.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs space-y-1">
                <Inbox className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-slate-600">No hay notificaciones</p>
                <p className="text-[11px]">
                  {filtroTab === 'no_leidas'
                    ? 'Todas las notificaciones han sido leídas.'
                    : 'Aún no se han registrado eventos recientes.'}
                </p>
              </div>
            ) : (
              notificaciones.map((n) => {
                const style = getNotificacionStyle(n.NotificacionTipo);
                const esNoLeida = n.NotificacionLeida === 'N';

                return (
                  <div
                    key={n.NotificacionId}
                    onClick={() => handleClickItem(n)}
                    className={`p-3.5 transition-all hover:bg-slate-50 cursor-pointer flex items-start gap-3 relative ${
                      esNoLeida ? 'bg-blue-50/20' : 'bg-white'
                    }`}
                  >
                    {/* Indicador no leída */}
                    {esNoLeida && (
                      <span className="w-2 h-2 rounded-full bg-blue-600 absolute left-2 top-4 shrink-0" />
                    )}

                    {/* Ícono de Tipo */}
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border mt-0.5 ${style.iconBg} ${
                        esNoLeida ? 'ml-2' : ''
                      }`}
                    >
                      {style.icon}
                    </div>

                    {/* Contenido de la Notificación */}
                    <div className="grow min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-xs font-bold text-slate-800 truncate">
                          {n.NotificacionTitulo}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                          {formatearTiempoRelativo(n.NotificacionFecha)}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-600 leading-snug line-clamp-2">
                        {n.NotificacionMensaje}
                      </p>

                      {/* Metadatos y Badges */}
                      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
                        <span className={`px-2 py-0.5 rounded-full font-bold border ${style.badgeBg}`}>
                          {n.NotificacionCategoria || style.label}
                        </span>

                        {n.NotificacionReferenciaId && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono font-semibold">
                            {n.NotificacionReferenciaId}
                          </span>
                        )}

                        {n.NotificacionDatos?.flujo?.indicador && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-50 text-slate-500 font-mono">
                            {n.NotificacionDatos.flujo.indicador}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Botón rápido marcar leída */}
                    {esNoLeida && (
                      <button
                        type="button"
                        onClick={(e) => handleMarcarLeida(n.NotificacionId, e)}
                        className="p-1 rounded-lg hover:bg-slate-200/80 text-slate-400 hover:text-slate-600 transition shrink-0"
                        title="Marcar como leída"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Pie del Dropdown: Ver Tabla Completa */}
          <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                if (typeof onVerTabla === 'function') {
                  onVerTabla();
                }
              }}
              className="w-full flex items-center justify-center gap-1.5 py-2 font-bold text-blue-600 hover:text-blue-700 bg-white hover:bg-blue-50/60 border border-slate-200/90 rounded-xl shadow-2xs transition active:scale-98 cursor-pointer"
            >
              <span>Ver todas en la tabla de notificaciones</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
