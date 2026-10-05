import React, { useState, useEffect } from 'react';
import { Zap, X, RefreshCw, AlertCircle, CheckCircle2, Building2, Package } from 'lucide-react';
import { sileo } from 'sileo';
import api from '../../services/api';

export default function ModalCompraRapida({
  isOpen,
  onClose,
  onCompraExitosa,
  productoInicial = null,
  cantidadInicial = 1,
  motivoInicial = 'Abastecimiento de emergencia por quiebre de stock'
}) {
  const [productos, setProductos] = useState([]);
  const [searchProd, setSearchProd] = useState('');
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [unidades, setUnidades] = useState([]);
  const [unidadSeleccionada, setUnidadSeleccionada] = useState(null);
  const [cantidad, setCantidad] = useState(1);
  const [precioUnitario, setPrecioUnitario] = useState(0);
  const [motivo, setMotivo] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingCatalogo, setIsLoadingCatalogo] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      cargarProductos();
      setCantidad(cantidadInicial || 1);
      setMotivo(motivoInicial || 'Abastecimiento de emergencia por quiebre de stock');
      setErrorMsg('');
      if (productoInicial) {
        configurarProducto(productoInicial);
      }
    }
  }, [isOpen, productoInicial, cantidadInicial, motivoInicial]);

  const cargarProductos = async () => {
    setIsLoadingCatalogo(true);
    try {
      const res = await api.inventario.productosSelect();
      if (res?.success && Array.isArray(res.data)) {
        setProductos(res.data);
      }
    } catch (e) {
      console.warn('Error al cargar catálogo en compra rápida:', e);
    } finally {
      setIsLoadingCatalogo(false);
    }
  };

  const configurarProducto = (prod) => {
    setProductoSeleccionado(prod);
    setSearchProd(prod.ProductoNombre || prod.nombre || '');
    
    // Configurar unidades
    const unis = prod.unidades || prod.presentaciones || [];
    setUnidades(unis);
    
    if (unis.length > 0) {
      const primera = unis[0];
      setUnidadSeleccionada(primera);
      const precio = Number(primera.precio_compra ?? prod.ProductoPrecioUnitario ?? 0);
      setPrecioUnitario(precio);
    } else {
      setUnidadSeleccionada(null);
      setPrecioUnitario(Number(prod.ProductoPrecioUnitario || 0));
    }
  };

  const handleSeleccionarProducto = (prod) => {
    configurarProducto(prod);
  };

  const handleCambiarUnidad = (unidadId) => {
    const uni = unidades.find((u) => (u.unidades_medidaId || u.id) === unidadId);
    if (uni) {
      setUnidadSeleccionada(uni);
      if (uni.precio_compra) {
        setPrecioUnitario(Number(uni.precio_compra));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!productoSeleccionado) {
      setErrorMsg('Debes seleccionar un producto.');
      return;
    }
    const cantNum = parseFloat(cantidad);
    if (!cantNum || cantNum <= 0) {
      setErrorMsg('La cantidad debe ser mayor a 0.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const prodId = productoSeleccionado.ProductoId || productoSeleccionado.id;
      const unidadId = unidadSeleccionada?.unidades_medidaId || unidadSeleccionada?.id || 'UND-00001';
      const obsTexto = motivo.trim() || 'Abastecimiento de emergencia por quiebre de stock';

      const payload = {
        producto_id: prodId,
        unidad_medida_id: unidadId,
        cantidad: cantNum,
        precio_unitario: parseFloat(precioUnitario) || 0,
        observaciones: obsTexto,
        motivo: obsTexto,
        detalles: [
          {
            producto_id: prodId,
            unidad_medida_id: unidadId,
            cantidad: cantNum,
            precio_unitario: parseFloat(precioUnitario) || 0,
          }
        ]
      };

      const res = await api.ordenesCompra.compraRapida(payload);
      if (res?.success) {
        sileo.success({
          title: 'Compra Rápida Exitosa',
          description: `+${cantNum} unidades añadidas inmediatamente al stock físico en almacén.`
        });
        if (onCompraExitosa) onCompraExitosa(res.data);
        onClose();
      } else {
        throw new Error(res?.message || 'Error al procesar compra rápida.');
      }
    } catch (err) {
      console.error('Error al registrar compra rápida:', err);
      const errorsObj = err.response?.data?.errors;
      let detailedMsg = '';
      if (errorsObj && typeof errorsObj === 'object') {
        detailedMsg = Object.values(errorsObj).flat().join(' | ');
      }
      const msg = detailedMsg || err.response?.data?.message || err.message || 'Error al procesar compra rápida.';
      setErrorMsg(msg);
      sileo.error({
        title: 'Error de Validación',
        description: msg
      });
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
      <div className="bg-white w-full max-w-lg rounded-2xl border border-amber-200 shadow-2xl p-6 space-y-4">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500 text-white rounded-xl shadow-xs">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Compra Rápida a Comercio Aliado
              </h3>
              <p className="text-[11px] text-slate-500">
                Abastecimiento inmediato sin orden de compra diferida
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

        {/* PROVEEDOR FIJO PYME VECINA */}
        <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-amber-900 font-semibold">
            <Building2 className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Proveedor: PYME Vecina (Comercio Aliado Local)</span>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
            PRV-PYME-VECINA
          </span>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {/* SELECCIÓN DE PRODUCTO */}
          <div className="relative">
            <label className="block font-semibold text-slate-700 mb-1">
              Producto <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={searchProd}
              onChange={(e) => {
                setSearchProd(e.target.value);
                setProductoSeleccionado(null);
              }}
              placeholder="Buscar producto por nombre..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-hidden focus:border-amber-500 focus:bg-white"
            />
            {!productoSeleccionado && searchProd && productosFiltrados.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto z-30">
                {productosFiltrados.slice(0, 10).map((prod) => (
                  <div
                    key={prod.ProductoId}
                    onClick={() => handleSeleccionarProducto(prod)}
                    className="p-2.5 hover:bg-amber-50/60 cursor-pointer border-b border-slate-50 text-xs flex justify-between items-center"
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

          {/* UNIDAD Y PRECIO */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Presentación / Unidad
              </label>
              <select
                disabled={!productoSeleccionado || unidades.length === 0}
                value={unidadSeleccionada?.unidades_medidaId || unidadSeleccionada?.id || ''}
                onChange={(e) => handleCambiarUnidad(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-hidden focus:border-amber-500 cursor-pointer disabled:opacity-50"
              >
                {unidades.length > 0 ? (
                  unidades.map((u) => (
                    <option key={u.unidades_medidaId || u.id} value={u.unidades_medidaId || u.id}>
                      {u.descripcion || u.unidades_medidaNombre} ({u.abreviatura || u.unidades_medidaAbreviatura})
                    </option>
                  ))
                ) : (
                  <option value="">Unidad Base (UND)</option>
                )}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Cantidad a Ingresar <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0.01"
                step="any"
                required
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-center text-slate-800 focus:outline-hidden focus:border-amber-500 focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Costo Unitario (PEN)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={precioUnitario}
                onChange={(e) => setPrecioUnitario(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800 focus:outline-hidden focus:border-amber-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Total Compra Estimado
              </label>
              <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 font-extrabold text-slate-800 text-right">
                S/ {(Number(cantidad || 0) * Number(precioUnitario || 0)).toFixed(2)}
              </div>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Motivo o Justificación
            </label>
            <input
              type="text"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej. Quiebre de stock en mostrador..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-hidden focus:border-amber-500 focus:bg-white"
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
              disabled={isSubmitting || !productoSeleccionado}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Procesando...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5" />
                  <span>Ingresar Stock Inmediato</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
