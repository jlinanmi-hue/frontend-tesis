import React, { useState, useMemo } from 'react';
import { TrendingUp, ArrowUpRight, ArrowDownRight, Layers } from 'lucide-react';
import SafeApexChart from '../charts/SafeApexChart';

export default function EvolucionSemanalChart({ evolucionData }) {
  const [selectedKpi, setSelectedKpi] = useState('pode');

  const semanas = evolucionData?.semanas || ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'];
  const seriesData = evolucionData?.series || {
    pode: [88.0, 91.0, 93.0, 95.2],
    tbpp: [65.0, 52.0, 47.0, 43.0],
    peor: [3.2, 2.5, 1.8, 1.4],
    prs: [4.0, 3.2, 2.5, 2.0],
  };
  const referenciaData = evolucionData?.referencia || {
    pode: 88.0,
    tbpp: 65.0,
    peor: 3.2,
    prs: 4.0,
  };

  const kpiConfigs = {
    pode: {
      label: 'Entregas a Tiempo (PODE)',
      unit: '%',
      color: '#10B981',
      meta: 95,
      metaLabel: 'Meta: ≥ 95%',
      subtitulo: 'Porcentaje de pedidos completados sin incidencias.',
      fraseFavorable: 'Tendencia favorable: el cumplimiento creció sostenidamente durante el mes.',
      fraseDesfavorable: 'Atención: el cumplimiento de entregas mostró retrocesos en semanas recientes.',
      isInverted: false,
    },
    tbpp: {
      label: 'Tiempo de Registro (TBPP)',
      unit: 's',
      color: '#6366F1',
      meta: 180,
      metaLabel: 'Meta: ≤ 180s',
      subtitulo: 'Segundos promedio dedicados a registrar cada pedido con IA.',
      fraseFavorable: 'Agilidad optimizada: el tiempo de captura se redujo notablemente con asistencia de IA.',
      fraseDesfavorable: 'Atención: los tiempos de registro aumentaron en los últimos días.',
      isInverted: true,
    },
    prs: {
      label: 'Quiebres de Stock (PRS)',
      unit: '%',
      color: '#EC4899',
      meta: 3,
      metaLabel: 'Meta: ≤ 3%',
      subtitulo: 'Falta de inventario en preparación semanal.',
      fraseFavorable: 'Inventario estable: los quiebres de producto se mantienen bajo control.',
      fraseDesfavorable: 'Alerta: aumento en quiebres de inventario durante el período analizado.',
      isInverted: true,
    },
  };

  const cfg = kpiConfigs[selectedKpi] || kpiConfigs.pode;
  const currentValues = seriesData[selectedKpi] || [0, 0, 0, 0];
  const refValue = referenciaData[selectedKpi] ?? currentValues[0];
  const lastValue = currentValues[currentValues.length - 1] ?? refValue;
  const diff = Number((lastValue - refValue).toFixed(1));
  const esFavorable = cfg.isInverted ? diff <= 0 : diff >= 0;

  const chartSeries = useMemo(() => [
    {
      name: cfg.label,
      data: currentValues,
    },
    {
      name: 'Referencia Inicial (Sem 1)',
      data: semanas.map(() => refValue),
    },
  ], [cfg.label, currentValues, semanas, refValue]);

  const chartOptions = useMemo(() => ({
    chart: {
      type: 'area',
      toolbar: { show: false },
      zoom: { enabled: false },
      sparkline: { enabled: false },
    },
    colors: [cfg.color, '#94A3B8'],
    stroke: {
      curve: 'smooth',
      width: [3, 2],
      dashArray: [0, 5],
    },
    fill: {
      type: ['gradient', 'solid'],
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.45,
        opacityTo: 0.05,
      },
      opacity: [1, 0.2],
    },
    markers: {
      size: [5, 0],
      colors: [cfg.color],
      strokeColors: '#fff',
      strokeWidth: 2,
      hover: { size: 7 },
    },
    dataLabels: {
      enabled: false,
    },
    xaxis: {
      categories: semanas,
      labels: {
        style: { fontSize: '11px', colors: '#64748B', fontWeight: 600 },
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        style: { fontSize: '11px', colors: '#64748B' },
        formatter: (val) => `${val}${cfg.unit}`,
      },
    },
    grid: {
      borderColor: '#F1F5F9',
      strokeDashArray: 4,
    },
    tooltip: {
      y: {
        formatter: (val) => `${val} ${cfg.unit}`,
      },
    },
    legend: {
      show: true,
      position: 'top',
      horizontalAlign: 'right',
      fontSize: '11px',
      markers: { width: 8, height: 8, radius: 12 },
    },
  }), [cfg.color, cfg.unit, semanas]);

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4 min-w-0 overflow-hidden">
      {/* Cabecera y Selector de KPI */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200/70">
              <TrendingUp className="w-4 h-4" />
            </span>
            <h3 className="text-base font-bold text-slate-800">
              Evolución Semanal de la Operación
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {cfg.subtitulo}
          </p>
        </div>

        {/* Selector de Indicador */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200/80">
          {Object.entries(kpiConfigs).map(([key, item]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedKpi(key)}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                selectedKpi === key
                  ? 'bg-white text-slate-800 shadow-2xs border border-slate-200/80'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {key.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Gráfico Apex */}
      <div className="w-full">
        <SafeApexChart
          options={chartOptions}
          series={chartSeries}
          type="area"
          height={260}
          width="100%"
        />
      </div>

      {/* Frase de Cierre Interpretada */}
      <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-slate-600">
          <span className={`w-2 h-2 rounded-full ${esFavorable ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          <span className="font-medium">
            {esFavorable ? cfg.fraseFavorable : cfg.fraseDesfavorable}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-slate-400 font-medium">Variación acumulada:</span>
          <span
            className={`font-mono font-bold px-2 py-0.5 rounded-md flex items-center gap-0.5 ${
              esFavorable
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}
          >
            {esFavorable ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {diff > 0 ? `+${diff}` : diff}
            {cfg.unit} vs Sem 1
          </span>
        </div>
      </div>
    </div>
  );
}
