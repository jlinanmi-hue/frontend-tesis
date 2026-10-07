import React, { useState, useEffect } from 'react';
import { Sliders, X, RefreshCw, AlertCircle, CheckCircle2, ArrowDownRight, ArrowUpRight, ShieldAlert } from 'lucide-react';
import { sileo } from 'sileo';
import api from '../../services/api';
import StyledSelect from '../dashboard/filters/StyledSelect';

export default function ModalAjusteManual({ isOpen, onClose, onAjusteExitoso }) {
  const [productos, setProductos] = useState([]);
  const [searchProd, setSearchProd] = useState('');
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [unidades, setUnidades] = useState([]);
  const [unidadSeleccionada, setUnidadSeleccionada] = useState(null);
  const [tipo, setTipo] = useState('E'); // 'E' = Entrada, 'S' = Salida
  const [cantidad, setCantidad] = useState(1);
  const [motivo, setMotivo] = useState('');

  const [isLoadingCatalogo, setIsLoadingCatalogo] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      cargarProductos();
      setProductoSeleccionado(null);
      setSearchProd('');
      setTipo('E');
      setCantidad(1);
      setMotivo('');
      setErrorMsg('');
    }
  }, [isOpen]);

  const cargarProductos = async () => {
    setIsLoadingCatalogo(true);
    try {
      const res = await api.inventario.productosSelect();
      if (res?.success && Array.isArray(res.data)) {
        setProductos(res.data);
      }
    } catch (e) {
      console.warn('Error cargando catálogo para ajuste manual:', e);
    } finally {
      setIsLoadingCatalogo(false);
    }
  };

  const handleSeleccionarProducto = (prod) => {
    setProductoSeleccionado(prod);
    setSearchProd(prod.ProductoNombre || '');
    const unis = prod.unidades || prod.presentaciones || [];
    setUnidades(unis);
    if (unis.length > 0) {
      setUnidadSeleccionada(unis[0]);
    } else {
      setUnidadSeleccionada(null);
    }
  };

  const esValido = productoSeleccionado && parseFloat(cantidad) > 0 && motivo.trim().length >= 10;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!esValido) {
      if (motivo.trim().length < 10) {
        setErrorMsg('El motivo del ajuste es obligatorio y debe tener al menos 10 caracteres.');
      } else {
        setErrorMsg('Por favor completa todos los campos requeridos.');
      }
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const prodId = productoSeleccionado.ProductoId || productoSeleccionado.id;
      const payload = {
        producto_id: prodId,
        unidad_medida_id: unidadSeleccionada?.unidades_medidaId || unidadSeleccionada?.id || 'UND-00001',
        tipo: tipo,
        cantidad: parseFloat(cantidad),
        motivo: motivo.trim()
      };

      const res = await api.inventario.ajusteManual(payload);
      if (res?.success) {
        sileo.success(`Ajuste manual de ${tipo === 'E' ? 'Entrada' : 'Salida'} asentado en Kardex con éxito.`);
        if (onAjusteExitoso) onAjusteExitoso();
        onClose();
      } else {
        throw new Error(res?.message || 'Error al asentar ajuste manual.');
      }
    } catch (err) {
      console.error('Error al registrar ajuste manual:', err);
      const msg = err.response?.data?.message || err.message || 'Error al procesar el ajuste manual.';
      setErrorMsg(msg);
      sileo.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const productosFiltrados = productos.filter((p) => {
    if (!searchProd.trim()) return false;
    const term = searchProd.toLowerCase();
    const nom = (p.ProductoNombre || '').toLowerCase();
    const cod = (p.ProductoId || '').toLowerCase();
    return nom.includes(term) || cod.includes(term);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-lg rounded-2xl border border-slate-200 shadow-2xl p-6 space-y-4">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl border border-purple-100">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Ajuste Manual de Inventario (Kardex)
              </h3>
              <p className="text-[11px] text-slate-500">
                Excepción controlada con motivo obligatorio y trazabilidad inmutable
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
        <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl text-xs text-purple-800 space-y-1">
          <div className="flex items-center gap-1.5 font-bold">
            <ShieldAlert className="w-4 h-4 text-purple-600 shrink-0" />
            <span>Principio de Trazabilidad Total</span>
          </div>
          <p className="text-[11px] text-purple-700 leading-relaxed">
            Todo ajuste manual genera un asiento inmutable en el Kardex con subtipo <code>AJUSTE_MANUAL</code> y usuario auditor.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {/* BUSCADOR DE PRODUCTO */}
          <div className="relative">
            <label className="block font-semibold text-slate-700 mb-1">
              Producto a Ajustar <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={searchProd}
              onChange={(e) => {
                setSearchProd(e.target.value);
                setProductoSeleccionado(null);
              }}
              placeholder="Buscar por nombre o código..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-hidden focus:border-purple-500 focus:bg-white"
            />
            {!productoSeleccionado && searchProd && productosFiltrados.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto z-30">
                {productosFiltrados.slice(0, 10).map((prod) => (
                  <div
                    key={prod.ProductoId}
                    onClick={() => handleSeleccionarProducto(prod)}
                    className="p-2.5 hover:bg-purple-50/60 cursor-pointer border-b border-slate-50 text-xs flex justify-between items-center"
                  >
                    <div>
                      <div className="font-bold text-slate-800">{prod.ProductoNombre}</div>
                      <div className="text-[11px] text-slate-400">Stock actual: {prod.stock_actual_texto || prod.ProductoStockActual}</div>
                    </div>
                    <span className="text-[11px] text-slate-500">{prod.categoria_nombre}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* TIPO DE MOVIMIENTO: ENTRADA / SALIDA */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Sentido del Ajuste <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTipo('E')}
                className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-2 border transition cursor-pointer ${
                  tipo === 'E'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-xs'
                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <ArrowDownRight className="w-4 h-4 text-emerald-600" />
                <span>Entrada (+ Stock)</span>
              </button>

              <button
                type="button"
                onClick={() => setTipo('S')}
                className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-2 border transition cursor-pointer ${
                  tipo === 'S'
                    ? 'bg-rose-50 text-rose-700 border-rose-300 shadow-xs'
                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <ArrowUpRight className="w-4 h-4 text-rose-600" />
                <span>Salida (- Stock)</span>
              </button>
            </div>
          </div>

          {/* UNIDAD Y CANTIDAD */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Unidad de Medida
              </label>
              <StyledSelect
                size="form"
                value={unidadSeleccionada?.unidades_medidaId || unidadSeleccionada?.id || ''}
                onChange={(v) => {
                  const u = unidades.find((x) => (x.unidades_medidaId || x.id) === v);
                  setUnidadSeleccionada(u || null);
                }}
                options={
                  unidades.length > 0
                    ? unidades.map((u) => ({
                        value: u.unidades_medidaId || u.id,
                        label: `${u.descripcion || u.unidades_medidaNombre} (${u.abreviatura || u.unidades_medidaAbreviatura})`,
                      }))
                    : [{ value: '', label: 'Unidad Base (UND)' }]
                }
                disabled={!productoSeleccionado || unidades.length === 0}
                placeholder="Seleccionar unidad..."
                searchable
                ariaLabel="Unidad de medida del ajuste"
                panelWidth={240}
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Cantidad a Ajustar <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0.01"
                step="any"
                required
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-center text-slate-800 focus:outline-hidden focus:border-purple-500 focus:bg-white"
              />
            </div>
          </div>

          {/* MOTIVO OBLIGATORIO (>= 10 CARACTERES) */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Motivo obligatorio del ajuste <span className="text-rose-500">*</span> (mín. 10 caracteres)
            </label>
            <textarea
              rows={3}
              required
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej. Conteo físico de fin de mes arrojó diferencia de inventario..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:outline-hidden focus:border-purple-500 focus:bg-white resize-none"
            />
            <span className="text-[11px] text-slate-400">
              Caracteres: {motivo.trim().length}/10 mínimo
            </span>
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
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Asentando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Asentar en Kardex</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
