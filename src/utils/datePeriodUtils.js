/**
 * Utilidades para manejo de Semanas ISO y Rangos de Fechas
 * Comercial Valencia - Dashboard de Gestión
 */

/**
 * Obtiene la fecha de inicio (lunes) y fin (domingo) para una semana ISO dada.
 * Formato esperado: "YYYY-Www" (ej: "2026-W37")
 */
export function obtenerRangoDeSemanaIso(semanaStr) {
  if (!semanaStr || typeof semanaStr !== 'string') {
    const hoy = new Date();
    return {
      fechaInicio: hoy.toISOString().split('T')[0],
      fechaFin: hoy.toISOString().split('T')[0],
      label: 'Semana Actual',
    };
  }

  const partes = semanaStr.split('-W');
  const year = parseInt(partes[0], 10) || 2026;
  const week = parseInt(partes[1], 10) || 1;

  // Algoritmo estándar ISO 8601 para calcular el lunes de la semana
  // El 4 de enero siempre está en la semana 1
  const jan4 = new Date(year, 0, 4);
  const dayOfWeekJan4 = jan4.getDay() || 7; // 1 (Lun) a 7 (Dom)
  const mondayWeek1 = new Date(jan4);
  mondayWeek1.setDate(jan4.getDate() - (dayOfWeekJan4 - 1));

  const startMonday = new Date(mondayWeek1);
  startMonday.setDate(mondayWeek1.getDate() + (week - 1) * 7);

  const endSunday = new Date(startMonday);
  endSunday.setDate(startMonday.getDate() + 6);

  const formatYMD = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dia}`;
  };

  const formatDM = (d) => {
    const dia = String(d.getDate()).padStart(2, '0');
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${dia}/${m}`;
  };

  const inicioStr = formatYMD(startMonday);
  const finStr = formatYMD(endSunday);
  const label = `Semana ${week} (${formatDM(startMonday)} – ${formatDM(endSunday)}/${year})`;

  return {
    year,
    week,
    fechaInicio: inicioStr,
    fechaFin: finStr,
    label,
  };
}

/**
 * Genera el listado completo de semanas ISO para un año determinado (1 a 52).
 * Por defecto ordenado descendente (de la más reciente a la más antigua).
 */
export function generarSemanasDelAno(year = 2026, ordenDescendente = true) {
  const semanas = [];
  for (let w = 1; w <= 52; w++) {
    const padW = String(w).padStart(2, '0');
    const isoKey = `${year}-W${padW}`;
    const rango = obtenerRangoDeSemanaIso(isoKey);
    semanas.push({
      key: isoKey,
      numero: w,
      year,
      label: rango.label,
      fechaInicio: rango.fechaInicio,
      fechaFin: rango.fechaFin,
    });
  }

  if (ordenDescendente) {
    return semanas.reverse();
  }
  return semanas;
}

/**
 * Calcula la semana ISO previa a la indicada.
 * ej: "2026-W37" -> "2026-W36", "2026-W01" -> "2025-W52"
 */
export function obtenerSemanaAnterior(semanaStr) {
  if (!semanaStr || typeof semanaStr !== 'string') {
    return '2026-W36';
  }
  const partes = semanaStr.split('-W');
  const year = parseInt(partes[0], 10) || 2026;
  const week = parseInt(partes[1], 10) || 1;

  if (week > 1) {
    const prevWeek = String(week - 1).padStart(2, '0');
    return `${year}-W${prevWeek}`;
  }

  // Si es semana 1, retroceder al año anterior
  return `${year - 1}-W52`;
}

/**
 * Normaliza un período de entrada (semana o rango personalizado) a objeto homogéneo
 */
