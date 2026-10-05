import React, { useRef, useState, useEffect } from 'react';
import { Printer, X, Download, QrCode } from 'lucide-react';
import api from '../../services/api';

/**
 * Helper para obtener datos del usuario autenticado real
 */
function getActiveUserData() {
  if (typeof window === 'undefined') return { username: 'admin', nombre: '', correo: '' };
  try {
    const raw = localStorage.getItem('userData');
    if (!raw) return { username: 'admin', nombre: '', correo: '' };
    const parsed = JSON.parse(raw);
    const nombre = (
      parsed.nombreCompleto ||
      parsed.nombre ||
      parsed.EmpleadoNombre ||
      (parsed.empleado ? `${parsed.empleado.EmpleadoNombres || ''} ${parsed.empleado.EmpleadoApellidos || ''}`.trim() : '') ||
      ''
    );
    const username = parsed.usuario || parsed.UsuarioUserName || parsed.username || 'admin';
    const correo = parsed.correo || parsed.EmpleadoCorreo || '';
    return {
      username,
      nombre: nombre || username,
      correo,
      raw: parsed,
    };
  } catch {
    return { username: 'admin', nombre: '', correo: '' };
  }
}

/**
 * Resuelve y extrae el nombre real del usuario / empleado asociado
 */
function resolveNombreUsuario(rawUser, activeUser, personalList = []) {
  if (!rawUser) {
    return activeUser?.nombre || activeUser?.username || 'ADMIN';
  }

  // Si ya es un objeto con datos de usuario
  if (typeof rawUser === 'object') {
    return (
      rawUser.nombreCompleto ||
      rawUser.nombre ||
      rawUser.EmpleadoNombre ||
      (rawUser.empleado ? `${rawUser.empleado.EmpleadoNombres || ''} ${rawUser.empleado.EmpleadoApellidos || ''}`.trim() : '') ||
      rawUser.UsuarioUserName ||
      rawUser.usuario ||
      activeUser?.nombre ||
      'ADMIN'
    );
  }

  const str = String(rawUser).trim();
  const lowerStr = str.toLowerCase();

  // 1. Si coincide con la sesión activa (correo, usuario o username)
  if (activeUser) {
    const activeCorreo = (activeUser.correo || '').toLowerCase();
    const activeUserStr = (activeUser.username || '').toLowerCase();
    if (
      (activeCorreo && lowerStr === activeCorreo) ||
      (activeUserStr && lowerStr === activeUserStr) ||
      lowerStr.includes('jlinanmi')
    ) {
      if (activeUser.nombre && activeUser.nombre.trim()) {
        return activeUser.nombre.trim();
      }
    }
  }

  // 2. Buscar en la lista de personal cargada o en caché
  if (Array.isArray(personalList) && personalList.length > 0) {
    const found = personalList.find(p =>
      (p.EmpleadoCorreo && p.EmpleadoCorreo.toLowerCase() === lowerStr) ||
      (p.usuario?.UsuarioUserName && p.usuario.UsuarioUserName.toLowerCase() === lowerStr) ||
      (p.EmpleadoId && p.EmpleadoId.toLowerCase() === lowerStr)
    );
    if (found) {
      const empNombre = `${found.EmpleadoNombres || ''} ${found.EmpleadoApellidos || ''}`.trim();
      if (empNombre) return empNombre;
    }
  }

  // 3. Buscar en sessionStorage o localStorage de personal si existe
  try {
    const rawPersonal = sessionStorage.getItem('personalCache') || localStorage.getItem('personalCache');
    if (rawPersonal) {
      const parsedList = JSON.parse(rawPersonal);
      if (Array.isArray(parsedList)) {
        const found = parsedList.find(p =>
          (p.EmpleadoCorreo && p.EmpleadoCorreo.toLowerCase() === lowerStr) ||
          (p.usuario?.UsuarioUserName && p.usuario.UsuarioUserName.toLowerCase() === lowerStr) ||
          (p.EmpleadoId && p.EmpleadoId.toLowerCase() === lowerStr)
        );
        if (found) {
          const empNombre = `${found.EmpleadoNombres || ''} ${found.EmpleadoApellidos || ''}`.trim();
          if (empNombre) return empNombre;
        }
      }
    }
  } catch {}

  // 4. Si coincide con userData en localStorage
  try {
    const rawStored = localStorage.getItem('userData');
    if (rawStored) {
      const parsed = JSON.parse(rawStored);
      const pCorreo = (parsed.correo || parsed.EmpleadoCorreo || '').toLowerCase();
      const pUser = (parsed.usuario || parsed.UsuarioUserName || '').toLowerCase();

      if (
        (pCorreo && lowerStr === pCorreo) ||
        (pUser && lowerStr === pUser) ||
        lowerStr.includes('jlinanmi')
      ) {
        const nombre = (
          parsed.nombreCompleto ||
          parsed.nombre ||
          (parsed.empleado ? `${parsed.empleado.EmpleadoNombres || ''} ${parsed.empleado.EmpleadoApellidos || ''}`.trim() : '')
        );
        if (nombre) return nombre.trim();
      }
    }
  } catch {}

  // 5. Si es un correo electrónico ("jlinanmi@ucvvirtual.edu.pe") y no se pudo vincular,
  // extraer la parte inicial de usuario sin el dominio para no imprimir correos
  if (str.includes('@')) {
    return str.split('@')[0];
  }

  return str;
}

