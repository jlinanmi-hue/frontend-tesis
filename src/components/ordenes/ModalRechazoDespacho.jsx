import React, { useState } from 'react';
import {
  AlertTriangle,
  X,
  XCircle,
  RotateCcw,
  ShieldAlert,
  Check
} from 'lucide-react';
import { sileo } from 'sileo';

const MOTIVOS_PREDETERMINADOS = [
  'Cliente no acepta entrega incompleta por falta de stock',
  'Producto crítico sin existencias físicas en almacén',
  'Desacuerdo con el despacho parcial ofrecido',
  'Cliente desistió del pedido tras notificación de quiebre'
];

export default function ModalRechazoDespacho({
  isOpen,
  onClose,
  pedidoId,
  itemsConRotura = [],
  onConfirmarRechazo
}) {
  const [motivoSeleccionado, setMotivoSeleccionado] = useState(MOTIVOS_PREDETERMINADOS[0]);
  const [esOtroMotivo, setEsOtroMotivo] = useState(false);
  const [motivoPersonalizado, setMotivoPersonalizado] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleConfirmar = async () => {
    const motivoFinal = esOtroMotivo ? motivoPersonalizado.trim() : motivoSeleccionado;

    if (!motivoFinal || motivoFinal.length < 5) {
      sileo.warning({
        title: 'Motivo Requerido',
        description: 'Por favor ingresa un motivo detallado del desistimiento (mínimo 5 caracteres).'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirmarRechazo({
        motivo: motivoFinal,
        items_con_rotura: itemsConRotura.map((it) => ({
          detalle_id: it.Detalle_Pedido_ProductosId || it.id,
          cantidad_faltante: it.cantidad_faltante || 0
        }))
      });
      onClose();
    } catch (err) {
      // Error manejado en componente padre
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-slate-900 border border-rose-500/30 rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Cabecera */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-rose-500/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/30">
              <XCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                Rechazar Despacho por Falta de Stock
              </h3>
              <p className="text-xs text-rose-300">
                Orden: <span className="font-mono font-bold text-white">{pedidoId}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="p-6 space-y-4">
          {/* Advertencia Académica y Operativa */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-200/90 space-y-1">
              <p className="font-semibold text-amber-300">
                Impacto Operativo y en Indicadores Oficiales:
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                <li>El pedido pasará a estado <span className="font-mono text-rose-400">RECHAZADO_ROTURA</span> (Anulado).</li>
                <li>Se reintegrarán <strong className="text-emerald-400">todas las unidades</strong> al stock físico de inventario.</li>
                <li>Impacto en KPIs: <strong className="text-rose-400">PODE = 0</strong> y <strong className="text-amber-400">PRS = 1</strong>.</li>
              </ul>
            </div>
          </div>

          {/* Selector de Motivo */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">
              Motivo del Desistimiento del Cliente:
            </label>
            <div className="space-y-2">
              {MOTIVOS_PREDETERMINADOS.map((motivo, idx) => (
                <label
                  key={idx}
                  className={`flex items-start gap-2.5 p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                    !esOtroMotivo && motivoSeleccionado === motivo
                      ? 'border-rose-500/50 bg-rose-500/10 text-slate-100'
                      : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="motivo_rechazo"
                    checked={!esOtroMotivo && motivoSeleccionado === motivo}
                    onChange={() => {
                      setEsOtroMotivo(false);
                      setMotivoSeleccionado(motivo);
                    }}
                    className="mt-0.5 text-rose-500 focus:ring-rose-500"
                  />
                  <span>{motivo}</span>
                </label>
              ))}

              <label
                className={`flex items-start gap-2.5 p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                  esOtroMotivo
                    ? 'border-rose-500/50 bg-rose-500/10 text-slate-100'
                    : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="motivo_rechazo"
                  checked={esOtroMotivo}
                  onChange={() => setEsOtroMotivo(true)}
                  className="mt-0.5 text-rose-500 focus:ring-rose-500"
                />
                <span>Otro motivo específico...</span>
              </label>
            </div>
          </div>

          {/* Campo de texto libre si selecciona "Otro motivo" */}
          {esOtroMotivo && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Especifique la causa del rechazo:
              </label>
              <textarea
                value={motivoPersonalizado}
                onChange={(e) => setMotivoPersonalizado(e.target.value)}
                placeholder="Detalle por qué el cliente no aceptó la entrega..."
                rows={3}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>
          )}
        </div>

        {/* Pie de Acciones */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-800 bg-slate-950/60">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirmar}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-rose-600 hover:bg-rose-500 active:bg-rose-700 rounded-lg shadow-lg shadow-rose-900/30 transition-all disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                <span>Reintegrando Stock...</span>
              </>
            ) : (
              <>
                <XCircle className="w-3.5 h-3.5" />
                <span>Confirmar Rechazo y Reintegrar Stock</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