export function normalizarPeriodo(periodo) {
  if (!periodo) {
    const defaultRango = obtenerRangoDeSemanaIso('2026-W37');
    return {
      tipo: 'week',
      valor: '2026-W37',
      fechaInicio: defaultRango.fechaInicio,
      fechaFin: defaultRango.fechaFin,
      label: defaultRango.label,
    };
  }

  if (typeof periodo === 'string') {
    if (periodo.includes('-W')) {
      const rango = obtenerRangoDeSemanaIso(periodo);
      return {
        tipo: 'week',
        valor: periodo,
        fechaInicio: rango.fechaInicio,
        fechaFin: rango.fechaFin,
        label: rango.label,
      };
    }

    // Si es formato mes "YYYY-MM"
    if (/^\d{4}-\d{2}$/.test(periodo)) {
      const [y, m] = periodo.split('-').map(Number);
      const ultimoDia = new Date(y, m, 0).getDate();
      return {
        tipo: 'month',
        valor: periodo,
        fechaInicio: `${periodo}-01`,
        fechaFin: `${periodo}-${String(ultimoDia).padStart(2, '0')}`,
        label: `Mes ${periodo}`,
      };
    }
  }

  if (typeof periodo === 'object') {
    if (periodo.tipo === 'custom') {
      const d1 = periodo.desde || periodo.fechaInicio;
      const d2 = periodo.hasta || periodo.fechaFin || d1;
      return {
        tipo: 'custom',
        valor: `${d1}_${d2}`,
        fechaInicio: d1,
        fechaFin: d2,
        label: `Rango: ${d1} al ${d2}`,
      };
    }

    if (periodo.tipo === 'week' && periodo.valor) {
      const rango = obtenerRangoDeSemanaIso(periodo.valor);
      return {
        tipo: 'week',
        valor: periodo.valor,
        fechaInicio: rango.fechaInicio,
        fechaFin: rango.fechaFin,
        label: rango.label,
      };
    }
  }

  const def = obtenerRangoDeSemanaIso('2026-W37');
  return {
    tipo: 'week',
    valor: '2026-W37',
    fechaInicio: def.fechaInicio,
    fechaFin: def.fechaFin,
    label: def.label,
  };
}

/**
 * Evalúa si dos períodos son exactamente iguales en rango de fechas
 */
export function sonPeriodosIguales(perA, perB) {
  const normA = normalizarPeriodo(perA);
  const normB = normalizarPeriodo(perB);
  return normA.fechaInicio === normB.fechaInicio && normA.fechaFin === normB.fechaFin;
}

/**
 * Calcula la variación matemática entre Período A y Período B
 * Convención: diff = Valor_B - Valor_A
 * Evalúa el semáforo 'favorable' según la meta oficial de cada indicador de la Tesis:
 * - PODE: Meta >= 95% (Mayor es mejor -> diff >= 0 es favorable)
 * - PEOR: Meta <= 1%  (Menor es mejor -> diff <= 0 es favorable)
 * - PRS:  Meta <= 2%  (Menor es mejor -> diff <= 0 es favorable)
 * - TBPP: Meta <= 10s (Menor es mejor -> diff <= 0 es favorable)
 */
export function calcularVariacionKpi(valA, valB, tipoIndicador) {
  const numA = Number(valA) || 0;
  const numB = Number(valB) || 0;
  const diff = Number((numB - numA).toFixed(2));
  const absDiff = Math.abs(diff);

  const esPorcentaje = ['PODE', 'PEOR', 'PRS'].includes(tipoIndicador);
  const unidad = esPorcentaje ? 'pp' : 's'; // pp = puntos porcentuales, s = segundos

  let favorable = false;
  let esEstable = absDiff === 0;

  if (tipoIndicador === 'PODE') {
    // Para PODE, un aumento en B respecto a A es favorable
    favorable = diff >= 0;
  } else {
    // Para PEOR, PRS y TBPP, una reducción en B respecto a A es favorable
    favorable = diff <= 0;
  }

  return {
    valA: numA,
    valB: numB,
    diff,
    absDiff,
    unidad,
    favorable,
    esEstable,
    signo: diff > 0 ? '+' : (diff < 0 ? '-' : ''),
    formattedDiff: `${diff > 0 ? '+' : ''}${diff.toFixed(1)} ${unidad}`,
  };
}
