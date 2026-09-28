import SafeApexChart from './SafeApexChart';

export default function FunnelChart({ data = [] }) {
  const categories = data.map(d => d.etapa_nombre || d.etapa || '');
  const values = data.map(d => Number(d.valor) || 0);

  const options = {
    chart: {
      type: 'bar',
      toolbar: { show: false },
    },
    plotOptions: {
      bar: {
        borderRadius: 6,
        horizontal: true,
        distributed: true,
        barHeight: '75%',
        isFunnel: true,
      },
    },
    colors: ['#3b82f6', '#6366f1', '#8b5cf6', '#10b981'],
    dataLabels: {
      enabled: true,
      formatter: (val, opt) => {
        const item = data[opt.dataPointIndex];
        return `${item?.etapa_nombre || item?.etapa || ''}: ${val} (${item?.porcentaje ?? 0}%)`;
      },
      style: {
        fontSize: '11.5px',
        fontWeight: 'bold',
        colors: ['#fff'],
      },
      dropShadow: { enabled: true, top: 1, left: 1, blur: 1, opacity: 0.4 },
    },
    xaxis: {
      categories: categories,
      labels: { show: false },
    },
    legend: { show: false },
    tooltip: {
      y: {
        formatter: (val) => `${val} pedidos`,
      },
    },
  };

  const series = [{ name: 'Órdenes', data: values }];

  return (
    <div className="w-full">
      <SafeApexChart options={options} series={series} type="bar" height={220} width="100%" />
      {data.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-100">
          {data.map((item, idx) => (
            <div key={idx} className="bg-slate-50 p-2 rounded-lg text-center border border-slate-100">
              <span className="text-[10px] text-slate-500 font-medium block truncate">
                {item.etapa_nombre || item.etapa}
              </span>
              <span className="text-sm font-bold text-slate-800">
                {item.valor} <span className="text-[10px] font-normal text-slate-400">pedidos</span>
              </span>
              <span className="text-[10px] text-blue-600 font-semibold block">
                {item.porcentaje}% retención
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
