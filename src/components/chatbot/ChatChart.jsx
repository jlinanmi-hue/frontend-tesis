import React, { useRef } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { Download } from 'lucide-react';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899'];

const parseSafe = (val) => {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (typeof val === 'string') {
    const cleaned = val.replace(/[^0-9.-]/g, '').trim();
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
  }
  return 0;
};

function CustomTooltip({ active, payload, label, isMoneda, unidad }) {
  if (active && payload && payload.length) {
    const item = payload[0];
    const val = item.value;
    const formatted = isMoneda
      ? `S/ ${Number(val).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : `${Number(val).toLocaleString('es-PE')}${unidad ? ` ${unidad}` : ''}`;

    return (
      <div className="bg-slate-900 text-white px-2.5 py-1.5 rounded-lg shadow-lg text-[11px] border border-slate-800 pointer-events-none">
        <p className="font-semibold text-slate-200">{label || item.name}</p>
        <p className="text-blue-400 font-bold">{formatted}</p>
      </div>
    );
  }
  return null;
}

export default function ChatChart({ chartData }) {
  const cardRef = useRef(null);

  if (!chartData) return null;

  // 1. Mapeo unificado de etiquetas
  const rawCategories = chartData.labels ?? chartData.categories ?? chartData.x ?? [];
  const parsedCategories = Array.isArray(rawCategories)
    ? rawCategories.map((c) => String(c ?? ''))
    : [];

  // 2. Parseo numérico seguro
  const rawSeries = chartData.series ?? [];
  let rawNumericSeries = [];
  if (Array.isArray(rawSeries)) {
    if (rawSeries.length > 0 && typeof rawSeries[0] === 'object' && rawSeries[0] !== null && 'data' in rawSeries[0]) {
      rawNumericSeries = (rawSeries[0].data ?? []).map(parseSafe);
    } else {
      rawNumericSeries = rawSeries.map(parseSafe);
    }
  }

  // 3. Sincronización de longitudes
  const len = Math.min(parsedCategories.length, rawNumericSeries.length);
  const categories = len > 0
    ? parsedCategories.slice(0, len)
    : (parsedCategories.length > 0 ? parsedCategories : rawNumericSeries.map((_, i) => `Punto ${i + 1}`));
  const numericSeries = len > 0 ? rawNumericSeries.slice(0, len) : rawNumericSeries;

  // 4. Transformación de datos declarativos para Recharts [{ name: '...', value: 123 }, ...]
  const data = categories.map((cat, i) => ({
    name: cat,
    value: numericSeries[i] ?? 0,
  }));

  const hasData = data.length > 0 && data.some((d) => d.value !== undefined && !isNaN(d.value));

  const rawType = chartData.chart_type ?? chartData.type ?? 'bar';
  const type = String(rawType).toLowerCase();
  const title = chartData.title || 'Gráfico';
  const total = chartData.total;
  const metadata = chartData.metadata;
  const is_comparison = chartData.is_comparison;
  const delta_pct = chartData.delta_pct;

  const formato = chartData.formato || metadata?.formato || metadata?.tipo || '';
  const unidad = chartData.unidad || metadata?.unidad || '';

  const isMoneda =
    formato === 'moneda' ||
    unidad === 'soles' ||
    (typeof total === 'string' && total.trim().startsWith('S/')) ||
    (!formato && !unidad && /\b(facturaci[oó]n|ingresos|recaudaci[oó]n)\b/i.test(title)) ||
    (!formato && !unidad && /\bventas\b/i.test(title) && !/pedido/i.test(title));

  const isPieDonut = type === 'pie' || type === 'donut';
  const isHorizontal = type === 'horizontal_bar';
  const isArea = type === 'area';
  const isLine = type === 'line';

  const handleExportPng = () => {
    try {
      const container = cardRef.current;
      if (!container) return;
      const svg = container.querySelector('svg');
      if (!svg) return;

      const svgData = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const URL = window.URL || window.webkitURL || window;
      const blobURL = URL.createObjectURL(svgBlob);

      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = svg.clientWidth || 600;
        canvas.height = svg.clientHeight || 260;
        const context = canvas.getContext('2d');
        if (context) {
          context.fillStyle = '#ffffff';
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.drawImage(image, 0, 0);
          const pngUrl = canvas.toDataURL('image/png');
          const downloadLink = document.createElement('a');
          downloadLink.href = pngUrl;
          downloadLink.download = `${(title || 'grafico').toLowerCase().replace(/[^a-z0-9]/gi, '_')}.png`;
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
        }
        URL.revokeObjectURL(blobURL);
      };
      image.src = blobURL;
    } catch (err) {
      console.error('Error al exportar PNG:', err);
    }
  };

  return (
    <div
      ref={cardRef}
      className="w-full min-w-[260px] sm:min-w-[320px] max-w-full bg-white rounded-xl border border-slate-200/90 shadow-2xs mt-2 mb-1 overflow-hidden"
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200/80 bg-slate-50/70">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[11px] font-bold text-slate-800 tracking-tight truncate">{title}</span>
          <span className="px-1.5 py-0.2 bg-blue-50 text-blue-700 border border-blue-200/60 text-[9px] font-mono font-semibold rounded">
            BI • IA
          </span>
        </div>
        <button
          type="button"
          onClick={handleExportPng}
          title="Descargar imagen PNG"
          className="flex items-center gap-1 px-2 py-1 text-[10px] font-mono font-medium text-slate-600 hover:text-blue-600 bg-white hover:bg-blue-50 border border-slate-200/80 hover:border-blue-200 rounded-lg transition cursor-pointer shadow-2xs"
        >
          <Download className="w-3 h-3 text-slate-500" />
          <span>Exportar</span>
        </button>
      </div>

      <div className="w-full px-2 pt-3 pb-1" style={{ height: 260 }}>
        {!hasData ? (
          <div className="flex items-center justify-center h-full text-slate-400 text-xs">
            Sin datos para mostrar
          </div>
        ) : isArea ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="chatAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => isMoneda ? `S/ ${Math.round(v)}` : `${Math.round(v)}`}
              />
              <Tooltip content={<CustomTooltip isMoneda={isMoneda} unidad={unidad} />} />
              <Area
                type="monotone"
                dataKey="value"
                name={title || 'Valor'}
                stroke="#2563eb"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#chatAreaGrad)"
                dot={{ r: 3, fill: '#2563eb', strokeWidth: 1, stroke: '#fff' }}
                activeDot={{ r: 5, fill: '#1d4ed8' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : isLine ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => isMoneda ? `S/ ${Math.round(v)}` : `${Math.round(v)}`}
              />
              <Tooltip content={<CustomTooltip isMoneda={isMoneda} unidad={unidad} />} />
              <Line
                type="monotone"
                dataKey="value"
                name={title || 'Valor'}
                stroke="#2563eb"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#2563eb', strokeWidth: 1, stroke: '#fff' }}
                activeDot={{ r: 5, fill: '#1d4ed8' }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : isHorizontal ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 10, right: 25, left: 15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis
                type="number"
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => isMoneda ? `S/ ${Math.round(v)}` : `${Math.round(v)}`}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={85}
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <Tooltip content={<CustomTooltip isMoneda={isMoneda} unidad={unidad} />} />
              <Bar dataKey="value" name={title || 'Valor'} fill="#3b82f6" radius={[0, 4, 4, 0]}>
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : isPieDonut ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="46%"
                innerRadius={type === 'donut' ? 48 : 0}
                outerRadius={75}
                paddingAngle={2}
                label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip isMoneda={isMoneda} unidad={unidad} />} />
              <Legend wrapperStyle={{ fontSize: '10.5px', paddingTop: '4px' }} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          /* Columna vertical por defecto */
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => isMoneda ? `S/ ${Math.round(v)}` : `${Math.round(v)}`}
              />
              <Tooltip content={<CustomTooltip isMoneda={isMoneda} unidad={unidad} />} />
              <Bar dataKey="value" name={title || 'Valor'} fill="#3b82f6" radius={[4, 4, 0, 0]}>
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {total && (
        <div className="px-3 py-2 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-500">Total acumulado:</span>
            <span className="text-[12px] font-bold text-slate-800">{total}</span>
          </div>
          {is_comparison && delta_pct !== undefined && (
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                delta_pct >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}
            >
              {delta_pct >= 0 ? '+' : ''}
              {delta_pct}%
            </span>
          )}
        </div>
      )}
    </div>
  );
}