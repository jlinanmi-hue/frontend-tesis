import React, { useState, useEffect, useRef } from 'react';
import {
  Package,
  PlusCircle,
  Search,
  Pencil,
  Trash2,
  RotateCcw,
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Layers,
  DollarSign,
  Plus,
  Trash,
  MapPin,
  FileText,
  Image as ImageIcon,
  Upload,
  ArrowUpCircle
} from 'lucide-react';
import api from '../../services/api';
import { sileo } from 'sileo';

export default function GestionProductos() {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [unidadesCatalogo, setUnidadesCatalogo] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState('activos'); // 'activos' | 'stock_bajo' | 'eliminados'
  const [editingId, setEditingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRowIds, setExpandedRowIds] = useState({});

  const toggleExpandRow = (id) => {
    setExpandedRowIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Estados para manejo de imagen
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  // Formulario de Producto
  const initialFormState = {
    ProductoNombre: '',
    Producto_Categoria_ProductoId: '',
    ProductoMarca: '',
    producto_descripcion: '',
    producto_imagen: '',
    Producto_producto_ubi_id: '',
    ProductoStockMinimo: 5,
    ProductoStockMaximo: 1000,
    stockInicial: 0,
    ProductoEstado: 'A',
    detalles: [
      {
        _uid: 'init-1',
        unidades_medidaId: 'UND-00001',
        factor_conversion: 1,
        precio_compra: '',
        precio_venta: '',
      },
    ],
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterTab, searchQuery]);

  const cargarDatos = async () => {
    setIsLoading(true);
    try {
      const [resProd, resCat, resUnd, resUbi] = await Promise.all([
        api.inventario.listarProductos({ todos: 1, per_page: 150 }),
        api.inventario.categorias(),
        api.inventario.unidades(),
        api.inventario.ubicaciones(),
      ]);

      if (resProd?.success && resProd?.data) {
        const lista = Array.isArray(resProd.data) ? resProd.data : resProd.data?.data || [];
        setProductos(lista);
      }

      if (resCat?.success && resCat?.data) {
        setCategorias(resCat.data || []);
      }

      if (resUnd?.success && resUnd?.data) {
        setUnidadesCatalogo(resUnd.data || []);
      }

      if (resUbi?.success && resUbi?.data) {
        setUbicaciones(resUbi.data || []);
      }
    } catch (err) {
      console.error('Error al cargar productos:', err);
      sileo.error({
        title: 'Error de Conexión',
        description: 'No se pudieron sincronizar los datos de productos.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // Manejo de Unidades de Medida en Formulario
  const handleAddDetalle = () => {
    const primeraDisponible = unidadesCatalogo.find(
      (u) => !formData.detalles.some((d) => d.unidades_medidaId === u.unidades_medidaId)
    );

    setFormData((prev) => ({
      ...prev,
      detalles: [
        ...prev.detalles,
        {
          _uid: `add-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          unidades_medidaId: primeraDisponible ? primeraDisponible.unidades_medidaId : (unidadesCatalogo[0]?.unidades_medidaId || 'UND-00001'),
          factor_conversion: 12,
          precio_compra: '',
          precio_venta: '',
        },
      ],
    }));
  };

  const handleRemoveDetalle = (index) => {
    if (formData.detalles.length <= 1) {
      sileo.warning({
        title: 'Acción Requerida',
        description: 'El producto debe conservar al menos una unidad de medida base.',
      });
      return;
    }
    setFormData((prev) => {
      const filtered = prev.detalles.filter((_, i) => i !== index);
      // Si se eliminó la unidad en posición 0, la nueva posición 0 se convierte en la Unidad Base (factor = 1)
      if (index === 0 && filtered.length > 0) {
        filtered[0] = { ...filtered[0], factor_conversion: 1 };
      }
      return { ...prev, detalles: filtered };
    });
  };

  // Convertir cualquier presentación adicional en Unidad Base (mueve a posición 0 con factor = 1)
  const handleSetAsBaseUnit = (index) => {
    if (index === 0) return;
    setFormData((prev) => {
      const target = { ...prev.detalles[index], factor_conversion: 1 };
      const rest = prev.detalles.filter((_, i) => i !== index);
      return {
        ...prev,
        detalles: [target, ...rest],
      };
    });
    sileo.info({
      title: 'Nueva Unidad Base',
      description: 'Esta presentación fue promovida como Unidad Base del producto (Factor = 1).',
    });
  };

  const handleDetalleChange = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.detalles];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, detalles: updated };
    });
  };

  // Enviar Formulario (Crear / Actualizar)
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.ProductoNombre.trim()) {
      sileo.warning({
        title: 'Campo obligatorio',
        description: 'Ingresa el nombre comercial del producto.',
      });
      return;
    }

    if (!formData.Producto_Categoria_ProductoId) {
      sileo.warning({
        title: 'Categoría requerida',
        description: 'Selecciona una categoría de productos.',
      });
      return;
    }

    // Validar que no haya unidades de medida duplicadas
    const unidadesIds = formData.detalles.map((d) => d.unidades_medidaId);
    if (new Set(unidadesIds).size !== unidadesIds.length) {
      sileo.warning({
        title: 'Unidad Duplicada',
        description: 'No puedes asignar la misma unidad de medida a más de una presentación.',
      });
      return;
    }

    // Validar que haya una unidad base con factor = 1
    const tieneBase = formData.detalles.some((d) => parseInt(d.factor_conversion, 10) === 1);
    if (!tieneBase) {
      sileo.warning({
        title: 'Unidad Base Requerida',
        description: 'Debe existir obligatoriamente al menos una unidad de medida con factor = 1.',
      });
      return;
    }

    // Validar precios numéricos
    for (const det of formData.detalles) {
      if (det.precio_compra === '' || det.precio_venta === '') {
        sileo.warning({
          title: 'Precios requeridos',
          description: 'Todos los precios de compra y venta deben completarse.',
        });
        return;
      }
    }

    setIsSubmitting(true);
    const toastId = sileo.show({
      type: 'loading',
      title: editingId ? 'Actualizando producto...' : 'Registrando producto...',
      description: 'Guardando especificaciones y presentaciones en el servidor',
      duration: null,
    });

    try {
      const payload = {
        ProductoNombre: formData.ProductoNombre.trim(),
        Producto_Categoria_ProductoId: formData.Producto_Categoria_ProductoId,
        ProductoMarca: formData.ProductoMarca.trim() || 'Genérico',
        producto_descripcion: formData.producto_descripcion?.trim() || 'No se ingresó descripción',
        producto_imagen: formData.producto_imagen?.trim() || 'Sin imagenes, ',
        Producto_producto_ubi_id: formData.Producto_producto_ubi_id || null,
        ProductoStockMinimo: Number(formData.ProductoStockMinimo) || 5,
        ProductoStockMaximo: Number(formData.ProductoStockMaximo) || 1000,
        detalles: formData.detalles.map((d, index) => ({
          unidades_medidaId: d.unidades_medidaId,
          factor_conversion: index === 0 ? 1 : (parseInt(d.factor_conversion, 10) || 1),
          precio_compra: parseFloat(d.precio_compra) || 0,
          precio_venta: parseFloat(d.precio_venta) || 0,
        })),
      };

      if (!editingId && Number(formData.stockInicial) > 0) {
        payload.stockInicial = Number(formData.stockInicial);
      }

      let res;
      let targetId = editingId;
      if (editingId) {
        res = await api.inventario.actualizarProducto(editingId, payload);
      } else {
        res = await api.inventario.crearProducto(payload);
        targetId = res?.data?.ProductoId;
      }

      if (res?.success) {
        // Subir archivo de imagen física si fue seleccionada
        if (imageFile && targetId) {
          try {
            await api.inventario.subirImagen(targetId, imageFile);
          } catch (uploadErr) {
            console.error('Error al subir archivo de imagen:', uploadErr);
            sileo.error({
              title: 'Aviso de Imagen',
              description: 'El producto fue guardado, pero no se pudo procesar la subida del archivo de imagen.',
            });
          }
        }

        sileo.dismiss(toastId);
        sileo.success({
          title: editingId ? '¡Producto Actualizado!' : '¡Producto Registrado!',
          description: `El artículo "${formData.ProductoNombre}" fue guardado exitosamente.`,
        });
        handleCancelEdit();
        cargarDatos();
      } else {
        throw new Error(res?.message || 'No se pudo procesar la solicitud.');
      }
    } catch (err) {
      console.error('Error al guardar producto:', err);
      sileo.dismiss(toastId);
      sileo.error({
        title: 'Error al procesar',
        description: err.data?.message || err.message || 'Verifica los datos ingresados.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Manejo de archivo de imagen
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      sileo.error({
        title: 'Formato no compatible',
        description: 'Por favor selecciona un archivo de imagen (PNG, JPG o WebP).',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      sileo.error({
        title: 'Imagen muy grande',
        description: 'El tamaño de la imagen no debe superar los 5MB.',
      });
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setFormData((prev) => ({ ...prev, producto_imagen: '' }));
  };

  // Iniciar Edición
  const handleEdit = async (prod) => {
    setEditingId(prod.ProductoId);
    setImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // Precargar preview si el producto tiene imagen
    if (prod.producto_imagen && prod.producto_imagen !== 'Sin imagenes, ') {
      const fullUrl = prod.producto_imagen.startsWith('http')
        ? prod.producto_imagen
        : `http://127.0.0.1:8000${prod.producto_imagen}`;
      setImagePreview(fullUrl);
    } else {
      setImagePreview(null);
    }

    const mapearDetalles = (items) => {
      if (!Array.isArray(items) || items.length === 0) return [];
      const now = Date.now();
      const mapped = items.map((d, i) => ({
        _uid: d._uid || `${d.Detalle_Producto_medida_unidades_medidaId || d.unidades_medidaId || 'u'}-${now}-${i}`,
        unidades_medidaId: d.Detalle_Producto_medida_unidades_medidaId || d.unidades_medidaId || '',
        factor_conversion: Number(d.Detalle_Producto_medida_factor_conversion ?? d.factor_conversion ?? 1),
        precio_compra: d.Detalle_Producto_medida_precio_compra ?? d.precio_compra ?? '',
        precio_venta: d.Detalle_Producto_medida_precio_venta ?? d.precio_venta ?? '',
      }));
      return mapped.sort((a, b) => a.factor_conversion - b.factor_conversion);
    };

    const rawDetalles = prod.detalle_producto_medidas || prod.detalleProductoMedidas || [];
    const detallesMapeados = mapearDetalles(rawDetalles);

    setFormData({
      ProductoNombre: prod.ProductoNombre || '',
      Producto_Categoria_ProductoId: prod.Producto_Categoria_ProductoId || '',
      ProductoMarca: prod.ProductoMarca || '',
      producto_descripcion: prod.producto_descripcion && prod.producto_descripcion !== 'No se ingresó descripción'
        ? prod.producto_descripcion
        : '',
      producto_imagen: prod.producto_imagen || '',
      Producto_producto_ubi_id: prod.Producto_producto_ubi_id || '',
      ProductoStockMinimo: prod.ProductoStockMinimo || 5,
      ProductoStockMaximo: prod.ProductoStockMaximo || 1000,
      stockInicial: 0,
      ProductoEstado: prod.ProductoEstado || 'A',
      detalles: detallesMapeados.length > 0 ? detallesMapeados : initialFormState.detalles,
    });

    // Refrescar con datos actualizados del servidor si es necesario
    try {
      const res = await api.inventario.obtenerProducto(prod.ProductoId);
      if (res?.success && res?.data) {
        const fresh = res.data;
        const freshDetalles = fresh.detalle_producto_medidas || fresh.detalleProductoMedidas || [];
        const freshMapped = mapearDetalles(freshDetalles);

        if (freshMapped.length > 0) {
          setFormData((prev) => ({
            ...prev,
            detalles: freshMapped,
            ProductoNombre: fresh.ProductoNombre || prev.ProductoNombre,
            Producto_Categoria_ProductoId: fresh.Producto_Categoria_ProductoId || prev.Producto_Categoria_ProductoId,
            ProductoMarca: fresh.ProductoMarca || prev.ProductoMarca,
            producto_descripcion: fresh.producto_descripcion && fresh.producto_descripcion !== 'No se ingresó descripción'
              ? fresh.producto_descripcion
              : '',
            producto_imagen: fresh.producto_imagen || prev.producto_imagen,
            Producto_producto_ubi_id: fresh.Producto_producto_ubi_id || prev.Producto_producto_ubi_id,
            ProductoStockMinimo: fresh.ProductoStockMinimo || prev.ProductoStockMinimo,
            ProductoStockMaximo: fresh.ProductoStockMaximo || prev.ProductoStockMaximo,
          }));

          if (fresh.producto_imagen && fresh.producto_imagen !== 'Sin imagenes, ') {
            const freshUrl = fresh.producto_imagen.startsWith('http')
              ? fresh.producto_imagen
              : `http://127.0.0.1:8000${fresh.producto_imagen}`;
            setImagePreview(freshUrl);
          }
        }
      }
    } catch (err) {
      console.warn('Detalles frescos no obtenidos de la API:', err);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setFormData(initialFormState);
  };

  // Eliminación Lógica
  const handleDelete = async (prod) => {
    if (!window.confirm(`¿Estás seguro de dar de baja lógica al producto "${prod.ProductoNombre}"?`)) {
      return;
    }

    const toastId = sileo.show({
      type: 'loading',
      title: 'Dando de baja...',
      description: 'Aplicando eliminación lógica al artículo',
      duration: null,
    });

    try {
      const res = await api.inventario.eliminarProducto(prod.ProductoId);
      if (res?.success) {
        sileo.dismiss(toastId);
        sileo.success({
          title: 'Producto Desactivado',
          description: `El artículo "${prod.ProductoNombre}" fue marcado como inactivo.`,
        });
        cargarDatos();
      } else {
        throw new Error(res?.message || 'Error al eliminar');
      }
    } catch (err) {
      console.error(err);
      sileo.dismiss(toastId);
      sileo.error({
        title: 'Error al dar de baja',
        description: err.data?.message || err.message,
      });
    }
  };

  // Restaurar Producto
  const handleRestore = async (prod) => {
    const toastId = sileo.show({
      type: 'loading',
      title: 'Restaurando...',
      description: 'Reactivando el artículo en el catálogo',
      duration: null,
    });

    try {
      const res = await api.inventario.restaurarProducto(prod.ProductoId);
      if (res?.success) {
        sileo.dismiss(toastId);
        sileo.success({
          title: '¡Producto Restaurado!',
          description: `El artículo "${prod.ProductoNombre}" vuelve a estar activo.`,
        });
        cargarDatos();
      } else {
        throw new Error(res?.message || 'Error al restaurar');
      }
    } catch (err) {
      console.error(err);
      sileo.dismiss(toastId);
      sileo.error({
        title: 'Error al restaurar',
        description: err.data?.message || err.message,
      });
    }
  };

  // Filtros de Vista
  const productosFiltrados = productos.filter((p) => {
    const matchesSearch =
      p.ProductoNombre?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.ProductoMarca?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.ProductoId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.categoria_nombre?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterTab === 'activos') {
      return p.ProductoEliminado === 'N' && p.ProductoEstado === 'A';
    }
    if (filterTab === 'stock_bajo') {
      const stock = parseFloat(p.ProductoStockActual) || 0;
      const min = parseFloat(p.ProductoStockMinimo) || 0;
      return p.ProductoEliminado === 'N' && stock <= min;
    }
    if (filterTab === 'eliminados') {
      return p.ProductoEliminado === 'S';
    }
    return true;
  });

  // Paginación a 5 registros
  const itemsPerPage = 5;
  const totalPages = Math.ceil(productosFiltrados.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProductos = productosFiltrados.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-6">
      {/* Encabezado Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-linear-to-tr from-blue-600 to-indigo-500 rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Catálogo Maestro de Productos</h1>
            <p className="text-sm text-slate-500">
              Registra artículos, define sus unidades de medida, costos de entrada y precios unitarios oficiales.
            </p>
          </div>
        </div>

        <button
          onClick={cargarDatos}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 hover:text-slate-800 rounded-lg border border-slate-200 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          Sincronizar
        </button>
      </div>

      {/* Grid de 2 Columnas (Izquierda: Formulario | Derecha: Directorio) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* COLUMNA IZQUIERDA: Formulario */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${editingId ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                {editingId ? <Pencil className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
              </div>
              <h2 className="font-semibold text-slate-800 text-base">
                {editingId ? 'Modificar Producto' : 'Nuevo Producto'}
              </h2>
            </div>
            {editingId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 font-medium bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-md transition-colors"
              >
                <X className="w-3.5 h-3.5" /> Cancelar
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nombre */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nombre del Producto <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={45}
                placeholder="Ej. Arroz Costeño Extra 1KG"
                value={formData.ProductoNombre}
                onChange={(e) => setFormData({ ...formData, ProductoNombre: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 focus:bg-white transition-colors"
              />
            </div>

            {/* Categoría y Marca */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Categoría <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={formData.Producto_Categoria_ProductoId}
                  onChange={(e) => setFormData({ ...formData, Producto_Categoria_ProductoId: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 focus:bg-white transition-colors cursor-pointer"
                >
                  <option value="">-- Seleccionar --</option>
                  {categorias.map((c) => (
                    <option key={c.Categoria_ProductoId} value={c.Categoria_ProductoId}>
                      {c.Categoria_ProductoDescripcion_categoria}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Marca</label>
                <input
                  type="text"
                  maxLength={45}
                  placeholder="Ej. Costeño"
                  value={formData.ProductoMarca}
                  onChange={(e) => setFormData({ ...formData, ProductoMarca: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 focus:bg-white transition-colors"
                />
              </div>
            </div>

            {/* Ubicación de Almacén  */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  <span>Ubicacion</span>
                </span>
                <span className="text-[10px] font-normal text-slate-400">
                  Almacén / Estante
                </span>
              </label>
              <select
                value={formData.Producto_producto_ubi_id}
                onChange={(e) => setFormData({ ...formData, Producto_producto_ubi_id: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 focus:bg-white transition-colors cursor-pointer"
              >
                <option value="">-- Sin Ubicación Asignada (Opcional) --</option>
                {ubicaciones.map((u) => (
                  <option key={u.producto_ubi_id} value={u.producto_ubi_id}>
                    {u.producto_ubi_descripcion} {u.producto_ubi_observacion ? `(${u.producto_ubi_observacion})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Descripción del Producto (Opcional) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  <span>Descripción</span>
                </span>
                <span className="text-[10px] font-normal text-slate-400">
                  Opcional ({formData.producto_descripcion?.length || 0}/50)
                </span>
              </label>
              <input
                type="text"
                maxLength={50}
                placeholder="Ej. Arroz extra costeño grano largo seleccionado"
                value={formData.producto_descripcion}
                onChange={(e) => setFormData({ ...formData, producto_descripcion: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 focus:bg-white transition-colors"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Por defecto: <span className="font-mono text-slate-500">"No se ingresó descripción"</span>
              </p>
            </div>

            {/* Subir Imagen del Producto (Opcional) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                  <span>Imagen del Producto</span>
                </span>
                <span className="text-[10px] font-normal text-slate-400">
                  Opcional (PNG, JPG, WebP)
                </span>
              </label>

              {imagePreview ? (
                <div className="relative border border-slate-200 rounded-xl p-2.5 bg-slate-50 flex items-center gap-3">
                  <img
                    src={imagePreview}
                    alt="Vista previa"
                    className="w-12 h-12 object-cover rounded-lg border border-slate-200 bg-white shrink-0"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-slate-700 truncate">
                      {imageFile ? imageFile.name : (formData.producto_imagen?.split('/').pop() || 'Imagen asignada')}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {imageFile ? `${(imageFile.size / 1024).toFixed(1)} KB` : 'Almacenada en servidor'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                    title="Quitar imagen"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div>
                  <label className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer bg-slate-50/50 hover:bg-blue-50/20 transition-all">
                    <Upload className="w-5 h-5 text-slate-400 mb-1" />
                    <span className="text-xs font-medium text-slate-600">Haz clic para subir imagen</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Máximo 5MB</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      className="hidden"
                      onChange={handleImageChange}
                    />
                  </label>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Por defecto: <span className="font-mono text-slate-500">"Sin imagenes, "</span>
                  </p>
                </div>
              )}
            </div>

            {/* Stock Mínimo, Stock Máximo y Stock Inicial */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Stock Mínimo</label>
                <input
                  type="number"
                  min="0"
                  value={formData.ProductoStockMinimo}
                  onChange={(e) => setFormData({ ...formData, ProductoStockMinimo: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Stock Máximo</label>
                <input
                  type="number"
                  min="1"
                  value={formData.ProductoStockMaximo}
                  onChange={(e) => setFormData({ ...formData, ProductoStockMaximo: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Stock Inicial {editingId && <span className="text-[10px] text-slate-400">(Fijo)</span>}
                </label>
                <input
                  type="number"
                  min="0"
                  disabled={!!editingId}
                  value={formData.stockInicial}
                  onChange={(e) => setFormData({ ...formData, stockInicial: e.target.value })}
                  className={`w-full px-3 py-2 text-sm border rounded-xl ${editingId ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-50 border-slate-200 focus:outline-hidden focus:border-blue-500'}`}
                />
              </div>
            </div>

            {/* Sección: Unidades de Medida y Precios */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Unidades de Medida y Precios
                  </label>
                </div>
                <button
                  type="button"
                  onClick={handleAddDetalle}
                  className="text-xs text-blue-600 hover:text-blue-700 font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Agregar Unidad
                </button>
              </div>

              <div className="space-y-2.5">
                {formData.detalles.map((det, index) => (
                  <div
                    key={det._uid || index}
                    className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2.5 relative"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-600 uppercase">
                        {index === 0 ? (
                          <span className="text-blue-700 bg-blue-100/90 border border-blue-200 px-2 py-0.5 rounded-md font-extrabold text-[10px] tracking-wide inline-flex items-center gap-1">
                            UNIDAD BASE (FACTOR: 1)
                          </span>
                        ) : (
                          `Presentación Adicional #${index + 1}`
                        )}
                      </span>
                      <div className="flex items-center gap-2">
                        {index > 0 && (
                          <button
                            type="button"
                            onClick={() => handleSetAsBaseUnit(index)}
                            className="text-[10px] text-blue-600 hover:text-blue-800 font-bold hover:underline cursor-pointer flex items-center gap-1"
                            title="Convertir esta presentación en la Unidad Base del producto (Factor = 1)"
                          >
                            <ArrowUpCircle className="w-3.5 h-3.5" />
                            <span>Hacer Base</span>
                          </button>
                        )}
                        {formData.detalles.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveDetalle(index)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Eliminar presentación"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="col-span-2 sm:col-span-2">
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">Unidad</label>
                        <select
                          value={det.unidades_medidaId}
                          onChange={(e) => handleDetalleChange(index, 'unidades_medidaId', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-500 cursor-pointer"
                        >
                          {unidadesCatalogo.map((u) => (
                            <option key={u.unidades_medidaId} value={u.unidades_medidaId}>
                              {u.unidades_medidaDescripcionUnidades}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-2 sm:col-span-2">
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                          Factor Conv. (x Unid)
                        </label>
                        <input
                          type="number"
                          min="1"
                          disabled={index === 0}
                          value={index === 0 ? 1 : det.factor_conversion}
                          onChange={(e) => handleDetalleChange(index, 'factor_conversion', e.target.value)}
                          className={`w-full px-2.5 py-1.5 text-xs border rounded-lg ${index === 0 ? 'bg-slate-100 text-slate-500 font-semibold cursor-not-allowed' : 'bg-white border-slate-200 focus:outline-hidden focus:border-blue-500'}`}
                        />
                      </div>

                      <div className="col-span-2 sm:col-span-2">
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                          Precio Compra (Costo)
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">S/</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={det.precio_compra}
                            onChange={(e) => handleDetalleChange(index, 'precio_compra', e.target.value)}
                            className="w-full pl-7 pr-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div className="col-span-2 sm:col-span-2">
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                          Precio Venta Sugerido
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">S/</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={det.precio_venta}
                            onChange={(e) => handleDetalleChange(index, 'precio_venta', e.target.value)}
                            className="w-full pl-7 pr-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Botón Guardar */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Guardando...
                  </>
                ) : editingId ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Guardar Cambios
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-4 h-4" /> Registrar Producto
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* COLUMNA DERECHA: Directorio */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          {/* Barra de Filtros y Buscador */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setFilterTab('activos')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex-1 sm:flex-none ${filterTab === 'activos' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Activos ({productos.filter((p) => p.ProductoEliminado === 'N' && p.ProductoEstado === 'A').length})
              </button>

              <button
                type="button"
                onClick={() => setFilterTab('stock_bajo')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex-1 sm:flex-none ${filterTab === 'stock_bajo' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-500 hover:text-amber-700'}`}
              >
                Stock Bajo ({productos.filter((p) => p.ProductoEliminado === 'N' && parseFloat(p.ProductoStockActual) <= parseFloat(p.ProductoStockMinimo)).length})
              </button>

              <button
                type="button"
                onClick={() => setFilterTab('eliminados')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex-1 sm:flex-none ${filterTab === 'eliminados' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-500 hover:text-rose-700'}`}
              >
                Bajas ({productos.filter((p) => p.ProductoEliminado === 'S').length})
              </button>
            </div>

            {/* Buscador */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar producto o marca..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 focus:bg-white transition-colors"
              />
            </div>
          </div>

          {/* Tabla de Productos */}
          <div className="border border-slate-200/80 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-3.5">Producto</th>
                    <th className="py-3 px-3.5">Categoría</th>
                    <th className="py-3 px-3.5 text-center">Stock Actual</th>
                    <th className="py-3 px-3.5 text-right">P. Venta Base</th>
                    <th className="py-3 px-3.5 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan="5" className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                        Cargando inventario...
                      </td>
                    </tr>
                  ) : paginatedProductos.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-10 text-center text-slate-400">
                        No se encontraron productos en esta vista.
                      </td>
                    </tr>
                  ) : (
                    paginatedProductos.map((p) => {
                      const stock = parseFloat(p.ProductoStockActual) || 0;
                      const min = parseFloat(p.ProductoStockMinimo) || 0;
                      const isLow = stock <= min;
                      const isZero = stock <= 0;
                      const isExpanded = !!expandedRowIds[p.ProductoId];
                      const rawDetalles = p.detalle_producto_medidas || p.detalleProductoMedidas || [];
                      const detalles = [...rawDetalles].sort((a, b) => {
                        const fA = Number(a.Detalle_Producto_medida_factor_conversion ?? a.factor_conversion ?? 1);
                        const fB = Number(b.Detalle_Producto_medida_factor_conversion ?? b.factor_conversion ?? 1);
                        return fA - fB;
                      });

                      return (
                        <React.Fragment key={p.ProductoId}>
                          <tr className={`transition-colors ${isExpanded ? 'bg-blue-50/40 border-b border-blue-100' : 'hover:bg-slate-50/60'}`}>
                            <td className="py-3 px-3.5">
                              <div className="flex items-start gap-2.5">
                                {p.producto_imagen && p.producto_imagen !== 'Sin imagenes, ' ? (
                                  <img
                                    src={p.producto_imagen.startsWith('http') ? p.producto_imagen : `http://127.0.0.1:8000${p.producto_imagen}`}
                                    alt={p.ProductoNombre}
                                    className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0 bg-slate-50"
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-400">
                                    <Package className="w-5 h-5" />
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="font-semibold text-slate-800 leading-tight">{p.ProductoNombre}</div>
                                  <div className="text-[11px] text-slate-400 mt-0.5">
                                    {p.ProductoMarca || 'Genérico'} · <span className="font-mono">{p.ProductoId}</span>
                                  </div>
                                  {p.producto_descripcion && p.producto_descripcion !== 'No se ingresó descripción' && (
                                    <div className="text-[11px] text-slate-500 italic line-clamp-1 mt-0.5" title={p.producto_descripcion}>
                                      {p.producto_descripcion}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-3.5 text-slate-600">
                              <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium">
                                {p.categoria_nombre || 'General'}
                              </span>
                              {p.ubicacion_descripcion && p.ubicacion_descripcion !== 'Sin Ubicación' && (
                                <div className="mt-1 flex items-center gap-1 text-[10px] text-blue-600 font-medium">
                                  <MapPin className="w-3 h-3 text-blue-500 shrink-0" />
                                  <span className="line-clamp-1">{p.ubicacion_descripcion}</span>
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-3.5 text-center">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold ${
                                  isZero
                                    ? 'bg-rose-100 text-rose-700'
                                    : isLow
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {p.stock_actual_formateado || `${stock} Unidades`}
                              </span>
                            </td>
                            <td className="py-3 px-3.5 text-right font-semibold text-slate-800">
                              {p.precio_venta_base_formateado || '—'}
                            </td>
                            <td className="py-3 px-3.5 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {p.ProductoEliminado === 'N' ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleEdit(p)}
                                      className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                                      title="Editar producto"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDelete(p)}
                                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                                      title="Dar de baja"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleRestore(p)}
                                    className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors cursor-pointer"
                                    title="Restaurar producto"
                                  >
                                    <RotateCcw className="w-3 h-3" /> Restaurar
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => toggleExpandRow(p.ProductoId)}
                                  className={`p-1 rounded-md transition-all cursor-pointer flex items-center justify-center ${
                                    isExpanded
                                      ? 'bg-blue-600 text-white shadow-xs hover:bg-blue-700'
                                      : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
                                  }`}
                                  title={isExpanded ? 'Ocultar unidades de medida' : 'Ver unidades de medida'}
                                >
                                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-white' : ''}`} />
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Fila expandida con las Unidades de Medida */}
                          {isExpanded && (
                            <tr className="bg-slate-50/90 border-b border-slate-200">
                              <td colSpan={5} className="py-3 px-4 sm:px-6">
                                <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-xs">
                                  <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100">
                                    <div className="flex items-center gap-2">
                                      <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                        <Layers className="w-3.5 h-3.5" />
                                      </div>
                                      <div>
                                        <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                          <span>Unidades de Medida y Presentaciones</span>
                                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                                            {detalles.length} {detalles.length === 1 ? 'presentación' : 'presentaciones'}
                                          </span>
                                        </div>
                                        <div className="text-[11px] text-slate-400">
                                          Factores de conversión y precios configurados para <span className="font-semibold text-slate-600">{p.ProductoNombre}</span>
                                        </div>
                                      </div>
                                    </div>
                                    <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-1 rounded-md">
                                      {p.ProductoId}
                                    </span>
                                  </div>

                                  {detalles.length === 0 ? (
                                    <div className="py-4 text-center text-xs text-slate-400">
                                      No se encontraron presentaciones o unidades de medida para este producto.
                                    </div>
                                  ) : (
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-left text-xs">
                                        <thead>
                                          <tr className="text-slate-400 border-b border-slate-100 text-[10px] uppercase font-semibold">
                                            <th className="pb-2 font-semibold">Tipo</th>
                                            <th className="pb-2 font-semibold">Presentación / Unidad</th>
                                            <th className="pb-2 text-center font-semibold">Factor Conv.</th>
                                            <th className="pb-2 text-right font-semibold">Precio Compra</th>
                                            <th className="pb-2 text-right font-semibold">Precio Venta</th>
                                            <th className="pb-2 text-right font-semibold">Margen Comercial</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                          {detalles.map((d, idx) => {
                                            const factor = Number(d.Detalle_Producto_medida_factor_conversion ?? d.factor_conversion ?? 1);
                                            const pCompra = parseFloat(d.Detalle_Producto_medida_precio_compra ?? d.precio_compra ?? 0);
                                            const pVenta = parseFloat(d.Detalle_Producto_medida_precio_venta ?? d.precio_venta ?? 0);
                                            const margen = pCompra > 0 ? (((pVenta - pCompra) / pCompra) * 100).toFixed(1) : '0.0';
                                            const isBase = factor === 1;

                                            const nombreUnidad = d.unidad_medida?.unidades_medidaDescripcionUnidades
                                              || unidadesCatalogo.find((u) => u.unidades_medidaId === (d.Detalle_Producto_medida_unidades_medidaId || d.unidades_medidaId))?.unidades_medidaDescripcionUnidades
                                              || (d.Detalle_Producto_medida_unidades_medidaId || d.unidades_medidaId);

                                            return (
                                              <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                                                <td className="py-2.5 pr-2">
                                                  {isBase ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200/60">
                                                      <CheckCircle2 className="w-3 h-3 text-blue-600" />
                                                      Unidad Base
                                                    </span>
                                                  ) : (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-medium">
                                                      Presentación #{idx + 1}
                                                    </span>
                                                  )}
                                                </td>
                                                <td className="py-2.5 pr-2 font-semibold text-slate-800">
                                                  {nombreUnidad}
                                                </td>
                                                <td className="py-2.5 px-2 text-center">
                                                  <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-[11px] font-semibold text-slate-700">
                                                    x {factor} {factor === 1 ? 'Unidad Base' : 'Unidades'}
                                                  </span>
                                                </td>
                                                <td className="py-2.5 pl-2 text-right font-mono text-slate-600">
                                                  S/ {pCompra.toFixed(2)}
                                                </td>
                                                <td className="py-2.5 pl-2 text-right font-mono font-bold text-slate-800">
                                                  S/ {pVenta.toFixed(2)}
                                                </td>
                                                <td className="py-2.5 pl-2 text-right">
                                                  <span
                                                    className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-semibold ${
                                                      parseFloat(margen) >= 0
                                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                                        : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                                                    }`}
                                                  >
                                                    {parseFloat(margen) >= 0 ? `+${margen}%` : `${margen}%`}
                                                  </span>
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
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginador (5 items por página) */}
            {totalPages > 1 && (
              <div className="p-3 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Mostrando {startIndex + 1} a {Math.min(startIndex + itemsPerPage, productosFiltrados.length)} de{' '}
                  {productosFiltrados.length} productos
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                    className="p-1 text-slate-600 hover:bg-slate-200/80 rounded-md disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-2 font-semibold text-slate-800">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                    className="p-1 text-slate-600 hover:bg-slate-200/80 rounded-md disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
