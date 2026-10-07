import React, { useEffect, useRef, useState } from 'react';

/**
 * SafeApexChart
 *
 * Renderizado robusto de ApexCharts (evita los cuadros en blanco de
 * react-apexcharts en React 19) con 3 optimizaciones de rendimiento:
 * 1. Import dinámico: la librería (~600KB) se carga solo cuando un gráfico
 *    la necesita, no en el bundle inicial.
 * 2. Puerta de visibilidad: no se instancia nada hasta que el contenedor
 *    está por entrar al viewport (IntersectionObserver).
 * 3. Actualización in-place: si solo cambian los datos, se usa
 *    `updateOptions` en vez de destruir y recrear el gráfico.
 */
export default function SafeApexChart({
  options = {},
  series = [],
  type = 'line',
  height = 260,
  width = '100%',
  className = '',
  loadingText = 'Cargando visualización...',
  ...rest
}) {
  const wrapRef = useRef(null);
  const chartElRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const apexLibRef = useRef(null);
  const shapeRef = useRef({ type: null, height: null, width: null });
  const [ready, setReady] = useState(false);
  const [isRendered, setIsRendered] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const numHeight = typeof height === 'number' ? height : parseInt(height, 10) || 260;

  const optsKey = JSON.stringify(options);
  const seriesKey = JSON.stringify(series);

  // 1. Puerta de visibilidad: montar solo al acercarse al viewport
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setReady(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setReady(true);
          io.disconnect();
        }
      },
      { rootMargin: '320px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // 2. Carga diferida de la librería + render / actualización
  useEffect(() => {
    if (!ready || !chartElRef.current) return;
    let isCancelled = false;

    const chartType = type || options.chart?.type || 'line';
    const chartHeight = height || options.chart?.height || 260;
    const chartWidth = width || options.chart?.width || '100%';
    const shapeChanged =
      shapeRef.current.type !== chartType ||
      shapeRef.current.height !== chartHeight ||
      shapeRef.current.width !== chartWidth;

    const finalOptions = {
      ...options,
      chart: {
        ...(options.chart || {}),
        type: chartType,
        height: chartHeight,
        width: chartWidth,
        animations: { enabled: true, easing: 'easeinout', speed: 300 },
      },
      series: series,
    };

    const ensureLib = async () => {
      if (!apexLibRef.current) {
        const mod = await import('apexcharts');
        const Apex = mod?.default || mod;
        if (typeof window !== 'undefined' && !window.ApexCharts) {
          window.ApexCharts = Apex;
        }
        apexLibRef.current = Apex;
      }
      return apexLibRef.current;
    };

    const run = async () => {
      try {
        const Apex = await ensureLib();
        if (isCancelled || !chartElRef.current) return;

        // Actualización in-place cuando solo cambian datos/opciones
        if (chartInstanceRef.current && !shapeChanged) {
          try {
            await chartInstanceRef.current.updateOptions(finalOptions, true, true);
            if (!isCancelled) setIsRendered(true);
            return;
          } catch (e) {
            // Si falla la actualización, se recrea abajo
          }
        }

        // Recreación completa (primera vez o cambio de tipo/tamaño)
        if (chartInstanceRef.current) {
          try { chartInstanceRef.current.destroy(); } catch (e) {}
          chartInstanceRef.current = null;
        }
        if (chartElRef.current) chartElRef.current.innerHTML = '';

        const chart = new Apex(chartElRef.current, finalOptions);
        chartInstanceRef.current = chart;
        shapeRef.current = { type: chartType, height: chartHeight, width: chartWidth };
        await chart.render();
        if (!isCancelled) setIsRendered(true);
      } catch (err) {
        if (!isCancelled) {
          console.error('SafeApexChart: Error al renderizar ApexCharts:', err);
          setLoadError(err?.message || 'Error al cargar el gráfico');
        }
      }
    };

    // Pequeño diferido para no competir con el pintado inicial
    const timer = setTimeout(run, 30);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, optsKey, seriesKey, type, height, width]);

  // Limpieza total al desmontar
  useEffect(() => {
    return () => {
      if (chartInstanceRef.current) {
        try { chartInstanceRef.current.destroy(); } catch (e) {}
        chartInstanceRef.current = null;
      }
      if (chartElRef.current) chartElRef.current.innerHTML = '';
    };
  }, []);

  // Manejo de redimensionado automático vía ResizeObserver nativo
  useEffect(() => {
    const el = chartElRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;

    const ro = new ResizeObserver(() => {
      if (chartInstanceRef.current && typeof chartInstanceRef.current.windowResize === 'function') {
        chartInstanceRef.current.windowResize();
      }
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, [ready]);

  return (
    <div
      ref={wrapRef}
      className={`w-full relative ${className}`}
      style={{ minHeight: `${numHeight}px` }}
    >
      <div
        ref={chartElRef}
        className="w-full h-full"
        style={{ minHeight: `${numHeight}px` }}
      />
      {!isRendered && !loadError && (
        <div className="absolute inset-0 flex items-center justify-center text-[11px] text-slate-400 pointer-events-none">
          {loadingText}
        </div>
      )}
    </div>
  );
}
