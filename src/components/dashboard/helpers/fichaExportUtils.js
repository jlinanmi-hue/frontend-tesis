import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Utilidades de Exportación Académica de Fichas de Observación
 * Genera archivos .xlsx y .pdf que replican exactamente los instrumentos
 * metodológicos de la tesis para Comercial Valencia S.A.C.
 */

// ============================================================================
// 1. EXPORTACIÓN DE FICHA DIARIA (Detalle Fila por Fila con Resumen al Pie)
// ============================================================================

/**
 * Exportar Ficha Diaria a Excel (.xlsx)
 */
export function exportarFichaDiariaAExcel(fichaData) {
  if (!fichaData || !fichaData.columnas || !fichaData.filas) {
    throw new Error('Datos incompletos para generar el archivo Excel.');
  }

  const { indicador, titulo, variable, fecha_formateada, formula, meta, columnas, filas, resumen } = fichaData;

  const sheetData = [];

  // Encabezado institucional de la ficha
  sheetData.push(['FICHA DE OBSERVACIÓN DIARIA — INSTRUMENTO DE MEDICIÓN DE TESIS']);
  sheetData.push(['EMPRESA:', 'Comercial Valencia S.A.C.']);
  sheetData.push(['VARIABLE:', variable || 'Gestión de pedidos']);
  sheetData.push(['INDICADOR:', `${indicador} — ${titulo}`]);
  sheetData.push(['FÓRMULA:', formula, 'META:', meta || '']);
  sheetData.push(['FECHA EVALUADA:', fecha_formateada, 'TOTAL REGISTROS:', filas.length]);
  sheetData.push(['FECHA DE EMISIÓN:', new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })]);
  sheetData.push([]);

  // Cabecera de la tabla
  const headers = columnas.map(c => c.label);
  sheetData.push(headers);

  // Filas individuales de cada orden/pedido
  filas.forEach(f => {
    const row = columnas.map(c => f[c.key] ?? '');
    sheetData.push(row);
  });

  // Fila de resumen al pie
  sheetData.push([]);
  const resumenRow = new Array(columnas.length).fill('');
  resumenRow[0] = 'RESUMEN CONSOLIDADO DEL DÍA:';

  if (indicador === 'PODE') {
    resumenRow[1] = `Total: ${resumen.total_ordenes}`;
    resumenRow[2] = `Despachadas: ${resumen.despachadas}`;
    resumenRow[3] = `No despachadas: ${resumen.no_despachadas}`;
    resumenRow[4] = `% Éxito (PODE): ${resumen.porcentaje_exito}%`;
    resumenRow[5] = `Estado: ${resumen.estado}`;
  } else if (indicador === 'PRS') {
    resumenRow[1] = `Total Pedidos: ${resumen.total_pedidos}`;
    resumenRow[2] = `Con Rotura: ${resumen.pedidos_con_rotura}`;
    resumenRow[3] = `Sin Rotura: ${resumen.pedidos_sin_rotura}`;
    resumenRow[4] = `% Rotura (PRS): ${resumen.porcentaje_rotura}%`;
    resumenRow[5] = `Promedio: ${resumen.promedio_roturas_pedido}`;
  } else if (indicador === 'TBPP') {
    resumenRow[1] = `Total Órdenes: ${resumen.total_ordenes}`;
    resumenRow[2] = `Tiempo Total: ${resumen.tiempo_total_min} min`;
    resumenRow[3] = `Tiempo Promedio: ${resumen.tiempo_promedio_min} min`;
    resumenRow[4] = `Estado: ${resumen.estado}`;
  }
  sheetData.push(resumenRow);

  // Crear libro
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  const colWidths = columnas.map(c => ({ wch: Math.max(c.width || 15, c.label.length + 4) }));
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  const sheetName = `Ficha_${indicador}`.substring(0, 31);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const cleanDate = (fecha_formateada || 'dia').replace(/\//g, '-');
  const filename = `Ficha_Diaria_${indicador}_${cleanDate}_${Date.now()}.xlsx`;
  XLSX.writeFile(wb, filename);
  return filename;
}

