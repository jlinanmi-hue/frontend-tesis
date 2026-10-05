/**
 * Cliente de Conexión API REST - Backend Laravel (Comercial Valencia)
 * Conexión nativa con fetch, manejo uniforme de errores y soporte CORS.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';

/**
 * Petición genérica con manejo de cabeceras JSON y respuestas estandarizadas
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers = {
    'Accept': 'application/json',
    ...(options.headers || {}),
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const config = {
    ...options,
    headers,
    credentials: 'omit', // o 'include' si se usan sesiones por cookies
  };

  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }

  try {
    const response = await fetch(url, config);
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMsg = data?.message || `Error del servidor (${response.status})`;
      const error = new Error(errorMsg);
      error.status = response.status;
      error.data = data;
      error.errors = data?.errors || null;
      throw error;
    }

    return data;
  } catch (error) {
    if (!error.status) {
      // Error de red o servidor backend apagado
      const networkError = new Error('No se pudo conectar con el servidor backend (127.0.0.1:8000). Asegúrate de que "php artisan serve" esté ejecutándose.');
      networkError.status = 0;
      throw networkError;
    }
    throw error;
  }
}

export const api = {
  // 1. MÓDULO DE AUTENTICACIÓN
  auth: {
    login: (username, password) =>
      request('/auth/login', {
        method: 'POST',
        body: { username, password },
      }),
    logout: () =>
      request('/auth/logout', {
        method: 'POST',
      }),
  },

  // 2. MÓDULO DE PERSONAL / USUARIOS
  personal: {
    listar: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/personal${query ? `?${query}` : ''}`);
    },
    cargos: () => request('/personal/cargos'),
    obtener: (id) => request(`/personal/${id}`),
    crear: (datos) =>
      request('/personal', {
        method: 'POST',
        body: datos,
      }),
    actualizar: (id, datos) =>
      request(`/personal/${id}`, {
        method: 'PUT',
        body: datos,
      }),
    cambiarPassword: (id, datos) =>
      request(`/personal/${id}/password`, {
        method: 'PATCH',
        body: datos,
      }),
    cambiarEstado: (id, estado) =>
      request(`/personal/${id}/estado`, {
        method: 'PATCH',
        body: { estado },
      }),
    eliminar: (id) =>
      request(`/personal/${id}`, {
        method: 'DELETE',
      }),
    restaurar: (id) =>
      request(`/personal/${id}/restore`, {
        method: 'POST',
      }),
  },

  // 3. MÓDULO DE INVENTARIO Y MOVIMIENTOS
  inventario: {
    productosSelect: () => request('/inventario/productos-select'),
    categorias: () => request('/inventario/categorias'),
    unidades: () => request('/inventario/unidades'),
    proveedoresInventario: () => request('/inventario/proveedores'),
    resumen: () => request('/inventario/stock/resumen'),
    stockMinimo: () => request('/inventario/stock/minimo'),
    stockPorUnidades: (productoId) => request(`/inventario/stock/producto/${productoId}`),
    listarProductos: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/inventario/productos${query ? `?${query}` : ''}`);
    },
    obtenerProducto: (id) => request(`/inventario/productos/${id}`),
    crearProducto: (datos) =>
      request('/inventario/productos', {
        method: 'POST',
        body: datos,
      }),
    actualizarProducto: (id, datos) =>
      request(`/inventario/productos/${id}`, {
        method: 'PUT',
        body: datos,
      }),
    eliminarProducto: (id) =>
      request(`/inventario/productos/${id}`, {
        method: 'DELETE',
      }),
    restaurarProducto: (id) =>
      request(`/inventario/productos/${id}/restore`, {
        method: 'POST',
      }),
    cambiarEstadoProducto: (id, estado) =>
      request(`/inventario/productos/${id}/estado`, {
        method: 'PATCH',
        body: { estado },
      }),
    movimientos: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/inventario/movimientos${query ? `?${query}` : ''}`);
    },
    registrarMovimiento: (datos) =>
      request('/inventario/movimientos', {
        method: 'POST',
        body: datos,
      }),
    movimientosPorProducto: (productoId) =>
      request(`/inventario/movimientos/producto/${productoId}`),
    movimientoDetalle: (id) =>
      request(`/inventario/movimientos/${id}`),
    ajusteManual: (datos) =>
      request('/inventario/movimientos/ajuste-manual', {
        method: 'POST',
        body: datos,
      }),
    crearProductoExpress: (datos) =>
      request('/inventario/productos/express', {
        method: 'POST',
        body: datos,
      }),
    ubicaciones: () => request('/inventario/ubicaciones'),
    subirImagen: (id, file) => {
      const formData = new FormData();
      formData.append('imagen', file);
      return request(`/inventario/productos/${id}/imagen`, {
        method: 'POST',
        body: formData,
      });
    },

    // Submódulo de Ajustes de Inventario y Mermas
    ajustes: {
      listar: (params = {}) => {
        const cleanParams = Object.fromEntries(
          Object.entries(params).filter(([_, v]) => v !== null && v !== undefined && v !== '')
        );
        const query = new URLSearchParams(cleanParams).toString();
        return request(`/inventario/ajustes${query ? `?${query}` : ''}`);
      },
      tipos: () => request('/inventario/ajustes/tipos'),
      resumen: () => request('/inventario/ajustes/resumen'),
      impactoFinanciero: (params = {}) => {
        const cleanParams = Object.fromEntries(
          Object.entries(params).filter(([_, v]) => v !== null && v !== undefined && v !== '')
        );
        const query = new URLSearchParams(cleanParams).toString();
        return request(`/inventario/ajustes/impacto-financiero${query ? `?${query}` : ''}`);
      },
      obtener: (id) => request(`/inventario/ajustes/${id}`),
      crear: (datos) =>
        request('/inventario/ajustes', {
          method: 'POST',
          body: datos,
        }),
      eliminar: (id) =>
        request(`/inventario/ajustes/${id}`, {
          method: 'DELETE',
        }),
      restaurar: (id) =>
        request(`/inventario/ajustes/${id}/restore`, {
          method: 'POST',
        }),
      descargarPdf: async (params = {}) => {
        const clean = Object.fromEntries(
          Object.entries(params).filter(([_, v]) => v !== null && v !== undefined && v !== '')
        );
        clean.download = '1';
        const query = new URLSearchParams(clean).toString();
        const res = await fetch(`${API_BASE_URL}/inventario/ajustes/reporte/pdf?${query}`);
        if (!res.ok) throw new Error('Error al descargar el reporte PDF');
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte-mermas-${new Date().toISOString().slice(0, 10)}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      },
      descargarExcel: async (params = {}) => {
        const clean = Object.fromEntries(
          Object.entries(params).filter(([_, v]) => v !== null && v !== undefined && v !== '')
        );
        const query = new URLSearchParams(clean).toString();
        const res = await fetch(`${API_BASE_URL}/inventario/ajustes/reporte/excel?${query}`);
        if (!res.ok) throw new Error('Error al descargar el reporte Excel');
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte-mermas-${new Date().toISOString().slice(0, 10)}.xls`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      },
    },
  },

  // 4. MÓDULO DE PROVEEDORES
  proveedores: {
    listar: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/proveedores${query ? `?${query}` : ''}`);
    },
    resumen: () => request('/proveedores/resumen'),
    buscar: (q) => request(`/proveedores/buscar?q=${encodeURIComponent(q)}`),
    obtener: (id) => request(`/proveedores/${id}`),
    crear: (datos) =>
      request('/proveedores', {
        method: 'POST',
        body: datos,
      }),
    actualizar: (id, datos) =>
      request(`/proveedores/${id}`, {
        method: 'PUT',
        body: datos,
      }),
    cambiarEstado: (id, estado) =>
      request(`/proveedores/${id}/estado`, {
        method: 'PATCH',
        body: { estado },
      }),
    eliminar: (id) =>
      request(`/proveedores/${id}`, {
        method: 'DELETE',
      }),
    restaurar: (id) =>
      request(`/proveedores/${id}/restore`, {
        method: 'POST',
      }),
    consultarSunat: (ruc) =>
      request(`/sunat/ruc/${ruc}?target=proveedor`),
    cumplimiento: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return request(`/proveedores/cumplimiento${q ? `?${q}` : ''}`);
    },
    rankingCumplimiento: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return request(`/proveedores/ranking-cumplimiento${q ? `?${q}` : ''}`);
    },
  },

  // 5. MÓDULO DE CLIENTES
  clientes: {
    listar: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/clientes${query ? `?${query}` : ''}`);
    },
    resumen: () => request('/clientes/resumen'),
    inactivos: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/clientes/inactivos${query ? `?${query}` : ''}`);
    },
    buscar: (q) => request(`/clientes/buscar?q=${encodeURIComponent(q)}`),
    obtener: (id) => request(`/clientes/${id}`),
    pedidos: (id, params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/clientes/${id}/pedidos${query ? `?${query}` : ''}`);
    },
    sincronizarCompras: (clienteId = null) =>
      request('/clientes/sincronizar-compras', {
        method: 'POST',
        body: { cliente_id: clienteId },
      }),
    crear: (datos) =>
      request('/clientes', {
        method: 'POST',
        body: datos,
      }),
    actualizar: (id, datos) =>
      request(`/clientes/${id}`, {
        method: 'PUT',
        body: datos,
      }),
    cambiarEstado: (id, estado) =>
      request(`/clientes/${id}/estado`, {
        method: 'PATCH',
        body: { estado },
      }),
    eliminar: (id) =>
      request(`/clientes/${id}`, {
        method: 'DELETE',
      }),
    restaurar: (id) =>
      request(`/clientes/${id}/restore`, {
        method: 'POST',
      }),
    consultarSunat: (documento) =>
      request(`/sunat/ruc/${documento}`),
  },

  // 6. CATÁLOGOS AUXILIARES
  catalogos: {
    categorias: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/categorias${query ? `?${query}` : ''}`);
    },
    crearCategoria: (datos) =>
      request('/categorias', {
        method: 'POST',
        body: datos,
      }),
    actualizarCategoria: (id, datos) =>
      request(`/categorias/${id}`, {
        method: 'PUT',
        body: datos,
      }),
    cambiarEstadoCategoria: (id, estado) =>
      request(`/categorias/${id}/estado`, {
        method: 'PATCH',
        body: { estado },
      }),
    eliminarCategoria: (id) =>
      request(`/categorias/${id}`, {
        method: 'DELETE',
      }),
    restaurarCategoria: (id) =>
      request(`/categorias/${id}/restore`, {
        method: 'POST',
      }),

    canalesPedido: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/canales-pedido${query ? `?${query}` : ''}`);
    },
    crearCanalPedido: (datos) =>
      request('/canales-pedido', {
        method: 'POST',
        body: datos,
      }),
    actualizarCanalPedido: (id, datos) =>
      request(`/canales-pedido/${id}`, {
        method: 'PUT',
        body: datos,
      }),
    cambiarEstadoCanalPedido: (id, estado) =>
      request(`/canales-pedido/${id}/estado`, {
        method: 'PATCH',
        body: { estado },
      }),
    eliminarCanalPedido: (id) =>
      request(`/canales-pedido/${id}`, {
        method: 'DELETE',
      }),
    restaurarCanalPedido: (id) =>
      request(`/canales-pedido/${id}/restore`, {
        method: 'POST',
      }),

    unidadesMedida: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/unidades-medida${query ? `?${query}` : ''}`);
    },
    obtenerUnidadMedida: (id) => request(`/unidades-medida/${id}`),
    crearUnidadMedida: (datos) =>
      request('/unidades-medida', {
        method: 'POST',
        body: datos,
      }),
    actualizarUnidadMedida: (id, datos) =>
      request(`/unidades-medida/${id}`, {
        method: 'PUT',
        body: datos,
      }),
    cambiarEstadoUnidadMedida: (id, estado) =>
      request(`/unidades-medida/${id}/estado`, {
        method: 'PATCH',
        body: { estado },
      }),
    eliminarUnidadMedida: (id) =>
      request(`/unidades-medida/${id}`, {
        method: 'DELETE',
      }),
    restaurarUnidadMedida: (id) =>
      request(`/unidades-medida/${id}/restore`, {
        method: 'POST',
      }),
    ubicaciones: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/ubicaciones${query ? `?${query}` : ''}`);
    },
    obtenerUbicacion: (id) => request(`/ubicaciones/${id}`),
    crearUbicacion: (datos) =>
      request('/ubicaciones', {
        method: 'POST',
        body: datos,
      }),
    actualizarUbicacion: (id, datos) =>
      request(`/ubicaciones/${id}`, {
        method: 'PUT',
        body: datos,
      }),
    cambiarEstadoUbicacion: (id, estado) =>
      request(`/ubicaciones/${id}/estado`, {
        method: 'PATCH',
        body: { estado },
      }),
    eliminarUbicacion: (id) =>
      request(`/ubicaciones/${id}`, {
        method: 'DELETE',
      }),
    restaurarUbicacion: (id) =>
      request(`/ubicaciones/${id}/restore`, {
        method: 'POST',
      }),
  },

  // 7. MÓDULO DE UBICACIONES DE ALMACÉN
  ubicaciones: {
    listar: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/ubicaciones${query ? `?${query}` : ''}`);
    },
    obtener: (id) => request(`/ubicaciones/${id}`),
    crear: (datos) =>
      request('/ubicaciones', {
        method: 'POST',
        body: datos,
      }),
    actualizar: (id, datos) =>
      request(`/ubicaciones/${id}`, {
        method: 'PUT',
        body: datos,
      }),
    cambiarEstado: (id, estado) =>
      request(`/ubicaciones/${id}/estado`, {
        method: 'PATCH',
        body: { estado },
      }),
    eliminar: (id) =>
      request(`/ubicaciones/${id}`, {
        method: 'DELETE',
      }),
    restaurar: (id) =>
      request(`/ubicaciones/${id}/restore`, {
        method: 'POST',
      }),
  },

  // 8. MÓDULO DE AJUSTES DE INVENTARIO (Mermas, Daños, Vencimientos, Pérdidas)
  ajustes: {
    listar: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/inventario/ajustes${query ? `?${query}` : ''}`);
    },
    tipos: () => request('/inventario/ajustes/tipos'),
    obtener: (id) => request(`/inventario/ajustes/${id}`),
    crear: (datos) =>
      request('/inventario/ajustes', {
        method: 'POST',
        body: datos,
      }),
    eliminar: (id) =>
      request(`/inventario/ajustes/${id}`, {
        method: 'DELETE',
      }),
    restaurar: (id) =>
      request(`/inventario/ajustes/${id}/restore`, {
        method: 'POST',
      }),
  },

  // 9. MÓDULO DE ROLES Y SEGURIDAD
  seguridad: {
    // Roles de Usuario
    listarRoles: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/seguridad/roles${query ? `?${query}` : ''}`);
    },
    crearRol: (datos) =>
      request('/seguridad/roles', {
        method: 'POST',
        body: datos,
      }),
    actualizarRol: (id, datos) =>
      request(`/seguridad/roles/${id}`, {
        method: 'PUT',
        body: datos,
      }),
    eliminarRol: (id) =>
      request(`/seguridad/roles/${id}`, {
        method: 'DELETE',
      }),
    restaurarRol: (id) =>
      request(`/seguridad/roles/${id}/restore`, {
        method: 'POST',
      }),

    // Cargos de Personal
    listarCargos: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/seguridad/cargos${query ? `?${query}` : ''}`);
    },
    crearCargo: (datos) =>
      request('/seguridad/cargos', {
        method: 'POST',
        body: datos,
      }),
    actualizarCargo: (id, datos) =>
      request(`/seguridad/cargos/${id}`, {
        method: 'PUT',
        body: datos,
      }),
    eliminarCargo: (id) =>
      request(`/seguridad/cargos/${id}`, {
        method: 'DELETE',
      }),
    restaurarCargo: (id) =>
      request(`/seguridad/cargos/${id}/restore`, {
        method: 'POST',
      }),
  },

  // 8. MÓDULO DE INTELIGENCIA ARTIFICIAL (GEMINI 3.6 FLASH)
  ai: {
    generate: (datos) =>
      request('/ai/generate', {
        method: 'POST',
        body: datos,
      }),
    chat: (datos) =>
      request('/ai/chat', {
        method: 'POST',
        body: datos,
      }),
    status: () => request('/ai/status'),
    tools: () => request('/ai/tools'),
  },

  // 9. MÓDULO DE DASHBOARD Y MÉTRICAS
  dashboard: {
    indicadores: (params = {}) => {
      const cleanParams = Object.fromEntries(
        Object.entries(params).filter(([_, v]) => v !== null && v !== undefined && v !== '')
      );
      const query = new URLSearchParams(cleanParams).toString();
      return request(`/dashboard/indicadores${query ? `?${query}` : ''}`);
    },
  },

  // 10. MÓDULO DE ÓRDENES DE COMPRA (COMPRAS Y PEDIDOS A PROVEEDORES)
  ordenesCompra: {
    listar: (params = {}) => {
      const cleanParams = Object.fromEntries(
        Object.entries(params).filter(([_, v]) => v !== null && v !== undefined && v !== '')
      );
      const query = new URLSearchParams(cleanParams).toString();
      return request(`/ordenes-compra${query ? `?${query}` : ''}`);
    },
    siguienteCodigo: () => request('/ordenes-compra/siguiente-codigo'),
    estados: () => request('/ordenes-compra/estados'),
    obtener: (id) => request(`/ordenes-compra/${id}`),
    crear: (datos) =>
      request('/ordenes-compra', {
        method: 'POST',
        body: datos,
      }),
    actualizar: (id, datos) =>
      request(`/ordenes-compra/${id}`, {
        method: 'PUT',
        body: datos,
      }),
    eliminar: (id) =>
      request(`/ordenes-compra/${id}`, {
        method: 'DELETE',
      }),
    restaurar: (id) =>
      request(`/ordenes-compra/${id}/restore`, {
        method: 'POST',
      }),
    asignarProveedor: (id, proveedorId) =>
      request(`/ordenes-compra/${id}/proveedor`, {
        method: 'PATCH',
        body: { proveedor_id: proveedorId },
      }),
    cambiarEstado: (id, estado, motivo = null) =>
      request(`/ordenes-compra/${id}/estado`, {
        method: 'PATCH',
        body: { estado, motivo },
      }),
    iniciarRecepcion: (id) =>
      request(`/ordenes-compra/${id}/iniciar-recepcion`, {
        method: 'POST',
      }),
    recepcionarItem: (id, datos) =>
      request(`/ordenes-compra/${id}/recepcionar-item`, {
        method: 'POST',
        body: datos,
      }),
    rechazarItem: (id, datos) =>
      request(`/ordenes-compra/${id}/rechazar-item`, {
        method: 'POST',
        body: datos,
      }),
    cerrarRecepcion: (id, datos = {}) =>
      request(`/ordenes-compra/${id}/cerrar-recepcion`, {
        method: 'POST',
        body: datos,
      }),
    anularRecepcion: (id, datos = {}) =>
      request(`/ordenes-compra/${id}/anular-recepcion`, {
        method: 'POST',
        body: datos,
      }),
    compraRapida: (datos) =>
      request('/ordenes-compra/compra-rapida', {
        method: 'POST',
        body: datos,
      }),
    historialRecepcion: (id) =>
      request(`/ordenes-compra/${id}/historial-recepcion`),
    generarNuevaOcFaltantes: (id) =>
      request(`/ordenes-compra/${id}/generar-oc-faltantes`, {
        method: 'POST',
      }),
    whatsapp: (id) => request(`/ordenes-compra/${id}/whatsapp`),
    mensajeWhatsapp: (id) => request(`/ordenes-compra/${id}/mensaje-whatsapp`),
    enviarWhatsapp: (id) =>
      request(`/ordenes-compra/${id}/enviar-whatsapp`, {
        method: 'POST',
      }),
    pdfUrl: (id) => request(`/ordenes-compra/${id}/pdf-url`),
    reportePdfUrl: (params = {}) => {
      const cleanParams = Object.fromEntries(
        Object.entries(params).filter(([_, v]) => v !== null && v !== undefined && v !== '')
      );
      const query = new URLSearchParams(cleanParams).toString();
      return `${API_BASE_URL}/ordenes-compra/reporte/pdf${query ? `?${query}` : ''}`;
    },
    obtenerPdfUrlDirecta: (id) => `${API_BASE_URL}/ordenes-compra/${id}/pdf`,
    descargarPdf: async (id) => {
      const url = `${API_BASE_URL}/ordenes-compra/${id}/pdf?download=1`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Error al descargar el PDF (${response.status})`);
      }
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `Orden_Compra_${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
    },
  },

  // 10.B MÓDULO DE AUDITORÍA Y CONTROL DE ROTURAS DE STOCK (INDICADOR PRS)
  roturasStock: {
    listar: (params = {}) => {
      const cleanParams = Object.fromEntries(
        Object.entries(params).filter(([_, v]) => v !== null && v !== undefined && v !== '')
      );
      const query = new URLSearchParams(cleanParams).toString();
      return request(`/roturas-stock${query ? `?${query}` : ''}`);
    },
    resumen: (params = {}) => {
      const cleanParams = Object.fromEntries(
        Object.entries(params).filter(([_, v]) => v !== null && v !== undefined && v !== '')
      );
      const query = new URLSearchParams(cleanParams).toString();
      return request(`/roturas-stock/resumen${query ? `?${query}` : ''}`);
    },
    intento: (datos) =>
      request('/roturas-stock/intento', {
        method: 'POST',
        body: datos,
      }),
    confirmar: (datos) =>
      request('/roturas-stock/confirmar', {
        method: 'POST',
        body: datos,
      }),
  },

  // 11. MÓDULO DE ÓRDENES DE CLIENTE (PEDIDOS DE VENTA)
  pedidosCliente: {
    listar: (params = {}) => {
      const cleanParams = Object.fromEntries(
        Object.entries(params).filter(([_, v]) => v !== null && v !== undefined && v !== '')
      );
      const query = new URLSearchParams(cleanParams).toString();
      return request(`/pedidos${query ? `?${query}` : ''}`);
    },
    obtener: (id) => request(`/pedidos/${id}`),
    crear: (datos) =>
      request('/pedidos', {
        method: 'POST',
        body: datos,
      }),
    actualizar: (id, datos) =>
      request(`/pedidos/${id}`, {
        method: 'PUT',
        body: datos,
      }),
    eliminar: (id) =>
      request(`/pedidos/${id}`, {
        method: 'DELETE',
      }),
    completar: (id, extras = {}) =>
      request(`/pedidos/${id}/complete`, {
        method: 'PATCH',
        body: extras,
      }),
    cancelar: (id, motivo = null, extras = {}) => {
      const payload = typeof motivo === 'object' && motivo !== null ? motivo : { motivo, ...extras };
      return request(`/pedidos/${id}/cancel`, {
        method: 'PATCH',
        body: payload,
      });
    },
    cambiarEstado: (id, estado, motivo = null, extras = {}) => {
      const payload = typeof motivo === 'object' && motivo !== null ? { estado, ...motivo } : { estado, motivo, ...extras };
      return request(`/pedidos/${id}/status`, {
        method: 'PATCH',
        body: payload,
      });
    },
    checkTimeout: (horas = null) =>
      request('/pedidos/check-timeout', {
        method: 'POST',
        body: { horas },
      }),
    notifyExpiring: (horas = null, ventana = 2) =>
      request('/pedidos/notify-expiring', {
        method: 'POST',
        body: { horas, ventana },
      }),
    porCliente: (clienteId, params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/clients/${clienteId}/orders${query ? `?${query}` : ''}`);
    },
    stock: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/products/stock${query ? `?${query}` : ''}`);
    },
    stockProducto: (id) => request(`/products/stock/${id}`),
    stats: (params = {}) => {
      const cleanParams = Object.fromEntries(
        Object.entries(params).filter(([_, v]) => v !== null && v !== undefined && v !== '')
      );
      const query = new URLSearchParams(cleanParams).toString();
      return request(`/pedidos/stats${query ? `?${query}` : ''}`);
    },
    daily: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/pedidos/daily${query ? `?${query}` : ''}`);
    },
  },

  // 13. MÓDULO DE DATOS DE LA EMPRESA (COMERCIAL VALENCIA)
  empresa: {
    obtener: () => request('/empresa'),
    actualizar: (datos) =>
      request('/empresa', {
        method: 'PUT',
        body: datos,
      }),
    sincronizarSunat: (ruc = null, guardar = false) =>
      request('/empresa/sincronizar-sunat', {
        method: 'POST',
        body: { ruc, guardar },
      }),
  },

  // 14. MÓDULO DE INTELIGENCIA ARTIFICIAL (VALENCIA AI / CHATBOT)
  ai: {
    chat: (payload) => {
      const body = { ...payload };
      if (body.prompt && !body.message) body.message = body.prompt;
      return request('/ai/chat', {
        method: 'POST',
        body,
      });
    },
    chatStream: async (arg1, arg2 = {}) => {
      // Soporta ambas firmas:
      // 1) api.ai.chatStream({ prompt, session_id, history, onChunk, onStatus, onDone, onError })
      // 2) api.ai.chatStream(payload, { onStatus, onToken, onDone, onError })
      let payload;
      let callbacks;

      if (arg1 && (arg1.onChunk || arg1.onToken || arg1.onStatus || arg1.onDone || arg1.onError)) {
        const { onChunk, onToken, onStatus, onDone, onError, ...rest } = arg1;
        payload = rest;
        callbacks = {
          onStatus,
          onToken: onToken || onChunk,
          onDone,
          onError,
        };
      } else {
        payload = arg1 || {};
        callbacks = {
          ...arg2,
          onToken: arg2.onToken || arg2.onChunk,
        };
      }

      if (payload && payload.prompt && !payload.message) {
        payload.message = payload.prompt;
      }

      const { onStatus, onToken, onDone, onError } = callbacks;
      const url = `${API_BASE_URL}/ai/chat-stream`;

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => null);
          throw new Error(errData?.message || `Error del servidor (${response.status})`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n\n');
          buffer = parts.pop() || '';

          for (const part of parts) {
            const lines = part.split('\n');
            let eventType = 'message';
            let eventData = null;

            for (const line of lines) {
              if (line.startsWith('event: ')) {
                eventType = line.substring(7).trim();
              } else if (line.startsWith('data: ')) {
                try {
                  eventData = JSON.parse(line.substring(6));
                } catch (e) {
                  eventData = line.substring(6);
                }
              }
            }

            if (eventData !== null) {
              if (eventType === 'status' && onStatus) {
                const statusMsg = typeof eventData === 'string' ? eventData : (eventData.message || eventData.status || '');
                onStatus(statusMsg);
              } else if (eventType === 'token' && onToken) {
                const tokenVal = typeof eventData === 'string' ? eventData : (eventData.token || eventData.chunk || '');
                onToken(tokenVal);
              } else if (eventType === 'done' && onDone) {
                onDone(eventData);
              } else if (eventType === 'error' && onError) {
                onError(eventData);
              }
            }
          }
        }
      } catch (err) {
        if (onError) onError(err);
        else throw err;
      }
    },
    transcribeAudio: (audioBlob, mimeType = 'audio/webm', fileName = 'voice_note.webm') => {
      const formData = new FormData();
      formData.append('audio', audioBlob, fileName);
      if (mimeType) {
        formData.append('mime_type', mimeType);
      }
      return request('/ai/transcribe-audio', {
        method: 'POST',
        body: formData,
      });
    },
    status: () => request('/ai/status'),
    tools: () => request('/ai/tools'),
    voiceStatus: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/ai/voice-status${qs ? `?${qs}` : ''}`);
    },
    sendFeedback: (datos) =>
      request('/ai/feedback', {
        method: 'POST',
        body: datos,
      }),
    feedbackStats: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/ai/feedback/stats${qs ? `?${qs}` : ''}`);
    },
  },

  // 16. MÓDULO DE DASHBOARD Y MÉTRICAS DE TESIS
  dashboard: {
    indicators: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/dashboard/indicators${qs ? `?${qs}` : ''}`);
    },
    detail: (id, params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/dashboard/indicator/${id}${qs ? `?${qs}` : ''}`);
    },
    compare: (params = {}) => {
      const cleanParams = Object.fromEntries(
        Object.entries(params).filter(([_, v]) => v !== null && v !== undefined && v !== '')
      );
      const qs = new URLSearchParams(cleanParams).toString();
      return request(`/dashboard/compare${qs ? `?${qs}` : ''}`);
    },
    indicadores: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/dashboard/indicadores${qs ? `?${qs}` : ''}`);
    },
    tokens: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/dashboard/tokens${qs ? `?${qs}` : ''}`);
    },
  },
};

api.ajustes = api.inventario.ajustes;
api.ordenes = api.ordenesCompra;
api.pedidos = api.pedidosCliente;
api.ordersCliente = api.pedidosCliente;

/**
 * Módulo: Predicciones Semanales de Reabastecimiento
 */
