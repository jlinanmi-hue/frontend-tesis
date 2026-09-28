import SafeApexChart from './SafeApexChart';

export default function GaugeChart({ value = 0, max = 100, label = 'Resultado', unit = '%' }) {
  const numVal = Number(value) || 0;
  const percentage = max === 100 ? numVal : Math.min(100, Math.round((numVal / max) * 100));
  const isCompliant = numVal <= max;

  // Lógica de color: para tiempo de resolución o errores, menor es mejor (≤ max es verde/ámbar, > max es rojo)
  let gaugeColor = '#10b981';
  if (numVal > max) {
    gaugeColor = '#ef4444';
  } else if (numVal > max * 0.66) {
    gaugeColor = '#f59e0b';
  }

  const options = {
    chart: {
      type: 'radialBar',
      offsetY: -10,
      sparkline: { enabled: true },
    },
    plotOptions: {
      radialBar: {
        startAngle: -90,
        endAngle: 90,
        track: {
          background: '#e2e8f0',
          strokeWidth: '97%',
          margin: 5,
        },
        dataLabels: {
          name: {
            show: false, // Desactivar etiqueta interna de ApexCharts para evitar solapamiento
          },
          value: {
            offsetY: -10,
            fontSize: '26px',
            fontWeight: '800',
            color: '#1e293b',
            formatter: () => `${numVal}${unit}`,
          },
        },
      },
    },
    fill: {
      colors: [gaugeColor],
    },
  };

  return (
    <div className="w-full flex flex-col items-center justify-center pt-2 pb-1">
      <SafeApexChart options={options} series={[percentage]} type="radialBar" height={190} width="100%" />
      <div className="text-center -mt-6 space-y-1">
        <span className="text-xs font-semibold text-slate-700 block">{label}</span>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-50 border border-slate-200">
          <span className={isCompliant ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
            🎯 Meta SLA: ≤ {max}{unit}
          </span>
          <span className="text-slate-300">•</span>
          <span className={isCompliant ? 'text-emerald-700' : 'text-rose-700'}>
            {isCompliant ? 'Cumple SLA' : 'Excede SLA'}
          </span>
        </div>
      </div>
    </div>
  );
}
