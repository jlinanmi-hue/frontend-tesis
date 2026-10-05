import React, { useState, useEffect } from 'react';
import { PackagePlus, X, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { sileo } from 'sileo';
import api from '../../services/api';

export default function ModalProductoExpress({ isOpen, onClose, onProductoCreado, proveedorId = null }) {
  const [nombre, setNombre] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [unidadMedidaId, setUnidadMedidaId] = useState('UND-00001');
  const [precioCompra, setPrecioCompra] = useState('');
  const [precioVenta, setPrecioVenta] = useState('');
  
  const [categorias, setCategorias] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingCatalogos, setIsLoadingCatalogos] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setNombre('');
      setPrecioCompra('');
      setPrecioVenta('');
      setErrorMsg('');
      cargarCatalogos();
    }
  }, [isOpen]);

  const cargarCatalogos = async () => {
    setIsLoadingCatalogos(true);
    try {
      const [resCat, resUni] = await Promise.allSettled([
        api.inventario.categorias(),
        api.inventario.unidades()
      ]);

      if (resCat.status === 'fulfilled' && resCat.value?.data) {
        const cats = Array.isArray(resCat.value.data) ? resCat.value.data : (resCat.value.data.data || []);
        setCategorias(cats);
        if (cats.length > 0 && !categoriaId) {
          setCategoriaId(cats[0].Categoria_ProductoId || cats[0].id || '');
        }
      }

      if (resUni.status === 'fulfilled' && resUni.value?.data) {
        const unis = Array.isArray(resUni.value.data) ? resUni.value.data : (resUni.value.data.data || []);
        setUnidades(unis);
        const und = unis.find(u => (u.unidades_medidaId || u.id) === 'UND-00001') || unis[0];
        if (und) {
          setUnidadMedidaId(und.unidades_medidaId || und.id);
        }
      }
    } catch (e) {
      console.warn('Error al cargar catálogos para producto exprés:', e);
    } finally {
      setIsLoadingCatalogos(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setErrorMsg('El nombre del producto es obligatorio.');
      return;
    }
    if (!categoriaId) {
      setErrorMsg('Selecciona una categoría válida.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const payload = {
        nombre: nombre.trim(),
        categoria_id: categoriaId,
        unidad_medida_id: unidadMedidaId || 'UND-00001',
        precio_compra: precioCompra ? parseFloat(precioCompra) : 0,
        precio_venta: precioVenta ? parseFloat(precioVenta) : 0,
        proveedor_id: proveedorId || undefined
      };

      const res = await api.inventario.crearProductoExpress(payload);
      if (res?.success && res?.data) {
        sileo.success(`Producto "${res.data.ProductoNombre}" creado exitosamente en modo exprés.`);
        if (onProductoCreado) {
          onProductoCreado(res.data);
        }
        onClose();
      } else {
        throw new Error(res?.message || 'No se pudo crear el producto exprés.');
      }
    } catch (err) {
      console.error('Error al crear producto exprés:', err);
      const msg = err.response?.data?.message || err.message || 'Error al crear producto exprés.';
      setErrorMsg(msg);
      sileo.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-2xl p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Nuevo Producto Exprés
              </h3>
              <p className="text-[11px] text-slate-500">
                Alta rápida para recepcionar mercadería no catalogada
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

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Nombre del Producto <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Cemento Quisqueya 42.5kg Tipo I"
              maxLength={45}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-hidden focus:border-emerald-500 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Categoría <span className="text-rose-500">*</span>
              </label>
              <select
                value={categoriaId}
                onChange={(e) => setCategoriaId(e.target.value)}
                disabled={isLoadingCatalogos}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-hidden focus:border-emerald-500 cursor-pointer"
              >
                {categorias.map((c) => (
                  <option key={c.Categoria_ProductoId || c.id} value={c.Categoria_ProductoId || c.id}>
                    {c.Categoria_ProductoNombre || c.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Unidad Base
              </label>
              <select
                value={unidadMedidaId}
                onChange={(e) => setUnidadMedidaId(e.target.value)}
                disabled={isLoadingCatalogos}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-hidden focus:border-emerald-500 cursor-pointer"
              >
                {unidades.map((u) => (
                  <option key={u.unidades_medidaId || u.id} value={u.unidades_medidaId || u.id}>
                    {u.unidades_medidaNombre || u.nombre || u.descripcion} ({u.unidades_medidaAbreviatura || u.abreviatura})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Precio Compra (PEN)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={precioCompra}
                onChange={(e) => setPrecioCompra(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800 focus:outline-hidden focus:border-emerald-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Precio Venta (PEN)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={precioVenta}
                onChange={(e) => setPrecioVenta(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800 focus:outline-hidden focus:border-emerald-500 focus:bg-white"
              />
            </div>
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
              disabled={isSubmitting || !nombre.trim()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Creando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Crear Producto</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