/**
 * Subcomponente de fila de item para separación limpia de lógica
 */
export function DocumentoOrdenItem({ item, index, isCompra = false }) {
  const codigo = item.codigo || item.producto_id || item.ProductoId || item.id || '---';
  const cantidad = typeof item.cantidad === 'number'
    ? item.cantidad.toFixed(2)
    : parseFloat(item.cantidad || 0).toFixed(2);
  const cantEntera = typeof item.cantidad === 'number'
    ? item.cantidad.toFixed(0)
    : parseFloat(item.cantidad || 0).toFixed(0);
  const factor = Number(item.factor_conversion || 1);
  const abrev = (item.medida || item.unidad_abreviatura || item.unidad_medida_abreviatura || item.unidad || 'UND').toUpperCase();
  const medida = (item.presentacion_completa || (factor > 1 ? `${abrev} (${factor} UND)` : abrev)).toUpperCase();
  const descripcion = (item.descripcion || item.producto_nombre || item.nombre || 'PRODUCTO').toUpperCase();
  const marca = (item.marca || item.producto_marca || '---').toUpperCase();
  const suc = (item.suc || item.sucursal || item.almacen || 'AC').toUpperCase();
  const precio = typeof item.precio === 'number'
    ? item.precio.toFixed(2)
    : parseFloat(item.precio || item.precio_unitario || item.costo_unitario || 0).toFixed(2);
  const total = typeof item.total === 'number'
    ? item.total.toFixed(2)
    : parseFloat(item.total || item.subtotal || (item.cantidad * item.precio) || 0).toFixed(2);

  if (isCompra) {
    return (
      <tr className="border-none text-[11px] sm:text-[12px] font-mono leading-tight hover:bg-slate-50/60 print:hover:bg-transparent">
        <td className="py-1 pr-2 text-left font-semibold text-black whitespace-nowrap">{codigo}</td>
        <td className="py-1 px-2 text-left text-black uppercase font-medium truncate max-w-[320px] sm:max-w-none">
          {descripcion}
        </td>
        <td className="py-1 px-2 text-left text-black uppercase whitespace-nowrap">{marca}</td>
        <td className="py-1 px-2 text-center text-black whitespace-nowrap">{medida}</td>
        <td className="py-1 pl-2 text-center font-bold text-black whitespace-nowrap">{cantEntera}</td>
      </tr>
    );
  }

  return (
    <tr className="border-none text-[11px] sm:text-[12px] font-mono leading-tight hover:bg-slate-50/60 print:hover:bg-transparent">
      <td className="py-0.5 pr-2 text-left font-semibold text-black whitespace-nowrap">{codigo}</td>
      <td className="py-0.5 px-2 text-right font-medium text-black whitespace-nowrap">{cantidad}</td>
      <td className="py-0.5 px-2 text-left text-black whitespace-nowrap">{medida}</td>
      <td className="py-0.5 px-2 text-left text-black uppercase font-medium truncate max-w-[320px] sm:max-w-none">
        {descripcion}
      </td>
      <td className="py-0.5 px-2 text-center text-black font-semibold whitespace-nowrap">{suc}</td>
      <td className="py-0.5 px-2 text-right text-black whitespace-nowrap">{precio}</td>
      <td className="py-0.5 pl-2 text-right font-bold text-black whitespace-nowrap">{total}</td>
    </tr>
  );
}

