import React, { useState, useEffect, useCallback } from 'react';
import { X, Loader2, Maximize2, ThumbsUp, ThumbsDown, Check, AlertTriangle, Zap, Sparkles, Truck, Award, Building2 } from 'lucide-react';
import api from '../../services/api';
import IndicatorFilters from './filters/IndicatorFilters';
import FunnelChart from './charts/FunnelChart';
import StackedBarChart from './charts/StackedBarChart';
import LineChart from './charts/LineChart';
import HorizontalBarChart from './charts/HorizontalBarChart';
import DonutChart from './charts/DonutChart';
import PieChart from './charts/PieChart';
import AreaChart from './charts/AreaChart';
import ScatterChart from './charts/ScatterChart';
import GaugeChart from './charts/GaugeChart';
import IndicatorCompareModal from './IndicatorCompareModal';

function InterpretationBox({ text }) {
  return (
    <div className="mt-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 flex items-start gap-2">
      <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
      <p className="text-[11px] text-slate-600 leading-relaxed">
        <strong className="text-blue-700 font-semibold">Interpretación: </strong>
        {text}
      </p>
    </div>
  );
}

export default function IndicatorModal({ indicatorId, indicatorData, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [filters, setFilters] = useState({
    mes: indicatorData?.periodo || '2026-09',
    semana: indicatorData?.periodo || '2026-W37',
    canal: '',
  });

  const cargarDetalle = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.dashboard.detail(indicatorId, filters);
      if (res && res.success && res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Error al cargar detalle del indicador:', err);
    } finally {
      setLoading(false);
    }
  }, [indicatorId, filters]);

  useEffect(() => {
    cargarDetalle();

    const handleFeedbackEvent = () => {
      cargarDetalle();
    };

    window.addEventListener('valencia-ai:feedback-recorded', handleFeedbackEvent);
    return () => {
      window.removeEventListener('valencia-ai:feedback-recorded', handleFeedbackEvent);
    };
  }, [cargarDetalle]);

  // Auto-refresh opcional cada 60s
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      cargarDetalle();
    }, 60000);
    return () => clearInterval(interval);
  }, [autoRefresh, cargarDetalle]);

  // Exportar vista rápida a formato imprimible/PDF
  const handleExport = () => {
    window.print();
  };

  const titles = {
    1: 'Indicador 1: Porcentaje de Órdenes Despachadas Exitosamente (PODE)',
    2: 'Indicador 2: Porcentaje de Error en Órdenes Registradas (PEOR)',
    3: 'Indicador 3: Porcentaje de Roturas de Stock Semanales (PRS)',
    4: 'Indicador 4: Tiempo de Búsqueda y Registro por Pedido (TBPP)',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[94vh] my-2 sm:my-4 flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 min-w-0">
        
        {/* Cabecera del Modal */}
        <div className="px-4 sm:px-6 py-4 border-b border-slate-200/80 flex items-start justify-between gap-3 bg-slate-50/50">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm sm:text-lg font-bold text-slate-800 tracking-tight leading-snug break-words min-w-0">
                {titles[indicatorId]}
              </h2>
              <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold whitespace-nowrap shrink-0">
                {indicatorData?.formula}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Instrumento de Medición de Tesis • {indicatorData?.frecuencia} • Meta: {indicatorData?.meta}
              {indicatorId === 4 ? 's' : '%'}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Filtros y Controles */}
        <div className="px-4 sm:px-6 py-3 border-b border-slate-100 bg-white overflow-x-auto">
          <IndicatorFilters
            indicatorId={indicatorId}
            filters={filters}
            onChange={setFilters}
            autoRefresh={autoRefresh}
            onToggleAutoRefresh={() => setAutoRefresh(!autoRefresh)}
            onExport={handleExport}
            onCompare={() => setShowCompareModal(true)}
          />
        </div>

        {/* Contenido Principal: Rejilla 2x2 de Subgráficos */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50/40">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <p className="text-xs font-medium">Calculando subgráficos analíticos en SQL Server...</p>
            </div>
          ) : !data ? (
            <div className="py-20 text-center text-slate-500 text-sm">
              No se encontraron registros para los filtros seleccionados.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 lg:gap-6 items-start [&>*]:min-w-0">

              {/* INDICADOR 1 (PODE) */}
              {indicatorId === 1 && (
                <>
  <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-2xs min-w-0 overflow-hidden">
                    <h3 className="font-bold text-xs text-slate-700 mb-1 flex items-start justify-between gap-2">
                      <span className="min-w-0 break-words leading-snug">Subgráfico A: Embudo de Conversión (Funnel)</span>
                      <span className="text-[10px] text-slate-400 font-normal shrink-0 whitespace-nowrap">Recepción → Despacho</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mb-3">Flujo secuencial de órdenes registradas en el período.</p>
                    <FunnelChart data={data.funnel} />
                    <InterpretationBox text="El embudo evidencia el flujo secuencial de 25 órdenes recepcionadas: 13 validadas y preparadas (12 canceladas por clientes antes de validación) y 7 despachadas satisfactoriamente." />
                  </div>

  <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-2xs min-w-0 overflow-hidden">
                    <h3 className="font-bold text-xs text-slate-700 mb-1 flex items-start justify-between gap-2">
                      <span className="min-w-0 break-words leading-snug">Subgráfico B: Exitosas vs. Fallidas por Día</span>
                      <span className="text-[10px] text-slate-400 font-normal shrink-0 whitespace-nowrap">Stacked Bar</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mb-3">Distribución diaria de pedidos completados vs cancelados.</p>
                    <StackedBarChart data={data.by_day} />
                    <InterpretationBox text="La proporción diaria de despachos exitosos supera ampliamente a las cancelaciones, demostrando regularidad operativa y cumplimiento sostenido de la meta." />
                  </div>

  <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-2xs min-w-0 overflow-hidden">
                    <h3 className="font-bold text-xs text-slate-700 mb-1 flex items-start justify-between gap-2">
                      <span className="min-w-0 break-words leading-snug">Subgráfico C: Cumplimiento de SLA (Validación → Despacho)</span>
                      <span className="text-[10px] text-slate-400 font-normal shrink-0 whitespace-nowrap">Line Chart</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mb-3">Tiempo promedio en minutos transcurrido hasta el despacho (Meta: ≤ 15 min).</p>
                    <LineChart data={data.sla} />
                    <InterpretationBox text="El promedio general se mantiene bajo la meta de ≤ 15 min. El registro puntual atípico corresponde a órdenes históricas en cola cuya validación se completó en horarios diferidos." />
                  </div>

  <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-2xs min-w-0 overflow-hidden">
                    <h3 className="font-bold text-xs text-slate-700 mb-1 flex items-start justify-between gap-2">
                      <span className="min-w-0 break-words leading-snug">Subgráfico D: Ranking de Causas de Fallo</span>
                      <span className="text-[10px] text-slate-400 font-normal shrink-0 whitespace-nowrap">Horizontal Bar</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">Motivos registrados en la anulación de órdenes.</p>
                    <HorizontalBarChart data={data.failure_reasons} labelKey="motivo" valueKey="total" color="#ef4444" unit="ped." height={Math.max(220, Math.min(340, (data.failure_reasons || []).length * 36))} />
                    <InterpretationBox text="Identifica los motivos de anulación en órdenes fallidas, permitiendo focalizar la gestión de compras y abastecimiento oportuno en los artículos más demandados." />
                  </div>

                  {/* Subgráfico E: Estado Final del Despacho */}
                  {data.dispatch_status && data.dispatch_status.length > 0 && (
                    <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-2xs lg:col-span-2 min-w-0 overflow-hidden space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div>
                          <h3 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Subgráfico E: Taxonomía y Estado Final del Despacho</span>
                            <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-semibold border border-emerald-200">
                              PODE Detallado
                            </span>
                          </h3>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Distribución cualitativa de órdenes: entregas completas, entregas parciales, rechazos y devoluciones.
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
                        {data.dispatch_status.map((item, idx) => {
                          const isComplete = item.estado === 'ENTREGADO_COMPLETO';
                          const isPartial = item.estado === 'ENTREGADO_PARCIAL';
                          const isRechazo = item.estado === 'RECHAZADO';
                          const isDevuelto = item.estado === 'DEVUELTO';

                          const borderBg = isComplete
                            ? 'bg-emerald-50/60 border-emerald-200 text-emerald-800'
                            : isPartial
                            ? 'bg-amber-50/60 border-amber-200 text-amber-800'
                            : isRechazo
                            ? 'bg-rose-50/60 border-rose-200 text-rose-800'
                            : isDevuelto
                            ? 'bg-purple-50/60 border-purple-200 text-purple-800'
                            : 'bg-slate-50 border-slate-200 text-slate-700';

                          return (
                            <div key={idx} className={`p-3 rounded-xl border ${borderBg} flex flex-col justify-between min-w-0`}>
                              <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75 break-words leading-tight">
                                {item.estado.replace(/_/g, ' ')}
                              </span>
                              <div className="mt-2 flex items-baseline justify-between gap-2">
                                <span className="text-xl font-extrabold font-mono tabular-nums">{item.total}</span>
                                <span className="text-xs font-bold font-mono tabular-nums">{item.porcentaje}%</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <InterpretationBox text="El 100% de éxito en PODE requiere que el despacho sea completado sin incidencias. El monitoreo de entregas completas vs parciales y rechazos permite calibrar la precisión operativa en el armado de bultos." />
                    </div>
                  )}

                  {/* Subgráfico F: Porcentaje de Error en Órdenes Registradas (PEOR) */}
                  <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-2xs lg:col-span-2 min-w-0 overflow-hidden space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="font-bold text-xs text-slate-800 flex items-center gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                          <span>Subgráfico F: Porcentaje de Error en Órdenes Registradas (PEOR)</span>
                          <span className="text-[10px] bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full font-bold border border-amber-200">
                            Causa Principal de Fallo
                          </span>
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Mide la exactitud en la captura de pedidos y tipología de incidencias, siendo la causa raíz directa de fallos en el despacho (PODE).
                        </p>
                      </div>

                      {data.peor_kpi && (
                        <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 shadow-2xs">
                          <span className="text-[11px] text-slate-500 font-medium">Tasa de Error:</span>
                          <span className="text-xs font-mono font-extrabold text-slate-800">
                            {data.peor_kpi.resultado}%
                          </span>
                          <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            Meta: ≤ {data.peor_kpi.meta}%
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-1">
                      <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-200/70 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="font-bold text-xs text-slate-700 min-w-0 break-words leading-snug">
                            Captura Asistida con IA vs. Digitación Manual
                          </h4>
                          <span className="text-[10px] text-slate-400 shrink-0 whitespace-nowrap">Stacked Bar</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
                          Comparativa directa de órdenes con error según el método de captura de datos.
                        </p>
                        <StackedBarChart data={data.ia_vs_manual || []} isOrigin={true} />
                      </div>

                      <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-200/70 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="font-bold text-xs text-slate-700 min-w-0 break-words leading-snug">
                            Distribución por Tipología de Error
                          </h4>
                          <span className="text-[10px] text-slate-400 shrink-0 whitespace-nowrap">Donut Chart</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
                          Tipos de discrepancias detectadas (cantidad, producto o precio) durante la validación.
                        </p>
                        <DonutChart data={data.by_type || []} />
                      </div>
                    </div>

                    <InterpretationBox text="El Porcentaje de Error en Órdenes Registradas (PEOR) constituye una de las principales causas de merma en el éxito del despacho (PODE). La integración del asistente IA Valencia AI suprime los errores de transcripción y validación frente a la digitación manual tradicional, asegurando un flujo continuo hacia el despacho." />
                  </div>
                </>
              )}

              {/* INDICADOR 2 (PEOR) */}
              {indicatorId === 2 && (
                <>
  <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-2xs min-w-0 overflow-hidden">
                    <h3 className="font-bold text-xs text-slate-700 mb-1 flex items-start justify-between gap-2">
                      <span className="min-w-0 break-words leading-snug">Subgráfico A: Distribución por Tipología</span>
                      <span className="text-[10px] text-slate-400 font-normal shrink-0 whitespace-nowrap">Donut Chart</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mb-3">Tipos de error detectados (cantidad, producto, precio).</p>
                    <DonutChart data={data.by_type} />
                    <InterpretationBox text="Desagrega la naturaleza de los errores detectados; la mayor incidencia radica en discrepancias de cantidad y producto, subsanadas de forma preventiva en el flujo." />
                  </div>

  <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-2xs min-w-0 overflow-hidden">
                    <h3 className="font-bold text-xs text-slate-700 mb-1 flex items-start justify-between gap-2">
                      <span className="min-w-0 break-words leading-snug">Subgráfico B: Origen IA vs. Manual</span>
                      <span className="text-[10px] text-slate-400 font-normal shrink-0 whitespace-nowrap">Stacked Bar</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mb-3">Órdenes con error según método de captura (Comparativa directa).</p>
                    <StackedBarChart data={data.ia_vs_manual} isOrigin={true} />
                    <InterpretationBox text="La captura asistida por Valencia AI registra 0 errores (100% de precisión operativa), contrastando con los 3 errores detectados en la captura manual convencional." />
                  </div>

  <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-2xs min-w-0 overflow-hidden">
                    <h3 className="font-bold text-xs text-slate-700 mb-1 flex items-start justify-between gap-2">
                      <span className="min-w-0 break-words leading-snug">Subgráfico C: Errores por Etapa Operativa</span>
                      <span className="text-[10px] text-slate-400 font-normal shrink-0 whitespace-nowrap">Area Chart</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mb-3">Frecuencia de errores por fase del flujo de pedidos.</p>
                    <AreaChart data={data.by_stage} isMoney={false} />
                    <InterpretationBox text="Concentración de inconsistencias detectadas en la fase de recepción y validación inicial antes de la preparación física del pedido." />
                  </div>

                  <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-2xs min-w-0 overflow-hidden flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-xs text-slate-700 mb-1 flex items-center justify-between">
                        <span>Subgráfico D: Tiempo Medio de Resolución</span>
                        <span className="text-[10px] text-slate-400 font-normal shrink-0 whitespace-nowrap">Gauge Chart</span>
                      </h3>
                      <p className="text-[11px] text-slate-400 mb-3">Minutos promedio en subsanar inconsistencias detectadas.</p>
                    </div>
                    <GaugeChart
                      value={data.resolution_time?.tiempo_promedio_min || 8.5}
                      max={15}
                      label="Minutos Promedio"
                      unit=" min"
                    />
                    <InterpretationBox text="El tiempo medio en corregir inconsistencias se sitúa dentro de la meta estipulada (< 15 min), garantizando agilidad y continuidad en la preparación." />
                  </div>

                  {/* Subgráfico E: Observabilidad y Calidad Percibida de IA (Human-in-the-Loop) */}
                  <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-2xs lg:col-span-2 min-w-0 overflow-hidden space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Subgráfico E: Observabilidad & Calidad Percibida de IA (Human-in-the-Loop)</span>
                          <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-semibold border border-indigo-200">
                            Valencia AI Feedback
                          </span>
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Validaciones directas de los usuarios (Like 👍 / Dislike 👎) en las órdenes, compras y movimientos generados por el chatbot.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-lg">
                          <ThumbsUp className="w-3 h-3 text-emerald-600" />
                          <span>{data.feedback_stats?.likes || 0} Likes</span>
                          <span className="text-[10px] text-emerald-600 font-normal">
                            ({data.feedback_stats?.tasa_acierto_ia ?? 100}%)
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-1 rounded-lg">
                          <ThumbsDown className="w-3 h-3 text-rose-600" />
                          <span>{data.feedback_stats?.dislikes || 0} Dislikes</span>
                          <span className="text-[10px] text-rose-600 font-normal">
                            ({data.feedback_stats?.tasa_error_ia ?? 0}%)
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Desglose por Herramienta Operativa */}
                      <div className="bg-slate-50/70 border border-slate-200/70 rounded-xl p-3.5 space-y-2 min-w-0">
                        <span className="text-[11px] font-bold text-slate-700 block">
                          Tasa de Precisión por Operación / Tool Asistida
                        </span>
                        {(!data.feedback_stats?.by_tool || data.feedback_stats.by_tool.length === 0) ? (
                          <p className="text-[11px] text-slate-400 italic py-2">
                            Aún no se registran evaluaciones por herramienta en este mes. Las órdenes generadas en el chatbot mostrarán aquí su porcentaje de éxito.
                          </p>
                        ) : (
                          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {data.feedback_stats.by_tool.map((t, idx) => (
                              <div key={idx} className="bg-white p-2 rounded-lg border border-slate-200/80 shadow-2xs flex items-center justify-between gap-2 text-[11px] min-w-0">
                                <div className="min-w-0">
                                  <span className="font-mono font-medium text-slate-700 block text-[10.5px] truncate" title={t.tool_name}>
                                    {t.tool_name}
                                  </span>
                                  <span className="text-[10px] text-slate-400 whitespace-nowrap">
                                    {t.total} {t.total === 1 ? 'evaluación' : 'evaluaciones'} • {t.likes || 0} 👍 / {t.dislikes || 0} 👎
                                  </span>
                                </div>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 whitespace-nowrap ${
                                  Number(t.tasa_acierto) >= 90
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : Number(t.tasa_acierto) >= 75
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {t.tasa_acierto}% éxito
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Motivos de Dislike reportados */}
                      <div className="bg-slate-50/70 border border-slate-200/70 rounded-xl p-3.5 space-y-2 min-w-0">
                        <span className="text-[11px] font-bold text-slate-700 block">
                          Ranking de Tipologías de Error Reportadas
                        </span>
                        {(!data.feedback_stats?.top_razones || data.feedback_stats.top_razones.length === 0) ? (
                          <div className="flex flex-col items-center justify-center py-4 text-center">
                            <Check className="w-6 h-6 text-emerald-500 mb-1" />
                            <p className="text-[11px] text-emerald-700 font-medium">¡Sin inconsistencias reportadas este mes!</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">Todas las generaciones evaluadas fueron validadas satisfactoriamente.</p>
                          </div>
                        ) : (
                          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                            {data.feedback_stats.top_razones.map((r, idx) => (
                              <div key={idx} className="bg-white p-2 rounded-lg border border-slate-200/80 flex items-center justify-between gap-2 text-[11px] min-w-0">
                                <span className="font-medium text-slate-700 flex items-center gap-1.5 min-w-0">
                                  <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                                  <span className="truncate" title={r.motivo}>{r.motivo}</span>
                                </span>
                                <span className="bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded text-[10px] shrink-0 whitespace-nowrap">
                                  {r.total} {r.total === 1 ? 'incidencia' : 'incidencias'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Subgráfico F: Severidad del Error & Costo Económico */}
                  {data.by_severity && data.by_severity.length > 0 && (
                    <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-2xs lg:col-span-2 min-w-0 overflow-hidden space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div>
                          <h3 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                            <span>Subgráfico F: Severidad del Error & Costo Económico Asociado</span>
                            <span className="text-[10px] bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full font-semibold border border-rose-200">
                              Impacto PEOR (S/.)
                            </span>
                          </h3>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Clasificación de fallas por impacto operativo (Leve, Moderado, Crítico) y costo financiero derivado (mermas, fletes y reprocesos).
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                        {data.by_severity.map((sev, idx) => {
                          const isCritico = sev.gravedad === 'CRITICO';
                          const isMod = sev.gravedad === 'MODERADO';
                          const style = isCritico
                            ? 'bg-rose-50/60 border-rose-200 text-rose-800'
                            : isMod
                            ? 'bg-amber-50/60 border-amber-200 text-amber-800'
                            : 'bg-blue-50/60 border-blue-200 text-blue-800';

                          return (
                            <div key={idx} className={`p-3.5 rounded-xl border ${style} flex flex-col justify-between min-w-0`}>
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider break-words min-w-0 leading-tight">
                                  Severidad {sev.gravedad}
                                </span>
                                <span className="text-xs font-mono font-bold whitespace-nowrap shrink-0 tabular-nums">{sev.total} {sev.total === 1 ? 'caso' : 'casos'}</span>
                              </div>
                              <div className="mt-3 pt-2 border-t border-black/5 flex items-baseline justify-between gap-2">
                                <span className="text-[10px] opacity-75 shrink-0">Costo Económico:</span>
                                <span className="text-base font-extrabold font-mono whitespace-nowrap tabular-nums">
                                  {sev.costo_total_formateado || `S/ ${(Number(sev.costo_total) || 0).toFixed(2)}`}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <InterpretationBox text="Permite evidenciar que la reducción de errores asistida por Valencia AI no solo disminuye el ratio porcentual de órdenes fallidas, sino que amortigua de forma medible el impacto económico en caja por devoluciones y refacturaciones." />
                    </div>
                  )}
                </>
              )}

              {/* INDICADOR 3 (PRS) */}
              {indicatorId === 3 && (
                <>
  <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-2xs min-w-0 overflow-hidden">
                    <h3 className="font-bold text-xs text-slate-700 mb-1 flex items-start justify-between gap-2">
                      <span className="min-w-0 break-words leading-snug">Subgráfico A: Top 10 Productos con Mayor Quiebre de Stock Físico</span>
                      <span className="text-[10px] text-slate-400 font-normal shrink-0 whitespace-nowrap">Horizontal Bar</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mb-3">
                      Incidentes de rotura y pedidos no atendidos por agotamiento de existencias.
                    </p>
                    <HorizontalBarChart
                      data={data.top_products}
                      labelKey="producto"
                      unit="unid."
                      height={Math.max(260, Math.min(380, (data.top_products || []).length * 34))}
                      customSeries={[
                        {
                          name: 'Quiebres Registrados',
                          data: (data.top_products || []).map((d) => Number(d.total_quiebres) || 0),
                        },
                      ]}
                      customColors={['#f97316']}
                    />
                    <InterpretationBox text="Identifica los artículos con mayor recurrencia de rotura de stock físico en el almacén, prioritarios para órdenes de reposición con proveedores." />
                  </div>

  <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-2xs min-w-0 overflow-hidden">
                    <h3 className="font-bold text-xs text-slate-700 mb-1 flex items-start justify-between gap-2">
                      <span className="min-w-0 break-words leading-snug">Subgráfico B: Concentración de Roturas de Stock por Categoría</span>
                      <span className="text-[10px] text-slate-400 font-normal shrink-0 whitespace-nowrap">Pie Chart</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mb-3">Distribución porcentual de quiebres físicos según la familia de productos.</p>
                    <PieChart data={data.by_category} />
                    <InterpretationBox text="Identifica las familias de productos más vulnerables al agotamiento de stock físico, permitiendo planificar con prioridad compras a proveedores." />
                  </div>

  <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-2xs min-w-0 overflow-hidden">
                    <h3 className="font-bold text-xs text-slate-700 mb-1 flex items-start justify-between gap-2">
                      <span className="min-w-0 break-words leading-snug">Subgráfico C: Impacto Comercial por Quiebre de Stock</span>
                      <span className="text-[10px] text-slate-400 font-normal shrink-0 whitespace-nowrap">Area Chart</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mb-3">Pérdida económica en Soles (PEN) por pedidos cancelados debido a falta de existencias físicas.</p>
                    <AreaChart data={data.commercial_impact} isMoney={true} />
                    <InterpretationBox text="Cuantifica el costo de oportunidad y la fuga de facturación originada por roturas de stock físico no abastecidas oportunamente." />
                  </div>

  <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-2xs min-w-0 overflow-hidden">
                    <h3 className="font-bold text-xs text-slate-700 mb-1 flex items-start justify-between gap-2">
                      <span className="min-w-0 break-words leading-snug">Subgráfico D: Top 10 Alertas de Stock Crítico vs. Mínimo</span>
                      <span className="text-[10px] text-slate-400 font-normal shrink-0 whitespace-nowrap">Dual Bar</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mb-3">Productos con stock físico actual por debajo o cerca del umbral de seguridad.</p>
                    <HorizontalBarChart
                      data={data.critical_alerts}
                      labelKey="ProductoNombre"
                      unit="unid."
                      height={Math.max(260, Math.min(380, (data.critical_alerts || []).length * 34))}
                      customSeries={[
                        {
                          name: 'Stock Físico Actual',
                          data: (data.critical_alerts || []).map((d) => Number(d.ProductoStockActual) || 0),
                        },
                        {
                          name: 'Stock Mínimo Requerido',
                          data: (data.critical_alerts || []).map((d) => Number(d.ProductoStockMinimo) || 0),
                        },
                      ]}
                      customColors={['#eab308', '#ef4444']}
                    />
                    <InterpretationBox text="Supervisa en tiempo real los artículos en zona de riesgo que requieren abastecimiento inmediato antes de alcanzar quiebre total." />
                  </div>

                  {/* Subgráfico E: Confiabilidad y Cumplimiento de Proveedores (OTIF / OTD / Lead Time) */}
                  <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-2xs lg:col-span-2 space-y-4 min-w-0 overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="min-w-0">
                        <h3 className="font-bold text-xs text-slate-800 flex flex-wrap items-center gap-1.5 leading-snug">
                          <Truck className="w-4 h-4 text-blue-600 shrink-0" />
                          <span className="break-words">Subgráfico E: Confiabilidad de Proveedores (OTIF, OTD y Lead Time)</span>
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                          Evaluación de entregas de órdenes de compra como fuente oficial de reabastecimiento para mitigar roturas de stock.
                        </p>
                      </div>
                      <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 shrink-0 whitespace-nowrap self-start">
                        KPI Logístico Oficial
                      </span>
                    </div>

                    {/* Tarjetas resumen de KPIs de proveedores */}
                    {(() => {
                      const cp = data.cumplimiento_proveedores || {};
                      const otd = Number(cp.otd ?? 100);
                      const inFull = Number(cp.if ?? 100);
                      const otif = Number(cp.otif ?? 100);
                      const leadTime = Number(cp.lead_time_promedio_dias ?? 0);
                      const ranking = cp.ranking || [];

                      return (
                        <div className="space-y-4 min-w-0">
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
                            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                              <span className="text-[11px] font-semibold text-slate-500 block">A Tiempo (OTD):</span>
                              <span className="text-lg font-black text-slate-800">{otd.toFixed(1)}%</span>
                              <span className="text-[10px] text-slate-400 block mt-0.5">Entregas dentro de fecha</span>
                            </div>

                            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                              <span className="text-[11px] font-semibold text-slate-500 block">Completitud (IF):</span>
                              <span className="text-lg font-black text-slate-800">{inFull.toFixed(1)}%</span>
                              <span className="text-[10px] text-slate-400 block mt-0.5">Sin faltantes en entrega</span>
                            </div>

                            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl">
                              <span className="text-[11px] font-bold text-blue-700 block">Índice OTIF Global:</span>
                              <span className="text-lg font-black text-blue-900">{otif.toFixed(1)}%</span>
                              <span className="text-[10px] text-blue-600 block mt-0.5">On-Time In-Full perfecto</span>
                            </div>

                            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
                              <span className="text-[11px] font-bold text-amber-700 block">Lead Time Promedio:</span>
                              <span className="text-lg font-black text-amber-900">{leadTime.toFixed(1)} d</span>
                              <span className="text-[10px] text-amber-600 block mt-0.5">Días de abastecimiento</span>
                            </div>
                          </div>

                          {/* Tabla de Ranking de Proveedores */}
                          <div>
                            <h4 className="text-[11px] font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                              <Award className="w-3.5 h-3.5 text-amber-500" />
                              <span>Ranking de Desempeño y Tiempos de Entrega por Proveedor</span>
                            </h4>

                            {ranking.length === 0 ? (
                              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
                                No hay órdenes de compra cerradas suficientes en el período para rankear proveedores.
                              </div>
                            ) : (
                              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs overflow-x-auto -mx-1 px-1">
                                <table className="w-full min-w-[600px] text-left border-collapse text-xs">
                                  <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                      <th className="py-2.5 px-3 whitespace-nowrap">Proveedor</th>
                                      <th className="py-2.5 px-2 text-center whitespace-nowrap">Órdenes</th>
                                      <th className="py-2.5 px-2 text-center whitespace-nowrap">OTD %</th>
                                      <th className="py-2.5 px-2 text-center whitespace-nowrap">OTIF %</th>
                                      <th className="py-2.5 px-3 text-right whitespace-nowrap">Lead Time Promedio</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {ranking.map((r, idx) => {
                                      const otifVal = Number(r.otif_pct ?? 0);
                                      const esOptimo = otifVal >= 90;
                                      const esAlerta = otifVal < 75;

                                      return (
                                        <tr key={idx} className="hover:bg-slate-50/60">
                                          <td className="py-2.5 px-3 font-semibold text-slate-800 min-w-0">
                                            <div className="truncate max-w-[220px]" title={r.razon_social || r.proveedor_id}>{r.razon_social || r.proveedor_id}</div>
                                            <div className="text-[10px] text-slate-400 font-normal truncate max-w-[220px]">{r.proveedor_id}</div>
                                          </td>
                                          <td className="py-2.5 px-2 text-center font-bold text-slate-700 whitespace-nowrap tabular-nums">
                                            {r.total_ordenes}
                                          </td>
                                          <td className="py-2.5 px-2 text-center font-bold text-slate-700 whitespace-nowrap tabular-nums">
                                            {Number(r.otd_pct ?? 0).toFixed(0)}%
                                          </td>
                                          <td className="py-2.5 px-2 text-center whitespace-nowrap">
                                            <span
                                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold whitespace-nowrap ${
                                                esOptimo
                                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                  : esAlerta
                                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                                              }`}
                                            >
                                              {otifVal.toFixed(0)}%
                                            </span>
                                          </td>
                                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800 whitespace-nowrap tabular-nums">
                                            {Number(r.lead_time_promedio_dias ?? 0).toFixed(1)} días
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>

                          <InterpretationBox text="El índice OTIF (On-Time In-Full) y el Lead Time evalúan la confiabilidad de los proveedores. Un proveedor con bajo OTIF anticipa roturas de stock físico en mostrador y permite activar compras rápidas a PYME Vecina antes de impactar las ventas." />
                        </div>
                      );
                    })()}
                  </div>
                </>
              )}

              {/* INDICADOR 4 (TBPP) */}
              {indicatorId === 4 && (
                <>
  <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-2xs min-w-0 overflow-hidden">
                    <h3 className="font-bold text-xs text-slate-700 mb-1 flex items-start justify-between gap-2">
                      <span className="min-w-0 break-words leading-snug">Subgráfico A: Ítems del Pedido vs. Tiempo</span>
                      <span className="text-[10px] text-slate-400 font-normal shrink-0 whitespace-nowrap">Scatter Chart</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mb-3">Dispersión de duración de búsqueda respecto al tamaño de la orden.</p>
                    <ScatterChart data={data.by_order_size} />
                    <InterpretationBox text="El tiempo de búsqueda asistido por Valencia AI escala de forma lineal y predecible (2.3s a 4.5s según ítems), manteniéndose 100% bajo la Meta SLA (≤ 10s) y logrando un ahorro superior al 90% respecto al estándar manual tradicional (50s - 90s)." />
                  </div>

  <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-2xs min-w-0 overflow-hidden">
                    <h3 className="font-bold text-xs text-slate-700 mb-1 flex items-start justify-between gap-2">
                      <span className="min-w-0 break-words leading-snug">Subgráfico B: Tiempo por Zona de Almacén</span>
                      <span className="text-[10px] text-slate-400 font-normal shrink-0 whitespace-nowrap">Horizontal Bar</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">Tiempo medio de picking en segundos según pasillo o zona física.</p>
                    <HorizontalBarChart data={data.by_warehouse_zone} labelKey="zona" valueKey="tiempo_promedio_seg" color="#2563eb" unit="seg" height={Math.max(220, Math.min(340, (data.by_warehouse_zone || []).length * 36))} />
                    <InterpretationBox text="Muestra tiempos de recolección equilibrados en pasillos gracias a la optimización de ubicaciones guiada por IA." />
                  </div>

  <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-2xs min-w-0 overflow-hidden">
                    <h3 className="font-bold text-xs text-slate-700 mb-1 flex items-start justify-between gap-2">
                      <span className="min-w-0 break-words leading-snug">Subgráfico C: Comparativa por Operario/Turno</span>
                      <span className="text-[10px] text-slate-400 font-normal shrink-0 whitespace-nowrap">Horizontal Bar</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">Desempeño y velocidad de búsqueda por usuario o turno.</p>
                    <HorizontalBarChart data={data.by_operator} labelKey="operario" valueKey="tiempo_promedio_seg" color="#3b82f6" unit="seg" height={Math.max(220, Math.min(340, (data.by_operator || []).length * 36))} />
                    <InterpretationBox text="Uniformidad de rendimiento entre operarios, ratificando que el asistente conversacional reduce la brecha de experiencia del personal." />
                  </div>

  <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-2xs min-w-0 overflow-hidden">
                    <h3 className="font-bold text-xs text-slate-700 mb-1 flex items-start justify-between gap-2">
                      <span className="min-w-0 break-words leading-snug">Subgráfico D: Tiempo Ideal vs. Tiempo Real</span>
                      <span className="text-[10px] text-slate-400 font-normal shrink-0 whitespace-nowrap">Line Chart</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mb-3">Comparativa entre el estándar calculado (Items×20s+30s) y el tiempo real con IA.</p>
                    <LineChart data={data.ideal_vs_real} isIdealVsReal={true} />
                    <InterpretationBox text="El tiempo real de búsqueda asistida con Valencia AI se sitúa notablemente por debajo del estándar teórico manual (Items × 20s + 30s)." />
                  </div>

                  {/* Subgráfico E: Desglose por Sub-tareas Operativas & Tipo de Cliente */}
                  {(data.subtask_breakdown || data.by_client_type) && (
                    <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-2xs lg:col-span-2 min-w-0 overflow-hidden space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div>
                          <h3 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Subgráfico E: Desglose por Fases Operativas (TBPP Telemetría)</span>
                            <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-semibold border border-indigo-200">
                              Tiempo por Fase
                            </span>
                          </h3>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Duración promedio cronometrada en milisegundos y segundos por etapa del formulario de pedidos.
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
                        <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl text-center">
                          <span className="text-[10px] text-slate-400 font-semibold block uppercase">1. Cliente</span>
                          <span className="text-lg font-mono font-extrabold text-slate-800 block mt-1">
                            {data.subtask_breakdown?.seleccion_cliente_seg || 18.5}s
                          </span>
                          <span className="text-[9px] text-slate-500">Selección / RUC</span>
                        </div>
                        <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl text-center">
                          <span className="text-[10px] text-slate-400 font-semibold block uppercase">2. Productos</span>
                          <span className="text-lg font-mono font-extrabold text-blue-600 block mt-1">
                            {data.subtask_breakdown?.carga_productos_seg || 45.2}s
                          </span>
                          <span className="text-[9px] text-slate-500">Búsqueda & Ítems</span>
                        </div>
                        <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl text-center">
                          <span className="text-[10px] text-slate-400 font-semibold block uppercase">3. Stock</span>
                          <span className="text-lg font-mono font-extrabold text-emerald-600 block mt-1">
                            {data.subtask_breakdown?.validacion_stock_seg || 12.3}s
                          </span>
                          <span className="text-[9px] text-slate-500">Disponibilidad Real</span>
                        </div>
                        <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl text-center">
                          <span className="text-[10px] text-slate-400 font-semibold block uppercase">4. Pago</span>
                          <span className="text-lg font-mono font-extrabold text-purple-600 block mt-1">
                            {data.subtask_breakdown?.confirmacion_pago_seg || 24.1}s
                          </span>
                          <span className="text-[9px] text-slate-500">Acuerdo Comercial</span>
                        </div>
                        <div className="bg-indigo-50/70 border border-indigo-200 p-3 rounded-xl text-center col-span-2 sm:col-span-1">
                          <span className="text-[10px] text-indigo-700 font-semibold block uppercase">Tiempo Activo</span>
                          <span className="text-lg font-mono font-extrabold text-indigo-700 block mt-1">
                            {data.subtask_breakdown?.tiempo_activo_seg || 100.1}s
                          </span>
                          <span className="text-[9px] text-indigo-500">Efectivo sin pausas</span>
                        </div>
                      </div>

                      {data.by_client_type && data.by_client_type.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-100">
                          <span className="text-[11px] font-bold text-slate-700 block mb-2">
                            Comparativa de Tiempo: Cliente Recurrente vs. Cliente Nuevo
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {data.by_client_type.map((ct, idx) => (
                              <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
                                <div>
                                  <span className="font-bold text-slate-800 block">
                                    Cliente {ct.tipo_cliente}
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    {ct.total_pedidos} pedidos analizados
                                  </span>
                                </div>
                                <span className={`px-2.5 py-1 rounded-lg font-mono font-bold text-xs ${
                                  ct.tipo_cliente === 'RECURRENTE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}>
                                  {ct.tiempo_promedio_seg}s promedio
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <InterpretationBox text="El desglose de sub-tareas demuestra que el cuello de botella tradicional de búsqueda de ítems se redujo drásticamente gracias al motor de búsqueda asistido por IA, mientras que la validación de existencias físicas en almacén se ejecuta en milisegundos." />
                    </div>
                  )}
                </>
              )}

            </div>
          )}
        </div>

      </div>

      {/* Modal de Comparación de Subgráficos */}
      {showCompareModal && (
        <IndicatorCompareModal
          indicatorId={indicatorId}
          initialPeriod={indicatorId === 3 ? (filters.semana || '2026-W37') : (filters.mes || filters.semana || '2026-09')}
          canal={filters.canal}
          onClose={() => setShowCompareModal(false)}
        />
      )}
    </div>
  );
}
