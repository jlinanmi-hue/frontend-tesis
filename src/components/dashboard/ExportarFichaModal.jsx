import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  FileSpreadsheet,
  FileText,
  Calendar,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Layers,
  ArrowDownToLine,
  CalendarDays,
  TableProperties,
  Clock,
  TrendingUp,
  PackageX,
  Truck,
  CalendarRange
} from 'lucide-react';
import api from '../../services/api';
import {
  exportarFichaDiariaAExcel,
  exportarFichaDiariaAPDF,
  exportarConsolidadoAExcel,
  exportarConsolidadoAPDF,
  exportarDetalleDiarioPorSemanaAExcel,
  exportarDetalleDiarioPorSemanaAPDF,
} from './helpers/fichaExportUtils';
import { sileo } from 'sileo';

const INDICADORES_OPCIONES = [
  { key: 'PODE', label: 'Indicador 01: Órdenes Despachadas Exitosamente (PODE)', icon: Truck, meta: '≥ 95%' },
  { key: 'PRS', label: 'Indicador 02: Roturas de Stock (PRS)', icon: PackageX, meta: '≤ 3%' },
  { key: 'TBPP', label: 'Indicador 03: Tiempo Promedio de Registro (TBPP)', icon: Clock, meta: '≤ 3 min' },
];

const CANALES = [
  { value: '', label: 'Todos los Canales' },
  { value: 'CNL-00001', label: 'Tienda Presencial' },
  { value: 'CNL-00002', label: 'Canal Web / App' },
  { value: 'CNL-00003', label: 'WhatsApp Comercial' },
];

