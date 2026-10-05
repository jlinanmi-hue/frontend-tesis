import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  X,
  Loader2,
  RefreshCw,
  Printer,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  GitCompare,
  Filter,
  Check,
  Zap,
  Truck,
  Award,
  Layers,
} from 'lucide-react';
import api from '../../services/api';
import PeriodSelector from './filters/PeriodSelector';
import FunnelChart from './charts/FunnelChart';
import StackedBarChart from './charts/StackedBarChart';
import LineChart from './charts/LineChart';
import HorizontalBarChart from './charts/HorizontalBarChart';
import DonutChart from './charts/DonutChart';
import PieChart from './charts/PieChart';
import AreaChart from './charts/AreaChart';
import ScatterChart from './charts/ScatterChart';
import GaugeChart from './charts/GaugeChart';
import {
  normalizarPeriodo,
  obtenerSemanaAnterior,
  sonPeriodosIguales,
  calcularVariacionKpi,
} from '../../utils/datePeriodUtils';

function ColumnSkeleton({ label }) {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 bg-slate-200/70 rounded-lg w-1/2"></div>
      <div className="h-64 bg-slate-200/60 rounded-xl"></div>
      <div className="h-64 bg-slate-200/60 rounded-xl"></div>
      <div className="h-64 bg-slate-200/60 rounded-xl"></div>
      <div className="h-64 bg-slate-200/60 rounded-xl"></div>
    </div>
  );
}

function ColumnError({ error, onRetry }) {
  return (
    <div className="p-8 bg-rose-50 border border-rose-200 rounded-xl text-center space-y-3">
      <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
      <h4 className="text-sm font-bold text-rose-800">Error al cargar datos del período</h4>
      <p className="text-xs text-rose-600 max-w-sm mx-auto">{error || 'No se pudieron consultar los subgráficos en SQL Server.'}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Reintentar
        </button>
      )}
    </div>
  );
}

function SubchartCard({ title, subtitle, badge, children, interpretation }) {
  return (
    <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-2xs space-y-2">
      <div className="flex items-start justify-between gap-2 mb-1">
        <div>
          <h4 className="font-bold text-xs text-slate-800">{title}</h4>
          {subtitle && <p className="text-[11px] text-slate-400">{subtitle}</p>}
        </div>
        {badge && (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
            {badge}
          </span>
        )}
      </div>
      <div>{children}</div>
      {interpretation && (
        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-start gap-1.5 text-[10.5px] text-slate-500">
          <Sparkles className="w-3 h-3 text-blue-500 shrink-0 mt-0.5" />
          <span>{interpretation}</span>
        </div>
      )}
    </div>
  );
}

