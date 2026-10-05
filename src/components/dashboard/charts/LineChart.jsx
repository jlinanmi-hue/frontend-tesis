import SafeApexChart from './SafeApexChart';

export default function LineChart({ data = [], isIdealVsReal = false, yAxisMax = undefined }) {
  let categories = [];
  let series = [];

  if (isIdealVsReal) {
    categories = data.map(d => d.dia_formateado || d.dia_nombre || (d.fecha ? d.fecha.substring(5) : ''));
    series = [
      {
        name: 'Tiempo Real IA',
        data: data.map(d => Number(d.tiempo_real || d.tiempo_real_seg) || 0),
      },
      {
        name: 'Estándar Ideal',
        data: data.map(d => Number(d.tiempo_ideal || d.tiempo_ideal_seg) || 0),
      },
    ];
  } else {
    // Cumplimiento SLA
    categories = data.map(d => d.dia_formateado || d.dia_nombre || (d.fecha ? d.fecha.substring(5) : ''));
    series = [
      {
        name: 'Tiempo Promedio (min)',
        data: data.map(d => Number(d.tiempo_promedio_min) || 0),
      },
    ];
  }

  const options = {
    chart: {
      type: 'line',
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    colors: isIdealVsReal ? ['#4f46e5', '#94a3b8'] : ['#2563eb'],
    stroke: {
      curve: 'smooth',
      width: [2.5, 2],
      dashArray: isIdealVsReal ? [0, 4] : [0],
    },
    markers: { size: 5, hover: { size: 7 } },
    annotations: !isIdealVsReal ? {
      yaxis: [
        {
          y: 15,
          borderColor: '#ef4444',
          strokeDashArray: 4,
          borderWidth: 2,
          label: {
            borderColor: '#ef4444',
            style: {
              color: '#fff',
              background: '#ef4444',
              fontSize: '10.5px',
              fontWeight: 700,
            },
            text: 'Meta SLA: ≤ 15 min',
          },
        },
      ],
    } : undefined,
    xaxis: {
      categories: categories,
      labels: {
        style: { fontSize: '11px', colors: '#64748b' },
      },
    },
    yaxis: {
      title: {
        text: isIdealVsReal ? 'Segundos' : 'Minutos',
        style: { fontSize: '11px', fontWeight: 600, color: '#64748b' },
      },
      labels: {
        style: { fontSize: '11px', colors: '#64748b' },
        formatter: (val) => `${Math.round(val)}${isIdealVsReal ? 's' : 'm'}`,
      },
      ...(yAxisMax !== undefined && yAxisMax !== null ? { max: yAxisMax } : {}),
    },
    legend: {
      position: 'top',
      fontSize: '12px',
      fontWeight: 600,
    },
    dataLabels: {
      enabled: true,
      formatter: (val) => `${Number(val).toFixed(0)}${isIdealVsReal ? 's' : 'm'}`,
      style: { fontSize: '10px', fontWeight: 'bold' },
      background: { enabled: true, borderRadius: 3, opacity: 0.8 },
    },
    tooltip: {
      y: {
        formatter: (val) => `${val} ${isIdealVsReal ? 'segundos' : 'minutos'}`,
      },
    },
  };

  return (
    <div className="w-full">
      <SafeApexChart options={options} series={series} type="line" height={260} width="100%" />
    </div>
  );
}
