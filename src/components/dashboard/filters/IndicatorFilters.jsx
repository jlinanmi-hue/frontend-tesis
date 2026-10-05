import React from 'react';
import { Calendar, Filter, RefreshCw, Download, GitCompare } from 'lucide-react';

export default function IndicatorFilters({
  indicatorId,
  filters,
  onChange,
  autoRefresh,
  onToggleAutoRefresh,
  onExport,
  onCompare,
}) {
  const isWeekly = indicatorId === 3;

  return (
    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
      <div className="flex flex-wrap items-center gap-3">
        {/* Selector de Período (Mes o Semana) */}
        <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          {isWeekly ? (
            <select
              value={filters.semana || '2026-W37'}
              onChange={(e) => onChange({ ...filters, semana: e.target.value })}
              className="bg-transparent font-medium text-slate-700 outline-none cursor-pointer"
            >
              <option value="2026-W37">Semana 37 (Actual - Sept 2026)</option>
              <option value="2026-W36">Semana 36 (Sept 2026)</option>
              <option value="2026-W35">Semana 35 (Ago 2026)</option>
            </select>
          ) : (
            <select
              value={filters.mes || '2026-09'}
              onChange={(e) => onChange({ ...filters, mes: e.target.value, periodo: e.target.value })}
              className="bg-transparent font-medium text-slate-700 outline-none cursor-pointer"
            >
              <option value="2026-09">Septiembre 2026 (Actual)</option>
              <option value="2026-08">Agosto 2026</option>
              <option value="2026-07">Julio 2026</option>
            </select>
          )}
        </div>

        {/* Filtro por Canal de Pedido */}
        <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={filters.canal || ''}
            onChange={(e) => onChange({ ...filters, canal: e.target.value })}
            className="bg-transparent font-medium text-slate-700 outline-none cursor-pointer"
          >
            <option value="">Todos los Canales</option>
            <option value="CNL-00001">Tienda Presencial</option>
            <option value="CNL-00002">Canal Web / App</option>
            <option value="CNL-00003">WhatsApp Comercial</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Botón de Comparación de Períodos */}
        {onCompare && (
          <button
            type="button"
            onClick={onCompare}
            className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold px-3 py-1.5 rounded-lg border border-blue-200 transition shadow-xs"
            title="Comparar subgráficos entre dos períodos distintos"
          >
            <GitCompare className="w-3.5 h-3.5 text-blue-600" />
            Comparar
          </button>
        )}

        {/* Toggle de Auto-Refresh */}
        <button
          type="button"
          onClick={onToggleAutoRefresh}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-semibold transition ${
            autoRefresh
              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
          }`}
          title="Actualiza automáticamente los datos cada 60 segundos"
        >
          <RefreshCw className={`w-3 h-3 ${autoRefresh ? 'animate-spin' : ''}`} />
          {autoRefresh ? 'Auto-Refresh (60s)' : 'Auto-Refresh (OFF)'}
        </button>

        {/* Botón de Exportación */}
        <button
          type="button"
          onClick={onExport}
          className="flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-700 font-semibold px-3 py-1.5 rounded-lg border border-slate-200 transition"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          Exportar
        </button>
      </div>
    </div>
  );
}
