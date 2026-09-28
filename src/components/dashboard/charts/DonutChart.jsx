import React from 'react';
import SafeApexChart from './SafeApexChart';

export default function DonutChart({ data = [] }) {
  const labels = data.map(d => d.tipo || d.categoria || d.etapa || 'Otro');
  const series = data.map(d => Number(d.total) || 0);
  const totalIncidencias = series.reduce((a, b) => a + b, 0);

  const colors = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6'];

  const options = {
    chart: {
      type: 'donut',
      toolbar: { show: false },
    },
    labels: labels.length ? labels : ['Sin datos'],
    colors: colors,
    legend: {
      position: 'bottom',
      fontSize: '11px',
      formatter: (seriesName, opts) => {
        const val = opts.w.globals.series[opts.seriesIndex];
        const pct = totalIncidencias > 0 ? Math.round((val / totalIncidencias) * 100) : 0;
        return `${seriesName}: ${val} (${pct}%)`;
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (val) => `${Math.round(val)}%`,
      style: { fontSize: '11px', fontWeight: 'bold' },
    },
    tooltip: {
      y: {
        formatter: (val) => `${val} incidencias registradas`,
      },
    },
    plotOptions: {
      pie: {
        donut: {
          size: '65%',
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Total Incidencias',
              fontSize: '11px',
              color: '#64748b',
              formatter: () => `${totalIncidencias}`,
            },
          },
        },
      },
    },
  };

  const chartSeries = series.length ? series : [1];

  return (
    <div className="w-full">
      <SafeApexChart options={options} series={chartSeries} type="donut" height={240} width="100%" />
      {data.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-100">
          {data.map((item, idx) => {
            const val = Number(item.total) || 0;
            const pct = totalIncidencias > 0 ? Math.round((val / totalIncidencias) * 100) : 0;
            const color = colors[idx % colors.length];
            return (
              <div key={idx} className="bg-slate-50 p-2 rounded-lg border border-slate-100 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <div className="min-w-0 flex-1">
                  <span className="text-[10.5px] font-medium text-slate-700 block truncate">{item.tipo || item.categoria}</span>
                  <span className="text-[10px] text-slate-500 font-bold">{val} err. <span className="text-blue-600 font-normal">({pct}%)</span></span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
