import React from 'react';
import { Calendar, RefreshCw, MapPin, Store } from 'lucide-react';
import StyledSelect from '../filters/StyledSelect';

export default function DashboardStickyFilters({
  dias = 7,
  onChangeDias,
  canal = '',
  onChangeCanal,
  zona = '',
  onChangeZona,
  loading = false,
  onRefresh,
}) {
  return (
    <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md py-3 px-4 sm:px-6 rounded-2xl border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-3 transition-all">
      {/* Grupo de Filtros Izquierda */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 text-xs min-w-0">

        {/* Selector de Período */}
        <StyledSelect
          value={dias}
          onChange={(v) => onChangeDias && onChangeDias(Number(v))}
          options={[
            { value: 1, label: 'Jornada de Hoy' },
            { value: 7, label: 'Últimos 7 días (Recomendado)' },
            { value: 15, label: 'Últimos 15 días' },
            { value: 30, label: 'Últimos 30 días' },
          ]}
          panelWidth={240}
          ariaLabel="Seleccionar período de análisis"
          icon={<Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
        />

        {/* Selector de Canal */}
        <StyledSelect
          value={canal}
          onChange={(v) => onChangeCanal && onChangeCanal(v)}
          options={[
            { value: '', label: 'Todos los canales' },
            { value: 'CNL-00001', label: 'Tienda Presencial' },
            { value: 'CNL-00002', label: 'WhatsApp Comercial' },
            { value: 'CNL-00003', label: 'Venta Telefónica' },
            { value: 'CNL-00004', label: 'Portal Web' },
          ]}
          panelWidth={220}
          ariaLabel="Filtrar por canal de venta"
          icon={<Store className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
        />

        {/* Selector de Zona / Distrito */}
        <StyledSelect
          value={zona}
          onChange={(v) => onChangeZona && onChangeZona(v)}
          options={[
            { value: '', label: 'Todas las zonas' },
            { value: 'trujillo_centro', label: 'Trujillo Centro' },
            { value: 'la_esperanza', label: 'La Esperanza' },
            { value: 'victor_larco', label: 'Víctor Larco' },
            { value: 'el_porvenir', label: 'El Porvenir' },
          ]}
          panelWidth={220}
          ariaLabel="Filtrar por zona o distrito"
          icon={<MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
        />

      </div>

      {/* Botón de Actualizar / Refresh */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-semibold rounded-xl text-xs shadow-xs hover:shadow transition disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Actualizando...' : 'Actualizar'}</span>
        </button>
      </div>
    </div>
  );
}