export default function IndicatorCompareModal({
  indicatorId,
  initialPeriod = '2026-W37',
  canal = '',
  onClose,
}) {
  // Normalizar período A inicial
  const initNormA = useMemo(() => normalizarPeriodo(initialPeriod), [initialPeriod]);
  const defaultPeriodB = useMemo(() => {
    if (initNormA.tipo === 'week') {
      return obtenerSemanaAnterior(initNormA.valor);
    }
    return '2026-W36';
  }, [initNormA]);

  const [periodoA, setPeriodoA] = useState(initNormA);
  const [periodoB, setPeriodoB] = useState(normalizarPeriodo(defaultPeriodB));
  const [selectedCanal, setSelectedCanal] = useState(canal || '');

  const [dataA, setDataA] = useState(null);
  const [dataB, setDataB] = useState(null);
  const [deltas, setDeltas] = useState(null);
  const [kpisA, setKpisA] = useState(null);
  const [kpisB, setKpisB] = useState(null);

  const [loadingA, setLoadingA] = useState(true);
  const [loadingB, setLoadingB] = useState(true);
  const [errorA, setErrorA] = useState(null);
  const [errorB, setErrorB] = useState(null);

  // Pestaña en mobile ('a' | 'b' | 'summary')
  const [activeMobileTab, setActiveMobileTab] = useState('a');

  // Cache en memoria para evitar peticiones redundantes
  const cacheRef = useRef(new Map());

  // Tecla Esc para cerrar
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Cargar comparación de períodos
  const fetchComparison = useCallback(async (target = 'both') => {
    if (target === 'both' || target === 'a') {
      setLoadingA(true);
      setErrorA(null);
    }
    if (target === 'both' || target === 'b') {
      setLoadingB(true);
      setErrorB(null);
    }

    const normA = normalizarPeriodo(periodoA);
    const normB = normalizarPeriodo(periodoB);

    const cacheKey = `${indicatorId}_${selectedCanal}_${normA.tipo}_${normA.valor}_${normB.tipo}_${normB.valor}`;
    if (cacheRef.current.has(cacheKey)) {
      const cached = cacheRef.current.get(cacheKey);
      setDataA(cached.periodo_a?.subcharts || null);
      setDataB(cached.periodo_b?.subcharts || null);
      setKpisA(cached.periodo_a?.kpis_globales || null);
      setKpisB(cached.periodo_b?.kpis_globales || null);
      setDeltas(cached.deltas || null);
      setLoadingA(false);
      setLoadingB(false);
      return;
    }

    try {
      const params = {
        indicator_id: indicatorId,
        canal: selectedCanal,
        tipo_a: normA.tipo,
        periodo_a: normA.valor,
        tipo_b: normB.tipo,
        periodo_b: normB.valor,
      };

      const res = await api.dashboard.compare(params);
      if (res && res.success && res.data) {
        cacheRef.current.set(cacheKey, res.data);
        setDataA(res.data.periodo_a?.subcharts || null);
        setDataB(res.data.periodo_b?.subcharts || null);
        setKpisA(res.data.periodo_a?.kpis_globales || null);
        setKpisB(res.data.periodo_b?.kpis_globales || null);
        setDeltas(res.data.deltas || null);
      } else {
        throw new Error(res?.message || 'Error en respuesta del servidor.');
      }
    } catch (err) {
      console.error('Error al cargar comparativa de períodos:', err);
      if (target === 'both' || target === 'a') {
        setErrorA(err.message || 'Error al obtener datos del Período A');
      }
      if (target === 'both' || target === 'b') {
        setErrorB(err.message || 'Error al obtener datos del Período B');
      }
    } finally {
      if (target === 'both' || target === 'a') setLoadingA(false);
      if (target === 'both' || target === 'b') setLoadingB(false);
    }
  }, [indicatorId, selectedCanal, periodoA, periodoB]);

  useEffect(() => {
    fetchComparison('both');
  }, [fetchComparison]);

  // Manejador cambio Período A
  const handlePeriodoAChange = (nuevoPeriodo) => {
    setPeriodoA(nuevoPeriodo);
  };

  // Manejador cambio Período B
  const handlePeriodoBChange = (nuevoPeriodo) => {
    setPeriodoB(nuevoPeriodo);
  };

  // Son iguales
  const sonIguales = useMemo(() => sonPeriodosIguales(periodoA, periodoB), [periodoA, periodoB]);

  // Título oficial por indicador
  const titles = {
    1: 'Indicador 1: Porcentaje de Órdenes Despachadas Exitosamente (PODE)',
    2: 'Indicador 2: Porcentaje de Error en Órdenes Registradas (PEOR)',
    3: 'Indicador 3: Porcentaje de Roturas de Stock Semanales (PRS)',
    4: 'Indicador 4: Tiempo de Búsqueda y Registro por Pedido (TBPP)',
  };

  // =========================================================================
  // CÁLCULO DE ESCALAS HOMÓLOGAS POR PAR DE SUBGRÁFICOS (yAxisMax / xAxisMax)
  // Cada par homólogo calcula su propio máximo para sincronizar columnas A y B
  // =========================================================================
  const scales = useMemo(() => {
    const sc = {};

    if (indicatorId === 1) {
      // Funnel
      const funnelA = Math.max(0, ...(dataA?.funnel || []).map(d => Number(d.valor) || 0));
      const funnelB = Math.max(0, ...(dataB?.funnel || []).map(d => Number(d.valor) || 0));
      sc.funnelMax = Math.max(funnelA, funnelB) > 0 ? Math.ceil(Math.max(funnelA, funnelB) * 1.1) : undefined;

      // By Day (Stacked Bar)
      const dayA = Math.max(0, ...(dataA?.by_day || []).map(d => (Number(d.exitosas) || 0) + (Number(d.fallidas) || 0)));
      const dayB = Math.max(0, ...(dataB?.by_day || []).map(d => (Number(d.exitosas) || 0) + (Number(d.fallidas) || 0)));
      sc.byDayMax = Math.max(dayA, dayB) > 0 ? Math.ceil(Math.max(dayA, dayB) * 1.15) : undefined;

      // SLA (Line)
      const slaA = Math.max(0, ...(dataA?.sla || []).map(d => Number(d.tiempo_promedio_min) || 0));
      const slaB = Math.max(0, ...(dataB?.sla || []).map(d => Number(d.tiempo_promedio_min) || 0));
      sc.slaMax = Math.ceil(Math.max(16, slaA, slaB) * 1.15);

      // Failure Reasons (Horizontal Bar)
      const failA = Math.max(0, ...(dataA?.failure_reasons || []).map(d => Number(d.total) || 0));
      const failB = Math.max(0, ...(dataB?.failure_reasons || []).map(d => Number(d.total) || 0));
      sc.failMax = Math.max(failA, failB) > 0 ? Math.ceil(Math.max(failA, failB) * 1.2) : undefined;
    }

    if (indicatorId === 2) {
      // IA vs Manual
      const iaA = Math.max(0, ...(dataA?.ia_vs_manual || []).map(d => Number(d.total) || 0));
      const iaB = Math.max(0, ...(dataB?.ia_vs_manual || []).map(d => Number(d.total) || 0));
      sc.iaMax = Math.max(iaA, iaB) > 0 ? Math.ceil(Math.max(iaA, iaB) * 1.2) : undefined;

      // By Stage (Area)
      const stageA = Math.max(0, ...(dataA?.by_stage || []).map(d => Number(d.total) || 0));
      const stageB = Math.max(0, ...(dataB?.by_stage || []).map(d => Number(d.total) || 0));
      sc.stageMax = Math.max(stageA, stageB) > 0 ? Math.ceil(Math.max(stageA, stageB) * 1.2) : undefined;
    }

    if (indicatorId === 3) {
      // Top Products
      const topA = Math.max(0, ...(dataA?.top_products || []).map(d => Number(d.total_quiebres) || 0));
      const topB = Math.max(0, ...(dataB?.top_products || []).map(d => Number(d.total_quiebres) || 0));
      sc.topMax = Math.max(topA, topB) > 0 ? Math.ceil(Math.max(topA, topB) * 1.2) : undefined;

      // Commercial Impact (Area)
      const impA = Math.max(0, ...(dataA?.commercial_impact || []).map(d => Number(d.monto_perdido) || 0));
      const impB = Math.max(0, ...(dataB?.commercial_impact || []).map(d => Number(d.monto_perdido) || 0));
      sc.impactMax = Math.max(impA, impB) > 0 ? Math.ceil(Math.max(impA, impB) * 1.15) : undefined;
    }

    if (indicatorId === 4) {
      // By Order Size (Scatter)
      const scattA = Math.max(0, ...(dataA?.by_order_size || []).map(d => Number(d.tiempo_seg) || 0));
      const scattB = Math.max(0, ...(dataB?.by_order_size || []).map(d => Number(d.tiempo_seg) || 0));
      sc.scatterMax = Math.ceil(Math.max(12, scattA, scattB) * 1.15);

      // Warehouse Zone
      const zoneA = Math.max(0, ...(dataA?.by_warehouse_zone || []).map(d => Number(d.tiempo_promedio_seg) || 0));
      const zoneB = Math.max(0, ...(dataB?.by_warehouse_zone || []).map(d => Number(d.tiempo_promedio_seg) || 0));
      sc.zoneMax = Math.max(zoneA, zoneB) > 0 ? Math.ceil(Math.max(zoneA, zoneB) * 1.2) : undefined;

      // Operator
      const opA = Math.max(0, ...(dataA?.by_operator || []).map(d => Number(d.tiempo_promedio_seg) || 0));
      const opB = Math.max(0, ...(dataB?.by_operator || []).map(d => Number(d.tiempo_promedio_seg) || 0));
      sc.opMax = Math.max(opA, opB) > 0 ? Math.ceil(Math.max(opA, opB) * 1.2) : undefined;

      // Ideal vs Real
      const idA = Math.max(0, ...(dataA?.ideal_vs_real || []).map(d => Math.max(Number(d.tiempo_real || d.tiempo_real_seg) || 0, Number(d.tiempo_ideal || d.tiempo_ideal_seg) || 0)));
      const idB = Math.max(0, ...(dataB?.ideal_vs_real || []).map(d => Math.max(Number(d.tiempo_real || d.tiempo_real_seg) || 0, Number(d.tiempo_ideal || d.tiempo_ideal_seg) || 0)));
      sc.lineMax = Math.max(idA, idB) > 0 ? Math.ceil(Math.max(idA, idB) * 1.15) : undefined;
    }

    return sc;
  }, [indicatorId, dataA, dataB]);

  // Renderizador de los 4 subgráficos para una columna dada
  const renderSubchartsColumn = (colData, colLetter, scaleObj) => {
    if (!colData) {
      return (
        <div className="py-20 text-center text-slate-400 text-xs">
          No hay datos disponibles para este período.
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* INDICADOR 1 (PODE) */}
        {indicatorId === 1 && (
          <>
            <SubchartCard
              title="Subgráfico A: Embudo de Conversión (Funnel)"
              subtitle="Recepción → Validación → Despacho"
              badge="Funnel"
              interpretation="Monitorea las órdenes que logran culminar el ciclo de despacho exitoso."
            >
              <FunnelChart data={colData.funnel || []} xAxisMax={scaleObj.funnelMax} />
            </SubchartCard>

            <SubchartCard
              title="Subgráfico B: Exitosas vs. Fallidas por Día"
              subtitle="Distribución temporal de órdenes"
              badge="Stacked Bar"
              interpretation="Relación de órdenes completas frente a cancelaciones operativas."
            >
              <StackedBarChart data={colData.by_day || []} yAxisMax={scaleObj.byDayMax} />
            </SubchartCard>

            <SubchartCard
              title="Subgráfico C: Cumplimiento de SLA (Validación → Despacho)"
              subtitle="Tiempo promedio en minutos (Meta: ≤ 15 min)"
              badge="Line Chart"
              interpretation="Tiempo transcurrido desde confirmación de pedido hasta entrega."
            >
              <LineChart data={colData.sla || []} yAxisMax={scaleObj.slaMax} />
            </SubchartCard>

            <SubchartCard
              title="Subgráfico D: Ranking de Causas de Fallo"
              subtitle="Motivos registrados en la anulación de órdenes"
              badge="Horizontal Bar"
              interpretation="Focaliza los motivos de rechazo o anulación de pedidos."
            >
              <HorizontalBarChart
                data={colData.failure_reasons || []}
                labelKey="motivo"
                valueKey="total"
                color="#ef4444"
                unit="ped."
                xAxisMax={scaleObj.failMax}
              />
            </SubchartCard>

            {/* Taxonomía de Despacho (si existe) */}
            {colData.dispatch_status && colData.dispatch_status.length > 0 && (
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-2">
                <h5 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Subgráfico E: Taxonomía y Estado Final</span>
                </h5>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {colData.dispatch_status.map((item, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg border bg-slate-50 border-slate-200 flex flex-col justify-between">
                      <span className="text-[10px] font-bold text-slate-600 uppercase truncate">
                        {item.estado.replace(/_/g, ' ')}
                      </span>
                      <div className="mt-1 flex items-baseline justify-between">
                        <span className="text-base font-extrabold font-mono text-slate-800">{item.total}</span>
                        <span className="text-[11px] font-bold font-mono text-slate-500">{item.porcentaje}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* INDICADOR 2 (PEOR) */}
        {indicatorId === 2 && (
          <>
            <SubchartCard
              title="Subgráfico A: Distribución por Tipología de Error"
              subtitle="Cantidad, producto, precio o digitación"
              badge="Donut"
              interpretation="Desagrega las inconsistencias detectadas en la toma de pedidos."
            >
              <DonutChart data={colData.by_type || []} />
            </SubchartCard>

            <SubchartCard
              title="Subgráfico B: Origen IA vs. Manual"
              subtitle="Órdenes con error según método de captura"
              badge="Stacked Bar"
              interpretation="Contraste de precisión entre Valencia AI y digitación manual."
            >
              <StackedBarChart data={colData.ia_vs_manual || []} isOrigin={true} yAxisMax={scaleObj.iaMax} />
            </SubchartCard>

            <SubchartCard
              title="Subgráfico C: Errores por Etapa Operativa"
              subtitle="Frecuencia según fase del flujo de pedido"
              badge="Area Chart"
              interpretation="Fase del proceso donde se suscita la inconsistencia."
            >
              <AreaChart data={colData.by_stage || []} isMoney={false} yAxisMax={scaleObj.stageMax} />
            </SubchartCard>

            <SubchartCard
              title="Subgráfico D: Tiempo Medio de Resolución"
              subtitle="Minutos promedio en subsanar inconsistencias (Meta: < 15 min)"
              badge="Gauge"
              interpretation="Agilidad en subsanar errores antes de la entrega física."
            >
              <GaugeChart
                value={colData.resolution_time?.tiempo_promedio_min || 8.5}
                max={15}
                label="Minutos Promedio"
                unit=" min"
              />
            </SubchartCard>
          </>
        )}

        {/* INDICADOR 3 (PRS) */}
        {indicatorId === 3 && (
          <>
            <SubchartCard
              title="Subgráfico A: Top 10 Productos con Mayor Quiebre"
              subtitle="Incidentes de rotura y pedidos no atendidos por stock físico"
              badge="Horizontal Bar"
              interpretation="Artículos que sufrieron falta de existencias en el almacén."
            >
              <HorizontalBarChart
                data={colData.top_products || []}
                labelKey="producto"
                unit="unid."
                customSeries={[
                  {
                    name: 'Quiebres Registrados',
                    data: (colData.top_products || []).map((d) => Number(d.total_quiebres) || 0),
                  },
                ]}
                customColors={['#f97316']}
                xAxisMax={scaleObj.topMax}
              />
            </SubchartCard>

            <SubchartCard
              title="Subgráfico B: Concentración por Categoría"
              subtitle="Distribución de quiebres físicos según familia de artículos"
              badge="Pie Chart"
              interpretation="Líneas de productos con mayor vulnerabilidad de existencias."
            >
              <PieChart data={colData.by_category || []} />
            </SubchartCard>

            <SubchartCard
              title="Subgráfico C: Impacto Comercial por Quiebre"
              subtitle="Pérdida económica en Soles (PEN) por falta de inventario"
              badge="Area Chart"
              interpretation="Ventas perdidas asociadas directamente al desabastecimiento."
            >
              <AreaChart data={colData.commercial_impact || []} isMoney={true} yAxisMax={scaleObj.impactMax} />
            </SubchartCard>

            <SubchartCard
              title="Subgráfico D: Top Alertas Stock Crítico vs Mínimo"
              subtitle="Existencias físicas en zona de riesgo de seguridad"
              badge="Dual Bar"
              interpretation="Monitoreo preventivo antes de alcanzar quiebre total."
            >
              <HorizontalBarChart
                data={colData.critical_alerts || []}
                labelKey="ProductoNombre"
                unit="unid."
                customSeries={[
                  {
                    name: 'Stock Físico Actual',
                    data: (colData.critical_alerts || []).map((d) => Number(d.ProductoStockActual) || 0),
                  },
                  {
                    name: 'Stock Mínimo Requerido',
                    data: (colData.critical_alerts || []).map((d) => Number(d.ProductoStockMinimo) || 0),
                  },
                ]}
                customColors={['#eab308', '#ef4444']}
              />
            </SubchartCard>
          </>
        )}

        {/* INDICADOR 4 (TBPP) */}
        {indicatorId === 4 && (
          <>
            <SubchartCard
              title="Subgráfico A: Ítems del Pedido vs. Tiempo"
              subtitle="Dispersión cronometrada respecto al volumen de ítems"
              badge="Scatter"
              interpretation="Escalamiento y correlación entre ítems y tiempo de picking."
            >
              <ScatterChart data={colData.by_order_size || []} yAxisMax={scaleObj.scatterMax} />
            </SubchartCard>

            <SubchartCard
              title="Subgráfico B: Tiempo por Zona de Almacén"
              subtitle="Segundos de búsqueda promedio según ubicación física"
              badge="Horizontal Bar"
              interpretation="Eficiencia de recorrido por pasillos y sectores del almacén."
            >
              <HorizontalBarChart
                data={colData.by_warehouse_zone || []}
                labelKey="zona"
                valueKey="tiempo_promedio_seg"
                color="#2563eb"
                unit="seg"
                xAxisMax={scaleObj.zoneMax}
              />
            </SubchartCard>

            <SubchartCard
              title="Subgráfico C: Comparativa por Operario/Turno"
              subtitle="Velocidad y agilidad de registro según usuario"
              badge="Horizontal Bar"
              interpretation="Uniformidad de desempeño del personal asistido por IA."
            >
              <HorizontalBarChart
                data={colData.by_operator || []}
                labelKey="operario"
                valueKey="tiempo_promedio_seg"
                color="#3b82f6"
                unit="seg"
                xAxisMax={scaleObj.opMax}
              />
            </SubchartCard>

            <SubchartCard
              title="Subgráfico D: Tiempo Ideal vs. Tiempo Real"
              subtitle="Estándar manual teórico vs cronómetro real asistido por IA"
              badge="Line Chart"
              interpretation="Ahorro directo frente al cálculo estándar tradicional."
            >
              <LineChart data={colData.ideal_vs_real || []} isIdealVsReal={true} yAxisMax={scaleObj.lineMax} />
            </SubchartCard>
          </>
        )}
      </div>
    );
  };

  // KPIs oficiales calculados (para tarjetas inferiores)
  const kpiVariations = useMemo(() => {
    const list = [
      { key: 'pode', label: 'PODE', desc: 'Órdenes Despachadas', meta: '≥ 95%', unit: 'pp', mayorEsMejor: true },
      { key: 'peor', label: 'PEOR', desc: 'Error en Órdenes', meta: '≤ 1%', unit: 'pp', mayorEsMejor: false },
      { key: 'prs',  label: 'PRS',  desc: 'Roturas de Stock', meta: '≤ 2%', unit: 'pp', mayorEsMejor: false },
      { key: 'tbpp', label: 'TBPP', desc: 'Tiempo Búsqueda', meta: '≤ 10s', unit: 's',  mayorEsMejor: false },
    ];

    return list.map((item) => {
      let valA = 0;
      let valB = 0;
      let diff = 0;
      let favorable = false;
      let esEstable = true;
      let formattedDiff = `0.0 ${item.unit}`;

      if (deltas && deltas[item.key]) {
        const d = deltas[item.key];
        valA = Number(d.val_a) || 0;
        valB = Number(d.val_b) || 0;
        diff = Number(d.diff) || 0;
        favorable = Boolean(d.favorable);
        esEstable = Boolean(d.es_estable) || Math.abs(diff) < 0.001;
        formattedDiff = `${diff > 0 ? '+' : ''}${diff.toFixed(1)} ${item.unit}`;
      } else if (kpisA && kpisB) {
        valA = Number(kpisA[item.key]) || 0;
        valB = Number(kpisB[item.key]) || 0;
        const calc = calcularVariacionKpi(valA, valB, item.key.toUpperCase());
        diff = calc.diff;
        favorable = calc.favorable;
        esEstable = calc.esEstable;
        formattedDiff = calc.formattedDiff;
      }

      return {
        ...item,
        valA,
        valB,
        diff,
        favorable,
        esEstable,
        formattedDiff,
      };
    });
  }, [deltas, kpisA, kpisB]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/65 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-7xl max-h-[96vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* ================================================================= */}
        {/* CABECERA DEL MODAL COMPARATIVO                                   */}
        {/* ================================================================= */}
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs">
              <GitCompare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-extrabold text-slate-800 tracking-tight">
                  Comparación de Subgráficos por Período
                </h3>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800 border border-blue-200">
                  {indicatorId === 1 ? 'PODE' : indicatorId === 2 ? 'PEOR' : indicatorId === 3 ? 'PRS' : 'TBPP'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 truncate max-w-xl">
                {titles[indicatorId]}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Filtro Canal Compartido */}
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs shadow-2xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedCanal}
                onChange={(e) => setSelectedCanal(e.target.value)}
                className="bg-transparent font-medium text-slate-700 outline-none cursor-pointer"
                title="Filtro de canal aplicado simultáneamente a ambos períodos"
              >
                <option value="">Todos los Canales</option>
                <option value="CNL-00001">Tienda Presencial</option>
                <option value="CNL-00002">Canal Web / App</option>
                <option value="CNL-00003">WhatsApp Comercial</option>
              </select>
            </div>

            {/* Botón Imprimir / PDF */}
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-700 font-semibold px-3 py-1.5 rounded-lg border border-slate-200 text-xs transition shadow-2xs print:hidden"
              title="Imprimir reporte comparativo en PDF o papel"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Imprimir / PDF</span>
            </button>

            {/* Botón Cerrar */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition print:hidden"
              title="Cerrar ventana comparativa (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* BANNER DE AVISO SI LOS PERÍODOS SON IDÉNTICOS                    */}
        {/* ================================================================= */}
        {sonIguales && (
          <div className="bg-amber-50 border-b border-amber-200 px-5 py-2 flex items-center gap-2 text-xs text-amber-800">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Períodos idénticos:</strong> Los períodos seleccionados en A y B abarcan el mismo rango de fechas. Las variaciones porcentuales (Δ) se reflejan en 0.0.
            </span>
          </div>
        )}

        {/* ================================================================= */}
        {/* BARRA DE TABS EXCLUSIVA PARA MÓVIL (< 1024px)                     */}
        {/* ================================================================= */}
        <div className="lg:hidden border-b border-slate-200 bg-slate-100/80 px-4 py-2 flex items-center justify-around text-xs">
          <button
            type="button"
            onClick={() => setActiveMobileTab('a')}
            className={`flex-1 py-1.5 text-center font-bold rounded-lg transition ${
              activeMobileTab === 'a'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            Período A (Base)
          </button>
          <button
            type="button"
            onClick={() => setActiveMobileTab('b')}
            className={`flex-1 py-1.5 text-center font-bold rounded-lg transition ${
              activeMobileTab === 'b'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            Período B (Comp.)
          </button>
          <button
            type="button"
            onClick={() => setActiveMobileTab('summary')}
            className={`flex-1 py-1.5 text-center font-bold rounded-lg transition ${
              activeMobileTab === 'summary'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            Resumen Δ
          </button>
        </div>

        {/* ================================================================= */}
        {/* CONTENIDO PRINCIPAL: DOS COLUMNAS LADO A LADO                    */}
        {/* ================================================================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            
            {/* ------------------------------------------------------------- */}
            {/* COLUMNA IZQUIERDA: PERÍODO A (REFERENCIA / BASE)              */}
            {/* ------------------------------------------------------------- */}
            <div className={`space-y-4 ${activeMobileTab !== 'a' ? 'hidden lg:block' : ''}`}>
              <div className="p-3.5 bg-blue-50/50 border border-blue-200 rounded-xl shadow-2xs">
                <PeriodSelector
                  label="Período A (Referencia / Base)"
                  theme="blue"
                  value={periodoA}
                  onChange={handlePeriodoAChange}
                />
              </div>

              {loadingA ? (
                <ColumnSkeleton label="Período A" />
              ) : errorA ? (
                <ColumnError error={errorA} onRetry={() => fetchComparison('a')} />
              ) : (
                renderSubchartsColumn(dataA, 'A', scales)
              )}
            </div>

            {/* ------------------------------------------------------------- */}
            {/* COLUMNA DERECHA: PERÍODO B (COMPARACIÓN)                     */}
            {/* ------------------------------------------------------------- */}
            <div className={`space-y-4 ${activeMobileTab !== 'b' ? 'hidden lg:block' : ''}`}>
              <div className="p-3.5 bg-amber-50/50 border border-amber-200 rounded-xl shadow-2xs">
                <PeriodSelector
                  label="Período B (Comparación)"
                  theme="amber"
                  value={periodoB}
                  onChange={handlePeriodoBChange}
                />
              </div>

              {loadingB ? (
                <ColumnSkeleton label="Período B" />
              ) : errorB ? (
                <ColumnError error={errorB} onRetry={() => fetchComparison('b')} />
              ) : (
                renderSubchartsColumn(dataB, 'B', scales)
              )}
            </div>

          </div>

          {/* =============================================================== */}
          {/* RESUMEN DE VARIACIONES GLOBALES (DELTA BANNER / BOTTOM CARDS)   */}
          {/* =============================================================== */}
          <div className={`${activeMobileTab !== 'summary' ? 'hidden lg:block' : ''} pt-2`}>
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-slate-900 text-white rounded-lg">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-slate-800">
                      Resumen Ejecutivo de Variación (Δ = Período B − Período A)
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Impacto comparativo en los 4 Indicadores Clave de Desempeño de la Tesis.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[11px] font-semibold">
                  <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                    A: {periodoA?.label || periodoA?.valor}
                  </span>
                  <span className="text-slate-400">vs</span>
                  <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                    B: {periodoB?.label || periodoB?.valor}
                  </span>
                </div>
              </div>

              {/* Grid 4 Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {kpiVariations.map((kpi) => {
                  const isPos = kpi.diff > 0;
                  const isNeg = kpi.diff < 0;

                  const badgeClass = kpi.esEstable
                    ? 'bg-slate-100 text-slate-700 border-slate-200'
                    : kpi.favorable
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200';

                  const badgeLabel = kpi.esEstable
                    ? 'Estable'
                    : kpi.favorable
                    ? 'Favorable'
                    : 'Desfavorable';

                  return (
                    <div
                      key={kpi.key}
                      className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between hover:bg-slate-50 transition"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-xs text-slate-800">{kpi.label}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeClass}`}>
                            {badgeLabel}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">{kpi.desc}</p>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-200/80 flex items-baseline justify-between">
                        <div className="text-xs font-mono">
                          <span className="text-slate-500">A: </span>
                          <strong className="text-slate-800">{kpi.valA.toFixed(1)}</strong>
                          <span className="mx-1.5 text-slate-300">|</span>
                          <span className="text-slate-500">B: </span>
                          <strong className="text-slate-800">{kpi.valB.toFixed(1)}</strong>
                        </div>

                        <div className="flex items-center gap-1 font-mono font-extrabold text-xs">
                          {kpi.esEstable ? (
                            <Minus className="w-3.5 h-3.5 text-slate-400" />
                          ) : isPos ? (
                            <TrendingUp className={`w-3.5 h-3.5 ${kpi.favorable ? 'text-emerald-600' : 'text-rose-600'}`} />
                          ) : (
                            <TrendingDown className={`w-3.5 h-3.5 ${kpi.favorable ? 'text-emerald-600' : 'text-rose-600'}`} />
                          )}
                          <span className={kpi.esEstable ? 'text-slate-500' : kpi.favorable ? 'text-emerald-700' : 'text-rose-700'}>
                            {kpi.formattedDiff}
                          </span>
                        </div>
                      </div>

                      <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between">
                        <span>Meta: {kpi.meta}</span>
                        <span className="font-semibold text-slate-500">
                          {kpi.favorable && !kpi.esEstable ? 'Cumple / Mejora' : kpi.esEstable ? 'Sin variación' : 'Requiere atención'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-500 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>
                  <strong>Análisis Automatizado: </strong>
                  La comparativa entre períodos permite aislar el impacto operativo de Valencia AI. Las variaciones en <strong>pp</strong> (puntos porcentuales) reflejan saltos directos de efectividad, mientras que <strong>s</strong> (segundos) mide la agilidad en picking y registro.
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