api.predicciones = {
  /** Obtiene las predicciones de compra (JSON). Soporta filtros: categoria_id, producto_id, semana */
  getPredicciones: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ''))
    ).toString();
    return request(`/ai/predicciones-compra${qs ? `?${qs}` : ''}`);
  },

  /** Descarga el PDF de una categoría específica (Blob) */
  downloadPdfCategoria: async (categoriaId) => {
    const resp = await fetch(
      `${API_BASE_URL}/ai/predicciones-compra/pdf/categoria/${encodeURIComponent(categoriaId)}`,
      { headers: { Accept: 'application/pdf' }, credentials: 'omit' }
    );
    if (!resp.ok) throw new Error('Error al descargar el PDF de categoría');
    return resp.blob();
  },

  /** Descarga el PDF general consolidado (Blob) */
  downloadPdfGeneral: async () => {
    const resp = await fetch(
      `${API_BASE_URL}/ai/predicciones-compra/pdf/general`,
      { headers: { Accept: 'application/pdf' }, credentials: 'omit' }
    );
    if (!resp.ok) throw new Error('Error al descargar el PDF general');
    return resp.blob();
  },

  /** Descarga la ficha PDF de un producto individual (Blob) */
  downloadPdfProducto: async (productoId) => {
    const resp = await fetch(
      `${API_BASE_URL}/ai/predicciones-compra/pdf/producto/${encodeURIComponent(productoId)}`,
      { headers: { Accept: 'application/pdf' }, credentials: 'omit' }
    );
    if (!resp.ok) throw new Error('Error al descargar la ficha PDF del producto');
    return resp.blob();
  },

  /** Descarga el CSV con BOM UTF-8 para Excel (Blob) */
  downloadCsv: async (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ''))
    ).toString();
    const resp = await fetch(
      `${API_BASE_URL}/ai/predicciones-compra/csv${qs ? `?${qs}` : ''}`,
      { headers: { Accept: 'text/csv' }, credentials: 'omit' }
    );
    if (!resp.ok) throw new Error('Error al descargar el CSV');
    return resp.blob();
  },
};

export default api;
