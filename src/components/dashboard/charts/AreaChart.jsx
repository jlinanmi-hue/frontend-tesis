import React from 'react';
import SafeApexChart from './SafeApexChart';

export default function AreaChart({ data = [], isMoney = false, yAxisMax = undefined }) {
  const categories = data.map(d => d.etapa || (d.fecha ? d.fecha.substring(5) : ''));
  const hasCommercial = data.length > 0 && data.some(d => d.monto_perdido !== undefined || d.monto_salvado !== undefined);

  let series = [];
  let colors = [];

  if (hasCommercial) {
    series = [
      {
        name: 'Pérdida Comercial (S/)',
        data: data.map(d => Number(d.monto_perdido) || 0),
      },
      {
        name: 'Pedidos en Quiebre (Cant.)',
        data: data.map(d => Number(d.pedidos_afectados ?? (d.monto_perdido > 0 ? 1 : 0)) || 0),
      },
    ];
    colors = ['#ef4444', '#6366f1'];
  } else {
    const values = data.map(d => Number(d.total || d.monto_perdido) || 0);
    series = [{ name: isMoney ? 'Pérdida Comercial' : 'Errores', data: values }];
    colors = [isMoney ? '#ef4444' : '#8b5cf6'];
  }

  const options = {
    chart: {
      type: 'area',
      toolbar: { show: false },
    },
    colors: colors,
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.5,
        opacityTo: 0.05,
      },
    },
    xaxis: {
      categories: categories,
      labels: { style: { fontSize: '11px', colors: '#64748b' } },
    },
    yaxis: {
      labels: {
        style: { fontSize: '11px', colors: '#64748b' },
        formatter: (val) => isMoney ? `S/ ${val}` : `${val}`,
      },
      ...(yAxisMax !== undefined && yAxisMax !== null ? { max: yAxisMax } : {}),
    },
    tooltip: {
      y: {
        formatter: (val, opts) => {
          if (hasCommercial && opts && opts.seriesIndex !== undefined) {
            return opts.seriesIndex === 0 ? `S/ ${Number(val).toFixed(2)}` : `${val} pedidos`;
          }
          return isMoney ? `S/ ${Number(val).toFixed(2)}` : `${val} eventos`;
        },
      },
    },
    legend: {
      show: hasCommercial,
      position: 'top',
      horizontalAlign: 'right',
      fontSize: '11px',
    },
  };

  return (
    <div className="w-full">
      <SafeApexChart options={options} series={series} type="area" height={260} width="100%" />
    </div>
  );
}
