import React, { useState, useMemo, useEffect } from 'react';
import { Calendar, ChevronDown, Check, ArrowRight, Clock } from 'lucide-react';
import { generarSemanasDelAno, normalizarPeriodo, obtenerRangoDeSemanaIso } from '../../../utils/datePeriodUtils';

/**
 * PeriodSelector
 * Selector unificado de período para la comparativa de indicadores.
 * Permite seleccionar semanas del año o definir un rango de fechas exacto (calendario).
 */
export default function PeriodSelector({
  label = 'Período',
  theme = 'blue', // 'blue' | 'amber'
  value,
  onChange,
  disabled = false,
}) {
  const semanas = useMemo(() => generarSemanasDelAno(2026, true), []);
  const norm = useMemo(() => normalizarPeriodo(value), [value]);

  const [modo, setModo] = useState(norm.tipo === 'custom' ? 'custom' : 'week');
  const [showCustomInputs, setShowCustomInputs] = useState(norm.tipo === 'custom');
  const [fechaDesde, setFechaDesde] = useState(norm.fechaInicio || '2026-09-01');
  const [fechaHasta, setFechaHasta] = useState(norm.fechaFin || '2026-09-13');

  // Sincronizar estado local si el value cambia desde el exterior
  useEffect(() => {
    if (norm.tipo === 'custom') {
      setModo('custom');
      setShowCustomInputs(true);
      if (norm.fechaInicio) setFechaDesde(norm.fechaInicio);
      if (norm.fechaFin) setFechaHasta(norm.fechaFin);
    } else {
      setModo('week');
      setShowCustomInputs(false);
    }
  }, [norm]);

  const handleSelectChange = (e) => {
    const val = e.target.value;
    if (val === 'CUSTOM_RANGE') {
      setModo('custom');
      setShowCustomInputs(true);
    } else {
      setModo('week');
      setShowCustomInputs(false);
      const rango = obtenerRangoDeSemanaIso(val);
      if (onChange) {
        onChange({
          tipo: 'week',
          valor: val,
          fechaInicio: rango.fechaInicio,
          fechaFin: rango.fechaFin,
          label: rango.label,
        });
      }
    }
  };

  const handleAplicarCustom = (e) => {
    e.preventDefault();
    if (!fechaDesde || !fechaHasta) return;
    if (fechaDesde > fechaHasta) {
      alert('La fecha de inicio no puede ser posterior a la fecha de fin.');
      return;
    }
    if (onChange) {
      onChange({
        tipo: 'custom',
        valor: `${fechaDesde}_${fechaHasta}`,
        fechaInicio: fechaDesde,
        fechaFin: fechaHasta,
        label: `Rango: ${fechaDesde} al ${fechaHasta}`,
      });
    }
  };

  const themeStyles = theme === 'blue'
    ? {
        border: 'border-blue-200 focus-within:border-blue-500',
        badge: 'bg-blue-50 text-blue-700 border-blue-200',
        button: 'bg-blue-600 hover:bg-blue-700 text-white',
        icon: 'text-blue-600',
      }
    : {
        border: 'border-amber-200 focus-within:border-amber-500',
        badge: 'bg-amber-50 text-amber-800 border-amber-200',
        button: 'bg-amber-600 hover:bg-amber-700 text-white',
        icon: 'text-amber-600',
      };

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
          <Calendar className={`w-3.5 h-3.5 ${themeStyles.icon}`} />
          <span>{label}</span>
        </label>
        <span className={`text-[10.5px] font-mono px-2 py-0.5 rounded-md border font-semibold ${themeStyles.badge}`}>
          {norm.label}
        </span>
      </div>

      {/* Control principal desplegable */}
      <div className={`relative bg-white rounded-xl border ${themeStyles.border} shadow-2xs transition-all`}>
        <select
          value={modo === 'custom' ? 'CUSTOM_RANGE' : (norm.valor || '2026-W37')}
          onChange={handleSelectChange}
          disabled={disabled}
          aria-label={`Seleccionar período para ${label}`}
          className="w-full bg-transparent px-3 py-2 pr-8 text-xs font-semibold text-slate-800 outline-none cursor-pointer disabled:opacity-50 appearance-none"
        >
          <optgroup label="── Semanas del Año 2026 ──">
            {semanas.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </optgroup>
          <optgroup label="── Rango Específico ──">
            <option value="CUSTOM_RANGE">📅 Rango de Fechas Personalizado...</option>
          </optgroup>
        </select>
        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
      </div>

      {/* Panel colapsable de Rango de Fechas Personalizado */}
      {showCustomInputs && (
        <form
          onSubmit={handleAplicarCustom}
          className="p-3 bg-slate-50/90 rounded-xl border border-slate-200 space-y-2.5 animate-in fade-in duration-150"
        >
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">Desde:</span>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 font-mono outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">Hasta:</span>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 font-mono outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setShowCustomInputs(false);
                setModo('week');
              }}
              className="px-2.5 py-1 text-[11px] font-semibold text-slate-500 hover:text-slate-700 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={disabled}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold shadow-2xs flex items-center gap-1 cursor-pointer transition ${themeStyles.button}`}
            >
              <Check className="w-3 h-3" />
              Aplicar Rango
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
