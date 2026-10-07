import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const DIAS_SEMANA = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

function parseYMD(str) {
  if (!str || typeof str !== 'string') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return { y, m: mo, d };
}

function toYMD(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function formatES(str) {
  const p = parseYMD(str);
  if (!p) return '';
  return `${String(p.d).padStart(2, '0')}/${String(p.m).padStart(2, '0')}/${p.y}`;
}

function todayYMD() {
  const t = new Date();
  return toYMD(t.getFullYear(), t.getMonth() + 1, t.getDate());
}

/**
 * StyledDatePicker
 * Selector de fecha con el diseno de la pagina (igual animacion y tarjeta
 * que StyledSelect): calendario en espanol, mes/ano navegables, dia
 * seleccionado en azul, Borrar / Hoy / Cancelar / Confirmar.
 *
 * Props:
 * - value: 'YYYY-MM-DD' o ''  | onChange(ymd|'')=>void
 * - placeholder, disabled, ariaLabel
 * - size: 'form' (h-11 como los inputs) | 'sm' (compacto para filtros)
 * - min, max: limites (opcional)
 */
export default function StyledDatePicker({
  value = '',
  onChange,
  placeholder = 'DD/MM/AAAA',
  disabled = false,
  ariaLabel = 'Seleccionar fecha',
  size = 'form',
  min = null,
  max = null,
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState({ y: 2026, m: 10 });
  const [mode, setMode] = useState('days'); // 'days' | 'months'
  const [pending, setPending] = useState(null);
  const [coords, setCoords] = useState(null);
  const [placement, setPlacement] = useState('bottom');
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const instanceId = useRef(`sdp-${Math.random().toString(36).slice(2, 9)}`);

  const isForm = size === 'form';
  const today = useMemo(() => todayYMD(), []);
  const display = value ? formatES(value) : '';

  // Solo un desplegable abierto a la vez (mismo evento que StyledSelect)
  useEffect(() => {
    const closeOthers = (e) => {
      if (e.detail !== instanceId.current) setOpen(false);
    };
    window.addEventListener('styled-select:open', closeOthers);
    return () => window.removeEventListener('styled-select:open', closeOthers);
  }, []);

  const syncView = (ymd) => {
    const p = parseYMD(ymd);
    const t = new Date();
    setView(p ? { y: p.y, m: p.m } : { y: t.getFullYear(), m: t.getMonth() + 1 });
    setPending(ymd || null);
    setMode('days');
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

  const handleTriggerClick = () => {
    if (disabled) return;
    window.dispatchEvent(new CustomEvent('styled-select:open', { detail: instanceId.current }));
    // Coordenadas reales desde el clic (el panel nace ya posicionado, sin flash)
    if (!open) {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect) {
        const width = Math.max(rect.width, isForm ? 300 : 280);
        setPlacement('bottom');
        setCoords({ left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)), top: rect.bottom + 6, width });
      }
    }
    setOpen((p) => !p);
  };
  useEffect(() => {
    if (!open) return;
    syncView(value);
    const raf = requestAnimationFrame(() => adjustToRealHeight());
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
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('keydown', handleKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open ]);

  // Reajusta al cambiar de vista (dias/meses cambia la altura) cuando abre arriba
  useEffect(() => {
    if (!open || placement !== 'top') return;
    adjustToRealHeight();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const inRange = (ymd) => {
    if (min && ymd < min) return false;
    if (max && ymd > max) return false;
    return true;
  };

  const cells = useMemo(() => {
    const { y, m } = view;
    const first = new Date(y, m - 1, 1);
    const offset = (first.getDay() + 6) % 7; // lunes = 0
    const daysInMonth = new Date(y, m, 0).getDate();
    const daysInPrev = new Date(y, m - 1, 0).getDate();
    const total = Math.ceil((offset + daysInMonth) / 7) * 7;
    const list = [];
    for (let i = 0; i < total; i++) {
      const dayNum = i - offset + 1;
      if (dayNum < 1) {
        const pm = m === 1 ? 12 : m - 1;
        const py = m === 1 ? y - 1 : y;
        list.push({ ymd: toYMD(py, pm, daysInPrev + dayNum), d: daysInPrev + dayNum, outside: true });
      } else if (dayNum > daysInMonth) {
        const nm = m === 12 ? 1 : m + 1;
        const ny = m === 12 ? y + 1 : y;
        list.push({ ymd: toYMD(ny, nm, dayNum - daysInMonth), d: dayNum - daysInMonth, outside: true });
      } else {
        list.push({ ymd: toYMD(y, m, dayNum), d: dayNum, outside: false });
      }
    }
    return list;
  }, [view]);

  const moveMonth = (delta) => {
    setView((v) => {
      let { y, m } = v;
      m += delta;
      if (m < 1) { m = 12; y -= 1; }
      if (m > 12) { m = 1; y += 1; }
      return { y, m };
    });
  };

  const commit = (ymd) => {
    setOpen(false);
    if (ymd !== value && typeof onChange === 'function') onChange(ymd);
  };

  const yearMin = new Date().getFullYear() - 10;
  const yearMax = new Date().getFullYear() + 10;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={handleTriggerClick}
        className={`flex items-center gap-2 border shadow-2xs transition min-w-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
          isForm
            ? 'w-full h-11 px-3.5 text-sm bg-slate-50/70 rounded-xl'
            : 'px-2.5 py-1.5 text-xs bg-white rounded-xl max-w-full'
        } ${
          open
            ? 'border-blue-500 ring-2 ring-blue-500/15 shadow-xs'
            : 'border-slate-200 hover:border-blue-300 hover:shadow-xs'
        }`}
      >
        <span className={`flex-1 text-left truncate tabular-nums ${
          display ? 'font-semibold text-slate-800' : 'font-normal text-slate-400'
        }`}>
          {display || placeholder}
        </span>
        <Calendar className={`${isForm ? 'w-4 h-4' : 'w-3.5 h-3.5'} shrink-0 ${open ? 'text-blue-500' : 'text-slate-400'}`} />
      </button>

      {open &&
        coords &&
        createPortal(
          <div
            ref={panelRef}
            style={{ left: `${coords.left}px`, top: `${coords.top}px`, width: `${coords.width}px` }}
            className="fixed z-[70] bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden"
          >
            <div className="p-3.5">
              {/* Cabecera: navegar mes + titulo mes/ano */}
              <div className="flex items-center justify-between gap-1 mb-2">
                <button
                  type="button"
                  onClick={() => (mode === 'days' ? moveMonth(-1) : setView((v) => ({ ...v, y: Math.max(yearMin, v.y - 1) })))}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition cursor-pointer"
                  aria-label="Anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setMode((m) => (m === 'days' ? 'months' : 'days'))}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[13px] font-bold text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                >
                  <span>{MESES[view.m - 1]} de {view.y}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${mode === 'months' ? 'rotate-180' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => (mode === 'days' ? moveMonth(1) : setView((v) => ({ ...v, y: Math.min(yearMax, v.y + 1) })))}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition cursor-pointer"
                  aria-label="Siguiente"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {mode === 'days' ? (
                <>
                  <div className="grid grid-cols-7 gap-1 mb-1">
                    {DIAS_SEMANA.map((d, i) => (
                      <span key={i} className="h-7 flex items-center justify-center text-[10px] font-bold text-slate-400">
                        {d}
                      </span>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {cells.map((c) => {
                      const isSel = pending === c.ymd;
                      const isToday = today === c.ymd;
                      const ok = inRange(c.ymd);
                      return (
                        <button
                          key={c.ymd}
                          type="button"
                          disabled={!ok}
                          onClick={() => setPending(c.ymd)}
                          className={`h-8 w-8 mx-auto rounded-full text-[13px] tabular-nums transition flex items-center justify-center ${
                            !ok
                              ? 'text-slate-300 cursor-not-allowed'
                              : isSel
                              ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/30 cursor-pointer'
                              : c.outside
                              ? 'text-slate-300 hover:bg-slate-100 cursor-pointer'
                              : isToday
                              ? 'text-blue-700 font-bold ring-1 ring-blue-500 hover:bg-blue-50 cursor-pointer'
                              : 'text-slate-700 hover:bg-blue-50 hover:text-blue-700 font-medium cursor-pointer'
                          }`}
                        >
                          {c.d}
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-3 gap-1.5">
                  {MESES.map((label, idx) => {
                    const active = view.m === idx + 1;
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => {
                          setView((v) => ({ ...v, m: idx + 1 }));
                          setMode('days');
                        }}
                        className={`px-2 py-2 rounded-xl text-xs transition cursor-pointer ${
                          active
                            ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/30'
                            : 'text-slate-600 hover:bg-blue-50 hover:text-blue-700 font-medium'
                        }`}
                      >
                        {label.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Pie: Borrar / Hoy / Cancelar / Confirmar */}
              <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-slate-100">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      if (value !== '' && typeof onChange === 'function') onChange('');
                    }}
                    className="px-2.5 py-1.5 text-xs font-semibold text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                  >
                    Borrar
                  </button>
                  <button
                    type="button"
                    onClick={() => commit(today)}
                    className="px-2.5 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                  >
                    Hoy
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => commit(pending || '')}
                    disabled={!pending}
                    className="px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md shadow-blue-500/25 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