/**
 * Exportar Ficha Diaria a PDF (.pdf)
 */
export function exportarFichaDiariaAPDF(fichaData) {
  if (!fichaData || !fichaData.columnas || !fichaData.filas) {
    throw new Error('Datos incompletos para generar el archivo PDF.');
  }

  const { indicador, titulo, variable, fecha_formateada, formula, meta, columnas, filas, resumen } = fichaData;

  const isLandscape = columnas.length >= 6;
  const doc = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Membrete superior
  doc.setFillColor(30, 58, 138); // Blue 900
  doc.rect(14, 12, pageWidth - 28, 1.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(30, 41, 59);
  doc.text('FICHA DE OBSERVACIÓN DIARIA — INSTRUMENTO DE MEDICIÓN DE TESIS', 14, 20);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Comercial Valencia S.A.C. • Fecha Evaluada: ${fecha_formateada} • Emisión: ${new Date().toLocaleDateString('es-PE')}`, 14, 25);

  // Tarjeta de Metadatos
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 28, pageWidth - 28, 24, 2, 2, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);

  // Columna 1
  doc.text('Variable:', 18, 34);
  doc.setFont('helvetica', 'normal');
  doc.text(variable || 'Gestión de pedidos', 40, 34);

  doc.setFont('helvetica', 'bold');
  doc.text('Indicador:', 18, 40);
  doc.setFont('helvetica', 'normal');
  doc.text(`${indicador} — ${titulo}`, 40, 40);

  doc.setFont('helvetica', 'bold');
  doc.text('Fórmula:', 18, 46);
  doc.setFont('helvetica', 'normal');
  doc.text(formula || '', 40, 46);

  // Columna 2
  const col2X = isLandscape ? 175 : 125;
  doc.setFont('helvetica', 'bold');
  doc.text('Meta:', col2X, 34);
  doc.setFont('helvetica', 'normal');
  doc.text(meta || '', col2X + 22, 34);

  doc.setFont('helvetica', 'bold');
  doc.text('Total Registros:', col2X, 40);
  doc.setFont('helvetica', 'normal');
  doc.text(`${filas.length} registros individuales`, col2X + 28, 40);

  // Tabla
  const headers = [columnas.map(c => c.label)];
  const rows = filas.map(f => columnas.map(c => String(f[c.key] ?? '')));

  // Fila de resumen al pie
  const footRow = new Array(columnas.length).fill('');
  footRow[0] = 'RESUMEN AL PIE:';

  if (indicador === 'PODE') {
    footRow[1] = `Total: ${resumen.total_ordenes}`;
    footRow[2] = `Despachadas: ${resumen.despachadas}`;
    footRow[3] = `No Desp.: ${resumen.no_despachadas}`;
    footRow[4] = `% Éxito: ${resumen.porcentaje_exito}%`;
    footRow[columnas.length - 1] = `Estado: ${resumen.estado}`;
  } else if (indicador === 'PRS') {
    footRow[1] = `Total: ${resumen.total_pedidos}`;
    footRow[2] = `Con Rotura: ${resumen.pedidos_con_rotura}`;
    footRow[3] = `Sin Rotura: ${resumen.pedidos_sin_rotura}`;
    footRow[4] = `% Rotura: ${resumen.porcentaje_rotura}%`;
    footRow[columnas.length - 1] = `Promedio: ${resumen.promedio_roturas_pedido}`;
  } else if (indicador === 'TBPP') {
    footRow[1] = `Total: ${resumen.total_ordenes}`;
    footRow[2] = `Tiempo Total: ${resumen.tiempo_total_min} min`;
    footRow[3] = `Promedio: ${resumen.tiempo_promedio_min} min`;
    footRow[columnas.length - 1] = `Estado: ${resumen.estado}`;
  }

  autoTable(doc, {
    startY: 56,
    head: headers,
    body: rows,
    foot: [footRow],
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2.2,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 14, right: 14 },
  });

  const cleanDate = (fecha_formateada || 'dia').replace(/\//g, '-');
  const filename = `Ficha_Diaria_${indicador}_${cleanDate}_${Date.now()}.pdf`;
  doc.save(filename);
  return filename;
}

// ============================================================================
// 2. EXPORTACIÓN DE REPORTE CONSOLIDADO (Semanal / Mensual sobre Totales)
// ============================================================================

/**
 * Exportar Reporte Consolidado a Excel (.xlsx)
 */
export function exportarConsolidadoAExcel(consolidadoData) {
  if (!consolidadoData || !consolidadoData.columnas || !consolidadoData.filas) {
    throw new Error('Datos incompletos para generar el archivo Excel.');
  }

  const { titulo, tipo, anio, columnas, filas, totales_consolidados } = consolidadoData;

  const sheetData = [];

  // Encabezado institucional
  sheetData.push(['REPORTE CONSOLIDADO DE INDICADORES — INSTRUMENTO DE MEDICIÓN DE TESIS']);
  sheetData.push(['EMPRESA:', 'Comercial Valencia S.A.C.']);
  sheetData.push(['AGRUPACIÓN:', `Consolidado ${tipo.toUpperCase()} (${anio})`]);
  sheetData.push(['MÉTODO DE CÁLCULO:', 'Calculado sobre sumatorias totales del período (∑), sin promediar valores diarios']);
  sheetData.push(['FECHA DE EMISIÓN:', new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })]);
  sheetData.push([]);

  // Cabecera
  const headers = columnas.map(c => c.label);
  sheetData.push(headers);

  // Filas por semana o mes
  filas.forEach(f => {
    const row = columnas.map(c => f[c.key] ?? '');
    sheetData.push(row);
  });

  // Fila de totales consolidados al pie
  sheetData.push([]);
  const totRow = new Array(columnas.length).fill('');
  totRow[0] = 'TOTALES DEL PERÍODO (∑):';
  totRow[1] = totales_consolidados.total_pedidos;
  totRow[2] = totales_consolidados.total_ordenes;
  totRow[3] = `${totales_consolidados.pode}%`;
  totRow[4] = `${totales_consolidados.prs}%`;
  totRow[5] = `${totales_consolidados.tbpp} min`;
  totRow[6] = totales_consolidados.pedidos_con_rotura;
  totRow[7] = totales_consolidados.promedio_roturas_pedido;
  sheetData.push(totRow);

  // Crear hoja y libro
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  const colWidths = columnas.map(c => ({ wch: Math.max(c.width || 15, c.label.length + 4) }));
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  const sheetName = `Consolidado_${tipo}`.substring(0, 31);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const filename = `Reporte_Consolidado_${tipo}_${anio}_${Date.now()}.xlsx`;
  XLSX.writeFile(wb, filename);
  return filename;
}

/**
 * Exportar Reporte Consolidado a PDF (.pdf)
 */
export function exportarConsolidadoAPDF(consolidadoData) {
  if (!consolidadoData || !consolidadoData.columnas || !consolidadoData.filas) {
    throw new Error('Datos incompletos para generar el archivo PDF.');
  }

  const { titulo, tipo, anio, columnas, filas, totales_consolidados } = consolidadoData;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Membrete superior
  doc.setFillColor(30, 58, 138); // Blue 900
  doc.rect(14, 12, pageWidth - 28, 1.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(30, 41, 59);
  doc.text('REPORTE CONSOLIDADO DE INDICADORES — INSTRUMENTO DE MEDICIÓN DE TESIS', 14, 20);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Comercial Valencia S.A.C. • ${titulo} • Fecha de Emisión: ${new Date().toLocaleDateString('es-PE')}`, 14, 25);

  // Cuadro informativo metodológico
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 28, pageWidth - 28, 18, 2, 2, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Método de Cálculo:', 18, 34);
  doc.setFont('helvetica', 'normal');
  doc.text('Indicadores calculados sobre sumatorias totales del período (∑), garantizando rigor estadístico sin promediar porcentajes.', 52, 34);

  doc.setFont('helvetica', 'bold');
  doc.text('Período Evaluado:', 18, 41);
  doc.setFont('helvetica', 'normal');
  doc.text(`Año ${anio} (${filas.length} períodos registrados)`, 52, 41);

  // Tabla
  const headers = [columnas.map(c => c.label)];
  const rows = filas.map(f => columnas.map(c => {
    if (c.key === 'pode' || c.key === 'prs') return `${f[c.key]}%`;
    if (c.key === 'tbpp') return `${f[c.key]} min`;
    return String(f[c.key] ?? '');
  }));

  // Fila de pie de tabla con totales consolidados
  const footRow = [
    'TOTALES DEL PERÍODO (∑):',
    String(totales_consolidados.total_pedidos),
    String(totales_consolidados.total_ordenes),
    `${totales_consolidados.pode}%`,
    `${totales_consolidados.prs}%`,
    `${totales_consolidados.tbpp} min`,
    String(totales_consolidados.pedidos_con_rotura),
    String(totales_consolidados.promedio_roturas_pedido),
  ];

  autoTable(doc, {
    startY: 50,
    head: headers,
    body: rows,
    foot: [footRow],
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2.4,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      halign: 'center',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold' },
      1: { halign: 'center' },
      2: { halign: 'center' },
      3: { halign: 'center' },
      4: { halign: 'center' },
      5: { halign: 'center' },
      6: { halign: 'center' },
      7: { halign: 'center' },
    },
    margin: { left: 14, right: 14 },
  });

  const filename = `Reporte_Consolidado_${tipo}_${anio}_${Date.now()}.pdf`;
  doc.save(filename);
  return filename;
}