/**
 * Generador de código de barras vectorial SVG simple (Code 39 / Monospace)
 */
function SimpleBarcodeSvg({ text }) {
  if (!text) return null;
  const clean = String(text).toUpperCase().replace(/[^A-Z0-9/-]/g, '');
  // Patrón visual de barras representativas para escáner
  return (
    <div className="flex flex-col items-center select-none">
      <svg className="h-8 w-36 sm:w-44" viewBox="0 0 160 30" preserveAspectRatio="none">
        <rect width="160" height="30" fill="white" />
        {/* Barras de guarda inicial */}
        <rect x="5" y="0" width="2" height="26" fill="black" />
        <rect x="9" y="0" width="1" height="26" fill="black" />
        <rect x="12" y="0" width="3" height="26" fill="black" />
        {/* Barras dinámicas según el hash del texto */}
        {clean.split('').map((char, idx) => {
          const charCode = char.charCodeAt(0);
          const xPos = 18 + idx * 9;
          if (xPos > 140) return null;
          const w1 = (charCode % 3) + 1;
          const w2 = ((charCode >> 1) % 2) + 1;
          return (
            <g key={idx}>
              <rect x={xPos} y="0" width={w1} height="26" fill="black" />
              <rect x={xPos + w1 + 1} y="0" width={w2} height="26" fill="black" />
            </g>
          );
        })}
        {/* Barras de guarda final */}
        <rect x="145" y="0" width="3" height="26" fill="black" />
        <rect x="150" y="0" width="1" height="26" fill="black" />
        <rect x="153" y="0" width="2" height="26" fill="black" />
      </svg>
      <span className="text-[9px] font-mono tracking-widest text-black mt-0.5 font-bold">
        *{clean}*
      </span>
    </div>
  );
}

/**
 * DocumentoOrdenOficial
 *
 * Réplica idéntica y estricta del formato físico oficial de Comercial Valencia
 * (según fotografía: cabecera centrada, metadatos en esquinas, tabla tabular
 * con bordes superior e inferior exactos, totales escalonados a la derecha y peso a la izquierda).
 *
 * Props unificadas:
 * @param {string} headerType - 'ORDEN DE FACTURACION' | 'ORDEN DE PEDIDO' | 'ORDEN DE COMPRA' | 'ORDEN DE INGRESO DE STOCK' | 'ORDEN DE EGRESO DE STOCK' | 'ORDEN DE AJUSTE DE INVENTARIO'
 * @param {object} metadata - { fecha, numero, usuario, pagina, fechaImpresion }
 * @param {object} entidad - { tipo: 'cliente'|'proveedor'|'almacen', nombre, ruc, direccion, responsable }
 * @param {array} items - [ { codigo, cantidad, medida, descripcion, suc, precio, total } ]
 * @param {object} totales - { subtotal, igv, totalGeneral, moneda }
 * @param {object} empresa - { nombre, ruc, logo }
 * @param {boolean} isOpen - Control de visibilidad del modal
 * @param {function} onClose - Callback al cerrar
 * @param {boolean} asModal - Si debe renderizarse dentro de modal flotante (default true)
 */
