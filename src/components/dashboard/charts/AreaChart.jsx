import React from 'react';
import SafeApexChart from './SafeApexChart';

export default function AreaChart({ data = [], isMoney = false }) {
  const categories = data.map(d => d.etapa || (d.fecha ? d.fecha.substring(5) : ''));
  const hasSalvadas = data.length > 0 && data.some(d => d.monto_salvado !== undefined);

  let series = [];
  let colors = [];

  if (hasSalvadas) {
    series = [
      {
        name: 'Órdenes Salvadas (Stock Virtual)',
        data: data.map(d => Number(d.monto_salvado) || 0),
      },
      {
        name: 'Pérdida por Quiebre (Rotura Fatal)',
        data: data.map(d => Number(d.monto_perdido) || 0),
      },
    ];
    colors = ['#10b981', '#ef4444'];
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
    },
    tooltip: {
      y: {
        formatter: (val) => isMoney ? `S/ ${Number(val).toFixed(2)}` : `${val} eventos`,
      },
    },
    legend: {
      show: hasSalvadas,
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
