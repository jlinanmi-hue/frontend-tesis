import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Layers,
  Activity,
  AlertTriangle,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import api from '../services/api';
import IndicatorCard from './dashboard/IndicatorCard';
import IndicatorModal from './dashboard/IndicatorModal';
import LazyBlock from './dashboard/LazyBlock';

// Bloques Ejecutivos
import DashboardStickyFilters from './dashboard/executive/DashboardStickyFilters';
import EstadoGeneralCard from './dashboard/executive/EstadoGeneralCard';
import ResumenHoyStrip from './dashboard/executive/ResumenHoyStrip';
import EvolucionSemanalChart from './dashboard/executive/EvolucionSemanalChart';
import PerdidaPedidosChart from './dashboard/executive/PerdidaPedidosChart';
import DificultadesCalendario from './dashboard/executive/DificultadesCalendario';
import TopCausasProblemas from './dashboard/executive/TopCausasProblemas';
import PedidosPorAtenderList from './dashboard/executive/PedidosPorAtenderList';
import AsistenteIaAccordion from './dashboard/executive/AsistenteIaAccordion';

// Caché en memoria del dashboard: el backend recalcula agregados pesados,
// así se sirve al instante al repetir filtros y se revalida en fondo.
const EJEC_TTL_MS = 60_000;
const IND_TTL_MS = 120_000;
const ejecCache = new Map();
let indCache = { ts: 0, data: null };

