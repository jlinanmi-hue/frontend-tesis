import React, { useState, useEffect } from 'react';
import { History, X, RefreshCw, FileText, ArrowDownRight, ArrowUpRight, CheckCircle2, Clock } from 'lucide-react';
import api from '../../services/api';

export default function ModalHistorialRecepcion({ isOpen, onClose, ordenId }) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && ordenId) {
      cargarHistorial();
    }
  }, [isOpen, ordenId]);

  const cargarHistorial = async () => {
    setIsLoading(true);
    try {
      const res = await api.ordenesCompra.historialRecepcion(ordenId);
      if (res?.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Error al cargar historial de recepción:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const orden = data?.orden || data;
  const items = data?.items || data?.detalles || [];
  const movimientos = data?.movimientos_kardex || [];

  const fEmision = orden?.fecha_emision || data?.fecha_emision || (orden?.fecha_creacion ? new Date(orden.fecha_creacion).toLocaleDateString('es-PE') : '-');
  const fEstimada = orden?.fecha_entrega_estimada || orden?.fecha_estimada_llegada || data?.fecha_entrega_estimada || 'No definida';
  const fReal = orden?.fecha_recepcion_real || data?.fecha_recepcion_real || (orden?.estado === 'CERRADA_CONFORME' ? 'Completada' : 'En proceso');
  const receptor = orden?.usuario_receptor || data?.usuario_receptor || 'Administrador / Almacén';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 md:p-6 animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-2xl border border-slate-200 shadow-2xl p-6 space-y-5 my-auto max-h-[90vh] flex flex-col">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Auditoría e Historial de Recepción
              </h3>
              <p className="text-[11px] text-slate-500">
                Orden: <strong className="text-blue-600">{ordenId}</strong>
                {orden?.proveedor?.razon_social && (
                  <span className="ml-2 text-slate-400">
                    • Proveedor: <strong className="text-slate-600">{orden.proveedor.razon_social}</strong>
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* CONTENIDO */}
        <div className="flex-1 overflow-y-auto space-y-4 text-xs">
          {isLoading ? (
            <div className="py-16 text-center text-slate-400">
              <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-2 text-blue-600" />
              <span>Consultando movimientos asentados en Kardex...</span>
            </div>
          ) : !data ? (
            <div className="py-12 text-center text-slate-400">
              No se pudo obtener información del historial.
            </div>
          ) : (
            <>
              {/* RESUMEN DE LA ORDEN */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[11px] text-slate-400 block">F. Emisión:</span>
                  <span className="font-bold text-slate-700">{fEmision}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">F. Estimada de Llegada:</span>
                  <span className="font-bold text-slate-700">{fEstimada}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">F. Recepción Real:</span>
                  <span className="font-bold text-slate-700">{fReal}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Receptor:</span>
                  <span className="font-bold text-slate-700">{receptor}</span>
                </div>
              </div>

              {/* TABLA DE ÍTEMS RECEPCIONADOS */}
              <div>
                <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <span>Estado de Ítems de la Orden</span>
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500">
                        <th className="py-2.5 px-3">Producto</th>
                        <th className="py-2.5 px-2 text-center">Presentación</th>
                        <th className="py-2.5 px-2 text-center">Solicitado</th>
                        <th className="py-2.5 px-2 text-center">Recibido</th>
                        <th className="py-2.5 px-2 text-center">Pendiente</th>
                        <th className="py-2.5 px-2 text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((it, idx) => {
                        const factor = Number(it.factor_conversion || 1);
                        const unidadAbrev = it.unidad_medida_abreviatura || it.unidad_nombre || 'UND';
                        const solicitada = Number(it.cantidad_solicitada || 0);
                        const recibida = Number(it.cantidad_recibida || 0);
                        const pendiente = Number(it.cantidad_pendiente ?? Math.max(0, solicitada - recibida));

                        return (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-3">
                              <span className="font-semibold text-slate-800 block">{it.producto_nombre}</span>
                              {it.producto_marca && (
                                <span className="text-[10px] text-slate-400">Marca: {it.producto_marca}</span>
                              )}
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-semibold text-[11px] border border-slate-200/80">
                                {unidadAbrev}
                              </span>
                              {factor > 1 && (
                                <div className="text-[10px] text-blue-600 font-medium mt-0.5">
                                  x {factor} unidades
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <div className="font-bold text-slate-700">{solicitada}</div>
                              {factor > 1 && (
                                <div className="text-[10px] text-slate-400">({solicitada * factor} unid.)</div>
                              )}
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <div className="font-bold text-emerald-600">{recibida}</div>
                              {factor > 1 && (
                                <div className="text-[10px] text-emerald-600/70">({recibida * factor} unid.)</div>
                              )}
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <div className="font-bold text-amber-600">{pendiente}</div>
                              {factor > 1 && (
                                <div className="text-[10px] text-amber-600/70">({pendiente * factor} unid.)</div>
                              )}
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              {it.estado_recepcion === 'COMPLETO' ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Completo
                                </span>
                              ) : it.estado_recepcion === 'PARCIAL' ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  Parcial
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
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
              </div>

              {/* MOVIMIENTOS EN KARDEX */}
              <div>
                <h4 className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                  <History className="w-4 h-4 text-blue-600" />
                  <span>Movimientos Oficiales en Kárdex (Auditoría Protegida: {movimientos.length})</span>
                </h4>
                <p className="text-[11px] text-slate-500 mb-2">
                  Registro inalterable de ingresos físicos a almacén para garantizar trazabilidad de inventario.
                </p>
                {movimientos.length === 0 ? (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-400">
                    Aún no se han registrado movimientos de inventario vinculados a esta orden.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500">
                          <th className="py-2.5 px-3">Código Movimiento</th>
                          <th className="py-2.5 px-2 text-center">Tipo</th>
                          <th className="py-2.5 px-2">Subtipo</th>
                          <th className="py-2.5 px-2 text-right">Cantidad</th>
                          <th className="py-2.5 px-3">Fecha y Hora</th>
                          <th className="py-2.5 px-3">Observación / Motivo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {movimientos.map((m) => {
                          const esEntrada = m.tipo === 'E';
                          return (
                            <tr key={m.id} className="hover:bg-slate-50/50">
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-700">
                                {m.documento_operacion_id || m.id}
                              </td>
                              <td className="py-2.5 px-2 text-center">
                                {esEntrada ? (
                                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <ArrowDownRight className="w-3 h-3" />
                                    Entrada
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                    <ArrowUpRight className="w-3 h-3" />
                                    Salida
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-2 font-semibold text-slate-700">
                                {m.subtipo || 'RECEPCION_OC'}
                              </td>
                              <td className="py-2.5 px-2 text-right font-extrabold text-slate-800">
                                {m.cantidad}
                              </td>
                              <td className="py-2.5 px-3 text-slate-500">
                                {m.fecha}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 italic">
                                {m.observacion || '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* FOOTER */}
        <div className="border-t border-slate-100 pt-3 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
