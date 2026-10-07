import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, Check } from 'lucide-react';

/**
 * StyledSelect
 * Desplegable personalizado con el diseño de la página (tarjeta blanca
 * redondeada, opción activa en azul). La lista se renderiza en un portal
 * para que no la recorten los contenedores con overflow del modal.
 *
 * Props:
 * - value: valor seleccionado
 * - onChange(value): callback al elegir opción
 * - options: [{ value, label, hint }] (lista plana)
 * - groups: [{ label, options: [{ value, label, hint }] }] (agrupada)
 * - icon: nodo opcional a la izquierda del botón
 * - placeholder, disabled, align ('left'|'right'), searchable (bool),
 *   panelWidth, ariaLabel
 * - size: 'sm' (compacto, filtros/paginación) | 'form' (h-11, igual que
 *   los inputs de formulario `h-11 px-3.5 text-sm rounded-xl`)
 */
export default function StyledSelect({
  value,
  onChange,
  options = [],
  groups = null,
  icon = null,
  placeholder = 'Seleccionar...',
  disabled = false,
  align = 'left',
  searchable = false,
  panelWidth = 280,
  ariaLabel = 'Selector desplegable',
  size = 'sm',
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [coords, setCoords] = useState(null);
  const [placement, setPlacement] = useState('bottom');
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const searchRef = useRef(null);
  const instanceId = useRef(`ss-${Math.random().toString(36).slice(2, 9)}`);

  // Solo un desplegable abierto a la vez en toda la app
  useEffect(() => {
    const closeOthers = (e) => {
      if (e.detail !== instanceId.current) setOpen(false);
    };
    window.addEventListener('styled-select:open', closeOthers);
    return () => window.removeEventListener('styled-select:open', closeOthers);
  }, []);

  const flatOptions = useMemo(() => {
    if (groups && groups.length > 0) return groups.flatMap((g) => g.options || []);
    return options || [];
  }, [groups, options]);

  const selected = useMemo(
    () => flatOptions.find((o) => String(o.value) === String(value)) || null,
    [flatOptions, value]
  );

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups && groups.length > 0 ? groups : null;
    const match = (o) =>
      String(o.label || '').toLowerCase().includes(q) ||
      String(o.value || '').toLowerCase().includes(q) ||
      String(o.hint || '').toLowerCase().includes(q);
    if (groups && groups.length > 0) {
      return groups
        .map((g) => ({ ...g, options: (g.options || []).filter(match) }))
        .filter((g) => g.options.length > 0);
    }
    const filtered = (options || []).filter(match);
    return [{ label: null, options: filtered }];
  }, [groups, options, query]);

  const filteredFlatCount = useMemo(() => {
    if (!filteredGroups) return (options || []).length;
    return filteredGroups.reduce((acc, g) => acc + (g.options || []).length, 0);
  }, [filteredGroups, options]);

  const clampLeft = (rect, width) => {
    const w = Math.max(rect.width, width);
    const rawLeft = align === 'right' ? rect.right - w : rect.left;
    return { width: w, left: Math.max(8, Math.min(rawLeft, window.innerWidth - w - 8)) };
  };

  // Reposiciona con la altura real del panel (evita el hueco flotante al voltear)
  const adjustToRealHeight = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    const h = panelRef.current?.offsetHeight;
    if (!rect || !h) return;
    const below = window.innerHeight - rect.bottom - 8;
    if (below < h + 12 && rect.top - 8 > below) {
      setPlacement('top');
      setCoords((c) => (c ? { ...c, top: Math.max(8, rect.top - 6 - h) } : c));
    } else {
      setPlacement('bottom');
      setCoords((c) => (c ? { ...c, top: rect.bottom + 6 } : c));
    }
  };

  useEffect(() => {
    if (!open) return;
    setQuery('');
    const raf = requestAnimationFrame(() => adjustToRealHeight());
    const t = setTimeout(() => searchRef.current?.focus(), 30);

    const handlePointerDown = (e) => {
      if (panelRef.current?.contains(e.target)) return;
      if (triggerRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const handleScroll = (e) => {
      if (panelRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const handleResize = () => setOpen(false);
    const handleKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    document.addEventListener('keydown', handleKey);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  // Reajusta al filtrar (cambia la altura) cuando abre hacia arriba
  useEffect(() => {
    if (!open || placement !== 'top') return;
    adjustToRealHeight();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const handleSelect = (val) => {
    setOpen(false);
    if (String(val) !== String(value) && typeof onChange === 'function') {
      onChange(val);
    }
  };

  const handleTriggerClick = () => {
    if (disabled) return;
    window.dispatchEvent(new CustomEvent('styled-select:open', { detail: instanceId.current }));
    // Coordenadas reales desde el clic (el panel nace ya posicionado, sin flash)
    if (!open) {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect) {
        const { width, left } = clampLeft(rect, panelWidth);
        setPlacement('bottom');
        setCoords({ left, top: rect.bottom + 6, width });
      }
    }
    setOpen((p) => !p);
  };

  const renderOptions = () => {
    if (groups && groups.length > 0) {
      const list = filteredGroups || [];
      if (list.length === 0) {
        return <p className="px-3.5 py-4 text-center text-xs text-slate-400">Sin resultados para “{query}”.</p>;
      }
      return list.map((g, gi) => (
        <div key={`${g.label || 'g'}-${gi}`}>
          {g.label && (
            <p className="sticky top-0 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/95 border-y border-slate-100">
              {g.label}
            </p>
          )}
          {g.options.map((o) => {
            const isActive = String(o.value) === String(value);
            return (
              <button
                key={String(o.value)}
                type="button"
                onClick={() => handleSelect(o.value)}
                className={`w-full text-left px-3.5 py-2 text-[13px] transition flex items-center justify-between gap-2 cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-slate-600 hover:bg-blue-50 hover:text-blue-700 font-medium'
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate">{o.label}</span>
                  {o.hint && (
                    <span className={`block text-[11px] truncate ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>
                      {o.hint}
                    </span>
                  )}
                </span>
                {isActive && <Check className="w-4 h-4 shrink-0" />}
              </button>
            );
          })}
        </div>
      ));
    }

    const list = filteredGroups ? filteredGroups[0]?.options || [] : options || [];
    if (list.length === 0) {
      return <p className="px-3.5 py-4 text-center text-xs text-slate-400">Sin resultados para “{query}”.</p>;
    }
    return list.map((o) => {
      const isActive = String(o.value) === String(value);
      return (
        <button
          key={String(o.value)}
          type="button"
          onClick={() => handleSelect(o.value)}
          className={`w-full text-left px-3.5 py-2 text-[13px] transition flex items-center justify-between gap-2 cursor-pointer ${
            isActive
              ? 'bg-blue-600 text-white font-semibold'
              : 'text-slate-600 hover:bg-blue-50 hover:text-blue-700 font-medium'
          }`}
        >
          <span className="truncate min-w-0">{o.label}</span>
          {isActive && <Check className="w-4 h-4 shrink-0" />}
        </button>
      );
    });
  };

  const isForm = size === 'form';

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={handleTriggerClick}
        className={`flex items-center gap-1.5 bg-white border shadow-2xs transition min-w-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
          isForm
            ? 'w-full h-11 px-3.5 text-sm rounded-xl'
            : 'pl-2 pr-1.5 py-1.5 rounded-xl text-xs max-w-full'
        } ${
          open
            ? 'border-blue-500 ring-2 ring-blue-500/15 shadow-xs'
            : 'border-slate-200 hover:border-blue-300 hover:shadow-xs'
        }`}
      >
        {icon && <span className="shrink-0">{icon}</span>}
        <span className={isForm
          ? `flex-1 text-left truncate ${selected ? 'font-semibold text-slate-800' : 'font-normal text-slate-400'}`
          : 'font-semibold text-slate-800 truncate max-w-[190px]'}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${open ? 'rotate-180 text-blue-500' : ''}`}
        />
      </button>

      {open &&
        coords &&
        createPortal(
          <div
            ref={panelRef}
            style={{ left: `${coords.left}px`, top: `${coords.top}px`, width: `${coords.width}px` }}
            className="fixed z-[70] bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden"
          >
              {searchable && filteredFlatCount > 8 && (
                <div className="p-2 border-b border-slate-100 sticky top-0 bg-white z-10">
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5">
                    <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <input
                      ref={searchRef}
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Buscar semana..."
                      className="w-full bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"
                    />
                  </div>
                </div>
              )}
              <div className="max-h-[300px] overflow-y-auto py-1.5">{renderOptions()}</div>
          </div>,
          document.body
        )}
    </>
  );
}
