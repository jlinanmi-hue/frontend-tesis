import React, { useState, useEffect, useRef } from 'react';
import {
  ClipboardList,
  PlusCircle,
  Search,
  RefreshCw,
  RotateCcw,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  DollarSign,
  Package,
  Layers,
  X,
  Info,
  SlidersHorizontal,
  Tag,
  Printer
} from 'lucide-react';
import api from '../../services/api';
import { sileo } from 'sileo';
import StyledSelect from '../dashboard/filters/StyledSelect';
import StyledDatePicker from '../common/StyledDatePicker';
import DocumentoOrdenOficial from '../common/DocumentoOrdenOficial';

export default function GestionAjustesInventario() {
  // Datos principales
  const [ajustes, setAjustes] = useState([]);
  const [tiposAjuste, setTiposAjuste] = useState([]);
  const [productosSelect, setProductosSelect] = useState([]);
  const [resumen, setResumen] = useState({
    total_ajustes: 0,
    total_unidades: 0,
    costo_total_perdido: 0,
    venta_total_perdida: 0,
    moneda: 'S/',
    por_tipo: [],
    top_productos_perdida: [],
  });

  // Estados de carga
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingResumen, setIsLoadingResumen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [paginacion, setPaginacion] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
    per_page: 8,
  });

  // Modales
  const [showModalCrear, setShowModalCrear] = useState(false);
  const [showModalDetalle, setShowModalDetalle] = useState(false);
  const [ajusteDetalle, setAjusteDetalle] = useState(null);
  const [showModalAnular, setShowModalAnular] = useState(false);
  const [ajusteParaAnular, setAjusteParaAnular] = useState(null);

  // Modal Formato Físico Oficial de Orden de Ajuste
  const [showModalOficial, setShowModalOficial] = useState(false);
  const [ajusteParaOficial, setAjusteParaOficial] = useState(null);
  const [datosEmpresa, setDatosEmpresa] = useState(null);

  useEffect(() => {
    if (api.empresa?.obtener) {
      api.empresa.obtener().then(res => {
        if (res?.data) setDatosEmpresa(res.data);
      }).catch(() => {});
    }
  }, []);

  // Formulario nuevo ajuste
  const getNowDateTimeLocal = () => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const initialForm = {
    productoId: '',
    tipo: 'Merma',
    cantidad: 1,
    motivo: '',
    fecha: getNowDateTimeLocal(),
  };
  const [formData, setFormData] = useState(initialForm);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);

  // Buscador interactivo de Producto en Modal
  const [searchProductoModal, setSearchProductoModal] = useState('');
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

  // Lista de productos filtrados según la búsqueda en el modal
  const productosFiltradosModal = productosSelect.filter((p) => {
    if (!searchProductoModal.trim()) return true;
    const term = searchProductoModal.toLowerCase();
    return (
      (p.ProductoNombre && p.ProductoNombre.toLowerCase().includes(term)) ||
      (p.ProductoMarca && p.ProductoMarca.toLowerCase().includes(term)) ||
      (p.ProductoId && p.ProductoId.toLowerCase().includes(term)) ||
      (p.categoria_nombre && p.categoria_nombre.toLowerCase().includes(term))
    );
  });

  const handleSeleccionarProductoModal = (prod) => {
    setProductoSeleccionado(prod);
    setFormData((prev) => ({
      ...prev,
      productoId: prod.ProductoId,
    }));
    setSearchProductoModal('');
    setIsDropdownProductoOpen(false);
  };

  const handleLimpiarProductoSeleccionado = () => {
    setProductoSeleccionado(null);
    setFormData((prev) => ({
      ...prev,
      productoId: '',
    }));
    setSearchProductoModal('');
    setIsDropdownProductoOpen(true);
  };

  // Cargar catálogo de tipos y productos ligeros
  const cargarCatalogosAuxiliares = async () => {
    try {
      const [resTipos, resProds] = await Promise.all([
        api.ajustes.tipos(),
        api.inventario.productosSelect(),
      ]);

      if (resTipos?.success && resTipos?.data) {
        setTiposAjuste(resTipos.data);
      }
      if (resProds?.success && resProds?.data) {
        setProductosSelect(resProds.data);
      }
    } catch (err) {
      console.error('Error al cargar catálogos auxiliares de ajustes:', err);
    }
  };

  // Cargar resumen financiero
  const cargarResumen = async () => {
    setIsLoadingResumen(true);
    try {
      const params = {};
      if (filtroTipo) params.tipo = filtroTipo;
      if (fechaDesde) params.fechaDesde = fechaDesde;
      if (fechaHasta) params.fechaHasta = fechaHasta;

      const res = await api.ajustes.impactoFinanciero(params);
      if (res?.success && res?.data) {
        setResumen(res.data);
      }
    } catch (err) {
      console.error('Error al cargar resumen de ajustes:', err);
    } finally {
      setIsLoadingResumen(false);
    }
  };

  // Cargar lista paginada de ajustes
  const cargarAjustes = async (page = 1) => {
    setIsLoading(true);
    try {
      const params = {
        page,
        per_page: 8,
      };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (filtroTipo) params.tipo = filtroTipo;
      if (fechaDesde) params.fechaDesde = fechaDesde;
      if (fechaHasta) params.fechaHasta = fechaHasta;

      const res = await api.ajustes.listar(params);
      if (res?.success && res?.data) {
        const pagData = res.data;
        setAjustes(pagData.data || []);
        setPaginacion({
          current_page: pagData.current_page || 1,
          last_page: pagData.last_page || 1,
          total: pagData.total || 0,
          per_page: pagData.per_page || 8,
        });
      }
    } catch (err) {
      console.error('Error al listar ajustes:', err);
      sileo.error({
        title: 'Error de Conexión',
        description: 'No se pudo sincronizar la lista de ajustes de inventario.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Efecto inicial
  useEffect(() => {
    cargarCatalogosAuxiliares();
  }, []);

  // Recargar cuando cambian los filtros principales
  useEffect(() => {
    cargarAjustes(currentPage);
    cargarResumen();
  }, [currentPage, filtroTipo, fechaDesde, fechaHasta]);

  // Debounce para búsqueda libre
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      cargarAjustes(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Limpiar filtros
  const handleLimpiarFiltros = () => {
    setSearchQuery('');
    setFiltroTipo('');
    setFechaDesde('');
    setFechaHasta('');
    setCurrentPage(1);
  };

  // Manejar cambio de producto en el formulario
  const handleProductoChange = (e) => {
    const prodId = e.target.value;
    const prod = productosSelect.find((p) => p.ProductoId === prodId) || null;
    setProductoSeleccionado(prod);
    setFormData((prev) => ({
      ...prev,
      productoId: prodId,
    }));
  };

  // Guardar nuevo ajuste
  const handleSubmitNuevoAjuste = async (e) => {
    e.preventDefault();

    if (!formData.productoId) {
      sileo.warning({
        title: 'Producto Obligatorio',
        description: 'Por favor selecciona el producto a ajustar.',
      });
      return;
    }

    const cantidadNum = parseFloat(formData.cantidad);
    if (isNaN(cantidadNum) || cantidadNum <= 0) {
      sileo.warning({
        title: 'Cantidad Inválida',
        description: 'La cantidad a descontar debe ser mayor a 0.',
      });
      return;
    }

    const stockActual = parseFloat(productoSeleccionado?.ProductoStockActual ?? productoSeleccionado?.stock_actual ?? 0);
    if (cantidadNum > stockActual) {
      sileo.error({
        title: 'Stock Insuficiente',
        description: `El stock actual es de ${stockActual}. No puedes descontar una cantidad mayor.`,
      });
      return;
    }

    if (!formData.motivo.trim()) {
      sileo.warning({
        title: 'Motivo Requerido',
        description: 'Por favor escribe el motivo o justificación del ajuste.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        Ajuste_inventario_ProductoId: formData.productoId,
        Ajuste_inventario_tipo: formData.tipo,
        Ajuste_inventario_cantidad: cantidadNum,
        Ajuste_inventario_motivo: formData.motivo.trim(),
        Ajuste_inventario_fecha: formData.fecha || getNowDateTimeLocal(),
      };

      const res = await api.ajustes.crear(payload);
      if (res?.success) {
        sileo.success({
          title: 'Ajuste Registrado',
          description: `Se registró el ajuste y se descontaron ${cantidadNum} unidades del inventario.`,
        });
        setShowModalCrear(false);
        setFormData({ ...initialForm, fecha: getNowDateTimeLocal() });
        setProductoSeleccionado(null);
        // Actualizar datos
        cargarAjustes(1);
        cargarResumen();
        cargarCatalogosAuxiliares();
      }
    } catch (err) {
      console.error('Error al registrar ajuste:', err);
      const msg = err.errors?.Ajuste_inventario_cantidad?.[0] || err.message || 'Error al guardar el ajuste';
      sileo.error({
        title: 'Error de Registro',
        description: msg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Abrir modal de anulación
  const handleSolicitarAnular = (ajuste) => {
    setAjusteParaAnular(ajuste);
    setShowModalAnular(true);
  };

  // Confirmar anulación
  const handleConfirmarAnulacion = async () => {
    if (!ajusteParaAnular) return;
    setIsSubmitting(true);
    try {
      const res = await api.ajustes.eliminar(ajusteParaAnular.Ajuste_inventario_id);
      if (res?.success) {
        sileo.success({
          title: 'Ajuste Anulado',
          description: 'El ajuste fue anulado lógicamente y el stock fue devuelto al inventario.',
        });
        setShowModalAnular(false);
        setAjusteParaAnular(null);
        cargarAjustes(currentPage);
        cargarResumen();
        cargarCatalogosAuxiliares();
      }
    } catch (err) {
      console.error('Error al anular ajuste:', err);
      sileo.error({
        title: 'Error al Anular',
        description: err.message || 'No se pudo anular el ajuste de inventario.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Exportar Excel
  const handleExportarExcel = async () => {
    setIsExportingExcel(true);
    try {
      const filtros = {};
      if (filtroTipo) filtros.tipo = filtroTipo;
      if (fechaDesde) filtros.fechaDesde = fechaDesde;
      if (fechaHasta) filtros.fechaHasta = fechaHasta;
      await api.ajustes.descargarExcel(filtros);
      sileo.success({
        title: 'Reporte Excel',
        description: 'La descarga del archivo Excel inició correctamente.',
      });
    } catch (err) {
      console.error('Error al exportar Excel:', err);
      sileo.error({
        title: 'Error de Exportación',
        description: 'No se pudo descargar el reporte en formato Excel.',
      });
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Exportar PDF
  const handleExportarPdf = async () => {
    setIsExportingPdf(true);
    try {
      const filtros = {};
      if (filtroTipo) filtros.tipo = filtroTipo;
      if (fechaDesde) filtros.fechaDesde = fechaDesde;
      if (fechaHasta) filtros.fechaHasta = fechaHasta;
      await api.ajustes.descargarPdf(filtros);
      sileo.success({
        title: 'Reporte PDF',
        description: 'La descarga del reporte PDF inició correctamente.',
      });
    } catch (err) {
      console.error('Error al exportar PDF:', err);
      sileo.error({
        title: 'Error de Exportación',
        description: 'No se pudo generar el documento PDF.',
      });
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Helper para badge según tipo de ajuste
  const renderTipoBadge = (tipo) => {
    const tiposMap = {
      Merma: 'bg-amber-100 text-amber-800 border-amber-200',
      Dañado: 'bg-orange-100 text-orange-800 border-orange-200',
      Vencido: 'bg-rose-100 text-rose-800 border-rose-200',
      Rotura: 'bg-pink-100 text-pink-800 border-pink-200',
      Pérdida: 'bg-red-100 text-red-900 border-red-200',
      'Ajuste Físico': 'bg-blue-100 text-blue-800 border-blue-200',
    };

    const estilo = tiposMap[tipo] || 'bg-slate-100 text-slate-800 border-slate-200';

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${estilo}`}>
        {tipo}
      </span>
    );
  };

  // Costo calculado en modal de registro
  const costoUnitarioSeleccionado = parseFloat(
    productoSeleccionado?.unidades?.[0]?.precio_compra || productoSeleccionado?.precio_compra || 0
  );
  const impactoCostoEstimado = (parseFloat(formData.cantidad || 0) * costoUnitarioSeleccionado).toFixed(2);

  return (
    <div className="space-y-6">
      
      {/* ============================================================ */}
      {/* 1. ENCABEZADO Y ACCIONES PRINCIPALES                        */}
      {/* ============================================================ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">
                Ajustes de Inventario y Mermas
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Registro de bajas, control de mermas físicas, caducidades y análisis de impacto económico.
              </p>
            </div>
          </div>
        </div>

        {/* Botones de acción superior */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleExportarExcel}
            disabled={isExportingExcel}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold transition cursor-pointer disabled:opacity-50"
            title="Exportar listado a Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{isExportingExcel ? 'Exportando...' : 'Exportar Excel'}</span>
          </button>

          <button
            onClick={handleExportarPdf}
            disabled={isExportingPdf}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold transition cursor-pointer disabled:opacity-50"
            title="Generar reporte en PDF"
          >
            <FileText className="w-4 h-4" />
            <span>{isExportingPdf ? 'Generando...' : 'Descargar PDF'}</span>
          </button>

          <button
            onClick={() => {
              setFormData(initialForm);
              setProductoSeleccionado(null);
              setSearchProductoModal('');
              setIsDropdownProductoOpen(false);
              setShowModalCrear(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Registrar Ajuste</span>
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. TARJETAS KPI DE IMPACTO FINANCIERO                        */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Ajustes */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Total Ajustes</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">
              {isLoadingResumen ? '...' : (resumen.total_ajustes || 0)}
            </p>
            <span className="text-[11px] text-slate-400">Incidencias registradas</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
            <ClipboardList className="w-6 h-6" />
          </div>
        </div>

        {/* Unidades Bajas */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Unidades Ajustadas</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">
              {isLoadingResumen ? '...' : Number(resumen.total_unidades || 0).toLocaleString()}
            </p>
            <span className="text-[11px] text-slate-400">Descontadas del stock</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
            <Package className="w-6 h-6" />
          </div>
        </div>

        {/* Costo Perdido */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Costo Total Perdido</p>
            <p className="text-2xl font-bold text-rose-600 mt-1">
              {isLoadingResumen
                ? '...'
                : `S/ ${Number(resumen.costo_total_perdido || 0).toFixed(2)}`}
            </p>
            <span className="text-[11px] text-slate-400">Valorizado al costo compra</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        {/* Venta Perdida */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Pérdida Venta Potencial</p>
            <p className="text-2xl font-bold text-purple-600 mt-1">
              {isLoadingResumen
                ? '...'
                : `S/ ${Number(resumen.venta_total_perdida || 0).toFixed(2)}`}
            </p>
            <span className="text-[11px] text-slate-400">Valorizado a precio venta</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. FILTROS Y CONTROLES DE BÚSQUEDA                          */}
      {/* ============================================================ */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          
          {/* Buscador */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por producto, ID o motivo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 focus:bg-white transition-colors"
            />
          </div>

          {/* Filtro por Tipo */}
          <div>
            <StyledSelect
              value={filtroTipo}
              onChange={(v) => {
                setFiltroTipo(v);
                setCurrentPage(1);
              }}
              options={[
                { value: '', label: 'Todos los tipos' },
                ...tiposAjuste.map((t) => ({ value: t.codigo, label: t.codigo })),
              ]}
              placeholder="Todos los tipos"
              searchable
              ariaLabel="Filtrar ajustes por tipo"
              panelWidth={240}
            />
          </div>

          {/* Fecha Desde */}
          <div>
            <StyledDatePicker
              value={fechaDesde}
              onChange={(v) => {
                setFechaDesde(v);
                setCurrentPage(1);
              }}
              size="sm"
              ariaLabel="Fecha inicial"
            />
          </div>

          {/* Fecha Hasta */}
          <div>
            <StyledDatePicker
              value={fechaHasta}
              onChange={(v) => {
                setFechaHasta(v);
                setCurrentPage(1);
              }}
              size="sm"
              ariaLabel="Fecha final"
            />
          </div>
        </div>

        {/* Acciones de filtro */}
        {(searchQuery || filtroTipo || fechaDesde || fechaHasta) && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-500">
              Filtros activos aplicados · Resultados encontrados: <strong>{paginacion.total}</strong>
            </span>
            <button
              onClick={handleLimpiarFiltros}
              className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpiar filtros</span>
            </button>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 4. TABLA PRINCIPAL DE AJUSTES                               */}
      {/* ============================================================ */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Código</th>
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4">Producto</th>
                <th className="py-3 px-4">Tipo Ajuste</th>
                <th className="py-3 px-4 text-center">Cantidad</th>
                <th className="py-3 px-4 text-right">Costo Total</th>
                <th className="py-3 px-4">Motivo / Justificación</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin text-blue-500" />
                    <span>Cargando historial de ajustes...</span>
                  </td>
                </tr>
              ) : ajustes.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400">
                    <ClipboardList className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">No se encontraron ajustes</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {searchQuery || filtroTipo || fechaDesde || fechaHasta
                        ? 'Prueba modificando los filtros de búsqueda.'
                        : 'Aún no se han registrado ajustes o mermas de inventario.'}
                    </p>
                  </td>
                </tr>
              ) : (
                ajustes.map((a) => {
                  const fechaObj = a.Ajuste_inventario_fecha ? new Date(a.Ajuste_inventario_fecha) : null;
                  const fechaFormateada = fechaObj
                    ? fechaObj.toLocaleDateString('es-PE', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '-';
                  const horaFormateada = fechaObj
                    ? fechaObj.toLocaleTimeString('es-PE', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '';

                  const isAnulado = a.Ajuste_inventario_Eliminado === 'S';

                  return (
                    <tr
                      key={a.Ajuste_inventario_id}
                      className={`hover:bg-slate-50/60 transition ${
                        isAnulado ? 'bg-slate-50/40 opacity-70' : ''
                      }`}
                    >
                      {/* Código */}
                      <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                        {a.Ajuste_inventario_id}
                      </td>

                      {/* Fecha y Hora */}
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        <div className="font-medium text-slate-700">{fechaFormateada}</div>
                        {horaFormateada && horaFormateada !== '00:00' && (
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">{horaFormateada}</div>
                        )}
                      </td>

                      {/* Producto */}
                      <td className="py-3 px-4">
                        <div className="max-w-xs">
                          <p className="font-semibold text-slate-800 truncate">
                            {a.producto?.ProductoNombre || a.Ajuste_inventario_ProductoId}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {a.producto?.ProductoMarca ? `${a.producto.ProductoMarca} · ` : ''}
                            ID: {a.Ajuste_inventario_ProductoId}
                          </p>
                        </div>
                      </td>

                      {/* Tipo */}
                      <td className="py-3 px-4">
                        {renderTipoBadge(a.Ajuste_inventario_tipo)}
                      </td>

                      {/* Cantidad */}
                      <td className="py-3 px-4 text-center font-bold text-slate-700">
                        {Number(a.Ajuste_inventario_cantidad || 0).toLocaleString()} {a.unidad_medida || a.producto?.unidad_base || 'UND'}
                      </td>

                      {/* Costo Total */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span className="font-bold text-rose-600">
                          S/ {Number(a.impacto_financiero_costo || 0).toFixed(2)}
                        </span>
                        <p className="text-[10px] text-slate-400">
                          (S/ {Number(a.costo_unitario || 0).toFixed(2)} c/u)
                        </p>
                      </td>

                      {/* Motivo */}
                      <td className="py-3 px-4 max-w-xs">
                        <p className="text-slate-600 line-clamp-2 text-xs" title={a.Ajuste_inventario_motivo}>
                          {a.Ajuste_inventario_motivo || '-'}
                        </p>
                      </td>

                      {/* Estado */}
                      <td className="py-3 px-4 text-center">
                        {isAnulado ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                            Anulado
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Activo
                          </span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Ver Detalle */}
                          <button
                            onClick={() => {
                              setAjusteDetalle(a);
                              setShowModalDetalle(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                            title="Ver Detalle Completo"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Imprimir Orden de Ajuste */}
                          <button
                            onClick={() => {
                              setAjusteParaOficial(a);
                              setShowModalOficial(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                            title="Imprimir Orden Oficial de Ajuste"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Anular / Revertir (solo si está activo) */}
                          {!isAnulado && (
                            <button
                              onClick={() => handleSolicitarAnular(a)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title="Anular ajuste y revertir stock"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <span>
            Página <strong>{paginacion.current_page}</strong> de <strong>{paginacion.last_page}</strong> · Mostrando {ajustes.length} de {paginacion.total} registros
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || isLoading}
              className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => setCurrentPage((p) => Math.min(paginacion.last_page, p + 1))}
              disabled={currentPage >= paginacion.last_page || isLoading}
              className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 5. MODAL: REGISTRAR NUEVO AJUSTE                            */}
      {/* ============================================================ */}
      {showModalCrear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden animate-in zoom-in-95 duration-150">
            
            {/* Header del modal */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Registrar Ajuste de Inventario</h3>
                  <p className="text-[11px] text-slate-500">Descontará stock físico y registrará salida en Kardex</p>
                </div>
              </div>
              <button
                onClick={() => setShowModalCrear(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmitNuevoAjuste} className="p-6 space-y-4 text-xs">
              
              {/* Buscador reactivo de Producto */}
              <div ref={productoDropdownRef} className="relative">
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700">
                    Producto a Ajustar <span className="text-rose-500">*</span>
                  </label>
                  {productoSeleccionado && (
                    <button
                      type="button"
                      onClick={handleLimpiarProductoSeleccionado}
                      className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold cursor-pointer flex items-center gap-1"
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
                      placeholder="Buscar producto por nombre, marca o código..."
                      value={searchProductoModal}
                      onChange={(e) => {
                        setSearchProductoModal(e.target.value);
                        setIsDropdownProductoOpen(true);
                      }}
                      onFocus={() => setIsDropdownProductoOpen(true)}
                      className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 focus:bg-white text-slate-800 text-xs transition-colors"
                    />
                    {searchProductoModal && (
                      <button
                        type="button"
                        onClick={() => setSearchProductoModal('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Menú flotante de resultados filtrados */}
                    {isDropdownProductoOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-40 max-h-60 overflow-y-auto divide-y divide-slate-100 animate-in fade-in slide-in-from-top-1 duration-150">
                        {productosFiltradosModal.length === 0 ? (
                          <div className="p-4 text-center text-slate-400 text-xs">
                            <Package className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                            <p className="font-semibold text-slate-600">No se encontraron productos</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {searchProductoModal
                                ? `No hay coincidencias con "${searchProductoModal}"`
                                : 'No hay productos disponibles'}
                            </p>
                          </div>
                        ) : (
                          productosFiltradosModal.map((p) => {
                            const stockNum = parseFloat(p.ProductoStockActual ?? 0);
                            const costoRef = parseFloat(
                              p.unidades?.[0]?.precio_compra || p.precio_compra || 0
                            );

                            return (
                              <button
                                key={p.ProductoId}
                                type="button"
                                onClick={() => handleSeleccionarProductoModal(p)}
                                className="w-full p-3 text-left hover:bg-blue-50/70 transition flex items-center justify-between gap-3 cursor-pointer group"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-800 text-xs group-hover:text-blue-600 transition-colors truncate">
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
                                    Stock: {stockNum.toLocaleString()} {p.unidad_base || 'UND'}
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
                  <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between gap-3 animate-in fade-in duration-150">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Package className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-xs">
                            {productoSeleccionado.ProductoNombre}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500 bg-white px-1.5 py-0.5 rounded border border-blue-100">
                            {productoSeleccionado.ProductoId}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5 truncate">
                          Marca: <strong>{productoSeleccionado.ProductoMarca || 'Genérica'}</strong> · Categoría: {productoSeleccionado.categoria_nombre || 'General'}
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

              {/* Grid: Tipo de Ajuste & Fecha */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tipo de Ajuste / Causa <span className="text-rose-500">*</span>
                  </label>
                  <StyledSelect
                    size="form"
                    value={formData.tipo}
                    onChange={(v) => setFormData({ ...formData, tipo: v })}
                    options={tiposAjuste.map((t) => ({ value: t.codigo, label: t.codigo }))}
                    placeholder="Seleccionar tipo..."
                    searchable
                    ariaLabel="Tipo de ajuste o causa"
                    panelWidth={240}
                  />
                  {tiposAjuste.find((t) => t.codigo === formData.tipo)?.descripcion && (
                    <p className="text-[10px] text-slate-400 mt-1">
                      {tiposAjuste.find((t) => t.codigo === formData.tipo)?.descripcion}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Fecha y Hora del Ajuste <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.fecha}
                    onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 focus:bg-white text-slate-800 font-medium"
                  />
                </div>
              </div>

              {/* Grid: Cantidad & Previsualización Costo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Cantidad a Descontar {productoSeleccionado?.unidad_base ? `(${productoSeleccionado.unidad_base})` : ''} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={formData.cantidad}
                    onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
                    placeholder="1.00"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 focus:bg-white text-slate-800 font-bold text-sm"
                  />
                  {productoSeleccionado && parseFloat(formData.cantidad || 0) > parseFloat(productoSeleccionado.ProductoStockActual ?? productoSeleccionado.stock_actual ?? 0) && (
                    <p className="text-[10px] text-rose-600 font-semibold mt-1">
                      ⚠️ La cantidad excede el stock disponible ({productoSeleccionado.stock_actual_texto})
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Impacto Costo Estimado
                  </label>
                  <div className="px-3 py-2 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 font-bold text-sm flex items-center justify-between">
                    <span>S/ {impactoCostoEstimado}</span>
                    <span className="text-[10px] text-rose-500 font-normal">
                      (~S/ {costoUnitarioSeleccionado.toFixed(2)} c/u)
                    </span>
                  </div>
                </div>
              </div>

              {/* Motivo / Justificación */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Motivo / Justificación Detallada <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe la causa: rotura en pasillo, fecha de caducidad vencida, merma en pesaje, etc..."
                  value={formData.motivo}
                  onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 focus:bg-white text-slate-800 resize-none"
                />
              </div>

              {/* Alerta de confirmación de regla de negocio */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  <strong>Aviso Operativo:</strong> Al confirmar, el stock del producto se reducirá inmediatamente en el almacén y se generará un movimiento de salida tipo <code>S</code> en el Kardex.
                </p>
              </div>

              {/* Botones de acción del modal */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowModalCrear(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-md shadow-blue-500/20 transition cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Registrando...' : 'Confirmar y Descontar Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 6. MODAL: VER DETALLE DEL AJUSTE                             */}
      {/* ============================================================ */}
      {showModalDetalle && ajusteDetalle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150">
            
            {/* Header del detalle */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold font-mono">
                  {ajusteDetalle.Ajuste_inventario_id.split('-')[1] || 'AJU'}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">
                    Ajuste {ajusteDetalle.Ajuste_inventario_id}
                  </h3>
                  <p className="text-[11px] text-slate-500">Detalle de incidencia y cálculo financiero</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowModalDetalle(false);
                  setAjusteDetalle(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido del detalle */}
            <div className="p-6 space-y-4 text-xs">
              
              {/* Bloque Producto */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                <p className="text-[11px] font-semibold text-slate-400 uppercase">Producto</p>
                <p className="text-sm font-bold text-slate-800">
                  {ajusteDetalle.producto?.ProductoNombre || ajusteDetalle.Ajuste_inventario_ProductoId}
                </p>
                <div className="flex items-center justify-between text-slate-500 text-[11px] pt-1 border-t border-slate-200/60">
                  <span>Código: <strong>{ajusteDetalle.Ajuste_inventario_ProductoId}</strong></span>
                  <span>Marca: <strong>{ajusteDetalle.producto?.ProductoMarca || '-'}</strong></span>
                </div>
              </div>

              {/* Grid Métricas del Ajuste */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-[11px] text-slate-400 font-medium">Tipo de Ajuste</p>
                  <div className="mt-1">{renderTipoBadge(ajusteDetalle.Ajuste_inventario_tipo)}</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-[11px] text-slate-400 font-medium">Cantidad Ajustada</p>
                  <p className="text-base font-bold text-slate-800 mt-0.5">
                    {Number(ajusteDetalle.Ajuste_inventario_cantidad || 0).toLocaleString()} {ajusteDetalle.unidad_medida || 'UND'}
                  </p>
                </div>

                <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-100">
                  <p className="text-[11px] text-rose-500 font-medium">Costo Total Perdido</p>
                  <p className="text-base font-bold text-rose-600 mt-0.5">
                    S/ {Number(ajusteDetalle.impacto_financiero_costo || 0).toFixed(2)}
                  </p>
                  <p className="text-[10px] text-rose-400">
                    S/ {Number(ajusteDetalle.costo_unitario || 0).toFixed(2)} c/u
                  </p>
                </div>

                <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100">
                  <p className="text-[11px] text-purple-500 font-medium">Pérdida Venta Potencial</p>
                  <p className="text-base font-bold text-purple-600 mt-0.5">
                    S/ {Number(ajusteDetalle.impacto_financiero_venta || 0).toFixed(2)}
                  </p>
                  <p className="text-[10px] text-purple-400">
                    S/ {Number(ajusteDetalle.precio_venta_unitario || 0).toFixed(2)} c/u
                  </p>
                </div>
              </div>

              {/* Motivo */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <p className="text-[11px] font-semibold text-slate-500">Motivo / Causa Registrada:</p>
                <p className="text-slate-700 leading-relaxed">{ajusteDetalle.Ajuste_inventario_motivo || 'Sin motivo especificado'}</p>
              </div>

              {/* Auditoría */}
              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>Registrado por:</span>
                  <span className="font-semibold text-slate-600">{ajusteDetalle.Ajuste_inventario_UsuarioCreacion || 'SYSTEM'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Fecha de operación:</span>
                  <span className="font-semibold text-slate-600">
                    {ajusteDetalle.Ajuste_inventario_fecha
                      ? new Date(ajusteDetalle.Ajuste_inventario_fecha).toLocaleString('es-PE')
                      : '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Estado de la orden:</span>
                  <span className="font-semibold text-slate-600">
                    {ajusteDetalle.Ajuste_inventario_Eliminado === 'S' ? 'Anulado (Stock revertido)' : 'Vigente en Kardex'}
                  </span>
                </div>
              </div>

              {/* Botón imprimir y cerrar */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAjusteParaOficial(ajusteDetalle);
                    setShowModalOficial(true);
                  }}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir Orden Oficial</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModalDetalle(false);
                    setAjusteDetalle(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 7. MODAL: CONFIRMAR ANULACIÓN DE AJUSTE                      */}
      {/* ============================================================ */}
      {showModalAnular && ajusteParaAnular && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-6 text-center space-y-3">
              <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-slate-800">
                ¿Anular Ajuste de Inventario?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Estás a punto de anular el ajuste <strong>{ajusteParaAnular.Ajuste_inventario_id}</strong>.
                Esta acción <strong className="text-emerald-700">revertirá y devolverá {ajusteParaAnular.Ajuste_inventario_cantidad} {ajusteParaAnular.unidad_medida || 'unidades'}</strong> al stock disponible del producto y registrará un contra-movimiento de entrada en el Kardex.
              </p>

              <div className="pt-3 flex items-center justify-center gap-2.5">
                <button
                  onClick={() => {
                    setShowModalAnular(false);
                    setAjusteParaAnular(null);
                  }}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmarAnulacion}
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md shadow-rose-500/20 transition cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Anulando...' : 'Sí, Anular y Devolver Stock'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. MODAL: FORMATO FÍSICO OFICIAL DE ORDEN DE AJUSTE (COMERCIAL VALENCIA) */}
      {showModalOficial && ajusteParaOficial && (
        <DocumentoOrdenOficial
          isOpen={showModalOficial}
          onClose={() => setShowModalOficial(false)}
          headerType="ORDEN DE AJUSTE DE INVENTARIO"
          metadata={{
            fecha: ajusteParaOficial.Ajuste_inventario_fecha ? new Date(ajusteParaOficial.Ajuste_inventario_fecha).toLocaleDateString('es-PE') : new Date().toLocaleDateString('es-PE'),
            numero: ajusteParaOficial.Ajuste_inventario_id || 'AJU-0001',
            usuario: ajusteParaOficial.Ajuste_inventario_UsuarioCreacion || undefined,
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
          entidad={{
            nombre: `CONTROL DE CALIDAD & ALMACÉN (${ajusteParaOficial.tipo_nombre || ajusteParaOficial.Ajuste_inventario_tipo || 'Ajuste / Merma'})`,
            ruc: datosEmpresa?.EmpresaRuc || '10181935451',
            direccion: datosEmpresa?.EmpresaDireccion || 'Av. Principal 123 - Lima, Perú',
            responsable: ajusteParaOficial.Ajuste_inventario_UsuarioCreacion || undefined,
          }}
          items={[
            {
              codigo: ajusteParaOficial.Ajuste_inventario_ProductoId || ajusteParaOficial.producto_id || '---',
              cantidad: ajusteParaOficial.Ajuste_inventario_cantidad || 1,
              medida: ajusteParaOficial.unidad_medida || 'UND',
              descripcion: `${ajusteParaOficial.producto_nombre || 'PRODUCTO'} - Motivo: ${ajusteParaOficial.Ajuste_inventario_motivo || 'Ajuste de inventario'}`,
              suc: 'AC',
              precio: ajusteParaOficial.costo_unitario || ajusteParaOficial.precio_unitario || 0,
              total: ajusteParaOficial.impacto_financiero || ((ajusteParaOficial.Ajuste_inventario_cantidad || 1) * (ajusteParaOficial.costo_unitario || 0)),
            }
          ]}
          totales={{
            subtotal: ajusteParaOficial.impacto_financiero || ((ajusteParaOficial.Ajuste_inventario_cantidad || 1) * (ajusteParaOficial.costo_unitario || 0)),
            igv: 0,
            totalGeneral: ajusteParaOficial.impacto_financiero || ((ajusteParaOficial.Ajuste_inventario_cantidad || 1) * (ajusteParaOficial.costo_unitario || 0)),
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
