import React, { useState, useEffect } from 'react';
import {
  PackageCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  X,
  XCircle,
  Check,
  RefreshCw,
  Plus,
  ArrowRight,
  ShieldAlert,
  FileSpreadsheet
} from 'lucide-react';
import { sileo } from 'sileo';
import api from '../../services/api';
import ModalProductoExpress from './ModalProductoExpress';

export default function ModalRecepcionMercaderia({
  isOpen,
  onClose,
  ordenId,
  onRecepcionFinalizada
}) {
  const [orden, setOrden] = useState(null);
  const [detalles, setDetalles] = useState([]);
  const [cantidadesRecibir, setCantidadesRecibir] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isItemSubmitting, setIsItemSubmitting] = useState({});
  const [isItemRejecting, setIsItemRejecting] = useState({});
  const [isClosing, setIsClosing] = useState(false);
  
  // Modal de Producto Exprés
  const [showModalExpress, setShowModalExpress] = useState(false);

  // Dialogo de Faltantes tras cerrar
  const [dialogFaltantes, setDialogFaltantes] = useState(null);
  const [isGenerandoFaltantes, setIsGenerandoFaltantes] = useState(false);

  useEffect(() => {
    if (isOpen && ordenId) {
      cargarOrden();
    }
  }, [isOpen, ordenId]);

  const cargarOrden = async () => {
    setIsLoading(true);
    try {
      const res = await api.ordenesCompra.obtener(ordenId);
      if (res?.success && res?.data) {
        const ord = res.data;
        setOrden(ord);
        const items = ord.detalles || [];
        setDetalles(items);
        
        // Inicializar input de cantidades con la cantidad pendiente de cada item
        const iniciales = {};
        items.forEach((item) => {
          const id = item.id || item.Detalle_Orden_CompraId;
          const pendiente = Number(item.cantidad_pendiente ?? Math.max(0, (item.cantidad || item.Detalle_Orden_CompraCantidad) - (item.cantidad_recibida || 0)));
          iniciales[id] = pendiente > 0 ? pendiente : '';
        });
        setCantidadesRecibir(iniciales);
      } else {
        throw new Error(res?.message || 'No se pudo cargar la orden');
      }
    } catch (err) {
      console.error('Error cargando orden para recepción:', err);
      sileo.error({
        title: 'Error de Carga',
        description: err.message || 'Error al cargar orden de compra.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCambiarCantidad = (detalleId, valor) => {
    setCantidadesRecibir((prev) => ({
      ...prev,
      [detalleId]: valor
    }));
  };

  const handleRecepcionarItem = async (detalle) => {
    const detalleId = detalle.id || detalle.Detalle_Orden_CompraId;
    const cantVal = parseFloat(cantidadesRecibir[detalleId]);

    if (!cantVal || cantVal <= 0) {
      sileo.warning({
        title: 'Cantidad Inválida',
        description: 'Ingresa una cantidad mayor a 0 a recepcionar.'
      });
      return;
    }

    const maxPendiente = Number(detalle.cantidad_pendiente ?? Math.max(0, (detalle.cantidad || detalle.Detalle_Orden_CompraCantidad) - (detalle.cantidad_recibida || 0)));
    if (cantVal > maxPendiente) {
      sileo.warning({
        title: 'Exceso de Cantidad',
        description: `La cantidad ingresada (${cantVal}) no puede superar lo pendiente (${maxPendiente}).`
      });
      return;
    }

    setIsItemSubmitting((prev) => ({ ...prev, [detalleId]: true }));
    try {
      const res = await api.ordenesCompra.recepcionarItem(ordenId, {
        detalle_id: String(detalleId),
        cantidad_recibida: cantVal
      });

      if (res?.success) {
        const factor = Number(detalle.factor_conversion || 1);
        const unidadAbrev = detalle.unidad_medida_abreviatura || detalle.unidad_abreviatura || detalle.unidad_nombre || 'UND';
        const cantFisica = cantVal * factor;
        const textoFisico = factor > 1 ? ` (+${cantFisica} unidades físicas ingresadas a Kárdex)` : '';

        sileo.success({
          title: 'Ítem Confirmado',
          description: `+${cantVal} ${unidadAbrev}${textoFisico} cargados al inventario.`
        });
        await cargarOrden();
      } else {
        throw new Error(res?.message || 'Error al registrar recepción de ítem.');
      }
    } catch (err) {
      console.error('Error al recepcionar ítem:', err);
      const errorsObj = err.response?.data?.errors;
      let detailedMsg = '';
      if (errorsObj && typeof errorsObj === 'object') {
        detailedMsg = Object.values(errorsObj).flat().join(' | ');
      }
      const msg = detailedMsg || err.response?.data?.message || err.message || 'Error al recepcionar el ítem.';
      sileo.error({
        title: 'Error de Recepción',
        description: msg
      });
    } finally {
      setIsItemSubmitting((prev) => ({ ...prev, [detalleId]: false }));
    }
  };

  const handleRechazarItem = async (detalle) => {
    const detalleId = detalle.id || detalle.Detalle_Orden_CompraId;
    const prodNombre = detalle.producto_nombre || detalle.nombre || 'el producto';

    if (!window.confirm(`¿Estás seguro de RECHAZAR "${prodNombre}"? El ítem no ingresará al almacén ni afectará el stock en Kárdex.`)) {
      return;
    }

    setIsItemRejecting((prev) => ({ ...prev, [detalleId]: true }));
    try {
      const res = await api.ordenesCompra.rechazarItem(ordenId, {
        detalle_id: String(detalleId),
        motivo: 'Producto rechazado en recepción'
      });

      if (res?.success) {
        sileo.info({
          title: 'Producto Rechazado',
          description: `"${prodNombre}" fue marcado como rechazado formalmente.`
        });
        await cargarOrden();
      } else {
        throw new Error(res?.message || 'Error al rechazar el producto.');
      }
    } catch (err) {
      console.error('Error al rechazar ítem:', err);
      const msg = err.response?.data?.message || err.message || 'Error al rechazar el producto.';
      sileo.error({
        title: 'Error',
        description: msg
      });
    } finally {
      setIsItemRejecting((prev) => ({ ...prev, [detalleId]: false }));
    }
  };

  const handleCerrarRecepcion = async () => {
    setIsClosing(true);
    try {
      const res = await api.ordenesCompra.cerrarRecepcion(ordenId);
      if (res?.success) {
        sileo.success({
          title: 'Recepción Finalizada',
          description: res.message || 'La recepción de la orden fue finalizada con éxito.'
        });
        
        // Si el backend detectó faltantes, preguntar si generar nueva OC
        if (res.data?.tiene_faltantes) {
          setDialogFaltantes({
            ordenId,
            itemsFaltantes: res.data.items_faltantes || []
          });
        } else {
          if (onRecepcionFinalizada) onRecepcionFinalizada();
          onClose();
        }
      } else {
        throw new Error(res?.message || 'Error al cerrar recepción.');
      }
    } catch (err) {
      console.error('Error cerrando recepción:', err);
      const msg = err.response?.data?.message || err.message || 'Error al cerrar la recepción.';
      sileo.error({
        title: 'Error al Cerrar',
        description: msg
      });
    } finally {
      setIsClosing(false);
    }
  };

  const handleConfirmarGenerarNuevaOc = async () => {
    setIsGenerandoFaltantes(true);
    try {
      const res = await api.ordenesCompra.generarNuevaOcFaltantes(ordenId);
      if (res?.success) {
        const nuevaId = res.data?.nueva_orden_id || res.data?.id || 'Nueva';
        sileo.success({
          title: 'Nueva OC Generada',
          description: `Nueva Orden ${nuevaId} creada automáticamente con los faltantes.`
        });
      }
    } catch (err) {
      console.error('Error generando nueva OC de faltantes:', err);
      sileo.error({
        title: 'Error de Generación',
        description: 'No se pudo generar la nueva orden de faltantes.'
      });
    } finally {
      setIsGenerandoFaltantes(false);
      setDialogFaltantes(null);
      if (onRecepcionFinalizada) onRecepcionFinalizada();
      onClose();
    }
  };

  if (!isOpen) return null;

  const tieneItemsPendientes = detalles.some(
    (d) => Number(d.cantidad_pendiente ?? ((d.cantidad || d.Detalle_Orden_CompraCantidad) - (d.cantidad_recibida || 0))) > 0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 md:p-6 animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-white w-full max-w-5xl lg:max-w-6xl rounded-2xl border border-slate-200 shadow-2xl p-6 space-y-5 my-auto max-h-[92vh] flex flex-col">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
              <PackageCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-800">
                  Recepción Oficial de Mercadería
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                  {ordenId}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Proveedor: <strong className="text-slate-700">{orden?.proveedor?.razon_social || orden?.proveedor?.ProveedorRazonSocial || 'Cargando...'}</strong>
                {orden?.fecha_entrega_estimada && (
                  <span className="ml-3 text-slate-400">
                    • F. Estimada: <strong className="text-slate-600">{orden.fecha_entrega_estimada}</strong>
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowModalExpress(true)}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              title="Registrar producto que no existía en catálogo"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Producto Exprés</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CONTENIDO PRINCIPAL: TABLA DE ÍTEMS */}
        <div className="flex-1 overflow-y-auto space-y-4">
          <div className="bg-blue-50/60 border border-blue-200/80 rounded-xl p-3 text-xs text-blue-800 flex items-start gap-2.5">
            <Clock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p>
              <strong>Carga Inmediata a Stock:</strong> Cada ítem confirmado ingresa en tiempo real al stock de la tienda con su factor de conversión y genera un movimiento oficial en Kárdex.
            </p>
          </div>

          {isLoading ? (
            <div className="py-16 text-center text-slate-400">
              <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-2 text-blue-600" />
              <p className="text-xs">Cargando detalles de la orden...</p>
            </div>
          ) : detalles.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No se encontraron ítems en esta orden de compra.
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-2xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-3.5">Producto</th>
                    <th className="py-3 px-2 text-center">Presentación</th>
                    <th className="py-3 px-3 text-center">Solicitado</th>
                    <th className="py-3 px-3 text-center">Recibido</th>
                    <th className="py-3 px-3 text-center">Pendiente</th>
                    <th className="py-3 px-3 text-center">Estado</th>
                    <th className="py-3 px-3 text-center">Recibir Ahora</th>
                    <th className="py-3 px-3 text-center min-w-[210px] whitespace-nowrap">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {detalles.map((d) => {
                    const detalleId = d.id || d.Detalle_Orden_CompraId;
                    const prodNombre = d.producto?.ProductoNombre || d.producto_nombre || 'Producto';
                    const marca = d.producto?.ProductoMarca || d.producto_marca || '';
                    const unidadAbrev = d.unidad_medida_abreviatura || d.unidad_abreviatura || d.unidad_medida?.unidades_medidaAbreviatura || d.unidad_nombre || 'UND';
                    const factor = Number(d.factor_conversion || 1);
                    const solicitada = Number(d.cantidad || d.Detalle_Orden_CompraCantidad || 0);
                    const recibida = Number(d.cantidad_recibida || 0);
                    const pendiente = Number(d.cantidad_pendiente ?? Math.max(0, solicitada - recibida));
                    const estadoItem = d.estado_recepcion || (recibida >= solicitada ? 'COMPLETO' : recibida > 0 ? 'PARCIAL' : 'PENDIENTE');
                    const estaRechazado = estadoItem === 'RECHAZADO' || d.rechazado || d.Detalle_Orden_CompraEntregado === 'R';
                    const estaCompleto = pendiente <= 0 && !estaRechazado;
                    const subiendoEste = isItemSubmitting[detalleId];
                    const rechazaEste = isItemRejecting[detalleId];
                    const cantInputVal = cantidadesRecibir[detalleId];

                    return (
                      <tr key={detalleId} className={estaRechazado ? 'bg-rose-50/30 opacity-80' : estaCompleto ? 'bg-slate-50/50' : 'hover:bg-blue-50/30'}>
                        <td className="py-3 px-3.5">
                          <div className="font-bold text-slate-800">{prodNombre}</div>
                          {marca && <div className="text-[11px] text-slate-400">Marca: {marca}</div>}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span className="font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg inline-block text-[11px]">
                            {unidadAbrev}
                          </span>
                          {factor > 1 && (
                            <div className="text-[10px] text-blue-600 font-semibold mt-0.5">
                              x {factor} unidades
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="font-bold text-slate-700">
                            {solicitada} <span className="text-[10px] font-normal text-slate-400">{unidadAbrev}</span>
                          </div>
                          {factor > 1 && (
                            <div className="text-[10px] text-slate-400">
                              ({solicitada * factor} unid. físicas)
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="font-bold text-emerald-600">
                            {recibida} <span className="text-[10px] font-normal text-emerald-500/70">{unidadAbrev}</span>
                          </div>
                          {factor > 1 && (
                            <div className="text-[10px] text-emerald-600/70">
                              ({recibida * factor} unid. físicas)
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="font-bold text-amber-600">
                            {pendiente} <span className="text-[10px] font-normal text-amber-500/70">{unidadAbrev}</span>
                          </div>
                          {factor > 1 && (
                            <div className="text-[10px] text-amber-600/70">
                              ({pendiente * factor} unid. físicas)
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {estaRechazado ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <XCircle className="w-3 h-3 text-rose-600" />
                              Rechazado
                            </span>
                          ) : estadoItem === 'COMPLETO' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Completo
                            </span>
                          ) : estadoItem === 'PARCIAL' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3 h-3 text-amber-600" />
                              Parcial
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              Pendiente
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <input
                            type="number"
                            min="0.01"
                            max={pendiente}
                            step="any"
                            disabled={estaCompleto || estaRechazado || subiendoEste || rechazaEste}
                            value={cantInputVal ?? ''}
                            onChange={(e) => handleCambiarCantidad(detalleId, e.target.value)}
                            placeholder="0"
                            className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-center font-bold text-slate-800 text-xs focus:outline-hidden focus:border-blue-500 disabled:opacity-40"
                          />
                          {factor > 1 && Number(cantInputVal) > 0 && !estaRechazado && (
                            <div className="text-[10px] text-blue-600 font-semibold mt-0.5">
                              +{Number(cantInputVal) * factor} al Kárdex
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center min-w-[210px] whitespace-nowrap">
                          {estaRechazado ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-rose-600 font-semibold bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100">
                              <XCircle className="w-3.5 h-3.5 text-rose-500" />
                              Rechazado
                            </span>
                          ) : estaCompleto ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              Ingresado
                            </span>
                          ) : (
                            <div className="flex items-center justify-center gap-2 whitespace-nowrap shrink-0">
                              <button
                                type="button"
                                disabled={estaCompleto || subiendoEste || rechazaEste || !cantidadesRecibir[detalleId]}
                                onClick={() => handleRecepcionarItem(d)}
                                title="Confirmar ingreso de mercadería a stock físico"
                                className="shrink-0 whitespace-nowrap px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
                              >
                                {subiendoEste ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Check className="w-3.5 h-3.5" />
                                )}
                                <span>Confirmar</span>
                              </button>

                              <button
                                type="button"
                                disabled={estaCompleto || subiendoEste || rechazaEste}
                                onClick={() => handleRechazarItem(d)}
                                title="Rechazar este producto (no ingresará a almacén)"
                                className="shrink-0 whitespace-nowrap px-3 py-1.5 bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
                              >
                                {rechazaEste ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-600" />
                                ) : (
                                  <X className="w-3.5 h-3.5 text-rose-600" />
                                )}
                                <span>Rechazar</span>
                              </button>
                            </div>
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

        {/* FOOTER */}
        <div className="border-t border-slate-100 pt-4 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500">
            {tieneItemsPendientes ? (
              <span className="text-amber-600 font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                Hay ítems pendientes de entrega. Al cerrar se registrará como "Cerrada con Faltante".
              </span>
            ) : (
              <span className="text-emerald-600 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Todos los ítems solicitados fueron recibidos en su totalidad.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isClosing}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Salir sin Cerrar
            </button>

            <button
              type="button"
              disabled={isClosing || isLoading}
              onClick={handleCerrarRecepcion}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-xs"
            >
              {isClosing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Cerrando Recepción...</span>
                </>
              ) : (
                <>
                  <PackageCheck className="w-4 h-4" />
                  <span>Cerrar Recepción de la Orden</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* MODAL PRODUCTO EXPRES */}
      {showModalExpress && (
        <ModalProductoExpress
          isOpen={showModalExpress}
          onClose={() => setShowModalExpress(false)}
          proveedorId={orden?.proveedor_id || orden?.Orden_Compra_ProveedorId}
          onProductoCreado={() => {
            sileo.info({
              title: 'Producto Registrado',
              description: 'Producto nuevo registrado. Ahora puedes agregarlo si es necesario.'
            });
            cargarOrden();
          }}
        />
      )}

      {/* DIALOG DE FALTANTES TRAS CERRAR */}
      {dialogFaltantes && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-2xl p-6 space-y-4 text-center">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl border border-amber-200 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-800">
                Recepción Cerrada con Faltantes
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                La orden fue cerrada pero no se recibieron todas las unidades pedidas.
                ¿Deseas generar automáticamente una nueva Orden de Compra por los ítems pendientes?
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                disabled={isGenerandoFaltantes}
                onClick={() => {
                  setDialogFaltantes(null);
                  if (onRecepcionFinalizada) onRecepcionFinalizada();
                  onClose();
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                No generar
              </button>

              <button
                type="button"
                disabled={isGenerandoFaltantes}
                onClick={handleConfirmarGenerarNuevaOc}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
              >
                {isGenerandoFaltantes ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
                <span>Sí, Generar Nueva OC</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