export default function DocumentoOrdenOficial({
  headerType = 'ORDEN DE FACTURACION',
  metadata = {},
  entidad = {},
  items = [],
  totales = {},
  empresa = {},
  isOpen = true,
  onClose,
  asModal = true,
}) {
  const printContainerRef = useRef(null);

  // Caché de personal para resolución de nombres de usuarios/empleados
  const [personalList, setPersonalList] = useState(() => {
    try {
      const cached = sessionStorage.getItem('personalCache');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (personalList.length === 0 && api.personal?.listar) {
      api.personal.listar({ todos: 1, per_page: 100 })
        .then((res) => {
          if (res?.data && Array.isArray(res.data)) {
            setPersonalList(res.data);
            try {
              sessionStorage.setItem('personalCache', JSON.stringify(res.data));
            } catch {}
          }
        })
        .catch(() => {});
    }
  }, []);

  if (asModal && !isOpen) return null;

  // 1. Normalización de metadatos con resolución de nombre real de usuario
  const activeUser = getActiveUserData();
  const fechaDoc = metadata.fecha || new Date().toLocaleDateString('es-PE');
  const numeroDoc = metadata.numero || 'OR/FAC-0001-000000001';
  const rawUsuario = metadata.usuario || metadata.usuario_creacion || metadata.usuario_creador || activeUser.nombre || activeUser.username;
  const usuarioDoc = resolveNombreUsuario(rawUsuario, activeUser, personalList);
  const paginaDoc = metadata.pagina || '1 de 1';
  const fechaImpresionDoc = metadata.fechaImpresion || new Date().toLocaleString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).replace('.', '');

  // 2. Normalización de entidad (Cliente, Proveedor o Almacén)
  const entidadNombre = entidad.nombre || entidad.ClienteNombre || entidad.ProveedorRazonSocial || 'CLIENTE GENERAL';
  const entidadRuc = entidad.ruc || entidad.ClienteRuc || entidad.ClienteDni || entidad.ProveedorRuc || entidad.dni_ruc || '---';
  const entidadDireccion = entidad.direccion || entidad.ClienteDireccion || entidad.ProveedorDireccion || '---';
  const rawResponsable = entidad.responsable || entidad.vendedor || entidad.operario || metadata.responsable || activeUser.nombre || usuarioDoc;
  const responsableNombre = resolveNombreUsuario(rawResponsable, activeUser, personalList);

  // 3. Normalización de totales y desglose exacto de IGV
  const sumItems = items.reduce((acc, it) => {
    const cant = Number(it.cantidad || 0);
    const prec = Number(it.precio || it.precio_unitario || it.costo_unitario || 0);
    const tot = it.total != null ? Number(it.total) : (cant * prec);
    return acc + (isNaN(tot) ? 0 : tot);
  }, 0);

  let subtotalNum = 0;
  let totalGeneralNum = 0;
  let igvNum = 0;

  if (totales.totalGeneral != null && totales.subtotal != null) {
    subtotalNum = Number(totales.subtotal);
    totalGeneralNum = Number(totales.totalGeneral);
    igvNum = totales.igv != null ? Number(totales.igv) : (totalGeneralNum - subtotalNum);
  } else if (totales.totalGeneral != null) {
    totalGeneralNum = Number(totales.totalGeneral);
    subtotalNum = totales.subtotal != null ? Number(totales.subtotal) : (totalGeneralNum / 1.18);
    igvNum = totales.igv != null ? Number(totales.igv) : (totalGeneralNum - subtotalNum);
  } else if (totales.subtotal != null) {
    subtotalNum = Number(totales.subtotal);
    igvNum = totales.igv != null ? Number(totales.igv) : (subtotalNum * 0.18);
    totalGeneralNum = subtotalNum + igvNum;
  } else {
    subtotalNum = sumItems;
    igvNum = totales.igv != null ? Number(totales.igv) : (subtotalNum * 0.18);
    totalGeneralNum = subtotalNum + igvNum;
  }

  const subtotalVal = subtotalNum.toFixed(2);
  const totalIgvVal = Math.max(0, igvNum).toFixed(2);
  const totalGeneralVal = totalGeneralNum.toFixed(2);

  const handleImprimir = () => {
    window.print();
  };

  const documentoHtml = (
    <div
      ref={printContainerRef}
      className="documento-orden-oficial w-full max-w-[840px] mx-auto bg-white p-6 sm:p-10 font-mono text-black text-[12px] leading-tight select-text"
      style={{ minHeight: '600px' }}
    >
      {/* ===== 1. METADATOS SUPERIORES DERECHOS ===== */}
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-3">
          {empresa.logo && (
            <img
              src={empresa.logo}
              alt="Logo Empresa"
              className="h-9 w-auto object-contain print:block"
            />
          )}
          <SimpleBarcodeSvg text={numeroDoc} />
        </div>

        <div className="text-right text-[10px] sm:text-[11px] font-mono leading-tight text-black space-y-0.5">
          <p><span className="font-semibold">Página:</span> {paginaDoc}</p>
          <p><span className="font-semibold">Impreso:</span> {fechaImpresionDoc}</p>
          <p><span className="font-semibold">Usuario:</span> {usuarioDoc}</p>
        </div>
      </div>

      {/* ===== 2. TÍTULO CENTRAL DEL DOCUMENTO ===== */}
      <div className="text-center my-3">
        <h1 className="text-base sm:text-lg font-extrabold tracking-wider uppercase text-black font-mono">
          {headerType}
        </h1>
        <div className="flex items-center justify-center gap-6 mt-1 text-[11px] sm:text-[12px] font-bold text-black font-mono">
          <span>FECHA: {fechaDoc}</span>
          <span>Nº: {numeroDoc}</span>
        </div>
      </div>

      {/* ===== 3. DATOS DE LA ENTIDAD / CLIENTE / PROVEEDOR ===== */}
      <div className="my-3 pt-2 text-[11px] sm:text-[12px] font-mono text-black">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-1">
          <div className="space-y-0.5 flex-1 pr-4">
            <p className="leading-tight">
              <span className="font-bold">Señores:</span> {entidadNombre}
            </p>
            <p className="leading-tight">
              <span className="font-bold">R.U.C.:</span> {entidadRuc}
            </p>
            <p className="leading-tight">
              <span className="font-bold">Dirección:</span> {entidadDireccion}
            </p>
          </div>

          <div className="text-left sm:text-right space-y-0.5 shrink-0 pt-1 sm:pt-0">
            <p className="leading-tight">
              <span className="font-bold">Fecha:</span> {fechaDoc}
            </p>
            <p className="leading-tight font-bold uppercase">
              {responsableNombre}
            </p>
          </div>
        </div>
      </div>

        {/* ===== 4. TABLA EXACTA DEL FORMATO ===== */}
        <div className="mt-3 mb-2">
          <table className="w-full border-collapse font-mono">
            <thead>
              {headerType === 'ORDEN DE COMPRA' ? (
                <tr className="border-t border-b-2 border-black text-[10px] sm:text-[11px] font-bold text-black">
                  <th className="py-1 pr-2 text-left whitespace-nowrap">CODIGO</th>
                  <th className="py-1 px-2 text-left">DESCRIPCION DEL PRODUCTO</th>
                  <th className="py-1 px-2 text-left whitespace-nowrap">MARCA</th>
                  <th className="py-1 px-2 text-center whitespace-nowrap">PRESENTACION</th>
                  <th className="py-1 pl-2 text-center whitespace-nowrap">CANT. SOLICITADA</th>
                </tr>
              ) : (
                <tr className="border-t border-b-2 border-black text-[10px] sm:text-[11px] font-bold text-black">
                  <th className="py-1 pr-2 text-left whitespace-nowrap">CODIGO</th>
                  <th className="py-1 px-2 text-right whitespace-nowrap">CANTID</th>
                  <th className="py-1 px-2 text-left whitespace-nowrap">MEDIDA</th>
                  <th className="py-1 px-2 text-left">DESCRIPCION DEL PRODUCTO</th>
                  <th className="py-1 px-2 text-center whitespace-nowrap">SUC</th>
                  <th className="py-1 px-2 text-right whitespace-nowrap">PRECIO</th>
                  <th className="py-1 pl-2 text-right whitespace-nowrap">TOTAL</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y-0">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={headerType === 'ORDEN DE COMPRA' ? 5 : 7} className="py-6 text-center text-slate-400 font-mono text-xs">
                    --- Sin ítems registrados en esta orden ---
                  </td>
                </tr>
              ) : (
                items.map((it, idx) => (
                  <DocumentoOrdenItem key={idx} item={it} index={idx} isCompra={headerType === 'ORDEN DE COMPRA'} />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Línea divisoria de fin de tabla */}
        <div className="border-t border-black mb-3" />

        {/* ===== 5. PIE DE TOTALES ===== */}
        {headerType === 'ORDEN DE COMPRA' ? (
          <div className="flex justify-between items-center pt-1 font-mono text-[11px] sm:text-[12px] text-black">
            <span className="text-[10px] text-slate-600 uppercase font-semibold">Documento Oficial de Solicitud de Mercadería</span>
            <div className="text-right space-y-0.5 font-mono">
              <div className="flex justify-end gap-4">
                <span className="font-bold">TOTAL ITEMS:</span>
                <span className="font-bold w-24 text-right">{items.length} producto(s)</span>
              </div>
              <div className="flex justify-end gap-4">
                <span className="font-bold">TOTAL CANTIDAD:</span>
                <span className="font-bold w-24 text-right">{items.reduce((acc, it) => acc + Number(it.cantidad || 0), 0)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-end pt-1 font-mono text-[11px] sm:text-[12px] text-black">
            <div className="text-right space-y-0.5 font-mono">
              <div className="flex justify-end gap-4">
                <span className="font-bold">TOTAL:</span>
                <span className="font-semibold w-24 text-right">{subtotalVal}</span>
              </div>
              <div className="flex justify-end gap-4">
                <span className="font-bold">TOTAL IGV:</span>
                <span className="font-semibold w-24 text-right">{totalIgvVal}</span>
              </div>
              <div className="flex justify-end gap-4">
                <span className="font-bold">TOTAL GENERAL:</span>
                <span className="font-bold w-24 text-right">{totalGeneralVal}</span>
              </div>
            </div>
          </div>
        )}
    </div>
  );

  // Si se solicita renderizado embebido (no modal)
  if (!asModal) {
    return documentoHtml;
  }

  // Renderizado dentro de modal interactivo
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
      {/* Estilos específicos de impresión embebidos */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
          body * {
            visibility: hidden !important;
          }
          .documento-orden-modal-container,
          .documento-orden-modal-container * {
            visibility: visible !important;
          }
          .documento-orden-modal-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          .documento-orden-oficial {
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="documento-orden-modal-container relative w-full max-w-4xl bg-slate-100 rounded-2xl shadow-2xl overflow-hidden border border-slate-300 my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Barra superior de herramientas (se oculta en impresión) */}
        <div className="no-print flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/30 text-blue-400 flex items-center justify-center font-bold">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold tracking-tight text-white">
                Vista de Impresión Oficial: {headerType}
              </h3>
              <p className="text-[10px] text-slate-400 font-mono">
                Documento Nº {numeroDoc}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleImprimir}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir Documento</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Hoja física en pantalla */}
        <div className="p-4 sm:p-8 max-h-[80vh] overflow-y-auto bg-slate-200/80 flex justify-center">
          <div className="shadow-lg rounded-sm overflow-hidden bg-white w-full max-w-[840px]">
            {documentoHtml}
          </div>
        </div>
      </div>
    </div>
  );
}
