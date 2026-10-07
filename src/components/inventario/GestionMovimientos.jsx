import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  ClipboardList,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  Calendar,
  FileText,
  Package,
  Layers,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Tag,
  X,
  RotateCcw,
  Eye,
  Info,
  Hash,
  Clock,
  User,
  ArrowRightLeft,
  ShieldCheck,
  Scale,
  Printer,
  Sliders,
} from 'lucide-react';
import api from '../../services/api';
import { sileo } from 'sileo';
import StyledSelect from '../dashboard/filters/StyledSelect';
import StyledDatePicker from '../common/StyledDatePicker';
import DocumentoOrdenOficial from '../common/DocumentoOrdenOficial';

export default function GestionMovimientos() {
  const [productosSelect, setProductosSelect] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [paginacion, setPaginacion] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
    per_page: 8,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSelects, setIsLoadingSelects] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal de Detalle de Movimiento (Ojito)
  const [isModalDetalleOpen, setIsModalDetalleOpen] = useState(false);
  const [movimientoDetalle, setMovimientoDetalle] = useState(null);
  const [isLoadingDetalle, setIsLoadingDetalle] = useState(false);

  // Modal Formato Físico Oficial de Orden de Movimiento
  const [showModalOficial, setShowModalOficial] = useState(false);
  const [movimientoParaOficial, setMovimientoParaOficial] = useState(null);
  const [datosEmpresa, setDatosEmpresa] = useState(null);

  useEffect(() => {
    if (api.empresa?.obtener) {
      api.empresa.obtener().then(res => {
        if (res?.data) setDatosEmpresa(res.data);
      }).catch(() => {});
    }
  }, []);

  // Filtros de la Tabla
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroTipo, setFiltroTipo] = useState(''); // '' | 'E' | 'S'
  const [filtroSubtipo, setFiltroSubtipo] = useState(''); // '' | 'RECEPCION_OC' | 'ANULACION_RECEPCION' | ...
  const [filtroDias, setFiltroDias] = useState(''); // '' | '1' | '7' | '15' | '30'
  const [currentPage, setCurrentPage] = useState(1);

  // Formulario de Movimiento (Réplica de la interfaz de referencia)
  const getNowDateTimeLocal = () => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const initialFormState = {
    tipoMovimiento: 'E', // Siempre Entrada
    productoId: '',
    unidadesMedidaId: '',
    cantidad: 1,
    precioUnitario: '',
    documentoOperacionId: '',
    fechaMovimiento: getNowDateTimeLocal(),
    fechaAproxSalida: '',
  };

  const [formData, setFormData] = useState(initialFormState);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [unidadSeleccionada, setUnidadSeleccionada] = useState(null);

  // Buscador interactivo de Producto
  const [searchProducto, setSearchProducto] = useState('');
  const [isDropdownProductoOpen, setIsDropdownProductoOpen] = useState(false);
  const productoDropdownRef = useRef(null);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (productoDropdownRef.current && !productoDropdownRef.current.contains(event.target)) {
        setIsDropdownProductoOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Lista de productos filtrados según la búsqueda
  const productosFiltrados = productosSelect.filter((p) => {
    if (!searchProducto.trim()) return true;
    const term = searchProducto.toLowerCase();
    return (
      (p.ProductoNombre && p.ProductoNombre.toLowerCase().includes(term)) ||
      (p.ProductoMarca && p.ProductoMarca.toLowerCase().includes(term)) ||
      (p.ProductoId && p.ProductoId.toLowerCase().includes(term)) ||
      (p.categoria_nombre && p.categoria_nombre.toLowerCase().includes(term))
    );
  });

  const handleSeleccionarProducto = (prod) => {
    setProductoSeleccionado(prod);
    setUnidadSeleccionada(null);

    const primeraUnidad = prod?.unidades?.[0] || null;

    setFormData((prev) => ({
      ...prev,
      productoId: prod.ProductoId,
      unidadesMedidaId: primeraUnidad ? primeraUnidad.unidades_medidaId : '',
      precioUnitario: primeraUnidad ? primeraUnidad.precio_compra : '',
    }));

    if (primeraUnidad) {
      setUnidadSeleccionada(primeraUnidad);
    }
    setSearchProducto('');
    setIsDropdownProductoOpen(false);
  };

  const handleLimpiarProductoSeleccionado = () => {
    setProductoSeleccionado(null);
    setUnidadSeleccionada(null);
    setFormData((prev) => ({
      ...prev,
      productoId: '',
      unidadesMedidaId: '',
      precioUnitario: '',
    }));
    setSearchProducto('');
    setIsDropdownProductoOpen(true);
  };

  // Cargar selector ligero de productos
  const cargarProductosSelect = async () => {
    setIsLoadingSelects(true);
    try {
      const res = await api.inventario.productosSelect();
      if (res?.success && res?.data) {
        setProductosSelect(res.data);
      }
    } catch (err) {
      console.error('Error al cargar productos para select:', err);
    } finally {
      setIsLoadingSelects(false);
    }
  };

  // Cargar tabla de movimientos desde el backend paginado a 8 registros
  const cargarMovimientos = async (page = 1) => {
    setIsLoading(true);
    try {
      const params = {
        page,
        per_page: 8,
      };
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      if (filtroTipo) {
        params.tipoMovimiento = filtroTipo;
      }
      if (filtroDias) {
        params.dias = filtroDias;
      }
      if (filtroSubtipo) {
        params.subtipo = filtroSubtipo;
      }

      const res = await api.inventario.movimientos(params);
      if (res?.success && res?.data) {
        const pagData = res.data;
        setMovimientos(pagData.data || []);
        setPaginacion({
          current_page: pagData.current_page || 1,
          last_page: pagData.last_page || 1,
          total: pagData.total || 0,
          per_page: pagData.per_page || 8,
        });
      }
    } catch (err) {
      console.error('Error al cargar movimientos:', err);
      sileo.error({
        title: 'Error de Servidor',
        description: 'No se pudo sincronizar el historial de movimientos.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Abrir Modal de Detalle de Movimiento (Ojito)
  const handleVerDetalle = async (mov) => {
    setMovimientoDetalle(mov);
    setIsModalDetalleOpen(true);

    try {
      setIsLoadingDetalle(true);
      const res = await api.inventario.movimientoDetalle(mov.Movimiento_productoId);
      if (res?.success && res?.data) {
        setMovimientoDetalle(res.data);
      }
    } catch (err) {
      console.error('Error al cargar detalle extendido de movimiento:', err);
    } finally {
      setIsLoadingDetalle(false);
    }
  };

  useEffect(() => {
    cargarProductosSelect();
  }, []);

  useEffect(() => {
    cargarMovimientos(currentPage);
  }, [currentPage, filtroTipo, filtroDias, filtroSubtipo]);

  // Manejador de búsqueda con debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      cargarMovimientos(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Helpers para Formato Oficial de Movimientos
  const resolverHeaderType = (mov) => {
    if (!mov) return 'ORDEN DE MOVIMIENTO DE STOCK';
    const subtipo = (mov.subtipo || mov.Movimiento_productoSubtipo || '').toUpperCase();
    const doc = (mov.documento_referencia || mov.Movimiento_productoDocumentoOperacionId || '').toUpperCase();
    const esSalida = (
      mov.Movimiento_productoTipoMovimiento === 'S' ||
      mov.Movimiento_productoTipo_Movimiento === 'S' ||
      mov.tipo_movimiento === 'S' ||
      mov.tipo === 'S'
    );

    if (subtipo === 'ANULACION_RECEPCION' || doc.startsWith('ANUL-')) {
      return 'ORDEN DE ANULACIÓN DE COMPRA';
    }
    if (subtipo === 'DEVOLUCION_CLIENTE' || doc.startsWith('DEV-PED-') || doc.startsWith('DEV-')) {
      return 'ORDEN DE REINGRESO DE STOCK';
    }
    if (subtipo === 'AJUSTE_MANUAL' || doc.startsWith('AJU-') || doc.startsWith('AJUSTE-')) {
      return esSalida ? 'ORDEN DE AJUSTE DE INVENTARIO (SALIDA)' : 'ORDEN DE AJUSTE DE INVENTARIO (INGRESO)';
    }
    if (subtipo === 'VENTA_PEDIDO' || subtipo === 'VENTA' || doc.startsWith('PED-')) {
      return 'ORDEN DE DESPACHO DE STOCK';
    }
    if (subtipo === 'RECEPCION_OC' || subtipo === 'COMPRA_RAPIDA' || doc.startsWith('OC-') || doc.startsWith('CR-')) {
      return 'ORDEN DE INGRESO DE STOCK';
    }
    return esSalida ? 'ORDEN DE EGRESO DE STOCK' : 'ORDEN DE INGRESO DE STOCK';
  };

  const resolverEntidadMovimiento = (mov) => {
    if (!mov) {
      return {
        nombre: 'ALMACÉN PRINCIPAL - COMERCIAL VALENCIA',
        ruc: datosEmpresa?.EmpresaRuc || '10181935451',
        direccion: datosEmpresa?.EmpresaDireccion || 'Av. Principal 123 - Lima, Perú',
      };
    }

    if (mov.proveedor) {
      return {
        nombre: mov.proveedor.razon_social || mov.proveedor.ProveedorRazonSocial || 'PROVEEDOR',
        ruc: mov.proveedor.ruc || mov.proveedor.ProveedorRuc || '---',
        direccion: mov.proveedor.direccion || mov.proveedor.ProveedorDireccion || '---',
        responsable: mov.usuario_creacion || undefined,
      };
    }

    if (mov.cliente) {
      return {
        nombre: mov.cliente.nombre || mov.cliente.ClienteNombre || 'CLIENTE',
        ruc: mov.cliente.ruc || mov.cliente.ClienteRuc || mov.cliente.ClienteDni || '---',
        direccion: mov.cliente.direccion || mov.cliente.ClienteDireccion || '---',
        responsable: mov.usuario_creacion || undefined,
      };
    }

    return {
      nombre: 'ALMACÉN PRINCIPAL - COMERCIAL VALENCIA',
      ruc: datosEmpresa?.EmpresaRuc || '10181935451',
      direccion: datosEmpresa?.EmpresaDireccion || 'Av. Principal 123 - Lima, Perú',
      responsable: mov.usuario_creacion || undefined,
    };
  };

  const handleImprimirOficial = async (mov) => {
    const id = mov.Movimiento_productoId || mov.id;
    if (id) {
      try {
        const res = await api.inventario.movimientoDetalle(id);
        if (res?.success && res?.data) {
          setMovimientoParaOficial(res.data);
          setShowModalOficial(true);
          return;
        }
      } catch (err) {
        console.error('Error al cargar detalle para impresión oficial:', err);
      }
    }
    setMovimientoParaOficial(mov);
    setShowModalOficial(true);
  };

  const renderBadgeSubtipo = (subtipo) => {
    switch (subtipo) {
      case 'RECEPCION_OC':
        return (
          <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            Recepción OC
          </span>
        );
      case 'ANULACION_RECEPCION':
        return (
          <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            Anulación OC
          </span>
        );
      case 'COMPRA_RAPIDA':
        return (
          <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            Compra Rápida
          </span>
        );
      case 'AJUSTE_MANUAL':
        return (
          <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            Ajuste Manual
          </span>
        );
      case 'DEVOLUCION_CLIENTE':
        return (
          <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
            Devolución
          </span>
        );
      case 'VENTA_PEDIDO':
      case 'VENTA':
        return (
          <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            Venta
          </span>
        );
      case 'INVENTARIO_INICIAL':
        return (
          <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            Inv. Inicial
          </span>
        );
      default:
        return subtipo ? (
          <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-50 text-slate-600 border border-slate-200">
            {subtipo}
          </span>
        ) : null;
    }
  };

  // Cuando cambia el producto seleccionado en el combo
  const handleProductoChange = (e) => {
    const id = e.target.value;
    const prod = productosSelect.find((p) => p.ProductoId === id) || null;

    setProductoSeleccionado(prod);
    setUnidadSeleccionada(null);

    // Seleccionar automáticamente la primera unidad disponible (generalmente la base)
    const primeraUnidad = prod?.unidades?.[0] || null;

    setFormData((prev) => ({
      ...prev,
      productoId: id,
      unidadesMedidaId: primeraUnidad ? primeraUnidad.unidades_medidaId : '',
      precioUnitario: primeraUnidad ? primeraUnidad.precio_compra : '',
    }));

    if (primeraUnidad) {
      setUnidadSeleccionada(primeraUnidad);
    }
  };

  // Cuando cambia la unidad de medida seleccionada
  const handleUnidadChange = (e) => {
    const uId = e.target.value;
    const und = productoSeleccionado?.unidades?.find((u) => u.unidades_medidaId === uId) || null;
    setUnidadSeleccionada(und);
    setFormData((prev) => ({
      ...prev,
      unidadesMedidaId: uId,
      precioUnitario: und ? und.precio_compra : '',
    }));
  };

  // Enviar Formulario de Registro (Exclusivo Entrada de Mercadería)
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.productoId) {
      sileo.warning({
        title: 'Producto Requerido',
        description: 'Por favor selecciona un producto de la lista.',
      });
      return;
    }

    if (!formData.unidadesMedidaId) {
      sileo.warning({
        title: 'Unidad Requerida',
        description: 'Selecciona una unidad de medida para la presentación.',
      });
      return;
    }

    const cantidadNum = parseFloat(formData.cantidad);
    if (!cantidadNum || cantidadNum <= 0) {
      sileo.warning({
        title: 'Cantidad Inválida',
        description: 'La cantidad ingresante debe ser un número positivo mayor a 0.',
      });
      return;
    }

    setIsSubmitting(true);
    const toastId = sileo.show({
      type: 'loading',
      title: 'Registrando entrada de stock...',
      description: 'Calculando conversiones y actualizando kardex en el servidor',
      duration: null,
    });

    try {
      const payload = {
        productoId: formData.productoId,
        unidadesMedidaId: formData.unidadesMedidaId,
        tipoMovimiento: 'E', // Siempre Entrada en este formulario
        cantidad: cantidadNum,
        documentoOperacionId: formData.documentoOperacionId.trim() || null,
        precioUnitario: parseFloat(formData.precioUnitario) || 0,
        fechaMovimiento: formData.fechaMovimiento || null,
        fechaAproxSalida: formData.fechaAproxSalida || null,
      };

      const res = await api.inventario.registrarMovimiento(payload);

      if (res?.success) {
        sileo.dismiss(toastId);
        sileo.success({
          title: '¡Entrada de Mercadería Registrada!',
          description: `Se ingresaron ${cantidadNum} ${unidadSeleccionada?.descripcion || 'unidades'} de "${productoSeleccionado?.ProductoNombre}" al stock.`,
        });

        // Limpiar formulario conservando fecha y hora actualizada
        setFormData({
          ...initialFormState,
          tipoMovimiento: 'E',
          fechaMovimiento: getNowDateTimeLocal(),
        });
        setProductoSeleccionado(null);
        setUnidadSeleccionada(null);
        setSearchProducto('');
        setIsDropdownProductoOpen(false);

        // Recargar datos y selector ligero (para actualizar stock en combos)
        cargarMovimientos(1);
        cargarProductosSelect();
      } else {
        throw new Error(res?.message || 'No se pudo registrar el movimiento.');
      }
    } catch (err) {
      console.error('Error al registrar movimiento:', err);
      sileo.dismiss(toastId);
      sileo.error({
        title: 'Error de Movimiento',
        description: err.data?.message || err.message || 'Verifica la disponibilidad de stock o los datos.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Gestión de Inventario</h1>
          <p className="text-sm text-slate-500 mt-1">
            Controla las entradas y salidas de mercadería, asegurando la trazabilidad.
          </p>
        </div>

        <button
          onClick={() => {
            cargarMovimientos(currentPage);
            cargarProductosSelect();
          }}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 hover:text-slate-800 rounded-lg border border-slate-200 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
          Actualizar Trazabilidad
        </button>
      </div>

      {/* Grid Principal: 2 Contenedores (Izquierda: Formulario | Derecha: Tabla de Trazabilidad) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* =========================================================================
            CONTENEDOR IZQUIERDO: Ingreso Manual y Registro de Stock (Réplica Fiel)
           ========================================================================= */}
        <div className="lg:col-span-5 bg-white p-6 sm:p-7 rounded-2xl border-2 border-emerald-500/30 shadow-xs space-y-5 relative">
          {/* Título del Contenedor con Ícono Verde */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                ⊕
              </div>
              <h2 className="text-base font-bold text-slate-800">
                Ingreso Manual y Registro de Stock
              </h2>
            </div>
            <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/60">
              Recepción / Compras
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 1. Buscador de Producto */}
            <div ref={productoDropdownRef} className="relative">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Seleccionar Producto <span className="text-rose-500">*</span>
                </label>
                {productoSeleccionado && (
                  <button
                    type="button"
                    onClick={handleLimpiarProductoSeleccionado}
                    className="text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold cursor-pointer flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Cambiar producto</span>
                  </button>
                )}
              </div>

              {!productoSeleccionado ? (
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    disabled={isLoadingSelects}
                    placeholder="Buscar producto por nombre, marca o código..."
                    value={searchProducto}
                    onChange={(e) => {
                      setSearchProducto(e.target.value);
                      setIsDropdownProductoOpen(true);
                    }}
                    onFocus={() => setIsDropdownProductoOpen(true)}
                    className="w-full pl-9.5 pr-8 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-emerald-500 focus:bg-white text-slate-800 transition-colors"
                  />
                  {searchProducto && (
                    <button
                      type="button"
                      onClick={() => setSearchProducto('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Menú flotante de resultados filtrados */}
                  {isDropdownProductoOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-40 max-h-60 overflow-y-auto divide-y divide-slate-100 animate-in fade-in slide-in-from-top-1 duration-150">
                      {productosFiltrados.length === 0 ? (
                        <div className="p-4 text-center text-slate-400 text-xs">
                          <Package className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                          <p className="font-semibold text-slate-600">No se encontraron productos</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {searchProducto
                              ? `No hay coincidencias con "${searchProducto}"`
                              : 'No hay productos disponibles'}
                          </p>
                        </div>
                      ) : (
                        productosFiltrados.map((p) => {
                          const stockNum = parseFloat(p.ProductoStockActual ?? 0);
                          const costoRef = parseFloat(
                            p.unidades?.[0]?.precio_compra || p.precio_compra || 0
                          );

                          return (
                            <button
                              key={p.ProductoId}
                              type="button"
                              onClick={() => handleSeleccionarProducto(p)}
                              className="w-full p-3 text-left hover:bg-emerald-50/70 transition flex items-center justify-between gap-3 cursor-pointer group"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-800 text-xs group-hover:text-emerald-700 transition-colors truncate">
                                    {p.ProductoNombre}
                                  </span>
                                  <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                                    {p.ProductoId}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                                  Marca: <strong>{p.ProductoMarca || 'Genérica'}</strong> · Cat: {p.categoria_nombre || 'General'}
                                  {costoRef > 0 && ` · Costo: S/ ${costoRef.toFixed(2)}`}
                                </p>
                              </div>

                              <div className="text-right shrink-0">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                    stockNum > 0
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                                  }`}
                                >
                                  Stock: {stockNum.toLocaleString()}
                                </span>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* Tarjeta del producto seleccionado */
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 animate-in fade-in duration-150">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Package className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-xs">
                          {productoSeleccionado.ProductoNombre}
                        </span>
                        <span className="text-[10px] font-mono text-slate-600 bg-white px-1.5 py-0.5 rounded border border-emerald-100">
                          {productoSeleccionado.ProductoId}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5 truncate">
                        Marca: <strong>{productoSeleccionado.ProductoMarca || 'Genérica'}</strong> · Cat: {productoSeleccionado.categoria_nombre || 'General'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block leading-tight">Stock Actual</span>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md inline-block">
                        {productoSeleccionado.stock_actual_texto}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleLimpiarProductoSeleccionado}
                      className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition cursor-pointer"
                      title="Cambiar producto"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Cantidad y Unidad de Medida (Grid de 2 columnas) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Cantidad <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="1"
                  value={formData.cantidad}
                  onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-emerald-500 focus:bg-white transition-colors font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Unidad de Medida <span className="text-rose-500">*</span>
                </label>
                <StyledSelect
                  size="form"
                  value={formData.unidadesMedidaId}
                  onChange={(v) => handleUnidadChange({ target: { value: v } })}
                  options={[
                    { value: '', label: '-- Seleccionar --' },
                    ...(productoSeleccionado?.unidades || []).map((u) => ({
                      value: u.unidades_medidaId,
                      label: `${u.descripcion} (Factor: ${u.factor_conversion})`,
                    })),
                  ]}
                  disabled={!productoSeleccionado || productoSeleccionado?.unidades?.length === 0}
                  placeholder="-- Seleccionar --"
                  searchable
                  ariaLabel="Unidad de medida del movimiento"
                  panelWidth={240}
                />
              </div>
            </div>

            {/* 3. Precios (Costo de Entrada del Lote & Precio Sugerido) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50/80 rounded-xl border border-slate-100">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Costo Entrada (S/)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-semibold">S/</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.precioUnitario}
                    onChange={(e) => setFormData({ ...formData, precioUnitario: e.target.value })}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-500 font-semibold text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Precio Sugerido Venta
                </label>
                <div className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 font-semibold flex items-center justify-between">
                  <span>{unidadSeleccionada?.precio_venta_formateado || 'S/ 0.00'}</span>
                  {unidadSeleccionada?.margen_porcentaje && (
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">
                      {unidadSeleccionada.margen_porcentaje}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 4. Número de Guía / Factura */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Número de Guía / Factura
              </label>
              <input
                type="text"
                maxLength={45}
                placeholder="Ej: F001-492"
                value={formData.documentoOperacionId}
                onChange={(e) => setFormData({ ...formData, documentoOperacionId: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-emerald-500 focus:bg-white transition-colors"
              />
            </div>

            {/* 5. Fechas (Fecha de Ingreso & Fecha Aprox de Salida) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Fecha y Hora de Ingreso
                </label>
                <div className="relative">
                  <input
                    type="datetime-local"
                    required
                    value={formData.fechaMovimiento}
                    onChange={(e) => setFormData({ ...formData, fechaMovimiento: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-emerald-50/50 border border-emerald-200 rounded-xl focus:outline-hidden focus:border-emerald-500 text-slate-800 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Fecha (Aprox) de Salida
                </label>
                <div className="relative">
                  <StyledDatePicker
                    value={formData.fechaAproxSalida}
                    onChange={(v) => setFormData({ ...formData, fechaAproxSalida: v })}
                    size="form"
                    ariaLabel="Fecha aproximada de salida"
                  />
                </div>
              </div>
            </div>

            {/* 6. Botón de Acción Principal Verde */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Procesando Entrada en Servidor...
                  </>
                ) : (
                  <>
                    <ArrowDownRight className="w-4 h-4 stroke-[3]" /> Registrar Entrada de Mercadería
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* =========================================================================
            CONTENEDOR DERECHO: Tabla de Trazabilidad y Fechas de Control (Réplica Fiel)
           ========================================================================= */}
        <div className="lg:col-span-7 bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          {/* Encabezado del Contenedor con Ícono Azul */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                📊
              </div>
              <h2 className="text-base font-bold text-slate-800">
                Tabla de Trazabilidad y Fechas de Control
              </h2>
            </div>

            <div className="flex items-center gap-2">
              {/* Filtros de Tipo */}
              <div className="inline-flex p-0.5 bg-slate-100 rounded-lg text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setFiltroTipo('');
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${filtroTipo === '' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFiltroTipo('E');
                    setFiltroSubtipo('');
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${filtroTipo === 'E' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500 hover:text-emerald-700'}`}
                >
                  Entradas
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFiltroTipo('S');
                    setFiltroSubtipo('');
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${filtroTipo === 'S' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-500 hover:text-rose-700'}`}
                >
                  Salidas
                </button>
              </div>
            </div>
          </div>

          {/* Filtros Rápidos: Buscador, Subtipo y Selector de Período */}
          <div className="space-y-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por producto, documento o motivo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 focus:bg-white transition-colors"
              />
            </div>

            {/* Filtro por Subtipo de Operación */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1 shrink-0">
                <Tag className="w-3 h-3 text-slate-400" /> Subtipo:
              </span>
              {[
                { label: 'Todos', value: '' },
                { label: 'Recepción OC', value: 'RECEPCION_OC' },
                { label: 'Anulación OC', value: 'ANULACION_RECEPCION' },
                { label: 'Compra Rápida', value: 'COMPRA_RAPIDA' },
                { label: 'Ajuste Manual', value: 'AJUSTE_MANUAL' },
                { label: 'Devolución', value: 'DEVOLUCION_CLIENTE' },
                { label: 'Despacho Venta', value: 'VENTA_PEDIDO' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setFiltroSubtipo(opt.value);
                    if (opt.value) {
                      setFiltroTipo('');
                    }
                    setCurrentPage(1);
                  }}
                  className={`px-2 py-0.5 text-[10px] font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                    filtroSubtipo === opt.value
                      ? 'bg-purple-600 text-white shadow-xs font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Selector de Período (1 día, 7 días, 15 días, 30 días) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1 shrink-0">
                <Calendar className="w-3 h-3 text-slate-400" /> Período:
              </span>
              {[
                { label: 'Todos', value: '' },
                { label: 'Hace 1 día', value: '1' },
                { label: 'Hace 7 días', value: '7' },
                { label: 'Hace 15 días', value: '15' },
                { label: 'Hace 30 días', value: '30' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setFiltroDias(opt.value);
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                    filtroDias === opt.value
                      ? 'bg-blue-600 text-white shadow-xs font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tabla de Movimientos / Kardex */}
          <div className="border border-slate-200/80 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-3.5">PRODUCTO</th>
                    <th className="py-3 px-3.5 text-center">CANT. / UM</th>
                    <th className="py-3 px-3.5">GUÍA / FACT</th>
                    <th className="py-3 px-3.5 bg-emerald-50/50 text-emerald-800 text-center">FECHA INGRESO</th>
                    <th className="py-3 px-3.5 bg-amber-50/40 text-amber-800 text-center">FECHA SALIDA</th>
                    <th className="py-3 px-3.5 text-right">SALDO STOCK</th>
                    <th className="py-3 px-3 text-center">ACCIONES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan="7" className="py-14 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                        Sincronizando trazabilidad desde el servidor...
                      </td>
                    </tr>
                  ) : movimientos.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-slate-400">
                        No hay movimientos registrados que coincidan con la búsqueda.
                      </td>
                    </tr>
                  ) : (
                    movimientos.map((m) => {
                      const esEntrada = m.tipo_movimiento_badge === 'ENTRADA';
                      return (
                        <tr key={m.Movimiento_productoId} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-3.5">
                            <div className="font-bold text-slate-800">{m.producto_nombre}</div>
                            <div className="text-[10px] text-slate-400">
                              {m.producto_marca || 'Genérico'} · {m.categoria_nombre}
                            </div>
                          </td>

                          <td className="py-3 px-3.5 text-center">
                            <span
                              className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold ${
                                esEntrada
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                              }`}
                            >
                              {m.cantidad_presentacion_texto}
                            </span>
                          </td>

                          <td className="py-3 px-3.5">
                            <div className="font-mono text-slate-700 font-bold">
                              {m.documento_referencia || m.documento_operacion_id || m.Movimiento_productoDocumentoOperacionId || '—'}
                            </div>
                            <div className="mt-1">
                              {renderBadgeSubtipo(m.subtipo || m.Movimiento_productoSubtipo)}
                            </div>
                          </td>

                          <td className="py-3 px-3.5 text-center font-mono text-emerald-800 bg-emerald-50/30 font-semibold">
                            {esEntrada ? (
                              <div className="leading-tight">
                                <div>{m.fecha_solo}</div>
                                {m.hora_solo && (
                                  <div className="text-[10px] text-emerald-600 font-medium tracking-tight mt-0.5">
                                    {m.hora_solo}
                                  </div>
                                )}
                              </div>
                            ) : (
                              '—'
                            )}
                          </td>

                          <td className="py-3 px-3.5 text-center font-mono text-amber-800 bg-amber-50/20 font-semibold">
                            {!esEntrada ? (
                              <div className="leading-tight">
                                <div>{m.fecha_solo}</div>
                                {m.hora_solo && (
                                  <div className="text-[10px] text-amber-600 font-medium tracking-tight mt-0.5">
                                    {m.hora_solo}
                                  </div>
                                )}
                              </div>
                            ) : (
                              '—'
                            )}
                          </td>

                          <td className="py-3 px-3.5 text-right font-bold text-slate-800">
                            {m.saldo_resultante_texto}
                          </td>

                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleVerDetalle(m)}
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center border border-slate-200/80 hover:border-blue-200 shadow-2xs"
                                title="Ver detalle del movimiento"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleImprimirOficial(m)}
                                className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center border border-slate-200/80 hover:border-blue-200 shadow-2xs"
                                title="Imprimir Orden Oficial de Movimiento"
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginador (Paginado a 8 registros por página) */}
            <div className="p-3 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>
                Total: <strong className="text-slate-700">{paginacion.total}</strong> movimientos registrados
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={paginacion.current_page <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  className="p-1 text-slate-600 hover:bg-slate-200/80 rounded-md disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 font-semibold text-slate-800">
                  Página {paginacion.current_page} de {paginacion.last_page}
                </span>
                <button
                  type="button"
                  disabled={paginacion.current_page >= paginacion.last_page}
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, paginacion.last_page))}
                  className="p-1 text-slate-600 hover:bg-slate-200/80 rounded-md disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MODAL: Detalle del Movimiento de Inventario (Ojito)
         ========================================================================= */}
      {isModalDetalleOpen && movimientoDetalle && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
            {/* Cabecera del Modal */}
            <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-xs font-bold ${
                    movimientoDetalle.tipo_movimiento_badge === 'ENTRADA'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {movimientoDetalle.tipo_movimiento_badge === 'ENTRADA' ? (
                    <ArrowDownRight className="w-5 h-5 stroke-[2.5]" />
                  ) : (
                    <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    Detalle del Movimiento
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    ID: {movimientoDetalle.Movimiento_productoId}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalDetalleOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido del Modal */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Badges de Estado y Tipo de Operación */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                      movimientoDetalle.tipo_movimiento_badge === 'ENTRADA'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-100 text-rose-800 border border-rose-200'
                    }`}
                  >
                    {movimientoDetalle.tipo_movimiento_badge === 'ENTRADA' ? '📥 ENTRADA DE STOCK' : '📤 SALIDA / MERMA'}
                  </span>
                </div>
                <span className="text-xs font-semibold text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                  {movimientoDetalle.tipo_operacion_texto || 'Movimiento de Inventario'}
                </span>
              </div>

              {/* Ficha del Producto */}
              <div className="p-4 bg-blue-50/40 border border-blue-100 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
                    Producto Involucrado
                  </span>
                  <span className="font-mono text-[10px] text-slate-500 bg-white px-1.5 py-0.5 rounded border border-blue-200/60">
                    {movimientoDetalle.producto_id || movimientoDetalle.Movimiento_producto_ProductoId}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-800">
                  {movimientoDetalle.producto_nombre}
                </h4>
                <p className="text-slate-500 text-xs">
                  Marca: <strong>{movimientoDetalle.producto_marca || 'Genérica'}</strong> · Categoría: <strong>{movimientoDetalle.categoria_nombre || 'General'}</strong>
                </p>
              </div>

              {/* Grid de Métricas de Cantidades y Unidades */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                    Cantidad Operada
                  </span>
                  <span className="text-base font-bold text-slate-800">
                    {movimientoDetalle.cantidad_presentacion_texto}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Unidad: {movimientoDetalle.unidad_movimiento_nombre || movimientoDetalle.unidadMedida?.unidades_medidaDescripcionUnidades || 'N/A'}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                    Saldo Stock Resultante
                  </span>
                  <span className="text-base font-bold text-emerald-700">
                    {movimientoDetalle.saldo_resultante_texto}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Unidad Base: {movimientoDetalle.unidad_base_nombre || 'Unidad'}
                  </span>
                </div>
              </div>

              {/* Costos e Impacto Financiero */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                    Costo / Precio Unitario
                  </span>
                  <span className="text-sm font-bold text-slate-700">
                    {movimientoDetalle.costo_precio_formateado || 'S/ 0.00'}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                    Valor Total Estimado
                  </span>
                  <span className="text-sm font-bold text-slate-700">
                    {movimientoDetalle.costo_total_formateado || 'S/ 0.00'}
                  </span>
                </div>
              </div>

              {/* Referencias y Fechas de Control */}
              <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Documento / Guía / Factura:</span>
                  <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {movimientoDetalle.documento_referencia || movimientoDetalle.Movimiento_productoDocumentoOperacionId || '—'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Fecha y Hora de Registro:</span>
                  <span className="font-mono font-semibold text-slate-700">
                    {movimientoDetalle.fecha_movimiento_formateada || movimientoDetalle.Movimiento_productoFecha_Movimiento || '—'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Registrado por:</span>
                  <span className="font-medium text-slate-700">
                    {movimientoDetalle.usuario_creacion || movimientoDetalle.Movimiento_productoUsuarioCreacion || 'Sistema'}
                  </span>
                </div>
              </div>
            </div>

            {/* Pie del Modal */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => handleImprimirOficial(movimientoDetalle)}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir Orden Oficial</span>
              </button>
              <button
                type="button"
                onClick={() => setIsModalDetalleOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Formato Físico Oficial de Orden de Movimiento */}
      {showModalOficial && movimientoParaOficial && (
        <DocumentoOrdenOficial
          isOpen={showModalOficial}
          onClose={() => setShowModalOficial(false)}
          headerType={resolverHeaderType(movimientoParaOficial)}
          metadata={{
            fecha: movimientoParaOficial.fecha_movimiento_formateada?.split(' ')[0] || movimientoParaOficial.fecha_movimiento || new Date().toLocaleDateString('es-PE'),
            numero: movimientoParaOficial.documento_referencia || movimientoParaOficial.Movimiento_productoDocumentoOperacionId || `MOV-${movimientoParaOficial.id || movimientoParaOficial.Movimiento_productoId || '0001'}`,
            usuario: movimientoParaOficial.usuario_creacion || movimientoParaOficial.Movimiento_productoUsuarioCreacion || undefined,
            pagina: '1 de 1',
            fechaImpresion: new Date().toLocaleString('es-PE', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            }).replace('.', ''),
          }}
          entidad={resolverEntidadMovimiento(movimientoParaOficial)}
          items={[
            {
              codigo: movimientoParaOficial.producto_id || movimientoParaOficial.ProductoId || movimientoParaOficial.Movimiento_producto_ProductoId || movimientoParaOficial.Movimiento_productoProductoId || '---',
              cantidad: Number(
                movimientoParaOficial.Movimiento_productoCantidadPresentacion ||
                (movimientoParaOficial.Movimiento_productoTipoMovimiento === 'E'
                  ? movimientoParaOficial.Movimiento_productoCantidadEntrada
                  : movimientoParaOficial.Movimiento_productoCantidadSalida) ||
                movimientoParaOficial.cantidad ||
                1
              ),
              medida: movimientoParaOficial.unidad_movimiento_abreviatura || movimientoParaOficial.unidad_abreviatura || movimientoParaOficial.unidad_base_abreviatura || movimientoParaOficial.unidad || 'UND',
              descripcion: movimientoParaOficial.producto_nombre || movimientoParaOficial.ProductoNombre || 'PRODUCTO DE ALMACÉN',
              suc: 'AC',
              precio: Number(movimientoParaOficial.Movimiento_productoCostoPrecioUnitario || movimientoParaOficial.precio_unitario || 0),
              total: Number(
                movimientoParaOficial.costo_total_estimado != null
                  ? movimientoParaOficial.costo_total_estimado
                  : ((Number(movimientoParaOficial.Movimiento_productoCantidadPresentacion || movimientoParaOficial.cantidad || 1)) * Number(movimientoParaOficial.Movimiento_productoCostoPrecioUnitario || movimientoParaOficial.precio_unitario || 0))
              ),
            }
          ]}
          totales={{
            subtotal: Number(
              movimientoParaOficial.costo_total_estimado != null
                ? movimientoParaOficial.costo_total_estimado
                : ((Number(movimientoParaOficial.Movimiento_productoCantidadPresentacion || movimientoParaOficial.cantidad || 1)) * Number(movimientoParaOficial.Movimiento_productoCostoPrecioUnitario || movimientoParaOficial.precio_unitario || 0))
            ),
            igv: 0,
            totalGeneral: Number(
              movimientoParaOficial.costo_total_estimado != null
                ? movimientoParaOficial.costo_total_estimado
                : ((Number(movimientoParaOficial.Movimiento_productoCantidadPresentacion || movimientoParaOficial.cantidad || 1)) * Number(movimientoParaOficial.Movimiento_productoCostoPrecioUnitario || movimientoParaOficial.precio_unitario || 0))
            ),
          }}
          empresa={{
            nombre: datosEmpresa?.EmpresaRazonSocial || datosEmpresa?.EmpresaNombreComercial || 'COMERCIAL VALENCIA',
            ruc: datosEmpresa?.EmpresaRuc || '10181935451',
            logo: datosEmpresa?.EmpresaLogo || null,
          }}
        />
      )}
    </div>
  );
}
