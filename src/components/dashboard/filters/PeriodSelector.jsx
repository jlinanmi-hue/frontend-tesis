import React, { useState, useMemo, useEffect } from 'react';
import { Calendar, Check } from 'lucide-react';
import StyledSelect from './StyledSelect';
import StyledDatePicker from '../../common/StyledDatePicker';
import { generarSemanasDelAno, normalizarPeriodo, obtenerRangoDeSemanaIso } from '../../../utils/datePeriodUtils';

const MESES_CORTO = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

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

  const semanasGroups = useMemo(() => {
    const porMes = new Map();
    semanas.forEach((s) => {
      const mesIdx = Number(String(s.fechaInicio || '').slice(5, 7)) || 1;
      const mesLabel = `${MESES_CORTO[mesIdx - 1]} 2026`;
      if (!porMes.has(mesLabel)) porMes.set(mesLabel, []);
      porMes.get(mesLabel).push({ value: s.key, label: s.label });
    });
    const lista = Array.from(porMes.entries()).map(([label, opts]) => ({ label, options: opts }));
    lista.push({
      label: 'Rango específico',
      options: [{ value: 'CUSTOM_RANGE', label: '📅 Rango de Fechas Personalizado...' }],
    });
    return lista;
  }, [semanas]);

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

  const handleValueChange = (val) => {
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
      <StyledSelect
        value={modo === 'custom' ? 'CUSTOM_RANGE' : (norm.valor || '2026-W37')}
        onChange={handleValueChange}
        groups={semanasGroups}
        searchable
        panelWidth={300}
        disabled={disabled}
        ariaLabel={`Seleccionar período para ${label}`}
        icon={<Calendar className={`w-3.5 h-3.5 ${themeStyles.icon} shrink-0`} />}
      />

      {/* Panel colapsable de Rango de Fechas Personalizado */}
      {showCustomInputs && (
        <form
          onSubmit={handleAplicarCustom}
          className="p-3 bg-slate-50/90 rounded-xl border border-slate-200 space-y-2.5 animate-in fade-in duration-150"
        >
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">Desde:</span>
              <StyledDatePicker
                value={fechaDesde}
                onChange={(v) => setFechaDesde(v)}
                size="sm"
                max={fechaHasta || undefined}
                ariaLabel="Fecha de inicio del rango personalizado"
              />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">Hasta:</span>
              <StyledDatePicker
                value={fechaHasta}
                onChange={(v) => setFechaHasta(v)}
                size="sm"
                min={fechaDesde || undefined}
                ariaLabel="Fecha de fin del rango personalizado"
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