// ============================================================================
// 3. EXPORTACIÓN DE DETALLE DIARIO POR SEMANA (Desglose con Fila de Totales)
// ============================================================================

/**
 * Exportar Detalle Diario por Semana a Excel (.xlsx)
 */
export function exportarDetalleDiarioPorSemanaAExcel(detalleSemana) {
  if (!detalleSemana || !detalleSemana.columnas || !detalleSemana.dias) {
    throw new Error('Datos incompletos para generar el archivo Excel.');
  }

  const { titulo, anio, semana, columnas, dias, totales_semana } = detalleSemana;

  const sheetData = [];

  // Encabezado institucional
  sheetData.push(['DETALLE DIARIO POR SEMANA — INSTRUMENTO DE MEDICIÓN DE TESIS']);
  sheetData.push(['EMPRESA:', 'Comercial Valencia S.A.C.']);
  sheetData.push(['TÍTULO:', titulo]);
  sheetData.push(['PERÍODO:', `Semana ${semana} (Año ${anio})`]);
  sheetData.push(['MÉTODO DE CÁLCULO:', 'Días calculados individualmente. Fila de totales consolidada sobre sumas totales (∑), sin promediar porcentajes.']);
  sheetData.push(['FECHA DE EMISIÓN:', new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })]);
  sheetData.push([]);

  // Cabecera
  const headers = columnas.map(c => c.label);
  sheetData.push(headers);

  // Filas por día
  dias.forEach(d => {
    const row = columnas.map(c => d[c.key] ?? '');
    sheetData.push(row);
  });

  // Fila de totales al pie
  sheetData.push([]);
  const totRow = [
    totales_semana.semana,
    totales_semana.dia || '',
    totales_semana.fecha || '',
    totales_semana.total_pedidos,
    totales_semana.total_ordenes,
    `${totales_semana.pode}%`,
    `${totales_semana.prs}%`,
    `${totales_semana.tbpp} min`,
    totales_semana.pedidos_con_rotura,
    totales_semana.promedio_roturas_pedido,
  ];
  sheetData.push(totRow);

  // Hoja y Libro
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  const colWidths = columnas.map(c => ({ wch: Math.max(c.width || 15, c.label.length + 4) }));
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  const sheetName = `Semana_${semana}`.substring(0, 31);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const filename = `Detalle_Diario_Semana_${semana}_${anio}_${Date.now()}.xlsx`;
  XLSX.writeFile(wb, filename);
  return filename;
}

