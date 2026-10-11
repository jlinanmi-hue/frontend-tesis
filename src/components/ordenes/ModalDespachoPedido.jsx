import React, { useState, useEffect, useMemo } from 'react';
import {
  PackageCheck,
  CheckCircle2,
  AlertTriangle,
  X,
  XCircle,
  RotateCcw,
  Boxes,
  Truck,
  User,
  Phone,
  Calendar,
  AlertCircle,
  FileText,
  Building2,
  DollarSign
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
  const [observacionesItem, setObservacionesItem] = useState({});
  const [observacionGeneral, setObservacionGeneral] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Modal de rechazo por desistimiento
  const [showModalRechazo, setShowModalRechazo] = useState(false);

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

        // Inicializar cantidades de despacho con lo solicitado o lo que ya se registró
        const initCant = {};
        const initObs = {};
        itms.forEach((it) => {
          const id = it.Detalle_Pedido_ProductosId;
          const cantPrevia = it.cantidad_despachada != null ? Number(it.cantidad_despachada) : Number(it.cantidad_solicitada);
          initCant[id] = cantPrevia;
          initObs[id] = it.observacion_item || '';
        });
        setCantidadesDespacho(initCant);
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

  const handleCambiarCantidad = (detalleId, valor, solicitada) => {
    if (valor === '') {
      setCantidadesDespacho((prev) => ({
        ...prev,
        [detalleId]: ''
      }));
      return;
    }

    const maxSolicitada = Number(solicitada || 0);
    const num = parseFloat(valor);

    if (isNaN(num) || num < 0) {
      setCantidadesDespacho((prev) => ({
        ...prev,
        [detalleId]: 0
      }));
      return;
    }

    // Validación estricta: No se puede despachar más de la cantidad solicitada
    if (num > maxSolicitada) {
      sileo.warning({
        title: 'Límite Máximo Superado',
        description: `No puedes despachar ${num}. El pedido solicita un máximo de ${maxSolicitada} unidades.`
      });
      setCantidadesDespacho((prev) => ({
        ...prev,
        [detalleId]: maxSolicitada
      }));
      return;
    }

    setCantidadesDespacho((prev) => ({
      ...prev,
      [detalleId]: num
    }));
  };

  const handleSetCantidad = (detalleId, cantidad) => {
    setCantidadesDespacho((prev) => ({
      ...prev,
      [detalleId]: cantidad
    }));
  };

  const handleCambiarObsItem = (detalleId, obs) => {
    setObservacionesItem((prev) => ({
      ...prev,
      [detalleId]: obs
    }));
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

  // Acción 1: Cancelar Preparación (Vuelve a PENDIENTE_DESPACHO)
  const handleCancelarPreparacion = async () => {
    setIsSubmitting(true);
    try {
      const res = await api.despacho.cancelarPreparacion(pedidoId, observacionGeneral);
      if (res?.success) {
        sileo.info({
          title: 'Preparación Cancelada',
          description: `El pedido ${pedidoId} volvió a estado PENDIENTE_DESPACHO.`
        });
        if (onDespachoFinalizado) onDespachoFinalizado();
        onClose();
      }
    } catch (err) {
      sileo.error({
        title: 'Error',
        description: err.message || 'No se pudo cancelar la preparación.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Acción 2: Confirmar Despacho 100% Completo
  const handleDespachoCompleto = async () => {
    if (calculos.hayExcesos) {
      sileo.error({
        title: 'Cantidad Inválida',
        description: 'Existen productos con cantidad mayor a la solicitada. No se puede entregar más de lo pedido.'
      });
      return;
    }

    if (calculos.hayFaltantes) {
      sileo.warning({
        title: 'Faltantes Detectados',
        description: 'Existen productos con cantidad menor a la solicitada. Usa "Despacho con Faltante".'
      });
      return;
    }

    setIsSubmitting(true);
    try {
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
          title: 'Error en Despacho',
          description: err.message || 'No se pudo completar el despacho.'
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Acción 3: Confirmar Despacho con Faltante (Cliente Acepta)
  const handleDespachoConFaltante = async () => {
    if (calculos.hayExcesos) {
      sileo.error({
        title: 'Cantidad Inválida',
        description: 'No se puede registrar el despacho: hay productos con cantidad superior a la solicitada.'
      });
      return;
    }

    if (!calculos.hayFaltantes) {
      sileo.info({
        title: 'Sin Faltantes',
        description: 'Todos los productos están completos. Puedes confirmar como Despacho 100% Completo.'
      });
      return;
    }

    if (!observacionGeneral.trim() || observacionGeneral.trim().length < 5) {
      sileo.warning({
        title: 'Observación Obligatoria',
        description: 'Ingresa una observación detallada explicando la aceptación del faltante por parte del cliente.'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        observacion: observacionGeneral.trim(),
        items: items.map((it) => {
          const id = it.Detalle_Pedido_ProductosId;
          return {
            detalle_id: id,
            cantidad_despachada: cantidadesDespacho[id] === '' ? 0 : Number(cantidadesDespacho[id] || 0),
            observacion: observacionesItem[id] || undefined
          };
        })
      };

      const res = await api.despacho.faltante(pedidoId, payload);
      if (res?.success) {
        sileo.success({
          title: 'Despacho con Faltante Registrado',
          description: `Pedido ${pedidoId} cerrado conforme con consentimiento del cliente. PODE = 1, PRS = 1.`
        });
        if (onDespachoFinalizado) onDespachoFinalizado();
        onClose();
      }
    } catch (err) {
      if (err.status === 409) {
        sileo.warning({
          title: 'Pedido Ya Procesado',
          description: 'Este pedido ya cuenta con un cierre registrado.'
        });
        if (onDespachoFinalizado) onDespachoFinalizado();
        onClose();
      } else {
        sileo.error({
          title: 'Error al Cerrar',
          description: err.message || 'No se pudo registrar el despacho con faltante.'
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Acción 4: Confirmar Rechazo desde el submodal
  const handleConfirmarRechazo = async (payload) => {
    try {
      const res = await api.despacho.rechazar(pedidoId, payload);
      if (res?.success) {
        sileo.info({
          title: 'Pedido Rechazado y Stock Reintegrado',
          description: `Pedido ${pedidoId} anulado por falta de stock. PODE = 0, PRS = 1.`
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
      <div className="fixed inset-0 z-40 flex items-center justify-center p-3 md:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
        <div className="relative w-full max-w-5xl max-h-[92vh] bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden my-auto">
          
          {/* Cabecera del Modal */}
          <div className="p-5 border-b border-slate-100 bg-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                <PackageCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-800">
                    Despacho y Verificación de Mercadería
                  </h2>
                  <span className="px-2 py-0.5 text-xs font-mono font-extrabold bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
                    {pedidoId}
                  </span>
                  {pedido?.PedidoEstadoDespacho && (
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                      pedido.PedidoEstadoDespacho === 'EN_PREPARACION'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : pedido.PedidoEstadoDespacho === 'ENTREGADO_COMPLETO'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : pedido.PedidoEstadoDespacho === 'ENTREGADO_CON_FALTANTE'
                        ? 'bg-orange-50 text-orange-700 border-orange-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                      {pedido.PedidoEstadoDespacho}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  Valida existencias físicas en almacén ítem por ítem antes de entregar al cliente
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

          {/* Subcabecera con información del pedido */}
          {pedido && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-5 py-3.5 bg-slate-50/70 border-b border-slate-100 text-xs shrink-0">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400 shrink-0" />
                <div className="truncate">
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Cliente</p>
                  <p className="font-bold text-slate-800 truncate">{pedido.ClienteNombre}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                <div className="truncate">
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Canal de Venta</p>
                  <p className="font-bold text-slate-800">{pedido.canal || 'Tienda Presencial'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-slate-400 shrink-0" />
                <div className="truncate">
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Modalidad</p>
                  <p className="font-bold text-slate-800">
                    {pedido.PedidoEsDelivery === 'S' ? 'Delivery a Domicilio' : 'Recojo en Mostrador'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-slate-400 shrink-0" />
                <div className="truncate">
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Total Original</p>
                  <p className="font-bold text-emerald-600">
                    S/ {Number(pedido.PedidoTotal || 0).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Contenido scrolleable: Grilla de Ítems */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 min-h-0">
            {isLoading ? (
              <div className="py-16 text-center text-slate-400">
                <RotateCcw className="w-8 h-8 mx-auto text-blue-600 animate-spin mb-3" />
                <p className="text-xs">Cargando ítems y existencias de almacén...</p>
              </div>
            ) : items.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs">
                <Boxes className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p className="font-semibold text-slate-600">No se encontraron ítems en este pedido.</p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-2xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-3.5">Producto</th>
                      <th className="py-3 px-3 text-center">U.M.</th>
                      <th className="py-3 px-3 text-right">Stock Almacén</th>
                      <th className="py-3 px-3 text-right">Solicitado</th>
                      <th className="py-3 px-3 text-center min-w-[150px]">A Despachar</th>
                      <th className="py-3 px-3 text-center">Estado Ítem</th>
                      <th className="py-3 px-3 text-right">Subtotal Real</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((it) => {
                      const id = it.Detalle_Pedido_ProductosId;
                      const solicitada = Number(it.cantidad_solicitada || 0);
                      const despachada = cantidadesDespacho[id] === '' ? 0 : Number(cantidadesDespacho[id] || 0);
                      const stockActual = Number(it.stock_actual || 0);
                      const precioUnit = Number(it.precio_unitario || 0);
                      const subtotalReal = despachada * precioUnit;
                      const faltante = Math.max(0, solicitada - despachada);
                      const esExceso = despachada > solicitada;

                      const esCompleto = !esExceso && faltante === 0 && despachada > 0;
                      const esParcial = !esExceso && faltante > 0 && despachada > 0;
                      const esAgotado = despachada === 0;

                      return (
                        <tr key={id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-3.5">
                            <p className="font-bold text-slate-800">{it.producto_nombre}</p>
                            <span className="text-[10px] font-mono text-slate-400">
                              {it.producto_id}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold font-mono bg-slate-100 text-slate-700 border border-slate-200">
                              {it.unidad_medida || 'UND'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold">
                            <span className={stockActual < solicitada ? 'text-rose-600' : 'text-slate-700'}>
                              {stockActual}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-700">
                            {solicitada}
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center justify-center gap-1.5">
                              <input
                                type="number"
                                min="0"
                                max={solicitada}
                                step="any"
                                value={cantidadesDespacho[id] ?? ''}
                                onChange={(e) => handleCambiarCantidad(id, e.target.value, solicitada)}
                                className={`w-20 px-2 py-1 text-center font-mono font-bold text-xs rounded-lg border bg-slate-50 focus:outline-hidden disabled:opacity-40 ${
                                  esExceso
                                    ? 'border-rose-500 text-rose-700 bg-rose-50 ring-2 ring-rose-400'
                                    : esCompleto
                                    ? 'border-emerald-300 text-emerald-700 focus:border-emerald-500'
                                    : esParcial
                                    ? 'border-amber-300 text-amber-700 focus:border-amber-500'
                                    : 'border-rose-300 text-rose-700 focus:border-rose-500'
                                }`}
                              />
                              <button
                                type="button"
                                title="Fijar al 100%"
                                onClick={() => handleSetCantidad(id, solicitada)}
                                className="px-1.5 py-1 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg border border-slate-200 transition cursor-pointer"
                              >
                                Max
                              </button>
                              <button
                                type="button"
                                title="Marcar 0 (Agotado)"
                                onClick={() => handleSetCantidad(id, 0)}
                                className="px-1.5 py-1 text-[10px] font-bold bg-slate-100 hover:bg-rose-50 text-rose-600 rounded-lg border border-slate-200 hover:border-rose-200 transition cursor-pointer"
                              >
                                0
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            {esExceso ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                                <XCircle className="w-3 h-3 text-rose-600" /> Excede (+{(despachada - solicitada).toFixed(2)})
                              </span>
                            ) : esCompleto ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Completo
                              </span>
                            ) : esParcial ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                <AlertTriangle className="w-3 h-3 text-amber-600" /> Faltante (-{faltante})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                <XCircle className="w-3 h-3 text-rose-600" /> Agotado (-{faltante})
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-800">
                            S/ {subtotalReal.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Panel de Alerta si hay descuadres */}
            {calculos.hayFaltantes && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800 space-y-1">
                  <p className="font-bold">
                    Se detectaron faltantes físicos en {calculos.cantItemsConFaltante} ítem(s):
                  </p>
                  <p>
                    Si el cliente acepta recibir el pedido con los productos disponibles, se recalculará el monto a cobrar a{' '}
                    <strong className="font-mono">S/ {calculos.totalDespachado.toFixed(2)}</strong> y se auditará la rotura en el indicador PRS (PODE = 1).
                  </p>
                </div>
              </div>
            )}

            {/* Campo de Observaciones Generales de Despacho */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Observaciones del Despacho / Acuerdo con el Cliente:
                {calculos.hayFaltantes && <span className="text-amber-600 ml-1">*(Obligatorio en faltante)</span>}
              </label>
              <input
                type="text"
                value={observacionGeneral}
                onChange={(e) => setObservacionGeneral(e.target.value)}
                placeholder={
                  calculos.hayFaltantes
                    ? 'Ej: Cliente Juan Pérez aceptó llevar 8 unidades de Aceite por rotura en almacén...'
                    : 'Observaciones opcionales del picking o salida...'
                }
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-blue-500 focus:bg-white transition"
              />
            </div>
          </div>

          {/* Pie de Totales y Acciones */}
          <div className="px-5 sm:px-6 py-4 border-t border-slate-100 bg-white shrink-0 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200/70">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <div>
                  <span className="text-slate-400">Total Solicitado: </span>
                  <span className="font-mono font-bold text-slate-800">
                    S/ {calculos.totalOriginal.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Total a Despachar: </span>
                  <span className={`font-mono font-extrabold ${calculos.hayFaltantes ? 'text-amber-600' : 'text-emerald-600'}`}>
                    S/ {calculos.totalDespachado.toFixed(2)}
                  </span>
                </div>
                {calculos.hayFaltantes && (
                  <div>
                    <span className="text-slate-400">Diferencia no cobrada: </span>
                    <span className="font-mono font-bold text-rose-600">
                      - S/ {calculos.diferenciaTotal.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Barra de Botones */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {pedido?.PedidoEstadoDespacho === 'EN_PREPARACION' && (
                  <button
                    type="button"
                    onClick={handleCancelarPreparacion}
                    disabled={isSubmitting}
                    className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer disabled:opacity-50"
                  >
                    Cancelar Preparación (Liberar)
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowModalRechazo(true)}
                  disabled={isSubmitting}
                  className="px-3 py-2 text-xs font-bold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 rounded-xl transition border border-rose-200 cursor-pointer disabled:opacity-50"
                >
                  Cliente Desiste (Rechazar)
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer disabled:opacity-50"
                >
                  Cerrar
                </button>

                {calculos.hayFaltantes ? (
                  <button
                    type="button"
                    onClick={handleDespachoConFaltante}
                    disabled={isSubmitting}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 active:bg-amber-700 rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5" />
                    )}
                    <span>Despachar con Faltante (Cliente Acepta)</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleDespachoCompleto}
                    disabled={isSubmitting}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    <span>Confirmar Despacho 100% Completo</span>
                  </button>
                )}
              </div>
            </div>
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
