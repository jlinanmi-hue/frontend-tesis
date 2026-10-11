import React, { useState, useEffect, useCallback } from 'react';
import {
  PackageCheck,
  Search,
  Filter,
  RefreshCw,
  Clock,
  Boxes,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Truck,
  User,
  ArrowRight,
  Eye,
  Calendar,
  Building2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { sileo } from 'sileo';
import api from '../../services/api';
import DespachoKPICards from './DespachoKPICards';
import ModalDespachoPedido from './ModalDespachoPedido';

export default function GestionDespachoPedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [kpis, setKpis] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  // Paginación
  const [paginacion, setPaginacion] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
    per_page: 15
  });

  // Modal de Despacho
  const [pedidoSeleccionadoId, setPedidoSeleccionadoId] = useState(null);
  const [showModalDespacho, setShowModalDespacho] = useState(false);

  const cargarPedidos = useCallback(async (page = 1) => {
    setIsLoading(true);
    try {
      const params = {
        page,
        per_page: paginacion.per_page,
        search: searchTerm.trim() || undefined,
        estado_despacho: filtroEstado || undefined,
        fecha_desde: fechaDesde || undefined,
        fecha_hasta: fechaHasta || undefined
      };

      const res = await api.despacho.listar(params);
      if (res?.success) {
        const paginatedData = res.data;
        setPedidos(paginatedData.data || []);
        setKpis(res.kpis || {});
        setPaginacion({
          current_page: paginatedData.current_page || 1,
          last_page: paginatedData.last_page || 1,
          total: paginatedData.total || 0,
          per_page: paginatedData.per_page || 15
        });
      } else {
        throw new Error(res?.message || 'Error al listar pedidos');
      }
    } catch (err) {
      console.error('Error cargando bandeja de despacho:', err);
      sileo.error({
        title: 'Error de Conexión',
        description: err.message || 'No se pudo cargar la bandeja de despacho.'
      });
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, filtroEstado, fechaDesde, fechaHasta, paginacion.per_page]);

  useEffect(() => {
    cargarPedidos(1);
  }, [cargarPedidos]);

  const handleAbrirDespacho = async (pedido) => {
    const estado = pedido.PedidoEstadoDespacho;

    // Si está pendiente, iniciamos la preparación automáticamente
    if (!estado || estado === 'PENDIENTE' || estado === 'PENDIENTE_DESPACHO') {
      try {
        await api.despacho.iniciar(pedido.PedidoId);
        sileo.info({
          title: 'Preparación Iniciada',
          description: `Pedido ${pedido.PedidoId} pasó a estado EN_PREPARACION.`
        });
      } catch (err) {
        console.warn('Iniciando sin actualizar backend:', err);
      }
    }

    setPedidoSeleccionadoId(pedido.PedidoId);
    setShowModalDespacho(true);
  };

  const handleVerDetalle = (pedido) => {
    setPedidoSeleccionadoId(pedido.PedidoId);
    setShowModalDespacho(true);
  };

  const handleFiltroRapido = (estado) => {
    setFiltroEstado((prev) => (prev === estado ? '' : estado));
  };

  const renderBadgeEstado = (estado, tieneFaltante) => {
    switch (estado) {
      case 'EN_PREPARACION':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30 animate-pulse">
            <Boxes className="w-3.5 h-3.5" /> En Preparación
          </span>
        );
      case 'ENTREGADO_COMPLETO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" /> Entregado 100%
          </span>
        );
      case 'ENTREGADO_CON_FALTANTE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-3.5 h-3.5" /> Entregado con Faltante
          </span>
        );
      case 'RECHAZADO_ROTURA':
      case 'RECHAZADO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <XCircle className="w-3.5 h-3.5" /> Rechazado (Rotura)
          </span>
        );
      case 'ENTREGADO_PARCIAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
            <AlertTriangle className="w-3.5 h-3.5" /> Entregado Parcial
          </span>
        );
      case 'PENDIENTE':
      case 'PENDIENTE_DESPACHO':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Clock className="w-3.5 h-3.5" /> Por Despachar
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Título de la sección */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <PackageCheck className="w-6 h-6 text-blue-400" />
            Despacho y Verificación de Pedidos
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Gestión logística de salida: verificación física de inventario antes de la entrega y auditoría de roturas
          </p>
        </div>

        <button
          onClick={() => cargarPedidos(paginacion.current_page)}
          disabled={isLoading}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 border border-slate-700 rounded-xl transition-all self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* Tarjetas KPI en vivo */}
      <DespachoKPICards kpis={kpis} onFiltroRapido={handleFiltroRapido} />

      {/* Barra de Filtros */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          
          {/* Búsqueda */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por orden o cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Filtro Estado */}
          <div>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="">Todos los Estados</option>
              <option value="PENDIENTE">Por Despachar (Pendientes)</option>
              <option value="EN_PREPARACION">En Preparación (Picking)</option>
              <option value="ENTREGADO_COMPLETO">Entregado 100% Conforme</option>
              <option value="ENTREGADO_CON_FALTANTE">Entregado con Faltante</option>
              <option value="RECHAZADO_ROTURA">Rechazado por Rotura</option>
            </select>
          </div>

          {/* Fecha Desde */}
          <div>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Fecha Hasta */}
          <div>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>

        </div>
      </div>

      {/* Tabla de Pedidos */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-800/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <th className="py-3 px-4">Orden</th>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">Canal</th>
                <th className="py-3 px-4">Modalidad</th>
                <th className="py-3 px-4">Fecha Pedido</th>
                <th className="py-3 px-4 text-right">Total Pedido</th>
                <th className="py-3 px-4 text-right">Total Despachado</th>
                <th className="py-3 px-4 text-center">Estado Despacho</th>
                <th className="py-3 px-4 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 mx-auto animate-spin text-blue-400 mb-2" />
                    Cargando pedidos de despacho...
                  </td>
                </tr>
              ) : pedidos.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <Boxes className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    No se encontraron pedidos con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                pedidos.map((p) => {
                  const estado = p.PedidoEstadoDespacho;
                  const esCerrado = ['ENTREGADO_COMPLETO', 'ENTREGADO_CON_FALTANTE', 'RECHAZADO_ROTURA', 'RECHAZADO', 'DEVUELTO'].includes(estado);
                  const enPrep = estado === 'EN_PREPARACION';

                  return (
                    <tr key={p.PedidoId} className="hover:bg-slate-800/40 transition-colors">
                      {/* Código */}
                      <td className="py-3 px-4 font-mono font-bold text-blue-400">
                        {p.PedidoId}
                      </td>

                      {/* Cliente */}
                      <td className="py-3 px-4">
                        <p className="font-medium text-slate-200">{p.ClienteNombre}</p>
                        {p.ClienteTelefono && (
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <User className="w-2.5 h-2.5" /> {p.ClienteTelefono}
                          </span>
                        )}
                      </td>

                      {/* Canal */}
                      <td className="py-3 px-4 text-slate-300">
                        <span className="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60 text-[10px]">
                          {p.canal || 'Tienda Presencial'}
                        </span>
                      </td>

                      {/* Modalidad */}
                      <td className="py-3 px-4">
                        {p.PedidoEsDelivery === 'S' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-full">
                            <Truck className="w-3 h-3" /> Delivery
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 bg-slate-800/60 border border-slate-700 px-2 py-0.5 rounded-full">
                            Mostrador
                          </span>
                        )}
                      </td>

                      {/* Fecha */}
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                        {p.PedidoFecha ? p.PedidoFecha.substring(0, 16).replace('T', ' ') : '—'}
                      </td>

                      {/* Total Original */}
                      <td className="py-3 px-4 text-right font-mono font-medium text-slate-200">
                        S/ {Number(p.PedidoTotal || 0).toFixed(2)}
                      </td>

                      {/* Total Despachado */}
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        {p.PedidoTotalDespachado != null ? (
                          <span className={p.PedidoTieneFaltante === 'S' ? 'text-amber-400' : 'text-emerald-400'}>
                            S/ {Number(p.PedidoTotalDespachado).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>

                      {/* Estado */}
                      <td className="py-3 px-4 text-center">
                        {renderBadgeEstado(estado, p.PedidoTieneFaltante)}
                      </td>

                      {/* Acciones */}
                      <td className="py-3 px-4 text-center">
                        {esCerrado ? (
                          <button
                            onClick={() => handleVerDetalle(p)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700 cursor-pointer"
                          >
                            <Eye className="w-3 h-3" /> Ver
                          </button>
                        ) : enPrep ? (
                          <button
                            onClick={() => handleAbrirDespacho(p)}
                            className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 rounded-lg shadow-md shadow-blue-900/30 transition-all cursor-pointer font-semibold animate-pulse"
                          >
                            <span>Continuar</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAbrirDespacho(p)}
                            className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-slate-900 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 rounded-lg shadow-md shadow-amber-900/20 transition-all cursor-pointer font-semibold"
                          >
                            <span>Despachar</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Barra de Paginación */}
        {paginacion.total > 0 && (
          <div className="flex items-center justify-between p-3.5 border-t border-slate-800 text-xs text-slate-400 bg-slate-950/40">
            <div>
              Mostrando página <span className="text-slate-200 font-medium">{paginacion.current_page}</span> de{' '}
              <span className="text-slate-200 font-medium">{paginacion.last_page}</span> ({paginacion.total} pedidos)
            </div>

            <div className="flex items-center gap-1">
              <button
                disabled={paginacion.current_page <= 1 || isLoading}
                onClick={() => cargarPedidos(paginacion.current_page - 1)}
                className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={paginacion.current_page >= paginacion.last_page || isLoading}
                onClick={() => cargarPedidos(paginacion.current_page + 1)}
                className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Despacho y Verificación */}
      <ModalDespachoPedido
        isOpen={showModalDespacho}
        onClose={() => {
          setShowModalDespacho(false);
          setPedidoSeleccionadoId(null);
        }}
        pedidoId={pedidoSeleccionadoId}
        onDespachoFinalizado={() => cargarPedidos(paginacion.current_page)}
      />

    </div>
  );
}