/**
 * Exportar Detalle Diario por Semana a PDF (.pdf)
 */
export function exportarDetalleDiarioPorSemanaAPDF(detalleSemana) {
  if (!detalleSemana || !detalleSemana.columnas || !detalleSemana.dias) {
    throw new Error('Datos incompletos para generar el archivo PDF.');
  }

  const { titulo, anio, semana, columnas, dias, totales_semana } = detalleSemana;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Membrete superior
  doc.setFillColor(30, 58, 138); // Blue 900
  doc.rect(14, 12, pageWidth - 28, 1.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(30, 41, 59);
  doc.text('DETALLE DIARIO POR SEMANA — INSTRUMENTO DE MEDICIÓN DE TESIS', 14, 20);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Comercial Valencia S.A.C. • ${titulo} • Fecha de Emisión: ${new Date().toLocaleDateString('es-PE')}`, 14, 25);

  // Cuadro informativo
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 28, pageWidth - 28, 18, 2, 2, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Principio de Cálculo:', 18, 34);
  doc.setFont('helvetica', 'normal');
  doc.text('Indicadores calculados día a día. La fila de totales consolida la semana sobre sumatorias totales (∑), sin promediar porcentajes.', 55, 34);

  doc.setFont('helvetica', 'bold');
  doc.text('Período Evaluado:', 18, 41);
  doc.setFont('helvetica', 'normal');
  doc.text(`Semana ${semana} del Año ${anio} (${dias.length} días operativos registrados)`, 55, 41);

  // Tabla
  const headers = [columnas.map(c => c.label)];
  const rows = dias.map(d => columnas.map(c => {
    if (c.key === 'pode' || c.key === 'prs') return `${d[c.key]}%`;
    if (c.key === 'tbpp') return `${d[c.key]} min`;
    return String(d[c.key] ?? '');
  }));

  const footRow = [
    totales_semana.semana,
    totales_semana.dia || '',
    totales_semana.fecha || '',
    String(totales_semana.total_pedidos),
    String(totales_semana.total_ordenes),
    `${totales_semana.pode}%`,
    `${totales_semana.prs}%`,
    `${totales_semana.tbpp} min`,
    String(totales_semana.pedidos_con_rotura),
    String(totales_semana.promedio_roturas_pedido),
  ];

  autoTable(doc, {
    startY: 50,
    head: headers,
    body: rows,
    foot: [footRow],
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2.3,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      halign: 'center',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold' },
      1: { halign: 'left' },
      2: { halign: 'center' },
      3: { halign: 'center' },
      4: { halign: 'center' },
      5: { halign: 'center' },
      6: { halign: 'center' },
      7: { halign: 'center' },
      8: { halign: 'center' },
      9: { halign: 'center' },
    },
    margin: { left: 14, right: 14 },
  });

  const filename = `Detalle_Diario_Semana_${semana}_${anio}_${Date.now()}.pdf`;
  doc.save(filename);
  return filename;
}

// ============================================================================
// 4. COMPATIBILIDAD RETROACTIVA
// ============================================================================
export const exportarFichaAExcel = exportarFichaDiariaAExcel;
export const exportarFichaAPDF = exportarFichaDiariaAPDF;

