/**
 * Utilidades y Formateadores Semánticos para el Dashboard Ejecutivo
 * Comercial Valencia - Adaptado a usuario no técnico (Cero jerga técnica)
 */

/**
 * Formatea la variación porcentual con tendencia y coloración semántica accesible
 * @param {number|null} delta - Diferencia respecto al período anterior (ej: +15.7 o -4.6)
 * @param {boolean} isInverted - Si true, un delta menor es mejor (ej. errores o quiebres)
 */
export function formatVariacion(delta, isInverted = false) {
  if (delta === null || delta === undefined || isNaN(delta)) {
    return null;
  }

  const num = Number(delta);
  const esPositivo = num >= 0;
  const esBueno = isInverted ? num <= 0 : num >= 0;

  const signo = esPositivo ? '+' : '';
  const texto = `${signo}${num.toFixed(1)}%`;
  const flecha = esPositivo ? '▲' : '▼';

  return {
    raw: num,
    texto,
    flecha,
    badgeText: `${flecha} ${texto}`,
    esBueno,
    colorClass: esBueno ? 'text-emerald-700' : 'text-rose-700',
    bgClass: esBueno ? 'bg-emerald-50 border-emerald-200/80' : 'bg-rose-50 border-rose-200/80',
    badgeClass: esBueno
      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
      : 'bg-rose-50 text-rose-700 border border-rose-200/80',
  };
}

/**
 * Resuelve el semáforo de 3 niveles con paleta accesible WCAG AA
 * @param {number} valor 
 * @param {number} meta 
 * @param {'mayor_mejor'|'menor_mejor'} tipo 
 */
export function getSemaforo(valor, meta, tipo = 'mayor_mejor') {
  const v = Number(valor) || 0;
  const m = Number(meta) || 0;

  if (tipo === 'mayor_mejor') {
    if (v >= m) {
      return {
        status: 'OPTIMO',
        label: 'Excelente',
        dotColor: 'bg-emerald-500',
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        textColor: 'text-emerald-700',
      };
    }
    if (v >= m * 0.90) {
      return {
        status: 'ALERTA',
        label: 'Atención',
        dotColor: 'bg-amber-500',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
        textColor: 'text-amber-700',
      };
    }
    return {
      status: 'CRITICO',
      label: 'Acción Requerida',
      dotColor: 'bg-rose-500',
      badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
      textColor: 'text-rose-700',
    };
  }

  // Menor es mejor (PEOR, PRS, TBPP)
  if (v <= m) {
    return {
      status: 'OPTIMO',
      label: 'Bajo Control',
      dotColor: 'bg-emerald-500',
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      textColor: 'text-emerald-700',
    };
  }
  if (v <= m * 1.5) {
    return {
      status: 'ALERTA',
      label: 'Atención',
      dotColor: 'bg-amber-500',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
      textColor: 'text-amber-700',
    };
  }
  return {
    status: 'CRITICO',
    label: 'Crítico',
    dotColor: 'bg-rose-500',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
    textColor: 'text-rose-700',
  };
}

/**
 * Calcula el Score General de Salud del Negocio (0 a 100)
 * Normalizado con techos para evitar penalizaciones negativas arbitrarias
 */
export function calcularScoreGeneral(indicators) {
  if (!indicators) return 80;

  const pode = Number(indicators.pode?.resultado ?? 90);
  const peor = Number(indicators.peor?.resultado ?? 2);
  const prs  = Number(indicators.prs?.resultado ?? 2);
  const tbpp = Number(indicators.tbpp?.resultado ?? 60);

  // 1. PODE (40% de peso): 95% es 100 pts
  const sPode = Math.min(100, Math.max(0, (pode / 95) * 100));

  // 2. PEOR (20% de peso): 2% o menos es 100 pts, 10% es 0 pts
  const sPeor = Math.min(100, Math.max(0, 100 - (peor / 2) * 25));

  // 3. PRS (20% de peso): 3% o menos es 100 pts, 15% es 0 pts
  const sPrs = Math.min(100, Math.max(0, 100 - (prs / 3) * 25));

  // 4. TBPP (20% de peso): 60s o menos es 100 pts, 180s es 75 pts, 300s es 25 pts
  const sTbpp = Math.min(100, Math.max(0, 100 - (Math.max(0, tbpp - 40) / 260) * 100));

  const scoreTotal = (sPode * 0.40) + (sPeor * 0.20) + (sPrs * 0.20) + (sTbpp * 0.20);
  return Math.round(scoreTotal);
}

/**
 * Traduce el estado global a una frase de negocio no técnica de 1 línea
 */
export function fraseResumen(score, indicators) {
  const pode = indicators?.pode?.resultado;
  const prs = indicators?.prs?.resultado;
  const peor = indicators?.peor?.resultado;

  if (score >= 85) {
    if (pode && pode >= 95) {
      return `Operación fluida: el ${pode}% de los pedidos se despacharon a tiempo y sin reclamos esta semana.`;
    }
    return 'Ritmo operativo óptimo: las entregas marchan a tiempo y el inventario se mantiene estable.';
  }

  if (score >= 70) {
    if (prs && prs > 3) {
      return `Atención requerida: se detectaron quiebres de stock en pedidos recientes que requieren reposición.`;
    }
    if (peor && peor > 2) {
      return `Atención en recepción: la tasa de correcciones en pedidos (${peor}%) superó el nivel deseado.`;
    }
    return 'Operación en marcha con desvíos leves: revise los pedidos demorados y el stock de reposición.';
  }

  return 'Alerta operativa: múltiples órdenes registran demoras o falta de stock. Revise los pedidos por atender.';
}
