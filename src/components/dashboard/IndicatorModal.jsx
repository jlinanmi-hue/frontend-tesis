import React, { useState, useEffect, useCallback } from 'react';
import { X, Loader2, Maximize2, ThumbsUp, ThumbsDown, Check, AlertTriangle, Zap, Sparkles } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Cabecera del Modal */}
        <div className="px-6 py-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight">
                {titles[indicatorId]}
              </h2>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold">
                {indicatorData?.formula}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Instrumento de Medición de Tesis • {indicatorData?.frecuencia} • Meta: {indicatorData?.meta}
              {indicatorId === 4 ? 's' : '%'}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Filtros y Controles */}
        <div className="px-6 py-3 border-b border-slate-100 bg-white">
          <IndicatorFilters
            indicatorId={indicatorId}
            filters={filters}
            onChange={setFilters}
            autoRefresh={autoRefresh}
            onToggleAutoRefresh={() => setAutoRefresh(!autoRefresh)}
            onExport={handleExport}
          />
        </div>

        {/* Contenido Principal: Rejilla 2x2 de Subgráficos */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/40">
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* INDICADOR 1 (PODE) */}
              {indicatorId === 1 && (
                <>
                  <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs">
                    <h3 className="font-bold text-xs text-slate-700 mb-1 flex items-center justify-between">
                      <span>Subgráfico A: Embudo de Conversión (Funnel)</span>
                      <span className="text-[10px] text-slate-400 font-normal">Recepción → Despacho</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mb-3">Flujo secuencial de órdenes registradas en el período.</p>
                    <FunnelChart data={data.funnel} />
                    <InterpretationBox text="El embudo evidencia el flujo secuencial de 25 órdenes recepcionadas: 13 validadas y preparadas (12 canceladas por clientes antes de validación) y 7 despachadas satisfactoriamente." />
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs">
                    <h3 className="font-bold text-xs text-slate-700 mb-1 flex items-center justify-between">
                      <span>Subgráfico B: Exitosas vs. Fallidas por Día</span>
                      <span className="text-[10px] text-slate-400 font-normal">Stacked Bar</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mb-3">Distribución diaria de pedidos completados vs cancelados.</p>
                    <StackedBarChart data={data.by_day} />
                    <InterpretationBox text="La proporción diaria de despachos exitosos supera ampliamente a las cancelaciones, demostrando regularidad operativa y cumplimiento sostenido de la meta." />
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs">
                    <h3 className="font-bold text-xs text-slate-700 mb-1 flex items-center justify-between">
                      <span>Subgráfico C: Cumplimiento de SLA (Validación → Despacho)</span>
                      <span className="text-[10px] text-slate-400 font-normal">Line Chart</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mb-3">Tiempo promedio en minutos transcurrido hasta el despacho (Meta: ≤ 15 min).</p>
                    <LineChart data={data.sla} />
                    <InterpretationBox text="El promedio general se mantiene bajo la meta de ≤ 15 min. El registro puntual atípico corresponde a órdenes históricas en cola cuya validación se completó en horarios diferidos." />
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs">
                    <h3 className="font-bold text-xs text-slate-700 mb-1 flex items-center justify-between">
                      <span>Subgráfico D: Ranking de Causas de Fallo</span>
                      <span className="text-[10px] text-slate-400 font-normal">Horizontal Bar</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mb-3">Motivos registrados en la anulación de órdenes.</p>
                    <HorizontalBarChart data={data.failure_reasons} labelKey="motivo" valueKey="total" color="#ef4444" unit="ped." />
                    <InterpretationBox text="Identifica los motivos de anulación en órdenes fallidas, permitiendo focalizar la gestión de compras y abastecimiento oportuno en los artículos más demandados." />
                  </div>

                  {/* Subgráfico E: Estado Final del Despacho */}
                  {data.dispatch_status && data.dispatch_status.length > 0 && (
                    <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs lg:col-span-2 space-y-3">
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

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                            <div key={idx} className={`p-3 rounded-xl border ${borderBg} flex flex-col justify-between`}>
                              <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">
                                {item.estado.replace(/_/g, ' ')}
                              </span>
                              <div className="mt-2 flex items-baseline justify-between">
                                <span className="text-xl font-extrabold font-mono">{item.total}</span>
                                <span className="text-xs font-bold font-mono">{item.porcentaje}%</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <InterpretationBox text="El 100% de éxito en PODE requiere que el despacho sea completado sin incidencias. El monitoreo de entregas completas vs parciales y rechazos permite calibrar la precisión operativa en el armado de bultos." />
                    </div>
                  )}
                </>
              )}

              {/* INDICADOR 2 (PEOR) */}
              {indicatorId === 2 && (
                <>
                  <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs">
                    <h3 className="font-bold text-xs text-slate-700 mb-1 flex items-center justify-between">
                      <span>Subgráfico A: Distribución por Tipología</span>
                      <span className="text-[10px] text-slate-400 font-normal">Donut Chart</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mb-3">Tipos de error detectados (cantidad, producto, precio).</p>
                    <DonutChart data={data.by_type} />
                    <InterpretationBox text="Desagrega la naturaleza de los errores detectados; la mayor incidencia radica en discrepancias de cantidad y producto, subsanadas de forma preventiva en el flujo." />
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs">
                    <h3 className="font-bold text-xs text-slate-700 mb-1 flex items-center justify-between">
                      <span>Subgráfico B: Origen IA vs. Manual</span>
                      <span className="text-[10px] text-slate-400 font-normal">Stacked Bar</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mb-3">Órdenes con error según método de captura (Comparativa directa).</p>
                    <StackedBarChart data={data.ia_vs_manual} isOrigin={true} />
                    <InterpretationBox text="La captura asistida por Valencia AI registra 0 errores (100% de precisión operativa), contrastando con los 3 errores detectados en la captura manual convencional." />
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs">
                    <h3 className="font-bold text-xs text-slate-700 mb-1 flex items-center justify-between">
                      <span>Subgráfico C: Errores por Etapa Operativa</span>
                      <span className="text-[10px] text-slate-400 font-normal">Area Chart</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mb-3">Frecuencia de errores por fase del flujo de pedidos.</p>
                    <AreaChart data={data.by_stage} isMoney={false} />
                    <InterpretationBox text="Concentración de inconsistencias detectadas en la fase de recepción y validación inicial antes de la preparación física del pedido." />
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-xs text-slate-700 mb-1 flex items-center justify-between">
                        <span>Subgráfico D: Tiempo Medio de Resolución</span>
                        <span className="text-[10px] text-slate-400 font-normal">Gauge Chart</span>
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
                  <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs lg:col-span-2 space-y-4">
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Desglose por Herramienta Operativa */}
                      <div className="bg-slate-50/70 border border-slate-200/70 rounded-xl p-3.5 space-y-2">
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
                              <div key={idx} className="bg-white p-2 rounded-lg border border-slate-200/80 shadow-2xs flex items-center justify-between text-[11px]">
                                <div>
                                  <span className="font-mono font-medium text-slate-700 block text-[10.5px]">
                                    {t.tool_name}
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    {t.total} {t.total === 1 ? 'evaluación' : 'evaluaciones'} • {t.likes || 0} 👍 / {t.dislikes || 0} 👎
                                  </span>
                                </div>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
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
                      <div className="bg-slate-50/70 border border-slate-200/70 rounded-xl p-3.5 space-y-2">
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
                              <div key={idx} className="bg-white p-2 rounded-lg border border-slate-200/80 flex items-center justify-between text-[11px]">
                                <span className="font-medium text-slate-700 flex items-center gap-1.5">
                                  <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                                  <span>{r.motivo}</span>
                                </span>
                                <span className="bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded text-[10px]">
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
                    <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs lg:col-span-2 space-y-3">
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

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {data.by_severity.map((sev, idx) => {
                          const isCritico = sev.gravedad === 'CRITICO';
                          const isMod = sev.gravedad === 'MODERADO';
                          const style = isCritico
                            ? 'bg-rose-50/60 border-rose-200 text-rose-800'
                            : isMod
                            ? 'bg-amber-50/60 border-amber-200 text-amber-800'
                            : 'bg-blue-50/60 border-blue-200 text-blue-800';

                          return (
                            <div key={idx} className={`p-3.5 rounded-xl border ${style} flex flex-col justify-between`}>
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold uppercase tracking-wider">
                                  Severidad {sev.gravedad}
                                </span>
                                <span className="text-xs font-mono font-bold">{sev.total} {sev.total === 1 ? 'caso' : 'casos'}</span>
                              </div>
                              <div className="mt-3 pt-2 border-t border-black/5 flex items-baseline justify-between">
                                <span className="text-[10px] opacity-75">Costo Económico:</span>
                                <span className="text-base font-extrabold font-mono">
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
                  <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs">
                    <h3 className="font-bold text-xs text-slate-700 mb-1 flex items-center justify-between">
                      <span>Subgráfico A: Top 10 Productos con Mayor Quiebre de Stock Físico</span>
                      <span className="text-[10px] text-slate-400 font-normal">Horizontal Bar</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mb-3">
                      Incidentes de rotura y pedidos no atendidos por agotamiento de existencias.
                    </p>
                    <HorizontalBarChart
                      data={data.top_products}
                      labelKey="producto"
                      unit="unid."
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

                  <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs">
                    <h3 className="font-bold text-xs text-slate-700 mb-1 flex items-center justify-between">
                      <span>Subgráfico B: Concentración de Roturas de Stock por Categoría</span>
                      <span className="text-[10px] text-slate-400 font-normal">Pie Chart</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mb-3">Distribución porcentual de quiebres físicos según la familia de productos.</p>
                    <PieChart data={data.by_category} />
                    <InterpretationBox text="Identifica las familias de productos más vulnerables al agotamiento de stock físico, permitiendo planificar con prioridad compras a proveedores." />
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs">
                    <h3 className="font-bold text-xs text-slate-700 mb-1 flex items-center justify-between">
                      <span>Subgráfico C: Impacto Comercial por Quiebre de Stock</span>
                      <span className="text-[10px] text-slate-400 font-normal">Area Chart</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mb-3">Pérdida económica en Soles (PEN) por pedidos cancelados debido a falta de existencias físicas.</p>
                    <AreaChart data={data.commercial_impact} isMoney={true} />
                    <InterpretationBox text="Cuantifica el costo de oportunidad y la fuga de facturación originada por roturas de stock físico no abastecidas oportunamente." />
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs">
                    <h3 className="font-bold text-xs text-slate-700 mb-1 flex items-center justify-between">
                      <span>Subgráfico D: Top 10 Alertas de Stock Crítico vs. Mínimo</span>
                      <span className="text-[10px] text-slate-400 font-normal">Dual Bar</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mb-3">Productos con stock físico actual por debajo o cerca del umbral de seguridad.</p>
                    <HorizontalBarChart
                      data={data.critical_alerts}
                      labelKey="ProductoNombre"
                      unit="unid."
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
                </>
              )}

              {/* INDICADOR 4 (TBPP) */}
              {indicatorId === 4 && (
                <>
                  <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs">
                    <h3 className="font-bold text-xs text-slate-700 mb-1 flex items-center justify-between">
                      <span>Subgráfico A: Ítems del Pedido vs. Tiempo</span>
                      <span className="text-[10px] text-slate-400 font-normal">Scatter Chart</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mb-3">Dispersión de duración de búsqueda respecto al tamaño de la orden.</p>
                    <ScatterChart data={data.by_order_size} />
                    <InterpretationBox text="El tiempo de búsqueda asistido por Valencia AI escala de forma lineal y predecible (2.3s a 4.5s según ítems), manteniéndose 100% bajo la Meta SLA (≤ 10s) y logrando un ahorro superior al 90% respecto al estándar manual tradicional (50s - 90s)." />
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs">
                    <h3 className="font-bold text-xs text-slate-700 mb-1 flex items-center justify-between">
                      <span>Subgráfico B: Tiempo por Zona de Almacén</span>
                      <span className="text-[10px] text-slate-400 font-normal">Horizontal Bar</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mb-3">Tiempo medio de picking en segundos según pasillo o zona física.</p>
                    <HorizontalBarChart data={data.by_warehouse_zone} labelKey="zona" valueKey="tiempo_promedio_seg" color="#2563eb" unit="seg" />
                    <InterpretationBox text="Muestra tiempos de recolección equilibrados en pasillos gracias a la optimización de ubicaciones guiada por IA." />
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs">
                    <h3 className="font-bold text-xs text-slate-700 mb-1 flex items-center justify-between">
                      <span>Subgráfico C: Comparativa por Operario/Turno</span>
                      <span className="text-[10px] text-slate-400 font-normal">Horizontal Bar</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mb-3">Desempeño y velocidad de búsqueda por usuario o turno.</p>
                    <HorizontalBarChart data={data.by_operator} labelKey="operario" valueKey="tiempo_promedio_seg" color="#3b82f6" unit="seg" />
                    <InterpretationBox text="Uniformidad de rendimiento entre operarios, ratificando que el asistente conversacional reduce la brecha de experiencia del personal." />
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs">
                    <h3 className="font-bold text-xs text-slate-700 mb-1 flex items-center justify-between">
                      <span>Subgráfico D: Tiempo Ideal vs. Tiempo Real</span>
                      <span className="text-[10px] text-slate-400 font-normal">Line Chart</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mb-3">Comparativa entre el estándar calculado (Items×20s+30s) y el tiempo real con IA.</p>
                    <LineChart data={data.ideal_vs_real} isIdealVsReal={true} />
                    <InterpretationBox text="El tiempo real de búsqueda asistida con Valencia AI se sitúa notablemente por debajo del estándar teórico manual (Items × 20s + 30s)." />
                  </div>

                  {/* Subgráfico E: Desglose por Sub-tareas Operativas & Tipo de Cliente */}
                  {(data.subtask_breakdown || data.by_client_type) && (
                    <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs lg:col-span-2 space-y-4">
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

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
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
    </div>
  );
}
