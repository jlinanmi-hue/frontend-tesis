import React, { useState } from 'react';
import { AlertOctagon, X, RefreshCw, ShieldAlert } from 'lucide-react';
import { sileo } from 'sileo';
import api from '../../services/api';

export default function ModalAnularRecepcion({
  isOpen,
  onClose,
  ordenId,
  onAnulacionExitosa
}) {
  const [motivo, setMotivo] = useState('');
  const [keyword, setKeyword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const esValido = motivo.trim().length >= 10 && keyword.trim().toUpperCase() === 'ANULAR';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!esValido) return;

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await api.ordenesCompra.anularRecepcion(ordenId, {
        motivo: motivo.trim()
      });

      if (res?.success) {
        sileo.success(`Recepción de orden ${ordenId} anulada y revertida en Kardex con éxito.`);
        if (onAnulacionExitosa) onAnulacionExitosa();
        onClose();
      } else {
        throw new Error(res?.message || 'Error al anular recepción.');
      }
    } catch (err) {
      console.error('Error al anular recepción:', err);
      const msg = err.response?.data?.message || err.message || 'Error al anular la recepción.';
      setErrorMsg(msg);
      sileo.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-md rounded-2xl border border-rose-200 shadow-2xl p-6 space-y-4">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Anular Recepción de Mercadería
              </h3>
              <p className="text-[11px] text-slate-500">
                Orden: <strong className="text-rose-600">{ordenId}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ALERTA DE INTEGRIDAD */}
        <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold">
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Contra-movimiento Inmutable en Kardex</span>
          </div>
          <p className="text-[11px] text-rose-700 leading-relaxed">
            Esta acción revertirá las cantidades ingresadas al inventario físico mediante salidas de ajuste en Kardex con código <code>ANUL-{ordenId}</code>.
            Los movimientos originales no se borran físicamente garantizando trazabilidad y auditoría.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-100 border border-rose-300 rounded-xl text-xs text-rose-900">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Motivo obligatorio de anulación <span className="text-rose-500">*</span> (mín. 10 caracteres)
            </label>
            <textarea
              rows={3}
              required
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej. Mercadería devuelta por encontrarse dañada en empaque..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-medium text-slate-800 focus:outline-hidden focus:border-rose-500 focus:bg-white resize-none"
            />
            <span className="text-[11px] text-slate-400">
              Caracteres: {motivo.trim().length}/10 mínimo
            </span>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Para confirmar, escribe la palabra <strong className="text-rose-600">ANULAR</strong>:
            </label>
            <input
              type="text"
              required
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="ANULAR"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-center font-extrabold text-slate-800 uppercase tracking-widest focus:outline-hidden focus:border-rose-500 focus:bg-white"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!esValido || isSubmitting}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Procesando...</span>
                </>
              ) : (
                <>
                  <AlertOctagon className="w-3.5 h-3.5" />
                  <span>Revertir Stock y Anular</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
