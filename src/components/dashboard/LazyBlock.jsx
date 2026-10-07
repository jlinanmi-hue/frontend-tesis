import React, { useEffect, useRef, useState } from 'react';

/**
 * LazyBlock
 * Monta a sus hijos solo cuando están por entrar al viewport.
 * Evita renderizar todos los gráficos pesados del dashboard de golpe
 * en la carga inicial (ApexCharts es costoso de instanciar).
 */
export default function LazyBlock({ children, minHeight = 220, rootMargin = '320px', className = '' }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  if (!visible) {
    return <div ref={ref} className={className} style={{ minHeight }} aria-hidden="true" />;
  }
  return <>{children}</>;
}
