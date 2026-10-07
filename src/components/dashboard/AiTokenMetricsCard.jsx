import React, { useState, useEffect, useCallback } from 'react';
import SafeApexChart from './charts/SafeApexChart';
import StyledDatePicker from '../common/StyledDatePicker';
import {
  Cpu,
  Sparkles,
  Calendar,
  Download,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Zap,
  DollarSign,
  Wrench,
  TrendingUp,
} from 'lucide-react';
import api from '../../services/api';

export default function AiTokenMetricsCard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activePreset, setActivePreset] = useState(30); // 15, 30, 90 or 'custom'
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [currency, setCurrency] = useState('USD'); // 'USD' | 'PEN'
  const [viewMode, setViewMode] = useState('breakdown'); // 'total' | 'breakdown'

  const fetchTokenData = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const res = await api.dashboard.tokens(params);
      if (res && res.success && res.data) {
        setData(res.data);
        if (res.data.rango) {
          setFechaDesde(res.data.rango.fecha_desde || '');
          setFechaHasta(res.data.rango.fecha_hasta || '');
        }
      }
    } catch (err) {
      console.error('Error al obtener consumo de tokens:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTokenData({ dias: 30 });
  }, [fetchTokenData]);

  // Manejar cambio de preset rápido (15, 30, 90 días)
  const handlePresetChange = (days) => {
    setActivePreset(days);
    setShowCustomRange(false);
    fetchTokenData({ dias: days });
  };

  // Manejar filtro por rango de fechas numéricas (máx 90 días)
  const handleApplyCustomDates = (e) => {
    e.preventDefault();
    if (!fechaDesde || !fechaHasta) return;
    setActivePreset('custom');
    fetchTokenData({
      fecha_desde: fechaDesde,
      fecha_hasta: fechaHasta,
    });
  };

  // Exportar datos de consumo a formato CSV
  const handleExportCSV = () => {
    if (!data?.serie_diaria || data.serie_diaria.length === 0) return;

    const headers = [
      'Fecha',
      'Total Tokens',
      'Prompt Tokens (Input)',
      'Candidates Tokens (Output)',
      'Total Peticiones',
      'Costo Estimado (USD)',
      'Costo Estimado (PEN)',
    ];

    const rows = data.serie_diaria.map((d) => [
      d.fecha,
      d.total_tokens,
      d.prompt_tokens,
      d.candidates_tokens,
      d.total_peticiones,
      d.costo_usd,
      (d.costo_usd * 3.75).toFixed(4),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `consumo_tokens_ia_${data.rango?.fecha_desde || 'inicio'}_${data.rango?.fecha_hasta || 'fin'}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const kpis = data?.kpis;
  const serie = data?.serie_diaria || [];
  const alerta = kpis?.alerta_consumo;

  // Preparar series para ApexCharts
  const categories = serie.map((item) => item.fecha_corta || item.fecha);
  const currentTokens = serie.map((item) => item.total_tokens || 0);
  const promptTokens = serie.map((item) => item.prompt_tokens || 0);
  const candidateTokens = serie.map((item) => item.candidates_tokens || 0);
  const prevTokens = serie.map((item) => item.total_tokens_prev || 0);

  const isBreakdown = viewMode === 'breakdown';

  const chartSeries = isBreakdown
    ? [
        { name: 'Input (Prompt Tokens)', data: promptTokens },
        { name: 'Output (Respuestas IA)', data: candidateTokens },
        { name: 'Total Período Anterior', data: prevTokens },
      ]
    : [
        { name: 'Consumo Período Actual', data: currentTokens },
        { name: 'Período Anterior Equivalente', data: prevTokens },
      ];

  const chartColors = isBreakdown ? ['#0284c7', '#1a65ff', '#94a3b8'] : ['#1a65ff', '#94a3b8'];

  const chartOptions = {
    chart: {
      type: 'area',
      height: 280,
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: { enabled: true, easing: 'easeinout', speed: 350 },
    },
    colors: chartColors,
    dataLabels: { enabled: false },
    stroke: {
      curve: 'smooth',
      width: isBreakdown ? [2.5, 2.5, 1.8] : [2.5, 1.8],
      dashArray: isBreakdown ? [0, 0, 4] : [0, 4],
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: isBreakdown ? 0.35 : 0.4,
        opacityTo: 0.04,
        stops: [0, 90, 100],
      },
    },
    xaxis: {
      categories: categories,
      labels: {
        style: { fontSize: '11px', colors: '#64748b', fontWeight: 500 },
        rotate: -35,
        rotateAlways: serie.length > 25,
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        style: { fontSize: '11px', colors: '#64748b' },
        formatter: (val) => {
          if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
          if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
          return `${val}`;
        },
      },
    },
    tooltip: {
      shared: true,
      intersect: false,
      y: {
        formatter: (val, opts) => {
          const index = opts.dataPointIndex;
          const point = serie[index];
          if (!point) return `${val.toLocaleString()} tokens`;
          const costStr = currency === 'PEN'
            ? `S/ ${(point.costo_usd * 3.75).toFixed(4)} PEN`
            : `$${point.costo_usd} USD`;
          return `${val.toLocaleString()} tokens • Costo est.: ${costStr}`;
        },
      },
    },
    legend: {
      position: 'top',
      horizontalAlign: 'right',
      fontSize: '11px',
      fontWeight: 600,
      markers: { width: 8, height: 8, radius: 12 },
    },
    grid: {
      borderColor: '#f1f5f9',
      strokeDashArray: 4,
      yaxis: { lines: { show: true } },
    },
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 sm:p-7 space-y-6">
      
      {/* 1. Cabecera y Controles de Filtrado */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-xs">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
                Consumo y Auditoría de Tokens IA
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/60 font-mono">
                  Motor IA
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Rango evaluado: <strong className="text-slate-700">{data?.rango?.label || 'Últimos 30 días'}</strong> ({data?.rango?.dias || 30} días máx. 90d)
              </p>
            </div>
          </div>
        </div>

        {/* Botones de Filtro y Exportación */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Píldoras de Presets Rápidos */}
          <div className="inline-flex bg-slate-100/90 p-1 rounded-xl border border-slate-200/70 text-xs font-semibold">
            <button
              onClick={() => handlePresetChange(15)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activePreset === 15
                  ? 'bg-white text-blue-600 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              15 días (Quincenal)
            </button>
            <button
              onClick={() => handlePresetChange(30)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activePreset === 30
                  ? 'bg-white text-blue-600 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              30 días (Mensual)
            </button>
            <button
              onClick={() => handlePresetChange(90)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activePreset === 90
                  ? 'bg-white text-blue-600 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              90 días (Trimestral)
            </button>
          </div>

          {/* Selector de Moneda USD / PEN */}
          <div className="inline-flex bg-slate-100/90 p-1 rounded-xl border border-slate-200/70 text-xs font-semibold">
            <button
              onClick={() => setCurrency('USD')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                currency === 'USD' ? 'bg-white text-slate-800 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              $ USD
            </button>
            <button
              onClick={() => setCurrency('PEN')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                currency === 'PEN' ? 'bg-white text-emerald-700 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              S/ PEN
            </button>
          </div>

          {/* Selector de Modo de Serie (Desglose vs Total) */}
          <div className="inline-flex bg-slate-100/90 p-1 rounded-xl border border-slate-200/70 text-xs font-semibold">
            <button
              onClick={() => setViewMode('breakdown')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                viewMode === 'breakdown' ? 'bg-white text-blue-600 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Input / Output
            </button>
            <button
              onClick={() => setViewMode('total')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                viewMode === 'total' ? 'bg-white text-blue-600 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Total
            </button>
          </div>

          {/* Toggle Rango Personalizado */}
          <button
            onClick={() => setShowCustomRange(!showCustomRange)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
              showCustomRange || activePreset === 'custom'
                ? 'bg-blue-50 text-blue-700 border-blue-300'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Fechas</span>
          </button>

          {/* Exportar CSV */}
          <button
            onClick={handleExportCSV}
            title="Exportar métricas de consumo en CSV"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold transition active:scale-95 shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>CSV</span>
          </button>

          {/* Refrescar */}
          <button
            onClick={() => {
              if (activePreset === 'custom') {
                fetchTokenData({ fecha_desde: fechaDesde, fecha_hasta: fechaHasta });
              } else {
                fetchTokenData({ dias: activePreset });
              }
            }}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition active:scale-95"
            title="Actualizar consumo"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Selector Numérico de Fechas Desplegable */}
      {showCustomRange && (
        <form
          onSubmit={handleApplyCustomDates}
          className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center gap-3 animate-in fade-in duration-200 text-xs"
        >
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Desde:</span>
            <StyledDatePicker
              value={fechaDesde}
              onChange={(v) => setFechaDesde(v)}
              size="sm"
              max={fechaHasta || undefined}
              ariaLabel="Fecha de inicio del rango"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Hasta:</span>
            <StyledDatePicker
              value={fechaHasta}
              onChange={(v) => setFechaHasta(v)}
              size="sm"
              min={fechaDesde || undefined}
              ariaLabel="Fecha de fin del rango"
            />
          </div>
          <button
            type="submit"
            className="bg-blue-600 text-white font-semibold px-4 py-1.5 rounded-lg hover:bg-blue-700 transition active:scale-95"
          >
            Filtrar Rango
          </button>
          <span className="text-[11px] text-slate-400">
            * Se limita automáticamente a un máximo de 90 días naturales según directiva.
          </span>
        </form>
      )}

      {/* Alerta de Consumo Inusual (si aplica) */}
      {alerta?.activo && !alertDismissed && (
        <div className="p-3.5 bg-amber-50/90 border border-amber-200/80 rounded-xl flex items-start justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-start gap-2.5 text-amber-800 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Pico de consumo inusual detectado</p>
              <p className="text-amber-700 mt-0.5">{alerta.mensaje}</p>
            </div>
          </div>
          <button
            onClick={() => setAlertDismissed(true)}
            className="text-amber-600 hover:text-amber-800 text-xs font-semibold px-2 py-0.5 rounded transition"
          >
            Entendido
          </button>
        </div>
      )}

      {/* 2. Tarjetas KPI de Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        
        {/* KPI 1: Total Tokens */}
        <div className="bg-gradient-to-b from-white to-slate-50/80 rounded-xl p-3.5 border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-blue-600" />
            Total Tokens
          </span>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight font-mono">
              {kpis?.total_tokens_formato || '0'}
            </span>
          </div>
          <div className="mt-1 flex items-center text-[10px] text-slate-500">
            {kpis?.delta_pct !== 0 && (
              <span
                className={`inline-flex items-center font-bold mr-1 ${
                  kpis?.delta_pct > 0 ? 'text-amber-600' : 'text-emerald-600'
                }`}
              >
                {kpis?.delta_pct > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {kpis?.delta_pct > 0 ? `+${kpis?.delta_pct}` : kpis?.delta_pct}%
              </span>
            )}
            <span>vs. período ant.</span>
          </div>
        </div>

        {/* KPI 2: Promedio Diario */}
        <div className="bg-gradient-to-b from-white to-slate-50/80 rounded-xl p-3.5 border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            Promedio Diario
          </span>
          <div className="mt-1.5 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight font-mono">
              {kpis?.promedio_diario_fmt || '0'}
            </span>
            <span className="text-[11px] font-normal text-slate-400">tok/día</span>
          </div>
          <p className="mt-1 text-[10px] text-slate-400 truncate">Ritmo de consumo operativo</p>
        </div>

        {/* KPI 3: Consultas IA */}
        <div className="bg-gradient-to-b from-white to-slate-50/80 rounded-xl p-3.5 border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
            <Cpu className="w-3.5 h-3.5 text-purple-600" />
            Llamadas a la IA
          </span>
          <div className="mt-1.5 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight font-mono">
              {kpis?.total_peticiones || '0'}
            </span>
            <span className="text-[11px] font-normal text-slate-400">peticiones</span>
          </div>
          <p className="mt-1 text-[10px] text-slate-400 truncate">Peticiones procesadas</p>
        </div>

        {/* KPI 4: Costo Estimado (con selector USD/PEN) */}
        <div className="bg-gradient-to-b from-white to-amber-50/30 rounded-xl p-3.5 border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-amber-600" />
              Costo Estimado
            </span>
            <span className="text-[9.5px] font-mono bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">
              {currency}
            </span>
          </span>
          <div className="mt-1.5 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight font-mono">
              {currency === 'PEN'
                ? `S/ ${kpis?.total_costo_pen ?? '0.00'}`
                : `$${kpis?.total_costo_usd ?? '0.00'}`}
            </span>
          </div>
          <p className="mt-1 text-[10px] font-medium text-slate-500">
            {currency === 'PEN'
              ? `≈ $${kpis?.total_costo_usd ?? '0.00'} USD`
              : `≈ S/ ${kpis?.total_costo_pen ?? '0.00'} PEN`}
          </p>
        </div>

        {/* KPI 5: Herramienta Más Usada */}
        <div className="col-span-2 md:col-span-1 bg-gradient-to-b from-white to-slate-50/80 rounded-xl p-3.5 border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
            <Wrench className="w-3.5 h-3.5 text-indigo-600" />
            Herramienta Top
          </span>
          <div className="mt-1.5 truncate">
            <span className="text-sm font-bold text-slate-800 font-mono">
              {kpis?.herramienta_mas_usada?.nombre || 'Ninguna'}
            </span>
          </div>
          <p className="mt-1 text-[10px] text-slate-500">
            <strong>{kpis?.herramienta_mas_usada?.llamadas || 0}</strong> llamadas ({kpis?.herramienta_mas_usada?.porcentaje || 0}%)
          </p>
        </div>

      </div>

      {/* 3. Gráfico de Área de Consumo Diario con Comparativa Temporal */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            {isBreakdown
              ? 'Evolución Diaria de Tokens (Input vs Output Desglosado)'
              : 'Evolución Diaria de Tokens (Consumo Total vs Anterior)'}
          </span>
          <span className="text-[11px] text-slate-400">
            Tarifas: $0.075 / 1M prompt • $0.30 / 1M respuesta • TC: S/ 3.75
          </span>
        </div>

        {loading ? (
          <div className="h-[280px] flex items-center justify-center text-slate-400 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mr-2" />
            Cargando analítica de tokens...
          </div>
        ) : serie.length === 0 ? (
          <div className="h-[280px] flex items-center justify-center text-slate-400 text-xs">
            No se registraron interacciones con la IA en este período.
          </div>
        ) : (
          <div className="w-full">
            <SafeApexChart options={chartOptions} series={chartSeries} type="area" height={280} width="100%" />
          </div>
        )}
      </div>

    </div>
  );
}