export default function ExportarFichaModal({
  isOpen,
  onClose,
  indicatorId = 1,
  indicatorData = null,
}) {
  // Pestaña activa: 'diario' | 'semana' | 'consolidado'
  const [tabActiva, setTabActiva] = useState('diario');

  // Mapear indicatorId inicial a código oficial (PODE, PRS, TBPP)
  const initialKey = indicatorId === 3 ? 'PRS' : (indicatorId === 4 ? 'TBPP' : 'PODE');

  // ==========================================================================
  // Estado Pestaña 1: Ficha Diaria (Detalle Completo 1 a 1)
  // ==========================================================================
  const [fechaDiaria, setFechaDiaria] = useState('2026-09-09');
  const [indicadorDiario, setIndicadorDiario] = useState(initialKey);
  const [canalDiario, setCanalDiario] = useState('');
  const [fichaDiariaData, setFichaDiariaData] = useState(null);
  const [loadingDiario, setLoadingDiario] = useState(false);
  const [errorDiario, setErrorDiario] = useState(null);

  // ==========================================================================
  // Estado Pestaña 2: Detalle Diario por Semana (NUEVA PESTAÑA)
  // ==========================================================================
  const [anioSemana, setAnioSemana] = useState(2026);
  const [semanaSeleccionada, setSemanaSeleccionada] = useState(37);
  const [semanasDisponibles, setSemanasDisponibles] = useState([]);
  const [canalSemana, setCanalSemana] = useState('');
  const [detalleSemanaData, setDetalleSemanaData] = useState(null);
  const [loadingSemana, setLoadingSemana] = useState(false);
  const [errorSemana, setErrorSemana] = useState(null);

  // ==========================================================================
  // Estado Pestaña 3: Resumen Consolidado (Semanal / Mensual sobre Totales)
  // ==========================================================================
  const [tipoConsolidado, setTipoConsolidado] = useState('semanal');
  const [anioConsolidado, setAnioConsolidado] = useState(2026);
  const [canalConsolidado, setCanalConsolidado] = useState('');
  const [consolidadoData, setConsolidadoData] = useState(null);
  const [loadingConsolidado, setLoadingConsolidado] = useState(false);
  const [errorConsolidado, setErrorConsolidado] = useState(null);

  const [descargando, setDescargando] = useState(false);

  // Sincronizar indicador si cambia desde el padre
  useEffect(() => {
    const key = indicatorId === 3 ? 'PRS' : (indicatorId === 4 ? 'TBPP' : 'PODE');
    setIndicadorDiario(key);
  }, [indicatorId]);

  // --------------------------------------------------------------------------
  // Cargar Detalle Diario (Pestaña 1)
  // --------------------------------------------------------------------------
  const cargarDetalleDiario = useCallback(async () => {
    setLoadingDiario(true);
    setErrorDiario(null);
    try {
      const res = await api.dashboard.fichaDiariaDetalle({
        fecha: fechaDiaria,
        indicador: indicadorDiario,
        canal_id: canalDiario || undefined,
      });

      if (res && res.success && res.data) {
        setFichaDiariaData(res.data);
      } else {
        throw new Error(res?.message || 'No se pudo cargar el detalle diario.');
      }
    } catch (err) {
      console.error('Error cargando ficha diaria:', err);
      setErrorDiario(err.message || 'Error al conectar con el servidor.');
    } finally {
      setLoadingDiario(false);
    }
  }, [fechaDiaria, indicadorDiario, canalDiario]);

  // --------------------------------------------------------------------------
  // Cargar Semanas Disponibles y Detalle Diario por Semana (Pestaña 2)
  // --------------------------------------------------------------------------
  const cargarSemanasDisponibles = useCallback(async (anio) => {
    try {
      const res = await api.dashboard.semanasDelAnio({ anio });
      if (res && res.success && Array.isArray(res.data)) {
        setSemanasDisponibles(res.data);
        if (res.data.length > 0 && (!semanaSeleccionada || !res.data.includes(semanaSeleccionada))) {
          setSemanaSeleccionada(res.data[0]);
        }
      }
    } catch (err) {
      console.error('Error cargando semanas disponibles:', err);
    }
  }, [semanaSeleccionada]);

  const cargarDetalleSemana = useCallback(async () => {
    if (!semanaSeleccionada) return;
    setLoadingSemana(true);
    setErrorSemana(null);
    try {
      const res = await api.dashboard.detalleDiarioSemana({
        anio: anioSemana,
        semana: semanaSeleccionada,
        canal_id: canalSemana || undefined,
      });

      if (res && res.success && res.data) {
        setDetalleSemanaData(res.data);
      } else {
        throw new Error(res?.message || 'No se pudo cargar el detalle de la semana.');
      }
    } catch (err) {
      console.error('Error cargando detalle diario por semana:', err);
      setErrorSemana(err.message || 'Error al conectar con el servidor.');
    } finally {
      setLoadingSemana(false);
    }
  }, [anioSemana, semanaSeleccionada, canalSemana]);

  // --------------------------------------------------------------------------
  // Cargar Consolidado Semanal/Mensual (Pestaña 3)
  // --------------------------------------------------------------------------
  const cargarConsolidado = useCallback(async () => {
    setLoadingConsolidado(true);
    setErrorConsolidado(null);
    try {
      const res = await api.dashboard.reporteConsolidado({
        tipo: tipoConsolidado,
        anio: anioConsolidado,
        canal_id: canalConsolidado || undefined,
      });

      if (res && res.success && res.data) {
        setConsolidadoData(res.data);
      } else {
        throw new Error(res?.message || 'No se pudo cargar el reporte consolidado.');
      }
    } catch (err) {
      console.error('Error cargando consolidado:', err);
      setErrorConsolidado(err.message || 'Error al conectar con el servidor.');
    } finally {
      setLoadingConsolidado(false);
    }
  }, [tipoConsolidado, anioConsolidado, canalConsolidado]);

  // Cargar semanas al montar o cambiar año de semana
  useEffect(() => {
    if (isOpen) {
      cargarSemanasDisponibles(anioSemana);
    }
  }, [isOpen, anioSemana, cargarSemanasDisponibles]);

  // Cargar datos según la pestaña activa
  useEffect(() => {
    if (!isOpen) return;
    if (tabActiva === 'diario') {
      cargarDetalleDiario();
    } else if (tabActiva === 'semana') {
      cargarDetalleSemana();
    } else if (tabActiva === 'consolidado') {
      cargarConsolidado();
    }
  }, [isOpen, tabActiva, cargarDetalleDiario, cargarDetalleSemana, cargarConsolidado]);

  if (!isOpen) return null;

  // --------------------------------------------------------------------------
  // Manejadores de Descarga
  // --------------------------------------------------------------------------
  const handleDescargarExcel = () => {
    try {
      setDescargando(true);
      if (tabActiva === 'diario') {
        if (!fichaDiariaData) return;
        const filename = exportarFichaDiariaAExcel(fichaDiariaData);
        sileo.success(`Ficha Diaria descargada en Excel: ${filename}`);
      } else if (tabActiva === 'semana') {
        if (!detalleSemanaData) return;
        const filename = exportarDetalleDiarioPorSemanaAExcel(detalleSemanaData);
        sileo.success(`Detalle Semanal descargado en Excel: ${filename}`);
      } else {
        if (!consolidadoData) return;
        const filename = exportarConsolidadoAExcel(consolidadoData);
        sileo.success(`Reporte Consolidado descargado en Excel: ${filename}`);
      }
    } catch (e) {
      console.error(e);
      sileo.error('Error al generar archivo Excel.');
    } finally {
      setDescargando(false);
    }
  };

  const handleDescargarPDF = () => {
    try {
      setDescargando(true);
      if (tabActiva === 'diario') {
        if (!fichaDiariaData) return;
        const filename = exportarFichaDiariaAPDF(fichaDiariaData);
        sileo.success(`Ficha Diaria descargada en PDF: ${filename}`);
      } else if (tabActiva === 'semana') {
        if (!detalleSemanaData) return;
        const filename = exportarDetalleDiarioPorSemanaAPDF(detalleSemanaData);
        sileo.success(`Detalle Semanal descargado en PDF: ${filename}`);
      } else {
        if (!consolidadoData) return;
        const filename = exportarConsolidadoAPDF(consolidadoData);
        sileo.success(`Reporte Consolidado descargado en PDF: ${filename}`);
      }
    } catch (e) {
      console.error(e);
      sileo.error('Error al generar archivo PDF.');
    } finally {
      setDescargando(false);
    }
  };

  const handleDescargarAmbos = () => {
    handleDescargarExcel();
    setTimeout(() => {
      handleDescargarPDF();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Cabecera Principal */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/20">
              <TableProperties className="w-6 h-6 text-blue-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight">Exportación de Instrumentos de Medición de Tesis</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase bg-blue-500/30 text-blue-200 border border-blue-400/30">
                  Comercial Valencia S.A.C.
                </span>
              </div>
              <p className="text-xs text-blue-200/90 mt-0.5">
                Cálculo en tiempo real • Fichas diarias con evidencia individual y consolidados sobre totales (∑)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
            title="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selector de 3 Pestañas */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 shrink-0 gap-1 overflow-x-auto">
          {/* Pestaña 1 */}
          <button
            onClick={() => setTabActiva('diario')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-t border-x whitespace-nowrap ${
              tabActiva === 'diario'
                ? 'bg-white text-blue-700 border-slate-200 shadow-sm -mb-px z-10'
                : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <CalendarDays className="w-4 h-4 text-blue-600" />
            <span>Ficha Diaria (Detalle Completo)</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 text-blue-700 font-bold">
              1 a 1
            </span>
          </button>

          {/* Pestaña 2: NUEVA */}
          <button
            onClick={() => setTabActiva('semana')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-t border-x whitespace-nowrap ${
              tabActiva === 'semana'
                ? 'bg-white text-emerald-700 border-slate-200 shadow-sm -mb-px z-10'
                : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <CalendarRange className="w-4 h-4 text-emerald-600" />
            <span>Detalle Diario por Semana</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-700 font-bold">
              Día a Día
            </span>
          </button>

          {/* Pestaña 3 */}
          <button
            onClick={() => setTabActiva('consolidado')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-t border-x whitespace-nowrap ${
              tabActiva === 'consolidado'
                ? 'bg-white text-indigo-700 border-slate-200 shadow-sm -mb-px z-10'
                : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-indigo-600" />
            <span>Reporte Consolidado (Semanal / Mensual)</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 text-indigo-700 font-bold">
              Totales ∑
            </span>
          </button>
        </div>

        {/* Contenido según pestaña activa */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50/50">

          {/* ============================================================ */}
          {/* PESTAÑA 1: FICHA DIARIA (Detalle Completo 1 a 1)              */}
          {/* ============================================================ */}
          {tabActiva === 'diario' && (
            <>
              {/* Barra de Filtros Diarios */}
              <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  {/* Selector de Indicador */}
                  <div className="flex-1 min-w-[280px]">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Indicador de Gestión a Evaluar
                    </label>
                    <select
                      value={indicadorDiario}
                      onChange={(e) => setIndicadorDiario(e.target.value)}
                      className="w-full text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      {INDICADORES_OPCIONES.map((opt) => (
                        <option key={opt.key} value={opt.key}>
                          {opt.label} • Meta: {opt.meta}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Selector de Fecha */}
                  <div className="w-48">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Fecha del Registro
                    </label>
                    <input
                      type="date"
                      value={fechaDiaria}
                      onChange={(e) => setFechaDiaria(e.target.value)}
                      className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  {/* Selector de Canal */}
                  <div className="w-52">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Canal de Venta
                    </label>
                    <select
                      value={canalDiario}
                      onChange={(e) => setCanalDiario(e.target.value)}
                      className="w-full text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      {CANALES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Botón Refrescar */}
                  <div className="flex items-end">
                    <button
                      onClick={cargarDetalleDiario}
                      disabled={loadingDiario}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300/80 transition-colors"
                      title="Actualizar datos"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingDiario ? 'animate-spin' : ''}`} />
                      <span>Actualizar</span>
                    </button>
                  </div>
                </div>

                {/* Banner informativo de la ficha seleccionada */}
                {fichaDiariaData && (
                  <div className="flex items-center justify-between px-3.5 py-2 rounded-lg bg-blue-50/70 border border-blue-200/80 text-xs text-blue-900">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="font-semibold">{fichaDiariaData.titulo}</span>
                      <span className="text-blue-600">• Fórmula: {fichaDiariaData.formula}</span>
                    </div>
                    <span className="font-bold text-blue-700 bg-white px-2 py-0.5 rounded shadow-xs">
                      Meta: {fichaDiariaData.meta}
                    </span>
                  </div>
                )}
              </div>

              {/* Vista previa de la Tabla Diaria */}
              <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TableProperties className="w-4 h-4 text-slate-500" />
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Detalle de Registros Individuales — {fichaDiariaData?.fecha_formateada || fechaDiaria}
                    </h3>
                  </div>
                  <span className="text-xs font-medium text-slate-500">
                    {fichaDiariaData?.filas?.length || 0} órdenes/pedidos en la jornada
                  </span>
                </div>

                {loadingDiario ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                    <RefreshCw className="w-7 h-7 text-blue-600 animate-spin mb-3" />
                    <p className="text-xs font-medium">Consultando registros individuales del día...</p>
                  </div>
                ) : errorDiario ? (
                  <div className="flex flex-col items-center justify-center py-12 text-rose-600">
                    <AlertTriangle className="w-8 h-8 mb-2" />
                    <p className="text-xs font-semibold">{errorDiario}</p>
                  </div>
                ) : !fichaDiariaData || fichaDiariaData.filas.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    No se encontraron órdenes registradas para la fecha seleccionada ({fechaDiaria}). Selecciona otra fecha con actividad.
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[320px]">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-100 text-slate-700 sticky top-0 border-b border-slate-200 shadow-xs">
                        <tr>
                          {fichaDiariaData.columnas.map((col) => (
                            <th key={col.key} className="px-3.5 py-2.5 font-bold uppercase tracking-wider text-[11px]">
                              {col.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {fichaDiariaData.filas.map((f, i) => (
                          <tr key={i} className="hover:bg-blue-50/40 transition-colors">
                            {fichaDiariaData.columnas.map((col) => {
                              const val = f[col.key];
                              const isBooleanCol = col.key === 'fue_despachado' || col.key === 'presento_rotura';

                              return (
                                <td key={col.key} className="px-3.5 py-2 text-slate-700 whitespace-nowrap">
                                  {isBooleanCol ? (
                                    <span
                                      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                                        val === 1
                                          ? col.key === 'fue_despachado'
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : 'bg-rose-100 text-rose-800'
                                          : col.key === 'fue_despachado'
                                          ? 'bg-rose-100 text-rose-800'
                                          : 'bg-emerald-100 text-emerald-800'
                                      }`}
                                    >
                                      {val === 1 ? '1 (SÍ)' : '0 (NO)'}
                                    </span>
                                  ) : col.key === 'codigo_orden' || col.key === 'codigo_pedido' ? (
                                    <span className="font-mono font-bold text-blue-700">{val}</span>
                                  ) : col.key === 'tiempo_transcurrido_min' ? (
                                    <span className="font-semibold text-slate-800">{val} min</span>
                                  ) : (
                                    val
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Resumen al pie de la Ficha Diaria */}
                {fichaDiariaData?.resumen && (
                  <div className="p-4 bg-gradient-to-r from-slate-50 to-blue-50/40 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Resumen Consolidado al Pie:
                    </span>

                    <div className="flex flex-wrap items-center gap-3">
                      {indicadorDiario === 'PODE' && (
                        <>
                          <div className="px-3 py-1 rounded-lg bg-white border border-slate-200 text-xs">
                            <span className="text-slate-500">Total Órdenes: </span>
                            <span className="font-bold text-slate-900">{fichaDiariaData.resumen.total_ordenes}</span>
                          </div>
                          <div className="px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-xs">
                            <span className="text-emerald-700">Despachadas: </span>
                            <span className="font-bold text-emerald-800">{fichaDiariaData.resumen.despachadas}</span>
                          </div>
                          <div className="px-3 py-1 rounded-lg bg-rose-50 border border-rose-200 text-xs">
                            <span className="text-rose-700">No Despachadas: </span>
                            <span className="font-bold text-rose-800">{fichaDiariaData.resumen.no_despachadas}</span>
                          </div>
                          <div className="px-3.5 py-1 rounded-lg bg-blue-600 text-white font-bold text-xs shadow-xs">
                            % Éxito (PODE): {fichaDiariaData.resumen.porcentaje_exito}%
                          </div>
                        </>
                      )}

                      {indicadorDiario === 'PRS' && (
                        <>
                          <div className="px-3 py-1 rounded-lg bg-white border border-slate-200 text-xs">
                            <span className="text-slate-500">Total Pedidos: </span>
                            <span className="font-bold text-slate-900">{fichaDiariaData.resumen.total_pedidos}</span>
                          </div>
                          <div className="px-3 py-1 rounded-lg bg-rose-50 border border-rose-200 text-xs">
                            <span className="text-rose-700">Con Rotura: </span>
                            <span className="font-bold text-rose-800">{fichaDiariaData.resumen.pedidos_con_rotura}</span>
                          </div>
                          <div className="px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-xs">
                            <span className="text-emerald-700">Sin Rotura: </span>
                            <span className="font-bold text-emerald-800">{fichaDiariaData.resumen.pedidos_sin_rotura}</span>
                          </div>
                          <div className="px-3.5 py-1 rounded-lg bg-rose-600 text-white font-bold text-xs shadow-xs">
                            % Rotura (PRS): {fichaDiariaData.resumen.porcentaje_rotura}%
                          </div>
                          <div className="px-3 py-1 rounded-lg bg-amber-50 border border-amber-200 text-xs">
                            <span className="text-amber-800 font-semibold">Promedio: </span>
                            <span className="font-bold text-amber-900">{fichaDiariaData.resumen.promedio_roturas_pedido}</span>
                          </div>
                        </>
                      )}

                      {indicadorDiario === 'TBPP' && (
                        <>
                          <div className="px-3 py-1 rounded-lg bg-white border border-slate-200 text-xs">
                            <span className="text-slate-500">Total Órdenes: </span>
                            <span className="font-bold text-slate-900">{fichaDiariaData.resumen.total_ordenes}</span>
                          </div>
                          <div className="px-3 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs">
                            <span className="text-slate-600">Tiempo Total: </span>
                            <span className="font-bold text-slate-800">{fichaDiariaData.resumen.tiempo_total_min} min</span>
                          </div>
                          <div className="px-3.5 py-1 rounded-lg bg-indigo-600 text-white font-bold text-xs shadow-xs">
                            Tiempo Promedio (TBPP): {fichaDiariaData.resumen.tiempo_promedio_min} min
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ============================================================ */}
          {/* PESTAÑA 2: DETALLE DIARIO POR SEMANA (NUEVA PESTAÑA)        */}
          {/* ============================================================ */}
          {tabActiva === 'semana' && (
            <>
              {/* Barra de Filtros de Semana */}
              <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  {/* Selector de Año */}
                  <div className="w-36">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Año
                    </label>
                    <select
                      value={anioSemana}
                      onChange={(e) => setAnioSemana(Number(e.target.value))}
                      className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value={2026}>2026</option>
                      <option value={2025}>2025</option>
                    </select>
                  </div>

                  {/* Selector de Semana Dinámico */}
                  <div className="w-56">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Semana Evaluada
                    </label>
                    <select
                      value={semanaSeleccionada || ''}
                      onChange={(e) => setSemanaSeleccionada(Number(e.target.value))}
                      className="w-full text-xs font-bold text-emerald-800 bg-emerald-50/50 border border-emerald-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      {semanasDisponibles.length === 0 ? (
                        <option value="">Sin semanas registradas</option>
                      ) : (
                        semanasDisponibles.map((sem) => (
                          <option key={sem} value={sem}>
                            Semana {sem} ({anioSemana})
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  {/* Selector de Canal */}
                  <div className="w-52">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Canal de Venta
                    </label>
                    <select
                      value={canalSemana}
                      onChange={(e) => setCanalSemana(e.target.value)}
                      className="w-full text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      {CANALES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Refrescar */}
                  <div className="flex items-end">
                    <button
                      onClick={cargarDetalleSemana}
                      disabled={loadingSemana}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300/80 transition-colors"
                      title="Actualizar datos"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingSemana ? 'animate-spin' : ''}`} />
                      <span>Actualizar</span>
                    </button>
                  </div>
                </div>

                {/* Aviso Metodológico */}
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-50/70 border border-emerald-200/80 text-xs text-emerald-950">
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>Principio Metodológico:</strong> Los indicadores se calculan por día dentro de la semana seleccionada. La fila de totales consolida la semana sobre <strong>sumas totales (∑)</strong>, no promediando los días.
                  </span>
                </div>
              </div>

              {/* Vista previa de la Tabla Semanal */}
              <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarRange className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Desglose Diario — Semana {semanaSeleccionada} (Año {anioSemana})
                    </h3>
                  </div>
                  <span className="text-xs font-medium text-slate-500">
                    {detalleSemanaData?.dias?.length || 0} días operativos registrados
                  </span>
                </div>

                {loadingSemana ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                    <RefreshCw className="w-7 h-7 text-emerald-600 animate-spin mb-3" />
                    <p className="text-xs font-medium">Calculando desglose diario de la semana...</p>
                  </div>
                ) : errorSemana ? (
                  <div className="flex flex-col items-center justify-center py-12 text-rose-600">
                    <AlertTriangle className="w-8 h-8 mb-2" />
                    <p className="text-xs font-semibold">{errorSemana}</p>
                  </div>
                ) : !detalleSemanaData || detalleSemanaData.dias.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    No se encontraron registros para la Semana {semanaSeleccionada} del {anioSemana}.
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[340px]">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-100 text-slate-700 sticky top-0 border-b border-slate-200 shadow-xs">
                        <tr>
                          {detalleSemanaData.columnas.map((col) => (
                            <th key={col.key} className="px-3 py-2.5 font-bold uppercase tracking-wider text-[11px] text-center">
                              {col.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {detalleSemanaData.dias.map((d, i) => (
                          <tr key={i} className="hover:bg-emerald-50/40 transition-colors">
                            <td className="px-3 py-2 font-medium text-slate-700 text-center">{d.semana}</td>
                            <td className="px-3 py-2 font-semibold text-slate-800 text-center">{d.dia}</td>
                            <td className="px-3 py-2 text-center text-slate-600 font-mono">{d.fecha}</td>
                            <td className="px-3 py-2 text-center text-slate-700">{d.total_pedidos}</td>
                            <td className="px-3 py-2 text-center text-slate-700">{d.total_ordenes}</td>
                            <td className="px-3 py-2 text-center font-bold text-blue-700">{d.pode}%</td>
                            <td className="px-3 py-2 text-center font-bold text-rose-700">{d.prs}%</td>
                            <td className="px-3 py-2 text-center font-bold text-indigo-700">{d.tbpp} min</td>
                            <td className="px-3 py-2 text-center text-slate-700">{d.pedidos_con_rotura}</td>
                            <td className="px-3 py-2 text-center text-slate-700 font-mono">{d.promedio_roturas_pedido}</td>
                          </tr>
                        ))}
                      </tbody>

                      {/* Fila de Totales de la Semana al Final */}
                      {detalleSemanaData.totales_semana && (
                        <tfoot className="bg-gradient-to-r from-emerald-100 via-teal-100 to-emerald-200 border-t-2 border-emerald-400 text-emerald-950 font-bold sticky bottom-0">
                          <tr>
                            <td colSpan={3} className="px-4 py-2.5 text-left font-black tracking-wider text-emerald-900">
                              {detalleSemanaData.totales_semana.semana} (CONSOLIDADO ∑)
                            </td>
                            <td className="px-3 py-2.5 text-center text-emerald-950 font-black">
                              {detalleSemanaData.totales_semana.total_pedidos}
                            </td>
                            <td className="px-3 py-2.5 text-center text-emerald-950 font-black">
                              {detalleSemanaData.totales_semana.total_ordenes}
                            </td>
                            <td className="px-3 py-2.5 text-center text-blue-900 font-black">
                              {detalleSemanaData.totales_semana.pode}%
                            </td>
                            <td className="px-3 py-2.5 text-center text-rose-900 font-black">
                              {detalleSemanaData.totales_semana.prs}%
                            </td>
                            <td className="px-3 py-2.5 text-center text-indigo-950 font-black">
                              {detalleSemanaData.totales_semana.tbpp} min
                            </td>
                            <td className="px-3 py-2.5 text-center text-emerald-950 font-black">
                              {detalleSemanaData.totales_semana.pedidos_con_rotura}
                            </td>
                            <td className="px-3 py-2.5 text-center text-emerald-950 font-black font-mono">
                              {detalleSemanaData.totales_semana.promedio_roturas_pedido}
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ============================================================ */}
          {/* PESTAÑA 3: REPORTE CONSOLIDADO (Semanal / Mensual sobre Totales) */}
          {/* ============================================================ */}
          {tabActiva === 'consolidado' && (
            <>
              {/* Barra de Filtros Consolidados */}
              <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  {/* Selector Agrupación: Semanal vs Mensual */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Agrupación:
                    </span>
                    <div className="flex rounded-lg border border-slate-300 p-0.5 bg-slate-100">
                      <button
                        onClick={() => setTipoConsolidado('semanal')}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                          tipoConsolidado === 'semanal'
                            ? 'bg-white text-indigo-700 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Semanal
                      </button>
                      <button
                        onClick={() => setTipoConsolidado('mensual')}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                          tipoConsolidado === 'mensual'
                            ? 'bg-white text-indigo-700 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Mensual
                      </button>
                    </div>
                  </div>

                  {/* Selector de Año */}
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Año:
                    </label>
                    <select
                      value={anioConsolidado}
                      onChange={(e) => setAnioConsolidado(Number(e.target.value))}
                      className="text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value={2026}>2026</option>
                      <option value={2025}>2025</option>
                    </select>
                  </div>

                  {/* Selector de Canal */}
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Canal:
                    </label>
                    <select
                      value={canalConsolidado}
                      onChange={(e) => setCanalConsolidado(e.target.value)}
                      className="text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      {CANALES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Refrescar */}
                  <button
                    onClick={cargarConsolidado}
                    disabled={loadingConsolidado}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300/80 transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingConsolidado ? 'animate-spin' : ''}`} />
                    <span>Actualizar</span>
                  </button>
                </div>

                {/* Banner metodológico */}
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-50/70 border border-indigo-200/80 text-xs text-indigo-950">
                  <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>
                    <strong>Principio Metodológico:</strong> Los indicadores se calculan directamente sobre las sumas totales del período (∑), garantizando rigor estadístico sin distorsión por promedio de porcentajes.
                  </span>
                </div>
              </div>

              {/* Vista previa de la Tabla Consolidada */}
              <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TableProperties className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Consolidado {tipoConsolidado === 'semanal' ? 'Semanal' : 'Mensual'} de Indicadores — Año {anioConsolidado}
                    </h3>
                  </div>
                  <span className="text-xs font-medium text-slate-500">
                    {consolidadoData?.filas?.length || 0} períodos evaluados
                  </span>
                </div>

                {loadingConsolidado ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                    <RefreshCw className="w-7 h-7 text-indigo-600 animate-spin mb-3" />
                    <p className="text-xs font-medium">Calculando consolidados sobre totales del período...</p>
                  </div>
                ) : errorConsolidado ? (
                  <div className="flex flex-col items-center justify-center py-12 text-rose-600">
                    <AlertTriangle className="w-8 h-8 mb-2" />
                    <p className="text-xs font-semibold">{errorConsolidado}</p>
                  </div>
                ) : !consolidadoData || consolidadoData.filas.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    No se encontraron registros para el año {anioConsolidado}.
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[320px]">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-100 text-slate-700 sticky top-0 border-b border-slate-200 shadow-xs">
                        <tr>
                          {consolidadoData.columnas.map((col) => (
                            <th key={col.key} className="px-3.5 py-2.5 font-bold uppercase tracking-wider text-[11px] text-center">
                              {col.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {consolidadoData.filas.map((f, i) => (
                          <tr key={i} className="hover:bg-indigo-50/40 transition-colors">
                            <td className="px-3.5 py-2.5 font-semibold text-slate-800">{f.periodo}</td>
                            <td className="px-3.5 py-2.5 text-center text-slate-700">{f.total_pedidos}</td>
                            <td className="px-3.5 py-2.5 text-center text-slate-700">{f.total_ordenes}</td>
                            <td className="px-3.5 py-2.5 text-center font-bold text-blue-700">{f.pode}%</td>
                            <td className="px-3.5 py-2.5 text-center font-bold text-rose-700">{f.prs}%</td>
                            <td className="px-3.5 py-2.5 text-center font-bold text-indigo-700">{f.tbpp} min</td>
                            <td className="px-3.5 py-2.5 text-center text-slate-700">{f.pedidos_con_rotura}</td>
                            <td className="px-3.5 py-2.5 text-center text-slate-700 font-mono">{f.promedio_roturas_pedido}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Totales Consolidados al Pie */}
                {consolidadoData?.totales_consolidados && (
                  <div className="p-4 bg-gradient-to-r from-indigo-900 to-blue-950 text-white flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-200">
                        Totales Consolidados del Período (∑):
                      </span>
                      <p className="text-[11px] text-indigo-300">
                        {consolidadoData.totales_consolidados.total_pedidos} Pedidos Totales • {consolidadoData.totales_consolidados.despachadas_exitosamente} Despachos Exitosos • {consolidadoData.totales_consolidados.pedidos_con_rotura} Roturas
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <div className="px-3 py-1 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 text-xs">
                        <span className="text-blue-200 font-semibold">PODE: </span>
                        <span className="font-extrabold text-white">{consolidadoData.totales_consolidados.pode}%</span>
                      </div>
                      <div className="px-3 py-1 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 text-xs">
                        <span className="text-rose-200 font-semibold">PRS: </span>
                        <span className="font-extrabold text-white">{consolidadoData.totales_consolidados.prs}%</span>
                      </div>
                      <div className="px-3 py-1 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 text-xs">
                        <span className="text-indigo-200 font-semibold">TBPP: </span>
                        <span className="font-extrabold text-white">{consolidadoData.totales_consolidados.tbpp} min</span>
                      </div>
                      <div className="px-3 py-1 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 text-xs">
                        <span className="text-amber-200 font-semibold">Promedio Roturas: </span>
                        <span className="font-extrabold text-white">{consolidadoData.totales_consolidados.promedio_roturas_pedido}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

        </div>

        {/* Pie de Acciones / Botones de Exportación */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="text-xs text-slate-500">
            Exportando en formato oficial para la sustentación de Tesis.
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleDescargarExcel}
              disabled={descargando}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 transition-all shadow-xs disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Descargar Excel (.xlsx)</span>
            </button>

            <button
              onClick={handleDescargarPDF}
              disabled={descargando}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-300 transition-all shadow-xs disabled:opacity-50"
            >
              <FileText className="w-4 h-4 text-rose-600" />
              <span>Descargar PDF (.pdf)</span>
            </button>

            <button
              onClick={handleDescargarAmbos}
              disabled={descargando}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm disabled:opacity-50"
            >
              <ArrowDownToLine className="w-4 h-4" />
              <span>Descargar Ambos</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
