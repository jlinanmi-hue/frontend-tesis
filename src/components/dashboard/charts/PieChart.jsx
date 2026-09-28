import SafeApexChart from './SafeApexChart';

export default function PieChart({ data = [] }) {
  const labels = data.map(d => d.categoria || d.tipo || 'General');
  const series = data.map(d => Number(d.total) || 0);

  const options = {
    chart: {
      type: 'pie',
      toolbar: { show: false },
    },
    labels: labels.length ? labels : ['Sin datos'],
    colors: ['#f97316', '#3b82f6', '#10b981', '#a855f7', '#ec4899'],
    legend: {
      position: 'bottom',
      fontSize: '11px',
    },
    dataLabels: {
      enabled: true,
      formatter: (val) => `${Math.round(val)}%`,
    },
  };

  const chartSeries = series.length ? series : [1];

  return (
    <div className="w-full">
      <SafeApexChart options={options} series={chartSeries} type="pie" height={260} width="100%" />
    </div>
  );
}
