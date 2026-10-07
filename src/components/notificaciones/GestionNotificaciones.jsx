import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  Search,
  CheckCheck,
  Trash2,
  RefreshCw,
  Sparkles,
  Filter,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  TrendingDown,
  Info,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  Layers,
  ArrowRight,
} from 'lucide-react';
import api from '../../services/api';
import { getNotificacionStyle, formatearTiempoRelativo } from './notificacionHelpers.jsx';
import StyledSelect from '../dashboard/filters/StyledSelect';

export default function GestionNotificaciones({ onNavigateModule }) {
  const [notificaciones, setNotificaciones] = useState([]);
  const [totalNoLeidas, setTotalNoLeidas] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todas'); // 'todas' | 'no_leidas' | 'leidas'
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  
  // Paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalRegistros, setTotalRegistros] = useState(0);

  // Modal de Detalle
  const [notificacionSeleccionada, setNotificacionSeleccionada] = useState(null);

  // Cargar notificaciones desde el backend
  const cargarNotificaciones = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.notificaciones.listar({
        page: paginaActual,
        per_page: 15,
        search: searchTerm || undefined,
        categoria: filtroCategoria || undefined,
        tipo: filtroTipo || undefined,
        solo_no_leidas: filtroEstado === 'no_leidas' ? true : undefined,
      });

      if (res && res.success) {
        const paginator = res.data;
        const items = paginator?.data || [];
        setNotificaciones(items);
        setTotalNoLeidas(res.total_no_leidas ?? 0);
        setTotalPaginas(paginator?.last_page || 1);
        setTotalRegistros(paginator?.total || items.length);
      }
    } catch (err) {
      console.error('Error al cargar tabla de notificaciones:', err);
    } finally {
      setLoading(false);
    }
  }, [paginaActual, searchTerm, filtroCategoria, filtroTipo, filtroEstado]);

  useEffect(() => {
    cargarNotificaciones();
  }, [cargarNotificaciones]);

  // Marcar una como leída
  const handleMarcarLeida = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await api.notificaciones.marcarLeida(id);
      setNotificaciones((prev) =>
        prev.map((n) => (n.NotificacionId === id ? { ...n, NotificacionLeida: 'S' } : n))
      );
      setTotalNoLeidas((prev) => Math.max(0, prev - 1));
      if (notificacionSeleccionada?.NotificacionId === id) {
        setNotificacionSeleccionada((prev) => ({ ...prev, NotificacionLeida: 'S' }));
      }
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

  // Eliminar una notificación
  const handleEliminar = async (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('¿Deseas eliminar esta notificación?')) return;
    try {
      await api.notificaciones.eliminar(id);
      setNotificaciones((prev) => prev.filter((n) => n.NotificacionId !== id));
      setTotalRegistros((prev) => Math.max(0, prev - 1));
      if (notificacionSeleccionada?.NotificacionId === id) {
        setNotificacionSeleccionada(null);
      }
    } catch (err) {
      console.error('Error al eliminar:', err);
    }
  };

  // Limpiar todas
  const handleLimpiarTodas = async () => {
    if (!window.confirm('¿Deseas vaciar todas las notificaciones activas?')) return;
    try {
      await api.notificaciones.eliminarTodas();
      setNotificaciones([]);
      setTotalNoLeidas(0);
      setTotalRegistros(0);
    } catch (err) {
      console.error('Error al limpiar todas:', err);
    }
  };

  // Emitir notificación de prueba para verificar tiempo real
  const handleEmitirTest = async (tipo) => {
    try {
      const titulos = {
        merma: 'Merma Registrada: Aceite Vegetal 900ml',
        warning: 'Quiebre de Stock en Picking: Arroz Superior',
        success: 'Ingreso Completado: Orden de Compra OC-00030',
        info: 'Valencia AI: Optimización de Rutas Generada',
      };

      await api.notificaciones.test({
        titulo: titulos[tipo] || 'Alerta Operativa del Sistema',
        mensaje: `Evento registrado automáticamente para validación de la tabla de notificaciones (${tipo.toUpperCase()}).`,
        tipo: tipo,
      });
      cargarNotificaciones();
    } catch (err) {
      console.error('Error al emitir test:', err);
    }
  };

  // Navegar a módulo
  const handleIrAModulo = (url, e) => {
    if (e) e.stopPropagation();
    if (url && typeof onNavigateModule === 'function') {
      onNavigateModule(url);
    } else if (url) {
      window.location.hash = `#${url}`;
    }
  };

  // Conteo de métricas para tarjetas superiores
  const totalMermas = notificaciones.filter(
    (n) => n.NotificacionTipo === 'merma' || n.NotificacionTipo === 'warning'
  ).length;
  const totalExitos = notificaciones.filter((n) => n.NotificacionTipo === 'success').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 1. Cabecera Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="bg-blue-600 text-white p-2 rounded-xl shadow-xs">
              <Bell className="w-5 h-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
              Tabla de Notificaciones del Sistema
            </h1>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm mt-1 leading-relaxed">
            Bandeja centralizada de alertas operativas, ingresos de mercadería, anulaciones e incidencias de IA.
          </p>
        </div>

        {/* Acciones Globales */}
        <div className="flex flex-wrap items-center gap-2.5">
          {totalNoLeidas > 0 && (
            <button
              type="button"
              onClick={handleMarcarTodas}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs border border-slate-200/90 shadow-2xs transition active:scale-95 cursor-pointer"
            >
              <CheckCheck className="w-4 h-4 text-blue-600" />
              <span>Marcar todas como leídas</span>
            </button>
          )}

          {/* Botón Emitir Test Rápido */}
          <div className="relative group">
            <button
              type="button"
              onClick={() => handleEmitirTest('warning')}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold rounded-xl text-xs border border-amber-200 shadow-2xs transition active:scale-95 cursor-pointer"
              title="Emitir alerta de prueba para verificar tiempo real"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>+ Alerta de Prueba</span>
            </button>
          </div>

          <button
            type="button"
            onClick={cargarNotificaciones}
            disabled={loading}
            className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-600 border border-slate-200/90 shadow-2xs transition active:scale-95 cursor-pointer"
            title="Refrescar notificaciones"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Tarjetas Resumen de Notificaciones */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        
        {/* Total Notificaciones */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Registros
            </span>
            <span className="text-2xl font-extrabold text-slate-800 font-mono mt-0.5 block">
              {totalRegistros}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-600">
            <Bell className="w-5 h-5" />
          </div>
        </div>

        {/* No Leídas */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Sin Revisar
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-2xl font-extrabold text-rose-600 font-mono">
                {totalNoLeidas}
              </span>
              {totalNoLeidas > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              )}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200/80 flex items-center justify-center text-rose-600">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Advertencias y Mermas */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Alertas y Mermas
            </span>
            <span className="text-2xl font-extrabold text-amber-700 font-mono mt-0.5 block">
              {totalMermas}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* Operaciones Exitosas */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Ingresos y Éxitos
            </span>
            <span className="text-2xl font-extrabold text-emerald-700 font-mono mt-0.5 block">
              {totalExitos}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* 3. Barra de Búsqueda y Filtros */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        
        {/* Buscador de Texto */}
        <div className="relative grow sm:max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por título, OC o mensaje..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition"
          />
        </div>

        {/* Filtros Dropdown */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          
          {/* Filtro Estado */}
          <StyledSelect
            value={filtroEstado}
            onChange={(v) => setFiltroEstado(v)}
            options={[
              { value: 'todas', label: 'Todos los estados' },
              { value: 'no_leidas', label: 'Solo sin leer' },
              { value: 'leidas', label: 'Solo leídas' },
            ]}
            panelWidth={220}
            ariaLabel="Filtrar por estado de notificación"
          />

          {/* Filtro Categoría */}
          <StyledSelect
            value={filtroCategoria}
            onChange={(v) => setFiltroCategoria(v)}
            options={[
              { value: '', label: 'Todas las categorías' },
              { value: 'INVENTARIO', label: 'Inventario' },
              { value: 'COMPRAS', label: 'Compras / OC' },
              { value: 'PEDIDOS', label: 'Pedidos de Clientes' },
            ]}
            panelWidth={220}
            ariaLabel="Filtrar por categoría"
          />

          {/* Filtro Tipo */}
          <StyledSelect
            value={filtroTipo}
            onChange={(v) => setFiltroTipo(v)}
            options={[
              { value: '', label: 'Todos los tipos' },
              { value: 'success', label: 'Éxito / Ingreso' },
              { value: 'warning', label: 'Advertencia' },
              { value: 'merma', label: 'Merma' },
              { value: 'danger', label: 'Crítico' },
              { value: 'info', label: 'Informativo' },
            ]}
            panelWidth={220}
            ariaLabel="Filtrar por tipo de notificación"
          />

          {/* Botón limpiar filtros */}
          {(searchTerm || filtroCategoria || filtroTipo || filtroEstado !== 'todas') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setFiltroCategoria('');
                setFiltroTipo('');
                setFiltroEstado('todas');
              }}
              className="text-xs text-blue-600 hover:text-blue-800 font-bold px-2 py-1 transition cursor-pointer"
            >
              Limpiar
            </button>
          )}

        </div>

      </div>

      {/* 4. Tabla Principal de Notificaciones */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {loading && notificaciones.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
            <span>Cargando tabla de notificaciones...</span>
          </div>
        ) : notificaciones.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs space-y-2">
            <Bell className="w-10 h-10 mx-auto text-slate-300" />
            <h3 className="text-sm font-bold text-slate-700">No se encontraron notificaciones</h3>
            <p className="max-w-md mx-auto text-slate-400">
              {searchTerm || filtroCategoria || filtroTipo
                ? 'Ninguna notificación coincide con los filtros aplicados.'
                : 'La bandeja de notificaciones está completamente vacía.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Notificación y Detalle</th>
                  <th className="py-3 px-4">Categoría / Ref.</th>
                  <th className="py-3 px-4">Flujo Operativo</th>
                  <th className="py-3 px-4">Fecha y Hora</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {notificaciones.map((n) => {
                  const style = getNotificacionStyle(n.NotificacionTipo);
                  const esNoLeida = n.NotificacionLeida === 'N';
                  const datos = n.NotificacionDatos || {};

                  return (
                    <tr
                      key={n.NotificacionId}
                      onClick={() => setNotificacionSeleccionada(n)}
                      className={`hover:bg-slate-50/80 transition-colors cursor-pointer group ${
                        esNoLeida ? 'bg-blue-50/15 font-medium' : 'bg-white'
                      }`}
                    >
                      {/* Tipo / Ícono */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center border shrink-0 ${style.iconBg}`}>
                            {style.icon}
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${style.badgeBg}`}>
                            {style.label}
                          </span>
                        </div>
                      </td>

                      {/* Título y Mensaje */}
                      <td className="py-3 px-4 max-w-xs sm:max-w-md">
                        <div className="flex items-center gap-2">
                          {esNoLeida && (
                            <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" title="Sin leer" />
                          )}
                          <span className="font-bold text-slate-800 text-xs">
                            {n.NotificacionTitulo}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                          {n.NotificacionMensaje}
                        </p>
                      </td>

                      {/* Categoría y Referencia */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-bold text-slate-700 block">
                          {n.NotificacionCategoria || 'GENERAL'}
                        </span>
                        {n.NotificacionReferenciaId && (
                          <span className="font-mono text-[10px] text-blue-600 font-semibold bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                            {n.NotificacionReferenciaId}
                          </span>
                        )}
                      </td>

                      {/* Flujo Operativo */}
                      <td className="py-3 px-4 whitespace-nowrap text-[11px] text-slate-600">
                        {datos.flujo?.indicador ? (
                          <div className="font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 inline-block">
                            {datos.flujo.indicador}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                        {datos.flujo?.origen && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[140px] mt-0.5">
                            {datos.flujo.origen}
                          </div>
                        )}
                      </td>

                      {/* Fecha y Hora */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-700">
                          {formatearTiempoRelativo(n.NotificacionFecha)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {n.NotificacionFecha
                            ? new Date(n.NotificacionFecha).toLocaleTimeString('es-PE', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : ''}
                        </div>
                      </td>

                      {/* Estado */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {esNoLeida ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                            No Leída
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500">
                            Leída
                          </span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          
                          {/* Botón Marcar Leída */}
                          {esNoLeida && (
                            <button
                              type="button"
                              onClick={(e) => handleMarcarLeida(n.NotificacionId, e)}
                              className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-500 hover:text-blue-600 border border-slate-200/80 shadow-2xs transition cursor-pointer"
                              title="Marcar como leída"
                            >
                              <CheckCheck className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Botón Ir a Módulo */}
                          {datos.accion?.url && (
                            <button
                              type="button"
                              onClick={(e) => handleIrAModulo(datos.accion.url, e)}
                              className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 shadow-2xs transition cursor-pointer"
                              title={datos.accion.texto || 'Ver en módulo'}
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Botón Ver Detalle */}
                          <button
                            type="button"
                            onClick={() => setNotificacionSeleccionada(n)}
                            className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 border border-slate-200/80 shadow-2xs transition cursor-pointer"
                            title="Ver detalles completos"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Botón Eliminar */}
                          <button
                            type="button"
                            onClick={(e) => handleEliminar(n.NotificacionId, e)}
                            className="p-1.5 rounded-lg bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200/80 shadow-2xs transition cursor-pointer"
                            title="Eliminar notificación"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 5. Paginación Inferior */}
        {totalPaginas > 1 && (
          <div className="p-4 bg-slate-50/70 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
            <span>
              Mostrando página <strong className="text-slate-800">{paginaActual}</strong> de{' '}
              <strong className="text-slate-800">{totalPaginas}</strong> ({totalRegistros} en total)
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                disabled={paginaActual <= 1}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 disabled:opacity-40 rounded-lg border border-slate-200/80 font-bold transition flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Anterior</span>
              </button>

              <button
                type="button"
                onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
                disabled={paginaActual >= totalPaginas}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 disabled:opacity-40 rounded-lg border border-slate-200/80 font-bold transition flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
              >
                <span>Siguiente</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* 6. Modal de Detalle de Notificación */}
      {notificacionSeleccionada && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Cabecera del Modal */}
            <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/60">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center border shadow-2xs ${
                    getNotificacionStyle(notificacionSeleccionada.NotificacionTipo).iconBg
                  }`}
                >
                  {getNotificacionStyle(notificacionSeleccionada.NotificacionTipo).icon}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-800">
                    {notificacionSeleccionada.NotificacionTitulo}
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">
                    {notificacionSeleccionada.NotificacionId} · {formatearTiempoRelativo(notificacionSeleccionada.NotificacionFecha)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setNotificacionSeleccionada(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cuerpo del Modal */}
            <div className="p-6 space-y-4 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Mensaje del Evento
                </span>
                <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200/70 leading-relaxed">
                  {notificacionSeleccionada.NotificacionMensaje}
                </p>
              </div>

              {/* Metadatos en Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Categoría</span>
                  <span className="text-xs font-bold text-slate-800">
                    {notificacionSeleccionada.NotificacionCategoria || 'GENERAL'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Referencia</span>
                  <span className="text-xs font-mono font-bold text-blue-600">
                    {notificacionSeleccionada.NotificacionReferenciaId || 'Sin referencia'}
                  </span>
                </div>
              </div>

              {/* Detalle Operativo si existe */}
              {notificacionSeleccionada.NotificacionDatos && (
                <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">
                    Detalle Operativo del Flujo
                  </span>

                  <div className="flex items-center justify-between font-mono text-[11px]">
                    <span className="text-slate-500">
                      {notificacionSeleccionada.NotificacionDatos?.flujo?.origen || 'Origen'}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
                    <span className="text-slate-800 font-bold">
                      {notificacionSeleccionada.NotificacionDatos?.flujo?.destino || 'Destino'}
                    </span>
                  </div>

                  {notificacionSeleccionada.NotificacionDatos?.flujo?.indicador && (
                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 font-mono text-[11px]">
                        {notificacionSeleccionada.NotificacionDatos.flujo.indicador}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Pie del Modal */}
            <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs">
              <div>
                {notificacionSeleccionada.NotificacionLeida === 'N' ? (
                  <button
                    type="button"
                    onClick={() => handleMarcarLeida(notificacionSeleccionada.NotificacionId)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-2xs transition active:scale-95 cursor-pointer"
                  >
                    <CheckCheck className="w-4 h-4" />
                    <span>Marcar como Leída</span>
                  </button>
                ) : (
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Notificación Leída
                  </span>
                )}
              </div>

              {notificacionSeleccionada.NotificacionDatos?.accion?.url && (
                <button
                  type="button"
                  onClick={() => {
                    handleIrAModulo(notificacionSeleccionada.NotificacionDatos.accion.url);
                    setNotificacionSeleccionada(null);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl shadow-2xs transition active:scale-95 cursor-pointer"
                >
                  <span>{notificacionSeleccionada.NotificacionDatos.accion.texto || 'Ir al Módulo'}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
