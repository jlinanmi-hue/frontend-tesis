import React, { useMemo } from 'react';
import { Calendar, Filter, RefreshCw, Download, GitCompare } from 'lucide-react';
import StyledSelect from './StyledSelect';
import { generarSemanasDelAno } from '../../../utils/datePeriodUtils';

const MESES_2026 = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const CANALES = [
  { value: '', label: 'Todos los Canales' },
  { value: 'CNL-00001', label: 'Tienda Presencial' },
  { value: 'CNL-00002', label: 'Canal Web / App' },
  { value: 'CNL-00003', label: 'WhatsApp Comercial' },
];

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

  // Listado completo de las 52 semanas del año (igual que en Comparar)
  const semanasGroups = useMemo(() => {
    const semanas = generarSemanasDelAno(2026, true);
    const porMes = new Map();
    semanas.forEach((s) => {
      const mesIdx = Number(String(s.fechaInicio || '').slice(5, 7)) || 1;
      const mesLabel = `${MESES_2026[mesIdx - 1]} 2026`;
      if (!porMes.has(mesLabel)) porMes.set(mesLabel, []);
      porMes.get(mesLabel).push({
        value: s.key,
        label: s.key === '2026-W37' ? `${s.label} • Actual` : s.label,
      });
    });
    return Array.from(porMes.entries()).map(([label, opts]) => ({ label, options: opts }));
  }, []);

  const mesesOptions = useMemo(
    () =>
      MESES_2026.map((nombre, idx) => {
        const mm = String(idx + 1).padStart(2, '0');
        const val = `2026-${mm}`;
        return {
          value: val,
          label: val === '2026-09' ? `${nombre} 2026 (Actual)` : `${nombre} 2026`,
        };
      }),
    []
  );

  return (
    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
      <div className="flex flex-wrap items-center gap-2.5 min-w-0">
        {/* Selector de Período (Mes o Semana) */}
        {isWeekly ? (
          <StyledSelect
            value={filters.semana || '2026-W37'}
            onChange={(v) => onChange({ ...filters, semana: v })}
            groups={semanasGroups}
            searchable
            panelWidth={300}
            ariaLabel="Seleccionar semana del año 2026"
            icon={<Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
          />
        ) : (
          <StyledSelect
            value={filters.mes || '2026-09'}
            onChange={(v) => onChange({ ...filters, mes: v, periodo: v })}
            options={mesesOptions}
            panelWidth={240}
            ariaLabel="Seleccionar mes del año 2026"
            icon={<Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
          />
        )}

        {/* Filtro por Canal de Pedido */}
        <StyledSelect
          value={filters.canal || ''}
          onChange={(v) => onChange({ ...filters, canal: v })}
          options={CANALES}
          panelWidth={220}
          ariaLabel="Filtrar por canal de pedido"
          icon={<Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
        />
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
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold px-3 py-1.5 rounded-lg border border-blue-700 transition shadow-xs cursor-pointer"
          title="Exportar Ficha de Observación oficial para la tesis (Excel / PDF)"
        >
          <Download className="w-3.5 h-3.5 text-blue-100" />
          <span>Exportar Ficha</span>
        </button>
      </div>
    </div>
  );
}
