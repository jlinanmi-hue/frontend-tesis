import React, { useState, useEffect, useMemo } from 'react';
import {
  PackageCheck,
  CheckCircle2,
  AlertTriangle,
  X,
  XCircle,
  RotateCcw,
  Check,
  Truck,
  User,
  Clock,
  Boxes,
  Building2,
  DollarSign,
  ArrowRight,
  Eye
} from 'lucide-react';
import { sileo } from 'sileo';
import api from '../../services/api';
import ModalRechazoDespacho from './ModalRechazoDespacho';

export default function ModalDespachoPedido({
  isOpen,
  onClose,
  pedidoId,
  onDespachoFinalizado
}) {
  const [pedido, setPedido] = useState(null);
  const [items, setItems] = useState([]);
  const [cantidadesDespacho, setCantidadesDespacho] = useState({});
  const [itemEstados, setItemEstados] = useState({}); // { [id]: 'PENDIENTE' | 'CONFIRMADO' | 'RECHAZADO' }
  const [observacionesItem, setObservacionesItem] = useState({});
  const [observacionGeneral, setObservacionGeneral] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Modal de rechazo por desistimiento
  const [showModalRechazo, setShowModalRechazo] = useState(false);

  // Determinar si el pedido ya fue finalizado (modo solo lectura para Ver Detalle)
  const esCerrado = useMemo(() => {
    const estadoDespacho = pedido?.PedidoEstadoDespacho;
    const estadoPedido = pedido?.PedidoEstado;
    return (
      ['ENTREGADO_COMPLETO', 'ENTREGADO_CON_FALTANTE', 'RECHAZADO_ROTURA', 'RECHAZADO', 'DEVUELTO', 'NO_DESPACHADO', 'ENTREGADO_PARCIAL'].includes(estadoDespacho) ||
      estadoPedido === 'C' ||
      estadoPedido === 'A'
    );
  }, [pedido]);

  useEffect(() => {
    if (isOpen && pedidoId) {
      cargarDetalle();
    }
  }, [isOpen, pedidoId]);

  const cargarDetalle = async () => {
    setIsLoading(true);
    try {
      const res = await api.despacho.obtener(pedidoId);
      if (res?.success && res?.data) {
        const ped = res.data.pedido;
        const itms = res.data.items || [];
        setPedido(ped);
        setItems(itms);

        const initCant = {};
        const initEstados = {};
        const initObs = {};

        itms.forEach((it) => {
          const id = it.Detalle_Pedido_ProductosId;
          const solicitada = Number(it.cantidad_solicitada || 0);
          const despPrevia = it.cantidad_despachada != null ? Number(it.cantidad_despachada) : solicitada;
          
          initCant[id] = despPrevia;
          initObs[id] = it.observacion_item || '';

          if (it.estado_item === 'NO_DISPONIBLE' || despPrevia === 0) {
            initEstados[id] = 'RECHAZADO';
          } else if (it.estado_item === 'VERIFICADO_OK' || despPrevia === solicitada) {
            initEstados[id] = 'CONFIRMADO';
          } else if (it.estado_item === 'CON_FALTANTE' || (despPrevia > 0 && despPrevia < solicitada)) {
            initEstados[id] = 'FALTANTE';
          } else {
            initEstados[id] = 'PENDIENTE';
          }
        });

        setCantidadesDespacho(initCant);
        setItemEstados(initEstados);
        setObservacionesItem(initObs);
        setObservacionGeneral(ped.PedidoObservacionDespacho || '');
      } else {
        throw new Error(res?.message || 'Error al cargar pedido');
      }
    } catch (err) {
      console.error('Error cargando detalle de despacho:', err);
      sileo.error({
        title: 'Error de Carga',
        description: err.message || 'No se pudo obtener el detalle del pedido.'
      });
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  // Cambio de cantidad manual en el input
  const handleCambiarCantidad = (detalleId, valor, solicitada) => {
    if (valor === '') {
      setCantidadesDespacho((prev) => ({ ...prev, [detalleId]: '' }));
      return;
    }

    const maxSolicitada = Number(solicitada || 0);
    const num = parseFloat(valor);

    if (isNaN(num) || num < 0) {
      setCantidadesDespacho((prev) => ({ ...prev, [detalleId]: 0 }));
      setItemEstados((prev) => ({ ...prev, [detalleId]: 'RECHAZADO' }));
      return;
    }

    // Validación estricta: No se puede despachar más de lo solicitado en el pedido
    if (num > maxSolicitada) {
      sileo.warning({
        title: 'Límite Máximo Superado',
        description: `No puedes despachar ${num}. El pedido solicita un máximo de ${maxSolicitada} unidades.`
      });
      setCantidadesDespacho((prev) => ({ ...prev, [detalleId]: maxSolicitada }));
      setItemEstados((prev) => ({ ...prev, [detalleId]: 'CONFIRMADO' }));
      return;
    }

    setCantidadesDespacho((prev) => ({ ...prev, [detalleId]: num }));
    setItemEstados((prev) => ({
      ...prev,
      [detalleId]: num === maxSolicitada ? 'CONFIRMADO' : num > 0 ? 'FALTANTE' : 'RECHAZADO'
    }));
  };

  // Acción 1: CONFIRMAR Ítem individual
  const handleConfirmarItem = (it) => {
    const id = it.Detalle_Pedido_ProductosId;
    const solicitada = Number(it.cantidad_solicitada || 0);
    const valor = cantidadesDespacho[id] === '' ? solicitada : Number(cantidadesDespacho[id] || 0);
    const cantFinal = Math.min(solicitada, Math.max(0, valor));

    setCantidadesDespacho((prev) => ({ ...prev, [id]: cantFinal }));

    if (cantFinal === solicitada) {
      setItemEstados((prev) => ({ ...prev, [id]: 'CONFIRMADO' }));
      sileo.success({
        title: 'Ítem Verificado 100%',
        description: `${it.producto_nombre}: ${cantFinal} unidades listas para despacho.`
      });
    } else if (cantFinal > 0) {
      setItemEstados((prev) => ({ ...prev, [id]: 'FALTANTE' }));
      sileo.warning({
        title: 'Ítem con Faltante',
        description: `${it.producto_nombre}: Despacho parcial de ${cantFinal} de ${solicitada} solicitadas.`
      });
    } else {
      setItemEstados((prev) => ({ ...prev, [id]: 'RECHAZADO' }));
      sileo.warning({
        title: 'Ítem Sin Stock',
        description: `${it.producto_nombre}: Marcado con 0 unidades.`
      });
    }
  };

  // Acción 2: RECHAZAR Ítem individual (Agotado / Sin stock)
  const handleRechazarItem = (it) => {
    const id = it.Detalle_Pedido_ProductosId;
    setCantidadesDespacho((prev) => ({ ...prev, [id]: 0 }));
    setItemEstados((prev) => ({ ...prev, [id]: 'RECHAZADO' }));
    sileo.warning({
      title: 'Ítem Rechazado / Sin Stock',
      description: `${it.producto_nombre} marcado como no disponible (0 unidades a entregar).`
    });
  };

  // Cálculos dinámicos
  const calculos = useMemo(() => {
    let totalDespachado = 0;
    let hayFaltantes = false;
    let hayExcesos = false;
    let cantItemsConFaltante = 0;
    let cantItemsConExceso = 0;
    const itemsConFaltante = [];
    const itemsConExceso = [];

    items.forEach((it) => {
      const id = it.Detalle_Pedido_ProductosId;
      const cantSolicitada = Number(it.cantidad_solicitada || 0);
      const cantDespachada = cantidadesDespacho[id] === '' ? 0 : Number(cantidadesDespacho[id] || 0);
      const precioUnit = Number(it.precio_unitario || 0);

      totalDespachado += cantDespachada * precioUnit;

      if (cantDespachada > cantSolicitada) {
        hayExcesos = true;
        cantItemsConExceso++;
        itemsConExceso.push({
          ...it,
          exceso: cantDespachada - cantSolicitada,
          cantidad_despachada: cantDespachada
        });
      }

      const faltante = Math.max(0, cantSolicitada - cantDespachada);
      if (faltante > 0) {
        hayFaltantes = true;
        cantItemsConFaltante++;
        itemsConFaltante.push({
          ...it,
          cantidad_faltante: faltante,
          cantidad_despachada: cantDespachada
        });
      }
    });

    const totalOriginal = Number(pedido?.PedidoTotal || 0);
    const diferenciaTotal = totalOriginal - totalDespachado;

    return {
      totalDespachado: Math.round(totalDespachado * 100) / 100,
      totalOriginal,
      diferenciaTotal: Math.round(diferenciaTotal * 100) / 100,
      hayFaltantes,
      hayExcesos,
      cantItemsConFaltante,
      cantItemsConExceso,
      itemsConFaltante,
      itemsConExceso
    };
  }, [items, cantidadesDespacho, pedido]);

  // CERRAR DESPACHO DE LA ORDEN (Botón verde principal)
  const handleCerrarDespacho = async () => {
    if (calculos.hayExcesos) {
      sileo.error({
        title: 'Cantidad Inválida',
        description: 'Existen productos con cantidad mayor a la solicitada. No se puede entregar más de lo pedido.'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (calculos.hayFaltantes) {
        // Cierre con Faltante aceptado por el cliente
        const obsFinal = observacionGeneral.trim() || `Despacho con faltante acordado con el cliente. ${calculos.cantItemsConFaltante} ítem(s) con faltante auditado.`;
        const payload = {
          observacion: obsFinal,
          items: items.map((it) => {
            const id = it.Detalle_Pedido_ProductosId;
            return {
              detalle_id: id,
              cantidad_despachada: cantidadesDespacho[id] === '' ? 0 : Number(cantidadesDespacho[id] || 0),
              observacion: observacionesItem[id] || (itemEstados[id] === 'RECHAZADO' ? 'Sin stock en almacén' : undefined)
            };
          })
        };

        const res = await api.despacho.faltante(pedidoId, payload);
        if (res?.success) {
          sileo.success({
            title: 'Despacho con Faltante Cerrado',
            description: `Pedido ${pedidoId} entregado conforme con consentimiento del cliente. PODE = 1, PRS = 1.`
          });
          if (onDespachoFinalizado) onDespachoFinalizado();
          onClose();
        }
      } else {
        // Cierre 100% Completo
        const res = await api.despacho.completar(pedidoId, {
          observacion: observacionGeneral.trim() || undefined
        });
        if (res?.success) {
          sileo.success({
            title: 'Despacho Completo Exitoso',
            description: `Pedido ${pedidoId} despachado al 100%. PODE = 1, PRS = 0.`
          });
          if (onDespachoFinalizado) onDespachoFinalizado();
          onClose();
        }
      }
    } catch (err) {
      if (err.status === 409) {
        sileo.warning({
          title: 'Operación Previa Detectada',
          description: 'Este pedido ya fue procesado previamente (Idempotencia).'
        });
        if (onDespachoFinalizado) onDespachoFinalizado();
        onClose();
      } else {
        sileo.error({
          title: 'Error al Cerrar Despacho',
          description: err.message || 'No se pudo completar el cierre del pedido.'
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // RECHAZO TOTAL POR DESISTIMIENTO (Cliente desiste porque faltó producto)
  const handleConfirmarRechazo = async (payload) => {
    try {
      const res = await api.despacho.rechazar(pedidoId, payload);
      if (res?.success) {
        sileo.info({
          title: 'Pedido Anulado por Desistimiento',
          description: `Pedido ${pedidoId} cancelado por falta de stock. Todo el stock fue reintegrado. PODE = 0, PRS = 1.`
        });
        if (onDespachoFinalizado) onDespachoFinalizado();
        onClose();
      }
    } catch (err) {
      if (err.status === 409) {
        sileo.warning({
          title: 'Pedido Ya Procesado',
          description: 'Este pedido ya fue procesado previamente.'
        });
        if (onDespachoFinalizado) onDespachoFinalizado();
        onClose();
      } else {
        sileo.error({
          title: 'Error al Rechazar',
          description: err.message || 'No se pudo procesar el rechazo del pedido.'
        });
        throw err;
      }
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
        <div className="bg-white w-full max-w-5xl rounded-2xl border border-slate-200 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden p-6 space-y-4">
          
          {/* HEADER DEL MODAL (Estilo captura oficial) */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 shadow-2xs">
                <PackageCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-800">
                    {esCerrado ? 'Detalle de Despacho de Mercadería' : 'Despacho Oficial de Mercadería'}
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    {pedidoId}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cliente: <span className="font-semibold text-slate-700">{pedido?.ClienteNombre || '—'}</span>
                  {' • '}
                  Canal: <span className="font-medium text-slate-600">{pedido?.canal || 'Tienda Presencial'}</span>
                  {' • '}
                  Fecha: <span className="font-mono text-slate-600">{pedido?.PedidoFecha ? pedido.PedidoFecha.substring(0, 10) : '—'}</span>
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* BANNER INFORMATIVO (Estilo captura) */}
          {esCerrado ? (
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs text-slate-700 flex items-start gap-2.5 shrink-0">
              <Eye className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <p>
                <strong>Registro de Despacho (Solo Lectura):</strong> Este pedido ya fue procesado y cerrado como{' '}
                <strong className="text-slate-900">{pedido?.PedidoEstadoDespacho || 'CERRADO'}</strong>
                {pedido?.PedidoFechaFinDespacho ? ` el ${pedido.PedidoFechaFinDespacho.substring(0, 16).replace('T', ' ')}` : ''}
                {pedido?.PedidoCerradoPor ? ` por ${pedido.PedidoCerradoPor}` : ''}.
                {pedido?.PedidoObservacionDespacho ? ` Obs: "${pedido.PedidoObservacionDespacho}".` : ''}
              </p>
            </div>
          ) : (
            <div className="bg-blue-50/60 border border-blue-200/80 rounded-xl p-3 text-xs text-blue-800 flex items-start gap-2.5 shrink-0">
              <Clock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <p>
                <strong>Control de Salida Ítem por Ítem:</strong> Valida existencias físicas antes de entregar. Los productos confirmados se despachan al cliente, y los faltantes o rechazados se auditan para el cálculo del indicador PRS.
              </p>
            </div>
          )}

          {/* TABLA PRINCIPAL DE ÍTEMS */}
          <div className="flex-1 overflow-y-auto space-y-4">
            {isLoading ? (
              <div className="py-16 text-center text-slate-400">
                <RotateCcw className="w-7 h-7 animate-spin mx-auto mb-2 text-blue-600" />
                <p className="text-xs">Cargando detalles del pedido...</p>
              </div>
            ) : items.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No se encontraron ítems en este pedido.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-2xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-3.5">Producto</th>
                      <th className="py-3 px-2 text-center">Presentación</th>
                      <th className="py-3 px-3 text-center">Solicitado</th>
                      <th className="py-3 px-3 text-center">Despachado</th>
                      <th className="py-3 px-3 text-center">{esCerrado ? 'Faltante' : 'Pendiente'}</th>
                      <th className="py-3 px-3 text-center">Estado</th>
                      {!esCerrado && <th className="py-3 px-3 text-center">A Despachar</th>}
                      {!esCerrado && <th className="py-3 px-3 text-center min-w-[210px] whitespace-nowrap">Acción</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((it) => {
                      const id = it.Detalle_Pedido_ProductosId;
                      const solicitada = Number(it.cantidad_solicitada || 0);
                      const despachada = cantidadesDespacho[id] === '' ? 0 : Number(cantidadesDespacho[id] || 0);
                      const faltante = Math.max(0, solicitada - despachada);
                      const estadoItem = itemEstados[id] || (despachada === 0 ? 'RECHAZADO' : despachada === solicitada ? 'CONFIRMADO' : 'FALTANTE');
                      const esRechazado = estadoItem === 'RECHAZADO' || despachada === 0;
                      const esCompleto = estadoItem === 'CONFIRMADO' && faltante === 0 && despachada > 0;
                      const esFaltante = estadoItem === 'FALTANTE' || (despachada > 0 && despachada < solicitada);
                      const esExceso = despachada > solicitada;

                      return (
                        <tr
                          key={id}
                          className={
                            esRechazado
                              ? 'bg-rose-50/30 opacity-90'
                              : esCompleto
                              ? 'bg-emerald-50/20'
                              : 'hover:bg-blue-50/30'
                          }
                        >
                          {/* Producto */}
                          <td className="py-3 px-3.5">
                            <div className="font-bold text-slate-800">{it.producto_nombre}</div>
                            <div className="text-[11px] font-mono text-slate-400">{it.producto_id}</div>
                          </td>

                          {/* Presentación */}
                          <td className="py-3 px-2 text-center">
                            <span className="font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg inline-block text-[11px]">
                              {it.unidad_medida || 'UND'}
                            </span>
                          </td>

                          {/* Solicitado */}
                          <td className="py-3 px-3 text-center font-bold text-slate-700">
                            {solicitada}
                          </td>

                          {/* Despachado */}
                          <td className="py-3 px-3 text-center">
                            <span className={`font-bold ${esRechazado ? 'text-rose-600' : esCompleto ? 'text-emerald-600' : 'text-amber-600'}`}>
                              {despachada}
                            </span>
                          </td>

                          {/* Pendiente / Faltante */}
                          <td className="py-3 px-3 text-center">
                            <span className={`font-bold ${faltante > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                              {faltante}
                            </span>
                          </td>

                          {/* Estado Pill */}
                          <td className="py-3 px-3 text-center">
                            {esExceso ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                <XCircle className="w-3 h-3 text-rose-600" /> Excede Pedido
                              </span>
                            ) : esRechazado ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                <XCircle className="w-3 h-3 text-rose-600" /> Sin Stock
                              </span>
                            ) : esCompleto ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Completo
                              </span>
                            ) : esFaltante ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                <AlertTriangle className="w-3 h-3 text-amber-600" /> Con Faltante
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                Pendiente
                              </span>
                            )}
                          </td>

                          {/* A Despachar y Acción (Solo en modo operativo / no cerrado) */}
                          {!esCerrado && (
                            <>
                              <td className="py-3 px-3 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  max={solicitada}
                                  step="any"
                                  value={cantidadesDespacho[id] ?? ''}
                                  onChange={(e) => handleCambiarCantidad(id, e.target.value, solicitada)}
                                  className={`w-20 bg-slate-50 border rounded-lg px-2 py-1 text-center font-bold text-xs focus:outline-hidden ${
                                    esExceso
                                      ? 'border-rose-500 text-rose-700 bg-rose-50 ring-2 ring-rose-400'
                                      : esCompleto
                                      ? 'border-emerald-300 text-emerald-700 focus:border-emerald-500'
                                      : esFaltante
                                      ? 'border-amber-300 text-amber-700 focus:border-amber-500'
                                      : 'border-slate-200 text-slate-800 focus:border-blue-500'
                                  }`}
                                />
                              </td>

                              <td className="py-3 px-3 text-center min-w-[210px] whitespace-nowrap">
                                <div className="flex items-center justify-center gap-2 whitespace-nowrap shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleConfirmarItem(it)}
                                    title="Confirmar despacho de este ítem"
                                    className="shrink-0 whitespace-nowrap px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Confirmar</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleRechazarItem(it)}
                                    title="Marcar sin stock / Rechazar este ítem"
                                    className="shrink-0 whitespace-nowrap px-3 py-1.5 bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                  >
                                    <X className="w-3.5 h-3.5 text-rose-600" />
                                    <span>Rechazar</span>
                                  </button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* FOOTER DEL MODAL */}
          <div className="border-t border-slate-100 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
            {esCerrado ? (
              <>
                {/* Resumen de totales del pedido cerrado a la izquierda */}
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl flex items-center gap-2">
                    <span className="text-slate-500 font-medium">Total Solicitado:</span>
                    <span className="font-mono font-bold text-slate-800">
                      S/ {Number(pedido?.PedidoTotal || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-2">
                    <span className="text-emerald-700 font-medium">Total Despachado:</span>
                    <span className="font-mono font-bold text-emerald-800">
                      S/ {Number(pedido?.PedidoTotalDespachado ?? pedido?.PedidoTotal ?? 0).toFixed(2)}
                    </span>
                  </div>
                  {pedido?.PedidoTieneFaltante === 'S' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      Cerrado con Faltante de Stock
                    </span>
                  )}
                </div>

                {/* Único botón a la derecha */}
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 active:scale-95 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-xs"
                  >
                    <span>Cerrar Detalle</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Mensaje de alerta a la izquierda */}
                <div className="flex items-center gap-2 text-xs">
                  {calculos.hayFaltantes ? (
                    <div className="flex items-center gap-2 text-amber-700 font-medium">
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>
                        Hay ítems con faltante o sin stock. Al cerrar se registrará como <strong>"Entregado con Faltante"</strong> (PODE = 1, PRS = 1).
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-emerald-700 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>
                        Todos los ítems verificados conformes al 100%. Despacho completo conforme.
                      </span>
                    </div>
                  )}
                </div>

                {/* Botones de acción a la derecha */}
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
                  >
                    Salir sin Cerrar
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowModalRechazo(true)}
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition cursor-pointer"
                    title="El cliente no acepta llevar el pedido incompleto"
                  >
                    Cliente Desiste (Rechazar)
                  </button>

                  <button
                    type="button"
                    disabled={isSubmitting || isLoading}
                    onClick={handleCerrarDespacho}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-xs"
                  >
                    {isSubmitting ? (
                      <>
                        <RotateCcw className="w-4 h-4 animate-spin" />
                        <span>Cerrando Despacho...</span>
                      </>
                    ) : (
                      <>
                        <PackageCheck className="w-4 h-4" />
                        <span>Cerrar Despacho de la Orden</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>

        </div>
      </div>

      {/* Submodal de Rechazo por Desistimiento */}
      <ModalRechazoDespacho
        isOpen={showModalRechazo}
        onClose={() => setShowModalRechazo(false)}
        pedidoId={pedidoId}
        itemsConRotura={calculos.itemsConFaltante}
        onConfirmarRechazo={handleConfirmarRechazo}
      />
    </>
  );
}
