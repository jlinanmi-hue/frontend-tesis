import SafeApexChart from './SafeApexChart';

export default function HorizontalBarChart({
  data = [],
  labelKey = 'motivo',
  valueKey = 'total',
  color = '#ef4444',
  customSeries = null,
  customColors = null,
  isStacked = false,
  height = 260,
  unit = '',
  xAxisMax = undefined,
}) {
  const categories = data.map(d => d[labelKey] || d.producto || d.zona || d.operario || d.ProductoNombre || '');
  const series = customSeries || [
    {
      name: 'Cantidad',
      data: data.map(d => Number(d[valueKey] || d.total_quiebres || d.tiempo_promedio_seg || d.ProductoStockActual) || 0),
    },
  ];
  const colors = customColors || [color];

  const options = {
    chart: {
      type: 'bar',
      stacked: isStacked,
      toolbar: { show: false },
    },
    plotOptions: {
      bar: {
        borderRadius: 4,
        horizontal: true,
        barHeight: '65%',
      },
    },
    colors: colors,
    dataLabels: {
      enabled: !isStacked,
      textAnchor: 'start',
      style: { colors: ['#1e293b'], fontSize: '11px', fontWeight: 'bold' },
      formatter: (val) => unit ? `${val} ${unit}` : `${val}`,
      offsetX: 5,
    },
    xaxis: {
      categories: categories,
      labels: { style: { fontSize: '11px', colors: '#64748b' } },
      ...(xAxisMax !== undefined && xAxisMax !== null ? { max: xAxisMax } : {}),
    },
    yaxis: {
      labels: {
        style: { fontSize: '11px', colors: '#64748b' },
        maxWidth: 160,
      },
    },
    tooltip: {
      y: {
        formatter: (val) => unit ? `${val} ${unit}` : `${val}`,
      },
    },
    legend: {
      show: series.length > 1,
      position: 'top',
      horizontalAlign: 'right',
      fontSize: '11px',
    },
  };

  return (
    <div className="w-full">
      <SafeApexChart options={options} series={series} type="bar" height={height} width="100%" />
    </div>
  );
}