export default function Dashboard() {
  const [dias, setDias] = useState(7);
  const [canal, setCanal] = useState('');
  const [zona, setZona] = useState('');

  const [ejecutivoData, setEjecutivoData] = useState(null);
  const [indicators, setIndicators] = useState(null);
  const [selectedIndicator, setSelectedIndicator] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const reqIdRef = useRef(0);
  const abortRef = useRef(null);
  const hasDataRef = useRef(false);
  const feedbackTimerRef = useRef(null);

  const cargarDatos = useCallback(async ({ force = false, silent = false } = {}) => {
    const myId = ++reqIdRef.current;
    if (abortRef.current) {
      try { abortRef.current.abort(); } catch (e) {}
    }
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const key = `${dias}|${canal}|${zona}`;
    const now = Date.now();
    const hit = ejecCache.get(key);
    const ejecFresh = hit && (now - hit.ts) < EJEC_TTL_MS;
    const indFresh = indCache.data && (now - indCache.ts) < IND_TTL_MS;

    // Vía rápida: caché vigente se muestra al instante y se revalida en fondo
    if (!force && ejecFresh) {
      setEjecutivoData(hit.data);
      hasDataRef.current = true;
      if (indFresh) setIndicators(indCache.data);
      setError(null);
      setLoading(false);
    } else if (!silent) {
      if (hasDataRef.current) setRefreshing(true);
      else setLoading(true);
    }
    if (!ejecFresh) setError(null);

    try {
      // En paralelo (antes eran secuenciales: el doble de espera)
      const [sE, sI] = await Promise.allSettled([
        api.dashboard.ejecutivo(
          { dias, canal_id: canal || undefined, zona_id: zona || undefined },
          { signal: ctrl.signal, timeout: 20000 }
        ),
        api.dashboard.indicators({}, { signal: ctrl.signal, timeout: 20000 }),
      ]);
      if (reqIdRef.current !== myId) return; // ciclo ya superado por otro más nuevo

      const rE = sE.status === 'fulfilled' ? sE.value : null;
      const rI = sI.status === 'fulfilled' ? sI.value : null;

      if (rE && rE.success && rE.data) {
        ejecCache.set(key, { ts: Date.now(), data: rE.data });
        setEjecutivoData(rE.data);
        hasDataRef.current = true;
        setError(null);
      } else if (!hasDataRef.current) {
        const reason = sE.status === 'rejected' ? sE.reason : null;
        if (reason?.aborted) return;
        throw new Error(rE?.message || reason?.message || 'Error al obtener resumen ejecutivo');
      }
      if (rI && rI.success && rI.data) {
        indCache = { ts: Date.now(), data: rI.data };
        setIndicators(rI.data);
      }
      // Si falla solo indicators, las cards usan sus valores de respaldo: no se bloquea
    } catch (err) {
      if (reqIdRef.current !== myId) return;
      if (err?.aborted || err?.name === 'AbortError') return; // cancelado por un ciclo nuevo
      console.error('Error al cargar datos del dashboard ejecutivo:', err);
      if (!hasDataRef.current) {
        setError(err?.message || 'No se pudo conectar con el servidor.');
      }
    } finally {
      if (reqIdRef.current === myId) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [dias, canal, zona]);

  useEffect(() => {
    cargarDatos();

    // El feedback de la IA revalida en fondo con debounce (evita tormentas de recargas)
    const handleFeedbackRecorded = () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = setTimeout(() => {
        cargarDatos({ force: true, silent: true });
      }, 2000);
    };

    window.addEventListener('valencia-ai:feedback-recorded', handleFeedbackRecorded);
    return () => {
      window.removeEventListener('valencia-ai:feedback-recorded', handleFeedbackRecorded);
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
      if (abortRef.current) {
        try { abortRef.current.abort(); } catch (e) {}
      }
    };
  }, [cargarDatos]);

  const cards = useMemo(() => [
    { id: 1, key: 'pode', data: indicators?.pode },
    { id: 3, key: 'prs', data: indicators?.prs },
    { id: 4, key: 'tbpp', data: indicators?.tbpp },
  ], [indicators]);

  return (
    <div className="p-4 sm:p-8 lg:p-10 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      
      {/* Cabecera Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="bg-blue-600 text-white p-2 rounded-xl shadow-xs">
              <Layers className="w-5 h-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
              Dashboard de Métricas e Indicadores
            </h1>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm mt-1 leading-relaxed">
            Panel ejecutivo de control para optimización de pedidos e inventario asistido por IA.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50/70 text-blue-600 border border-blue-200/80 rounded-full text-xs font-semibold shadow-2xs">
            <Activity className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
            <span>Métricas en Vivo</span>
          </div>
        </div>
      </div>

      {/* 1. Bloque 1: Filtros Globales Sticky */}
      <DashboardStickyFilters
        dias={dias}
        onChangeDias={setDias}
        canal={canal}
        onChangeCanal={setCanal}
        zona={zona}
        onChangeZona={setZona}
        loading={loading || refreshing}
        onRefresh={() => cargarDatos({ force: true })}
      />

      {/* Manejo de Estados de Error con Botón de Reintentar */}
      {error && !ejecutivoData ? (
        <div className="bg-white rounded-2xl p-8 border border-rose-200 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">
              No se pudo cargar el resumen ejecutivo
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Ocurrió un inconveniente al conectar con el servidor o procesar los datos de las órdenes.
            </p>
          </div>
          <button
            type="button"
            onClick={() => cargarDatos({ force: true })}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs shadow-xs transition active:scale-95 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reintentar</span>
          </button>
        </div>
      ) : loading && !ejecutivoData ? (
        /* Skeletons de Carga Inicial */
        <div className="space-y-6 animate-pulse">
          <div className="h-44 bg-slate-100 rounded-2xl" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-56 bg-slate-100 rounded-2xl" />
            <div className="h-56 bg-slate-100 rounded-2xl" />
            <div className="h-56 bg-slate-100 rounded-2xl" />
          </div>
          <div className="h-20 bg-slate-100 rounded-2xl" />
          <div className="h-72 bg-slate-100 rounded-2xl" />
        </div>
      ) : (
        <>
          {/* 2. Bloque 2: Estado General del Negocio */}
          <EstadoGeneralCard
            estado={ejecutivoData?.estado_general}
            indicators={indicators}
          />

          {/* 3. Bloque 3: Tres Cards Principales (PODE con PEOR strip, PRS, TBPP) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-800">
                  Indicadores Principales de Desempeño
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Haz clic en cualquier indicador para abrir sus subgráficos analíticos y detalle profundo.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5 lg:gap-6 [&>*]:min-w-0">
              {cards.map((card) => (
                <IndicatorCard
                  key={card.id}
                  id={card.id}
                  data={card.data}
                  peorData={card.id === 1 ? indicators?.peor : undefined}
                  onOpenPeor={() => setSelectedIndicator({ id: 2, key: 'peor', data: indicators?.peor })}
                  onClick={() => setSelectedIndicator(card)}
                />
              ))}
            </div>
          </div>

          {/* 4. Bloque 4: Mini-Strip "Resumen de Hoy" */}
          <ResumenHoyStrip resumen={ejecutivoData?.resumen_hoy} />

          {/* 5. Bloque 5: Evolución Semanal (montaje diferido: gráfico pesado) */}
          <LazyBlock minHeight={340}>
            <EvolucionSemanalChart evolucionData={ejecutivoData?.evolucion_semanal} />
          </LazyBlock>

          {/* Gráficos Operativos en Grid de 2 Columnas: Bloques 6 y 7 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6 items-start [&>*]:min-w-0">
            {/* 6. Bloque 6: Pérdida de Pedidos */}
            <LazyBlock minHeight={300}>
              <PerdidaPedidosChart perdidaData={ejecutivoData?.perdida_pedidos} />
            </LazyBlock>

            {/* 7. Bloque 7: Dificultades en el Trabajo (Calendario) */}
            <LazyBlock minHeight={300}>
              <DificultadesCalendario calendarioData={ejecutivoData?.calendario_dificultades} />
            </LazyBlock>
          </div>

          {/* Gráficos Operativos en Grid de 2 Columnas: Bloques 8 y 9 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6 items-start [&>*]:min-w-0">
            {/* 8. Bloque 8: Principales Causas de Problema (Podio Top 3) */}
            <LazyBlock minHeight={280}>
              <TopCausasProblemas causasData={ejecutivoData?.top_causas} />
            </LazyBlock>

            {/* 9. Bloque 9: Pedidos por Atender (Lista Urgente) */}
            <LazyBlock minHeight={280}>
              <PedidosPorAtenderList
                pedidosData={ejecutivoData?.pedidos_por_atender}
                onOpenPedido={(id) => {
                  window.location.hash = `#/pedidos?buscar=${id}`;
                }}
              />
            </LazyBlock>
          </div>

          {/* 10. Bloque 10: Uso del Asistente IA (Colapsable al Final) */}
          <LazyBlock minHeight={120}>
            <AsistenteIaAccordion />
          </LazyBlock>
        </>
      )}

      {/* Modal Interactivo de Subgráficos Detallados (Nivel 2) */}
      {selectedIndicator && (
        <IndicatorModal
          indicatorId={selectedIndicator.id}
          indicatorData={selectedIndicator.data}
          onClose={() => setSelectedIndicator(null)}
        />
      )}

    </div>
  );
}
