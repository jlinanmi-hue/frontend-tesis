import SafeApexChart from './SafeApexChart';
import { Bot, User } from 'lucide-react';

export default function StackedBarChart({ data = [], isOrigin = false, yAxisMax = undefined }) {
  // Manejo de datos según sea origen (IA vs Manual) o serie temporal (by_day)
  let categories = [];
  let series = [];

  if (isOrigin) {
    categories = data.map(d => d.nombre || d.origen || '');
    series = [
      {
        name: 'Errores Detectados',
        data: data.map(d => Number(d.total) || 0),
      },
    ];
  } else {
    categories = data.map(d => d.dia_formateado || d.dia_nombre || (d.fecha ? d.fecha.substring(5) : ''));
    series = [
      {
        name: 'Exitosas (Entregadas)',
        data: data.map(d => Number(d.exitosas) || 0),
      },
      {
        name: 'Fallidas (Anuladas)',
        data: data.map(d => Number(d.fallidas) || 0),
      },
    ];
  }

  const options = {
    chart: {
      type: 'bar',
      stacked: !isOrigin,
      toolbar: { show: false },
    },
    colors: isOrigin ? ['#1A65FF', '#F59E0B'] : ['#10b981', '#ef4444'],
    plotOptions: {
      bar: {
        borderRadius: 5,
        columnWidth: isOrigin ? '40%' : '55%',
        distributed: isOrigin,
      },
    },
    xaxis: {
      categories: categories,
      labels: {
        style: { fontSize: '11px', colors: '#64748b', fontWeight: 500 },
      },
    },
    yaxis: {
      title: {
        text: isOrigin ? 'N° de Errores' : 'N° Pedidos',
        style: { fontSize: '11px', fontWeight: 600, color: '#64748b' },
      },
      labels: {
        style: { fontSize: '11px', colors: '#64748b' },
      },
      ...(yAxisMax !== undefined && yAxisMax !== null ? { max: yAxisMax } : {}),
    },
    legend: {
      show: !isOrigin,
      position: 'top',
      fontSize: '12px',
      fontWeight: 600,
    },
    dataLabels: {
      enabled: true,
      formatter: (val, opt) => {
        if (isOrigin) {
          const item = data[opt.dataPointIndex];
          return `${val} (${item?.porcentaje ?? 0}%)`;
        }
        return val > 0 ? `${val}` : '';
      },
      style: {
        fontSize: '10.5px',
        fontWeight: 'bold',
        colors: isOrigin ? ['#1e293b'] : ['#fff'],
      },
      offsetY: isOrigin ? -20 : 0,
    },
    tooltip: {
      y: {
        formatter: (val) => `${val} ${isOrigin ? 'errores' : 'pedidos'}`,
      },
    },
  };

  // Extraer valores dinámicos para origen IA vs Manual
  const iaItem = isOrigin ? (data.find(d => (d.origen || d.nombre || '').includes('IA')) || { total: 0, porcentaje: 0 }) : null;
  const manualItem = isOrigin ? (data.find(d => (d.origen || d.nombre || '').includes('Manual')) || { total: 0, porcentaje: 0 }) : null;

  return (
    <div className="w-full">
      <SafeApexChart options={options} series={series} type="bar" height={220} width="100%" />
      {isOrigin && (
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100">
          <div className="flex-1 bg-blue-50 border border-blue-200 rounded-xl p-2.5 flex items-center gap-2">
            <div className="p-1 bg-blue-600 text-white rounded-lg">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[10px] text-blue-700 font-semibold block">Asistido por Valencia AI</span>
              <strong className="text-xs text-blue-950">
                {iaItem.total} errores ({iaItem.total === 0 ? '100% precisión' : `${iaItem.porcentaje}% del total`})
              </strong>
            </div>
          </div>
          <div className="flex-1 bg-amber-50 border border-amber-200 rounded-xl p-2.5 flex items-center gap-2">
            <div className="p-1 bg-amber-600 text-white rounded-lg">
              <User className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[10px] text-amber-700 font-semibold block">Captura Manual</span>
              <strong className="text-xs text-amber-950">
                {manualItem.total} {manualItem.total === 1 ? 'error detectado' : 'errores detectados'} ({manualItem.porcentaje}% de fallos)
              </strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
