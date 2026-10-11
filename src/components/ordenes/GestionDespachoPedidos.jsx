import React, { useState, useEffect, useCallback } from 'react';
import {
  PackageCheck,
  Search,
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
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { sileo } from 'sileo';
import api from '../../services/api';
import DespachoKPICards from './DespachoKPICards';
import ModalDespachoPedido from './ModalDespachoPedido';
import StyledSelect from '../dashboard/filters/StyledSelect';
import StyledDatePicker from '../common/StyledDatePicker';

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
    per_page: 10
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
          per_page: paginatedData.per_page || 10
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
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Boxes className="w-3.5 h-3.5 text-amber-500" /> En Preparación
          </span>
        );
      case 'ENTREGADO_COMPLETO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Entregado 100%
          </span>
        );
      case 'ENTREGADO_CON_FALTANTE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">
            <AlertTriangle className="w-3.5 h-3.5 text-orange-500" /> Entregado con Faltante
          </span>
        );
      case 'RECHAZADO_ROTURA':
      case 'RECHAZADO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 text-rose-500" /> Rechazado (Rotura)
          </span>
        );
      case 'ENTREGADO_PARCIAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Entregado Parcial
          </span>
        );
      case 'PENDIENTE':
      case 'PENDIENTE_DESPACHO':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3.5 h-3.5 text-blue-500" /> Por Despachar
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER DE LA SECCIÓN */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 shadow-2xs">
              <PackageCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Despacho y Verificación de Pedidos
              </h1>
              <p className="text-xs text-slate-500">
                Gestión logística de salida: verificación física de inventario antes de la entrega y auditoría de roturas
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => cargarPedidos(paginacion.current_page)}
          disabled={isLoading}
          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs flex items-center gap-2 transition cursor-pointer self-start md:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          <span>Actualizar Lista</span>
        </button>
      </div>

      {/* Tarjetas KPI en vivo */}
      <DespachoKPICards kpis={kpis} onFiltroRapido={handleFiltroRapido} />

      {/* FILTROS Y BUSCADOR */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* BUSCADOR */}
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && cargarPedidos(1)}
            placeholder="Buscar por orden o cliente..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-700 focus:outline-hidden focus:border-blue-500 transition"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* SELECTOR DE ESTADOS */}
          <StyledSelect
            value={filtroEstado}
            onChange={(v) => setFiltroEstado(v)}
            options={[
              { value: '', label: 'Todos los Estados' },
              { value: 'PENDIENTE', label: 'Por Despachar (Pendientes)' },
              { value: 'EN_PREPARACION', label: 'En Preparación (Picking)' },
              { value: 'ENTREGADO_COMPLETO', label: 'Entregado 100% Conforme' },
              { value: 'ENTREGADO_CON_FALTANTE', label: 'Entregado con Faltante' },
              { value: 'RECHAZADO_ROTURA', label: 'Rechazado por Rotura' },
            ]}
            panelWidth={240}
            ariaLabel="Filtrar por estado de despacho"
          />

          {/* RANGO DE FECHAS */}
          <div className="flex items-center gap-2">
            <StyledDatePicker
              value={fechaDesde}
              onChange={(v) => setFechaDesde(v)}
              size="sm"
              max={fechaHasta || undefined}
              ariaLabel="Fecha desde"
            />
            <span className="text-slate-400 text-xs">a</span>
            <StyledDatePicker
              value={fechaHasta}
              onChange={(v) => setFechaHasta(v)}
              size="sm"
              min={fechaDesde || undefined}
              ariaLabel="Fecha hasta"
            />
          </div>

          {(searchTerm || filtroEstado || fechaDesde || fechaHasta) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFiltroEstado('');
                setFechaDesde('');
                setFechaHasta('');
              }}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Limpiar
            </button>
          )}

          <button
            onClick={() => cargarPedidos(1)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Buscar</span>
          </button>
        </div>
      </div>

      {/* TABLA PRINCIPAL DE PEDIDOS */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-24 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-600" />
            <p className="text-xs font-medium">Cargando pedidos de despacho...</p>
          </div>
        ) : pedidos.length === 0 ? (
          <div className="py-20 text-center text-slate-400 space-y-2">
            <Boxes className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">No se encontraron pedidos</p>
            <p className="text-xs text-slate-400">Intenta cambiar los términos de búsqueda o filtros de estado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider select-none">
                  <th className="py-3.5 px-4">Orden</th>
                  <th className="py-3.5 px-4">Cliente</th>
                  <th className="py-3.5 px-4">Canal</th>
                  <th className="py-3.5 px-4">Modalidad</th>
                  <th className="py-3.5 px-4">Fecha Pedido</th>
                  <th className="py-3.5 px-4 text-right">Total Pedido</th>
                  <th className="py-3.5 px-4 text-right">Total Despachado</th>
                  <th className="py-3.5 px-4 text-center">Estado Despacho</th>
                  <th className="py-3.5 px-4 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pedidos.map((p) => {
                  const estado = p.PedidoEstadoDespacho;
                  const esCerrado = ['ENTREGADO_COMPLETO', 'ENTREGADO_CON_FALTANTE', 'RECHAZADO_ROTURA', 'RECHAZADO', 'DEVUELTO'].includes(estado);
                  const enPrep = estado === 'EN_PREPARACION';

                  return (
                    <tr key={p.PedidoId} className="hover:bg-slate-50/70 transition-colors">
                      {/* Código */}
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-600">
                        {p.PedidoId}
                      </td>

                      {/* Cliente */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">{p.ClienteNombre}</div>
                        {p.ClienteTelefono && (
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                            <User className="w-2.5 h-2.5" /> {p.ClienteTelefono}
                          </span>
                        )}
                      </td>

                      {/* Canal */}
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 text-[11px]">
                          {p.canal || 'Tienda Presencial'}
                        </span>
                      </td>

                      {/* Modalidad */}
                      <td className="py-3.5 px-4">
                        {p.PedidoEsDelivery === 'S' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            <Truck className="w-3 h-3" /> Delivery
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            Mostrador
                          </span>
                        )}
                      </td>

                      {/* Fecha */}
                      <td className="py-3.5 px-4 text-slate-600 font-medium font-mono text-[11px]">
                        {p.PedidoFecha ? p.PedidoFecha.substring(0, 16).replace('T', ' ') : '—'}
                      </td>

                      {/* Total Original */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-800">
                        S/ {Number(p.PedidoTotal || 0).toFixed(2)}
                      </td>

                      {/* Total Despachado */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold">
                        {p.PedidoTotalDespachado != null ? (
                          <span className={p.PedidoTieneFaltante === 'S' ? 'text-amber-600' : 'text-emerald-600'}>
                            S/ {Number(p.PedidoTotalDespachado).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Estado */}
                      <td className="py-3.5 px-4 text-center">
                        {renderBadgeEstado(estado, p.PedidoTieneFaltante)}
                      </td>

                      {/* Acciones */}
                      <td className="py-3.5 px-4 text-center">
                        {esCerrado ? (
                          <button
                            onClick={() => handleVerDetalle(p)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer text-xs"
                            title="Ver detalle del despacho"
                          >
                            <Eye className="w-4 h-4" />
                            <span className="font-semibold">Ver</span>
                          </button>
                        ) : enPrep ? (
                          <button
                            onClick={() => handleAbrirDespacho(p)}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs inline-flex items-center gap-1.5"
                          >
                            <span>Continuar</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAbrirDespacho(p)}
                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs inline-flex items-center gap-1.5"
                          >
                            <span>Despachar</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINACIÓN estilo captura: Filas por página + < 1 / 2 > */}
        {!isLoading && (
          <div className="px-4 py-3 bg-white border-t border-slate-200 flex items-center justify-end gap-4 text-xs text-slate-500 rounded-b-2xl">
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Filas por página:</span>
              <StyledSelect
                value={paginacion.per_page}
                onChange={(v) => {
                  setPaginacion((prev) => ({
                    ...prev,
                    per_page: Number(v),
                    current_page: 1,
                  }));
                }}
                options={[
                  { value: 10, label: '10' },
                  { value: 25, label: '25' },
                  { value: 50, label: '50' },
                ]}
                panelWidth={200}
                ariaLabel="Filas por página"
              />
            </div>

            <div className="flex items-center gap-1">
              <button
                disabled={paginacion.current_page <= 1}
                onClick={() => cargarPedidos(paginacion.current_page - 1)}
                className="p-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                title="Página anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-2 font-medium text-slate-700 tabular-nums">
                {paginacion.current_page} / {paginacion.last_page || 1}
              </span>

              <button
                disabled={paginacion.current_page >= (paginacion.last_page || 1)}
                onClick={() => cargarPedidos(paginacion.current_page + 1)}
                className="p-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                title="Página siguiente"
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
