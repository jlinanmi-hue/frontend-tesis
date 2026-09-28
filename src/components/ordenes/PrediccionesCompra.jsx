import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, ShoppingCart, AlertTriangle, Package,
  Download, FileSpreadsheet, FileText, RefreshCw,
  Search, Filter, ChevronUp, ChevronDown, Zap,
  HelpCircle, Truck, Info, X, Layers
} from 'lucide-react';
import api from '../../services/api';

/**
 * PrediccionesCompra
 *
 * Pantalla de Sugerencias de Reabastecimiento Semanal de Comercial Valencia.
 * Muestra predicciones deterministas (Fórmula + Estadística) de cantidad a comprar
 * para cada producto activo, filtradas por categoría o búsqueda de texto.
 *
 * Props:
 *   onNavigateToOrdenCompra(prefill) → Navega a GestionOrdenesCompra con datos prefill.
 */
export default function PrediccionesCompra({ onNavigateToOrdenCompra }) {
  const [predicciones, setPredicciones]         = useState([]);
  const [categorias, setCategorias]             = useState([]);
  const [resumen, setResumen]                   = useState({ total_productos: 0, total_a_reponer: 0, criticos: 0, total_estimado: 0, semana: '' });
  const [loading, setLoading]                   = useState(true);
  const [loadingExport, setLoadingExport]       = useState(null); // 'pdf-cat'|'pdf-gen'|'csv'|prodId
  const [search, setSearch]                     = useState('');
  const [categoriaFiltro, setCategoriaFiltro]   = useState('');
  const [soloConSugerencia, setSoloConSugerencia] = useState(false);
  const [showGuia, setShowGuia]                 = useState(false);
  const [ordenDir, setOrdenDir]                 = useState('desc');
  const [ordenCol, setOrdenCol]                 = useState('score');
  const [error, setError]                       = useState(null);

  // ── Carga de datos ──────────────────────────────────────────────────────────
  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const peticiones = [
        api.predicciones.getPredicciones(
          categoriaFiltro ? { categoria_id: categoriaFiltro } : {}
        )
      ];

      // Consultar categorías del catálogo si aún no se han cargado
      if (categorias.length === 0) {
        peticiones.push(api.catalogos?.categorias?.({ todos: 1, per_page: 100 }) ?? Promise.resolve({ data: [] }));
      }

      const [dataPred, dataCat] = await Promise.all(peticiones);

      if (dataPred?.success) {
        setPredicciones(dataPred.predicciones || []);
        setResumen({
          total_productos: dataPred.total_productos || 0,
          total_a_reponer: dataPred.total_a_reponer ?? (dataPred.predicciones || []).filter(p => (p.cantidad_empaques || 0) > 0).length,
          criticos:        dataPred.criticos || 0,
          total_estimado:  dataPred.total_estimado || 0,
          semana:          dataPred.semana || '',
        });
      }

      // Procesar catálogo de categorías
      if (categorias.length === 0) {
        let cats = [];
        if (dataCat?.data) {
          cats = Array.isArray(dataCat.data) ? dataCat.data : (dataCat.data?.data || []);
        }

        // Fallback inteligente: si la API no devolvió lista, extraer categorías de las predicciones
        if (!cats.length && dataPred?.predicciones?.length) {
          const mapa = new Map();
          dataPred.predicciones.forEach(p => {
            if (p.categoria_id && !mapa.has(p.categoria_id)) {
              mapa.set(p.categoria_id, {
                Categoria_ProductoId: p.categoria_id,
                Categoria_ProductoDescripcion_categoria: p.categoria_nombre || p.categoria_id,
              });
            }
          });
          cats = Array.from(mapa.values());
        }

        if (cats.length > 0) {
          setCategorias(cats);
        }
      }
    } catch (err) {
      console.error('PrediccionesCompra: Error al cargar datos', err);
      setError('No se pudieron cargar las sugerencias de reabastecimiento. Verifique la conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  }, [categoriaFiltro, categorias.length]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  // ── Filtrado y ordenación en cliente ───────────────────────────────────────
  const filtradas = predicciones
    .filter(p => {
      if (soloConSugerencia && (p.cantidad_empaques || 0) <= 0) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        p.producto_nombre?.toLowerCase().includes(q) ||
        p.producto_id?.toLowerCase().includes(q) ||
        p.proveedor_nombre?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      let va = a[ordenCol] ?? 0;
      let vb = b[ordenCol] ?? 0;
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return ordenDir === 'asc' ? -1 : 1;
      if (va > vb) return ordenDir === 'asc' ? 1 : -1;
      return 0;
    });

  const toggleOrden = (col) => {
    if (ordenCol === col) {
      setOrdenDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setOrdenCol(col);
      setOrdenDir('desc');
    }
  };

  // ── Helpers de descarga ────────────────────────────────────────────────────
  const triggerDownload = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdfCategoria = async () => {
    if (!categoriaFiltro) {
      alert('Selecciona una categoría primero para descargar su PDF.');
      return;
    }
    setLoadingExport('pdf-cat');
    try {
      const blob = await api.predicciones.downloadPdfCategoria(categoriaFiltro);
      triggerDownload(blob, `predicciones_categoria_${resumen.semana}.pdf`);
    } catch { alert('No se pudo descargar el PDF de la categoría.'); }
    finally { setLoadingExport(null); }
  };

  const handleDownloadPdfGeneral = async () => {
    setLoadingExport('pdf-gen');
    try {
      const blob = await api.predicciones.downloadPdfGeneral();
      triggerDownload(blob, `predicciones_compra_${resumen.semana}.pdf`);
    } catch { alert('No se pudo descargar el PDF general.'); }
    finally { setLoadingExport(null); }
  };

  const handleDownloadCsv = async () => {
    setLoadingExport('csv');
    try {
      const blob = await api.predicciones.downloadCsv(
        categoriaFiltro ? { categoria_id: categoriaFiltro } : {}
      );
      triggerDownload(blob, `predicciones_compra_${resumen.semana}.csv`);
    } catch { alert('No se pudo descargar el CSV.'); }
    finally { setLoadingExport(null); }
  };

  const handleDownloadPdfProducto = async (productoId, nombre) => {
    setLoadingExport(productoId);
    try {
      const blob = await api.predicciones.downloadPdfProducto(productoId);
      const safe = nombre.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 40);
      triggerDownload(blob, `ficha_${safe}_${resumen.semana}.pdf`);
    } catch { alert('No se pudo descargar la ficha PDF del producto.'); }
    finally { setLoadingExport(null); }
  };

  // ── "Pedir X" → Navegar a Orden de Compra con prefill ─────────────────────
  const handlePedir = (p) => {
    if (typeof onNavigateToOrdenCompra === 'function') {
      onNavigateToOrdenCompra({
        tipo:           'orden_compra',
        proveedor_id:   p.proveedor_id,
        proveedor_nombre: p.proveedor_nombre,
        detalles: [{
          producto_id:      p.producto_id,
          nombre:           p.producto_nombre,
          cantidad:         p.cantidad_empaques,
          factor_conversion: p.multiplo_empaque,
          unidad_id:        p.empaque_preferido,
          precio_unitario:  p.precio_referencia_empaque,
        }],
      });
    }
  };

  // ── Helpers de UI ──────────────────────────────────────────────────────────
  const scoreBadge = (score) => {
    const pct = Math.round(score * 100);
    if (score >= 0.7) {
      return (
        <span
          title="Prioridad Alta (70%+): Producto en quiebre o stock crítico con alta demanda. Se aconseja ordenar con urgencia."
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 cursor-help"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          Alta ({pct}%)
        </span>
      );
    }
    if (score >= 0.4) {
      return (
        <span
          title="Prioridad Media (40-69%): Stock cercano al margen de seguridad."
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/80 cursor-help"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Media ({pct}%)
        </span>
      );
    }
    return (
      <span
        title="Prioridad Baja (<40%): Stock suficiente para cubrir la demanda estimada."
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-50 text-slate-600 border border-slate-200 cursor-help"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
        Baja ({pct}%)
      </span>
    );
  };

  const estadoBadge = (p) => {
    if (p.stock_actual <= 0) {
      return (
        <span
          title="Sin stock disponible en almacén."
          className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-red-50 text-red-700 border border-red-200/80 cursor-help"
        >
          Quiebre
        </span>
      );
    }
    if (p.stock_actual <= p.stock_minimo) {
      return (
        <span
          title="Stock por debajo del mínimo de seguridad."
          className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200/80 cursor-help"
        >
          Bajo Mínimo
        </span>
      );
    }
    return (
      <span
        title="Nivel de inventario operativo y estable."
        className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-50 text-slate-600 border border-slate-200 cursor-help"
      >
        Óptimo
      </span>
    );
  };

  const SortIcon = ({ col }) => (
    <span className="inline-flex flex-col ml-1 opacity-60">
      {ordenCol === col ? (
        ordenDir === 'asc' ? <ChevronUp className="w-3 h-3 text-blue-600" /> : <ChevronDown className="w-3 h-3 text-blue-600" />
      ) : (
        <span className="w-3 h-3 opacity-30">⇅</span>
      )}
    </span>
  );

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 space-y-5">

      {/* ENCABEZADO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1 border-b border-slate-200/60">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="p-1.5 bg-blue-600 text-white rounded-lg shadow-2xs">
              <Layers className="w-4 h-4" />
            </span>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">
              Sugerencias de Reabastecimiento
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/80">
              <Zap className="w-3 h-3 text-blue-600" />
              Motor Predictivo IA
            </span>
          </div>

          <div className="text-xs text-slate-500 mt-1.5 flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/60">
              {resumen.semana ? `Semana ${resumen.semana}` : 'Semana activa'}
            </span>
            <span className="text-slate-300">·</span>
            <span>Análisis predictivo de reposición sobre histórico de órdenes</span>
            <span className="text-slate-300">·</span>
            <span>Cobertura objetivo: 1.5 semanas</span>
            <span className="text-slate-300">·</span>
            <button
              type="button"
              onClick={() => setShowGuia(v => !v)}
              className="inline-flex items-center gap-1 text-slate-600 hover:text-blue-600 font-medium cursor-pointer transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
              <span>{showGuia ? 'Ocultar criterios' : 'Criterios de cálculo'}</span>
            </button>
          </div>
        </div>

        {/* Toolbar de acciones y exportación */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={cargarDatos}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-800 disabled:opacity-50 transition shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : 'text-slate-400'}`} />
            Actualizar
          </button>
          <button
            onClick={handleDownloadPdfCategoria}
            disabled={!categoriaFiltro || loadingExport === 'pdf-cat'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-800 disabled:opacity-40 transition shadow-2xs"
            title="Descargar reporte PDF por categoría seleccionada"
          >
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            {loadingExport === 'pdf-cat' ? 'Generando...' : 'PDF Categoría'}
          </button>
          <button
            onClick={handleDownloadPdfGeneral}
            disabled={loadingExport === 'pdf-gen'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-800 disabled:opacity-40 transition shadow-2xs"
            title="Descargar reporte PDF consolidado"
          >
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            {loadingExport === 'pdf-gen' ? 'Generando...' : 'PDF General'}
          </button>
          <button
            onClick={handleDownloadCsv}
            disabled={loadingExport === 'csv'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-800 disabled:opacity-40 transition shadow-2xs"
            title="Exportar datos a formato CSV / Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            {loadingExport === 'csv' ? 'Exportando...' : 'Excel CSV'}
          </button>
        </div>
      </div>

      {/* CRITERIOS DE CÁLCULO DESPLEGABLE */}
      {showGuia && (
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600">
                <Info className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Criterios del Motor de Abastecimiento Asistido por IA
                </h3>
                <p className="text-[11px] text-slate-500">
                  Reglas analíticas aplicadas para balancear inventario, evitar quiebres y controlar el capital de trabajo.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowGuia(false)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
              title="Cerrar panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-50/70 border border-slate-200/70 rounded-lg p-3">
              <div className="font-semibold text-slate-800 mb-1 flex items-center gap-1.5 text-xs">
                <TrendingUp className="w-3.5 h-3.5 text-slate-500" /> Consumo Semanal
              </div>
              <p className="text-slate-500 leading-relaxed text-[11px]">
                Promedio móvil ponderado de demanda sobre las últimas 4 semanas. Descarta semanas de quiebre para no falsear el cálculo.
              </p>
            </div>
            <div className="bg-slate-50/70 border border-slate-200/70 rounded-lg p-3">
              <div className="font-semibold text-slate-800 mb-1 flex items-center gap-1.5 text-xs">
                <Truck className="w-3.5 h-3.5 text-slate-500" /> Stock en Tránsito
              </div>
              <p className="text-slate-500 leading-relaxed text-[11px]">
                Unidades ya solicitadas a proveedores pendientes de ingreso. Se deducen del requerimiento para evitar compras duplicadas.
              </p>
            </div>
            <div className="bg-slate-50/70 border border-slate-200/70 rounded-lg p-3">
              <div className="font-semibold text-slate-800 mb-1 flex items-center gap-1.5 text-xs">
                <Package className="w-3.5 h-3.5 text-slate-500" /> Sugerencia de Compra
              </div>
              <p className="text-slate-500 leading-relaxed text-[11px]">
                Volumen ajustado al empaque comercial preferido (cajas, fardos o sacos) para garantizar 1.5 semanas de cobertura operativa.
              </p>
            </div>
            <div className="bg-slate-50/70 border border-slate-200/70 rounded-lg p-3">
              <div className="font-semibold text-slate-800 mb-1 flex items-center gap-1.5 text-xs">
                <Zap className="w-3.5 h-3.5 text-slate-500" /> Prioridad de Compra
              </div>
              <p className="text-slate-500 leading-relaxed text-[11px]">
                Índice de 0% a 100% que jerarquiza las compras según la inminencia del quiebre y el ritmo de rotación del producto.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TARJETAS KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Por Reponer
            </span>
            <span className="p-1 rounded-md bg-blue-50 text-blue-600">
              <Package className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-800 tracking-tight">
            {resumen.total_a_reponer ?? 0}
            <span className="text-xs font-normal text-slate-400 ml-1.5">
              de {resumen.total_productos}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              En Quiebre / Crítico
            </span>
            <span className={`p-1 rounded-md ${resumen.criticos > 0 ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-400'}`}>
              <AlertTriangle className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className={`text-2xl font-bold tracking-tight ${resumen.criticos > 0 ? 'text-red-600' : 'text-slate-800'}`}>
            {resumen.criticos}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Productos Evaluados
            </span>
            <span className="p-1 rounded-md bg-slate-50 text-slate-600">
              <TrendingUp className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-800 tracking-tight">
            {filtradas.length}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Inversión Estimada
            </span>
            <span className="p-1 rounded-md bg-emerald-50 text-emerald-600">
              <ShoppingCart className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-800 tracking-tight">
            <span className="text-slate-400 text-sm font-medium mr-1">S/</span>
            {Number(resumen.total_estimado).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* FILTROS */}
      <div className="flex flex-col md:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por código, producto o proveedor..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:flex-none">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={categoriaFiltro}
              onChange={e => setCategoriaFiltro(e.target.value)}
              className="pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 min-w-44 transition cursor-pointer"
            >
              <option value="">Todas las categorías</option>
              {categorias.map(c => (
                <option key={c.Categoria_ProductoId || c.id} value={c.Categoria_ProductoId || c.id}>
                  {c.Categoria_ProductoDescripcion_categoria || c.descripcion || c.nombre}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => setSoloConSugerencia(v => !v)}
            title="Filtrar únicamente productos que requieren reposición inmediata"
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition cursor-pointer shrink-0 ${
              soloConSugerencia
                ? 'bg-blue-600 border-blue-600 text-white shadow-2xs'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span>Solo por reponer</span>
            {resumen.total_a_reponer > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${soloConSugerencia ? 'bg-white text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
                {resumen.total_a_reponer}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ESTADO DE ERROR */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* TABLA DE PREDICCIONES */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/95 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
              <tr>
                <th className="px-3 py-3 text-left cursor-pointer select-none" onClick={() => toggleOrden('producto_nombre')} title="Nombre del producto, código y proveedor">
                  Producto <SortIcon col="producto_nombre" />
                </th>
                <th className="px-3 py-3 text-right cursor-pointer select-none" onClick={() => toggleOrden('stock_actual')} title="Unidades físicas disponibles actualmente en almacén">
                  Stock Físico <SortIcon col="stock_actual" />
                </th>
                <th className="px-3 py-3 text-right" title="Mercadería solicitada en órdenes de compra pendientes de ingreso">
                  En Tránsito
                </th>
                <th className="px-3 py-3 text-right cursor-pointer select-none" onClick={() => toggleOrden('demanda_semanal')} title="Consumo semanal proyectado sobre ventas recientes">
                  Consumo Sem. <SortIcon col="demanda_semanal" />
                </th>
                <th className="px-3 py-3 text-center cursor-pointer select-none" onClick={() => toggleOrden('cantidad_empaques')} title="Cantidad sugerida a comprar calculada por el modelo de IA">
                  Sugerencia <SortIcon col="cantidad_empaques" />
                </th>
                <th className="px-3 py-3 text-right cursor-pointer select-none" onClick={() => toggleOrden('precio_referencia_empaque')} title="Último precio de compra o precio de catálogo por empaque">
                  P. Ref. Compra <SortIcon col="precio_referencia_empaque" />
                </th>
                <th className="px-3 py-3 text-right cursor-pointer select-none" onClick={() => toggleOrden('total_estimado')} title="Inversión total estimada (Sugerencia × Precio de Compra)">
                  Inversión Est. <SortIcon col="total_estimado" />
                </th>
                <th className="px-3 py-3 text-center" title="Días estimados de inventario con el ritmo de consumo actual">
                  Días Stock
                </th>
                <th className="px-3 py-3 text-center" title="Diagnóstico del nivel de inventario">
                  Condición
                </th>
                <th className="px-3 py-3 text-center cursor-pointer select-none" onClick={() => toggleOrden('score')} title="Nivel de urgencia calculado por la IA">
                  Prioridad <SortIcon col="score" />
                </th>
                <th className="px-3 py-3 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                    <span>Calculando sugerencias de abastecimiento con el modelo predictivo...</span>
                  </td>
                </tr>
              ) : filtradas.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-slate-400">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <div className="font-medium text-slate-700">No hay productos que requieran reposición</div>
                    <div className="text-xs mt-1 text-slate-400">
                      {search ? 'Intenta con otro término de búsqueda o selecciona otra categoría.' : 'El inventario físico y las órdenes en tránsito cubren la demanda proyectada.'}
                    </div>
                  </td>
                </tr>
              ) : (
                filtradas.map((p, idx) => (
                  <tr key={p.producto_id} className={`hover:bg-slate-50/80 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-slate-800 truncate max-w-[220px]" title={p.producto_nombre}>{p.producto_nombre}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{p.producto_id} · {p.categoria_nombre}</div>
                      {p.proveedor_nombre && (
                        <div className="text-[11px] text-slate-400 truncate max-w-[220px]" title={p.proveedor_nombre}>{p.proveedor_nombre}</div>
                      )}
                    </td>
                    <td className={`px-3 py-2.5 text-right font-mono text-xs ${p.stock_actual <= 0 ? 'text-red-600 font-bold' : 'text-slate-700'}`}>
                      {p.stock_actual?.toLocaleString('es-PE', { minimumFractionDigits: 1 })}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs">
                      {p.stock_transito > 0 ? (
                        <span className="font-medium text-blue-700 bg-blue-50/80 border border-blue-200/60 px-1.5 py-0.5 rounded text-[11px]" title="En tránsito por orden de compra pendiente">
                          +{p.stock_transito?.toLocaleString('es-PE', { minimumFractionDigits: 1 })}
                        </span>
                      ) : (
                        <span className="text-slate-300 font-mono">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs text-slate-600">
                      {p.demanda_semanal?.toLocaleString('es-PE', { minimumFractionDigits: 1 })}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {p.cantidad_empaques > 0 ? (
                        <div>
                          <span className="font-bold text-slate-800 text-xs">
                            {p.cantidad_empaques}
                          </span>
                          <span className="text-[11px] text-slate-500 font-normal ml-1">
                            {p.empaque_preferido}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-300 font-mono text-xs">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs text-slate-600">
                      {p.precio_referencia_empaque > 0
                        ? `S/ ${p.precio_referencia_empaque.toFixed(2)}`
                        : <span className="text-slate-300">—</span>
                      }
                      {p.precio_fallback && <div className="text-slate-400 text-[10px] font-sans">(catálogo)</div>}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs font-semibold">
                      {p.total_estimado > 0 ? (
                        <span className="text-slate-800 font-mono">
                          S/ {p.total_estimado.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span className="text-slate-300 font-mono">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs text-slate-600">
                      {p.cobertura_dias_texto}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {estadoBadge(p)}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {scoreBadge(p.score)}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {/* Ficha PDF individual */}
                        <button
                          onClick={() => handleDownloadPdfProducto(p.producto_id, p.producto_nombre)}
                          disabled={loadingExport === p.producto_id}
                          title="Descargar ficha PDF del producto"
                          className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-40"
                        >
                          {loadingExport === p.producto_id
                            ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            : <Download className="w-3.5 h-3.5" />
                          }
                        </button>
                        {/* Botón Pedir o Etiqueta Cubierto */}
                        {p.cantidad_empaques > 0 ? (
                          <button
                            onClick={() => handlePedir(p)}
                            title={`Generar orden de compra por ${p.cantidad_empaques} ${p.empaque_preferido}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition shadow-2xs cursor-pointer"
                          >
                            <ShoppingCart className="w-3 h-3" />
                            Pedir {p.cantidad_empaques}
                          </button>
                        ) : (
                          <span
                            title="El stock disponible cubre la demanda estimada"
                            className="text-[11px] text-slate-400 font-medium px-2 py-0.5"
                          >
                            Cubierto
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FOOTER INFORMATIVO */}
      {!loading && filtradas.length > 0 && (
        <div className="text-xs text-slate-400 text-right">
          Mostrando {filtradas.length} de {resumen.total_productos} producto(s) · Semana {resumen.semana}
        </div>
      )}
    </div>
  );
}
