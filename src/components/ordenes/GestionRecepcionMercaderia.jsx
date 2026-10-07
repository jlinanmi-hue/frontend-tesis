import React, { useState, useEffect, useCallback } from 'react';
import {
  PackageCheck,
  Search,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RefreshCw,
  History,
  AlertTriangle,
  Building2,
  Calendar,
  Layers,
  FileText,
  Boxes,
  ArrowRight
} from 'lucide-react';
import { sileo } from 'sileo';
import api from '../../services/api';
import ModalRecepcionMercaderia from './ModalRecepcionMercaderia';
import ModalHistorialRecepcion from './ModalHistorialRecepcion';
import ModalAnularRecepcion from './ModalAnularRecepcion';
import StyledSelect from '../dashboard/filters/StyledSelect';

export default function GestionRecepcionMercaderia() {
  const [ordenes, setOrdenes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [expandedOrdenId, setExpandedOrdenId] = useState(null);
  const [paginacion, setPaginacion] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
    per_page: 10
  });

  // Modales
  const [ordenParaRecepcion, setOrdenParaRecepcion] = useState(null);
  const [showModalRecepcion, setShowModalRecepcion] = useState(false);
  const [ordenParaHistorial, setOrdenParaHistorial] = useState(null);
  const [showModalHistorial, setShowModalHistorial] = useState(false);
  const [ordenParaAnular, setOrdenParaAnular] = useState(null);
  const [showModalAnular, setShowModalAnular] = useState(false);

  // Estadísticas locales de conteo
  const [stats, setStats] = useState({
    porAtender: 0,
    parciales: 0,
    cerradasConforme: 0,
    cerradasFaltante: 0
  });

  const cargarOrdenes = useCallback(async (page = 1) => {
    setIsLoading(true);
    try {
      const params = {
        page,
        per_page: paginacion.per_page,
        search: searchTerm.trim() || undefined,
        estado: filtroEstado || undefined
      };

      const res = await api.ordenesCompra.listar(params);
      if (res?.success) {
        const items = res.data?.data || res.data || [];
        setOrdenes(items);

        if (res.data?.current_page) {
          setPaginacion({
            current_page: res.data.current_page,
            last_page: res.data.last_page,
            total: res.data.total,
            per_page: res.data.per_page
          });
        }

        // Calcular conteos rápidos si tenemos el listado completo o de página
        let countPorAtender = 0;
        let countParciales = 0;
        let countConformes = 0;
        let countFaltantes = 0;

        items.forEach((oc) => {
          const st = oc.estado || oc.Orden_CompraEstado;
          if (st === 'EMITIDA' || st === 'PENDIENTE_RECEPCION' || st === 'BORRADOR' || st === 'ENVIADA' || st === 'P') {
            countPorAtender++;
          } else if (st === 'RECEPCION_PARCIAL' || st === 'EN_RECEPCION') {
            countParciales++;
            countPorAtender++;
          } else if (st === 'CERRADA_CONFORME' || st === 'CERRADA' || st === 'C') {
            countConformes++;
          } else if (st === 'CERRADA_CON_FALTANTE') {
            countFaltantes++;
          }
        });

        setStats({
          porAtender: countPorAtender,
          parciales: countParciales,
          cerradasConforme: countConformes,
          cerradasFaltante: countFaltantes
        });
      } else {
        throw new Error(res?.message || 'No se pudieron cargar las órdenes de compra.');
      }
    } catch (err) {
      console.error('Error cargando órdenes para recepción:', err);
      sileo.error({
        title: 'Error de Conexión',
        description: err.message || 'Error al obtener órdenes de compra.'
      });
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, filtroEstado, paginacion.per_page]);

  useEffect(() => {
    cargarOrdenes(1);
  }, [cargarOrdenes]);

  const toggleExpand = (ordenId) => {
    setExpandedOrdenId((prev) => (prev === ordenId ? null : ordenId));
  };

  const handleAbrirRecepcion = (oc) => {
    const id = oc.id || oc.Orden_CompraId;
    setOrdenParaRecepcion(id);
    setShowModalRecepcion(true);
  };

  const handleAbrirHistorial = (oc) => {
    const id = oc.id || oc.Orden_CompraId;
    setOrdenParaHistorial(id);
    setShowModalHistorial(true);
  };

  const handleAbrirAnulacion = (oc) => {
    const id = oc.id || oc.Orden_CompraId;
    setOrdenParaAnular(id);
    setShowModalAnular(true);
  };

  const renderBadgeEstado = (estado) => {
    switch (estado) {
      case 'EMITIDA':
      case 'BORRADOR':
      case 'ENVIADA':
      case 'PENDIENTE_RECEPCION':
      case 'P':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3.5 h-3.5 text-blue-500" />
            Emitida
          </span>
        );
      case 'RECEPCION_PARCIAL':
      case 'EN_RECEPCION':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <RefreshCw className="w-3.5 h-3.5 text-amber-500 animate-spin" />
            Recepción Parcial
          </span>
        );
      case 'CERRADA_CONFORME':
      case 'CERRADA':
      case 'C':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            Cerrada Conforme
          </span>
        );
      case 'CERRADA_CON_FALTANTE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">
            <AlertCircle className="w-3.5 h-3.5 text-orange-500" />
            Cerrada con Faltante
          </span>
        );
      case 'ANULADA':
      case 'A':
      case 'CANCELADA_PROVEEDOR':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 text-rose-500" />
            Anulada
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
            {estado || 'N/A'}
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
                Recepción de Mercadería
              </h1>
              <p className="text-xs text-slate-500">
                Verificación física de ingresos, control de faltantes y carga inmutable de stock al Kárdex
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => cargarOrdenes(paginacion.current_page)}
          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs flex items-center gap-2 transition cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Actualizar Lista</span>
        </button>
      </div>

      {/* TARJETAS DE INDICADORES (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div 
          onClick={() => setFiltroEstado('EMITIDA')}
          className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs hover:border-blue-300 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Por Atender / Emitidas</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-800">{stats.porAtender}</span>
            <span className="text-[11px] text-slate-400">órdenes</span>
          </div>
        </div>

        <div 
          onClick={() => setFiltroEstado('RECEPCION_PARCIAL')}
          className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs hover:border-amber-300 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">En Recepción Parcial</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <RefreshCw className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-700">{stats.parciales}</span>
            <span className="text-[11px] text-slate-400">en proceso</span>
          </div>
        </div>

        <div 
          onClick={() => setFiltroEstado('CERRADA_CONFORME')}
          className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs hover:border-emerald-300 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Cerradas Conforme</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700">{stats.cerradasConforme}</span>
            <span className="text-[11px] text-slate-400">100% completas</span>
          </div>
        </div>

        <div 
          onClick={() => setFiltroEstado('CERRADA_CON_FALTANTE')}
          className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs hover:border-orange-300 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Cerradas con Faltante</span>
            <div className="p-2 bg-orange-50 text-orange-600 rounded-xl">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-orange-700">{stats.cerradasFaltante}</span>
            <span className="text-[11px] text-slate-400">incompletas</span>
          </div>
        </div>
      </div>

      {/* FILTROS Y BUSCADOR */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* BUSCADOR */}
        <div className="relative flex-1 min-w-[260px] max-w-md">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && cargarOrdenes(1)}
            placeholder="Buscar por código de orden (OC-00028) o proveedor..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-700 focus:outline-hidden focus:border-blue-500 transition"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        {/* SELECTOR DE ESTADOS OFICIALES */}
        <div className="flex items-center gap-2 flex-wrap">
          <StyledSelect
            value={filtroEstado}
            onChange={(v) => setFiltroEstado(v)}
            options={[
              { value: '', label: 'Todos los Estados' },
              { value: 'EMITIDA', label: 'Emitida' },
              { value: 'RECEPCION_PARCIAL', label: 'En Recepción Parcial' },
              { value: 'CERRADA_CONFORME', label: 'Cerrada Conforme' },
              { value: 'CERRADA_CON_FALTANTE', label: 'Cerrada con Faltante' },
              { value: 'ANULADA', label: 'Anulada' },
            ]}
            panelWidth={230}
            ariaLabel="Filtrar por estado de recepción"
          />

          {(searchTerm || filtroEstado) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFiltroEstado('');
              }}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Limpiar
            </button>
          )}

          <button
            onClick={() => cargarOrdenes(1)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Buscar</span>
          </button>
        </div>
      </div>

      {/* TABLA PRINCIPAL DE ÓRDENES CON FILAS EXPANDIBLES (ACORDEÓN) */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-24 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-600" />
            <p className="text-xs font-medium">Cargando órdenes de recepción de mercadería...</p>
          </div>
        ) : ordenes.length === 0 ? (
          <div className="py-20 text-center text-slate-400 space-y-2">
            <Boxes className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">No se encontraron órdenes de compra</p>
            <p className="text-xs text-slate-400">Intenta cambiar los términos de búsqueda o filtros de estado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider select-none">
                  <th className="py-3.5 px-3 w-10 text-center"></th>
                  <th className="py-3.5 px-3">Código OC</th>
                  <th className="py-3.5 px-3">F. Emisión</th>
                  <th className="py-3.5 px-3">F. Estimada</th>
                  <th className="py-3.5 px-3">Proveedor</th>
                  <th className="py-3.5 px-2 text-center">Ítems</th>
                  <th className="py-3.5 px-3 text-center">Estado</th>
                  <th className="py-3.5 px-3 text-center">Acciones de Recepción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ordenes.map((oc) => {
                  const ocId = oc.id || oc.Orden_CompraId;
                  const isExpanded = expandedOrdenId === ocId;
                  const estado = oc.estado || oc.Orden_CompraEstado;
                  const provNombre = oc.proveedor?.razon_social || oc.proveedor?.ProveedorRazonSocial || 'Sin Proveedor';
                  const provRuc = oc.proveedor?.ruc || oc.proveedor?.ProveedorRuc;
                  const fEmision = oc.fecha_emision || oc.fecha_formateada || (oc.fecha ? new Date(oc.fecha).toLocaleDateString('es-PE') : '-');
                  const fEstimada = oc.fecha_entrega_estimada || oc.fecha_estimada_llegada_formateada || oc.fecha_estimada_llegada || '-';
                  const detalles = oc.detalles || [];
                  const totalItems = oc.total_items ?? detalles.length;

                  const puedeRecepcionar = estado === 'EMITIDA' || estado === 'RECEPCION_PARCIAL' || estado === 'PENDIENTE_RECEPCION' || estado === 'EN_RECEPCION' || estado === 'P';
                  const esCerrada = estado === 'CERRADA_CONFORME' || estado === 'CERRADA_CON_FALTANTE' || estado === 'CERRADA' || estado === 'C';
                  const esAnulada = estado === 'ANULADA' || estado === 'A';

                  return (
                    <React.Fragment key={ocId}>
                      {/* FILA PRINCIPAL DE LA ORDEN */}
                      <tr 
                        className={`transition cursor-pointer ${
                          isExpanded 
                            ? 'bg-blue-50/40' 
                            : 'hover:bg-slate-50/70'
                        }`}
                        onClick={() => toggleExpand(ocId)}
                      >
                        <td className="py-3.5 px-3 text-center text-slate-400">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-blue-600 mx-auto" />
                          ) : (
                            <ChevronRight className="w-4 h-4 mx-auto" />
                          )}
                        </td>
                        <td className="py-3.5 px-3 font-mono font-bold text-blue-600">
                          {ocId}
                        </td>
                        <td className="py-3.5 px-3 text-slate-600 font-medium">
                          {fEmision}
                        </td>
                        <td className="py-3.5 px-3 text-slate-500 font-medium">
                          {fEstimada}
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="font-bold text-slate-800">{provNombre}</div>
                          {provRuc && <div className="text-[10px] text-slate-400 font-mono">RUC: {provRuc}</div>}
                        </td>
                        <td className="py-3.5 px-2 text-center">
                          <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                            {totalItems} prod.
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          {renderBadgeEstado(estado)}
                        </td>
                        <td 
                          className="py-3.5 px-3 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            {puedeRecepcionar && (
                              <button
                                onClick={() => handleAbrirRecepcion(oc)}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                                title="Ingresar productos al inventario físico"
                              >
                                <PackageCheck className="w-3.5 h-3.5" />
                                <span>Recepcionar</span>
                              </button>
                            )}

                            <button
                              onClick={() => handleAbrirHistorial(oc)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                              title="Ver Auditoría y Asientos en Kárdex"
                            >
                              <History className="w-4 h-4" />
                            </button>

                            {puedeRecepcionar && (
                              <button
                                onClick={() => handleAbrirAnulacion(oc)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                title="Rechazar / Anular Orden"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* FILA EXPANDIBLE: LISTA COMPLETA DE PRODUCTOS */}
                      {isExpanded && (
                        <tr className="bg-slate-50/70 border-b border-slate-200">
                          <td colSpan={8} className="p-4 pl-12 pr-6">
                            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
                              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                <div className="flex items-center gap-2">
                                  <FileText className="w-4 h-4 text-blue-600" />
                                  <span className="font-bold text-xs text-slate-800">
                                    Detalle de Productos Solicitados para {ocId}
                                  </span>
                                  <span className="text-[11px] text-slate-400">
                                    ({detalles.length} referencias requeridas)
                                  </span>
                                </div>

                                {puedeRecepcionar && (
                                  <button
                                    onClick={() => handleAbrirRecepcion(oc)}
                                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                                  >
                                    <PackageCheck className="w-3.5 h-3.5" />
                                    <span>Comenzar Carga de Stock</span>
                                  </button>
                                )}
                              </div>

                              {detalles.length === 0 ? (
                                <p className="text-xs text-slate-400 py-3 text-center">
                                  No hay ítems registrados en el detalle de esta orden.
                                </p>
                              ) : (
                                <div className="overflow-x-auto border border-slate-100 rounded-lg">
                                  <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                      <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-200">
                                        <th className="py-2 px-3 w-10 text-center">#</th>
                                        <th className="py-2 px-3">Producto</th>
                                        <th className="py-2 px-2 text-center">Presentación</th>
                                        <th className="py-2 px-3 text-center">Cant. Solicitada</th>
                                        <th className="py-2 px-3 text-center">Cant. Recibida</th>
                                        <th className="py-2 px-3 text-center">Pendiente</th>
                                        <th className="py-2 px-3 text-center">Estado Ítem</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {detalles.map((d, index) => {
                                        const prodNombre = d.producto_nombre || d.producto?.ProductoNombre || 'Producto';
                                        const marca = d.producto_marca || d.producto?.ProductoMarca || '';
                                        const unidadAbrev = d.unidad_medida_abreviatura || d.unidad_abreviatura || d.unidad_medida?.unidades_medidaAbreviatura || d.unidad_nombre || 'UND';
                                        const factor = Number(d.factor_conversion || 1);
                                        const cantSol = Number(d.cantidad || d.Detalle_Orden_CompraCantidad || 0);
                                        const cantRec = Number(d.cantidad_recibida || 0);
                                        const cantPend = Number(d.cantidad_pendiente ?? Math.max(0, cantSol - cantRec));
                                        const estadoItem = d.estado_recepcion || (cantRec >= cantSol ? 'COMPLETO' : cantRec > 0 ? 'PARCIAL' : 'PENDIENTE');

                                        return (
                                          <tr key={d.id || index} className="hover:bg-slate-50/50">
                                            <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">
                                              {index + 1}
                                            </td>
                                            <td className="py-2 px-3">
                                              <span className="font-bold text-slate-800 block">{prodNombre}</span>
                                              {marca && <span className="text-[10px] text-slate-400">Marca: {marca}</span>}
                                            </td>
                                            <td className="py-2 px-2 text-center">
                                              <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md text-[11px] border border-slate-200">
                                                {unidadAbrev}
                                              </span>
                                              {factor > 1 && (
                                                <div className="text-[10px] text-blue-600 font-medium mt-0.5">
                                                  x {factor} unidades
                                                </div>
                                              )}
                                            </td>
                                            <td className="py-2 px-3 text-center">
                                              <div className="font-bold text-slate-700">{cantSol}</div>
                                              {factor > 1 && (
                                                <div className="text-[10px] text-slate-400">({cantSol * factor} unid. físicas)</div>
                                              )}
                                            </td>
                                            <td className="py-2 px-3 text-center">
                                              <div className="font-bold text-emerald-600">{cantRec}</div>
                                              {factor > 1 && (
                                                <div className="text-[10px] text-emerald-600/70">({cantRec * factor} unid. físicas)</div>
                                              )}
                                            </td>
                                            <td className="py-2 px-3 text-center">
                                              <div className="font-bold text-amber-600">{cantPend}</div>
                                              {factor > 1 && (
                                                <div className="text-[10px] text-amber-600/70">({cantPend * factor} unid. físicas)</div>
                                              )}
                                            </td>
                                            <td className="py-2 px-3 text-center">
                                              {estadoItem === 'COMPLETO' ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                  Completo
                                                </span>
                                              ) : estadoItem === 'PARCIAL' ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                  <Clock className="w-3 h-3 text-amber-600" />
                                                  Parcial
                                                </span>
                                              ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                                  Pendiente
                                                </span>
                                              )}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
                onClick={() => cargarOrdenes(paginacion.current_page - 1)}
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
                onClick={() => cargarOrdenes(paginacion.current_page + 1)}
                className="p-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                title="Página siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODALES CONECTADOS */}
      <ModalRecepcionMercaderia
        isOpen={showModalRecepcion}
        onClose={() => setShowModalRecepcion(false)}
        ordenId={ordenParaRecepcion}
        onRecepcionFinalizada={() => cargarOrdenes(paginacion.current_page)}
      />

      <ModalHistorialRecepcion
        isOpen={showModalHistorial}
        onClose={() => setShowModalHistorial(false)}
        ordenId={ordenParaHistorial}
      />

      <ModalAnularRecepcion
        isOpen={showModalAnular}
        onClose={() => setShowModalAnular(false)}
        ordenId={ordenParaAnular}
        onAnulacionExitosa={() => cargarOrdenes(paginacion.current_page)}
      />
    </div>
  );
}
