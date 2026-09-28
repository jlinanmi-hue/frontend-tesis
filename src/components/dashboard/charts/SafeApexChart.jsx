import React, { useEffect, useRef, useState } from 'react';
import ApexCharts from 'apexcharts';

// Interoperabilidad segura ESM / CJS para Vite y Rollup
const Apex = ApexCharts?.default || ApexCharts;

// Garantizar que window.ApexCharts esté disponible globalmente para exportación PNG y utilidades
if (typeof window !== 'undefined' && !window.ApexCharts) {
  window.ApexCharts = Apex;
}

/**
 * SafeApexChart
 *
 * Implementación canónica y robusta basada directamente en vanilla ApexCharts.
 * Elimina la dependencia de react-apexcharts que genera fallos silenciosos y cuadros
 * en blanco en React 19 debido a StrictMode, destrucciones prematuras en renders
 * asíncronos y contenedores div sin altura explícita.
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
  const chartElRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const [isRendered, setIsRendered] = useState(false);

  const numHeight = typeof height === 'number' ? height : parseInt(height, 10) || 260;

  // Renderizado / Actualización del gráfico
  useEffect(() => {
    let isCancelled = false;

    // Destruir instancia anterior si existía y limpiar el contenedor
    if (chartInstanceRef.current) {
      try {
        chartInstanceRef.current.destroy();
      } catch (e) {}
      chartInstanceRef.current = null;
    }
    if (chartElRef.current) {
      chartElRef.current.innerHTML = '';
    }

    if (!chartElRef.current) return;

    const chartType = type || options.chart?.type || 'line';
    const chartHeight = height || options.chart?.height || 260;
    const chartWidth = width || options.chart?.width || '100%';

    const finalOptions = {
      ...options,
      chart: {
        ...(options.chart || {}),
        type: chartType,
        height: chartHeight,
        width: chartWidth,
      },
      series: series,
    };

    const renderChart = async () => {
      if (isCancelled || !chartElRef.current) return;
      try {
        const chart = new Apex(chartElRef.current, finalOptions);
        chartInstanceRef.current = chart;
        await chart.render();
        if (!isCancelled) {
          setIsRendered(true);
        }
      } catch (err) {
        console.error('SafeApexChart: Error al renderizar ApexCharts:', err);
      }
    };

    // Pequeño timeout (20ms) para garantizar que el DOM esté calculado y dimensionado
    const timer = setTimeout(renderChart, 20);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
      if (chartInstanceRef.current) {
        try {
          chartInstanceRef.current.destroy();
        } catch (e) {}
        chartInstanceRef.current = null;
      }
      if (chartElRef.current) {
        chartElRef.current.innerHTML = '';
      }
    };
  }, [
    JSON.stringify(options),
    JSON.stringify(series),
    type,
    height,
    width,
  ]);

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
  }, []);

  return (
    <div
      className={`w-full relative ${className}`}
      style={{ minHeight: `${numHeight}px` }}
    >
      <div
        ref={chartElRef}
        className="w-full h-full"
        style={{ minHeight: `${numHeight}px` }}
      />
    </div>
  );
}
