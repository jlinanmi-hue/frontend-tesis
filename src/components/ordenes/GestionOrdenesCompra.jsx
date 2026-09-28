import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Send,
  Pencil,
  Trash2,
  Plus,
  Search,
  Building2,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Eye,
  Download,
  ChevronDown,
  RefreshCw,
  ShoppingBag,
  Layers,
  X,
  Package,
  FileCheck,
  Camera,
  Image as ImageIcon,
  Printer,
  Zap
} from 'lucide-react';
import { sileo } from 'sileo';
import api from '../../services/api';
import DocumentoOrdenOficial from '../common/DocumentoOrdenOficial';

export default function GestionOrdenesCompra({ aiPrefill = null, onClearAiPrefill = null, onNavigateToPredicciones = null }) {
  // Pestaña activa: 'nueva' (Generar Orden) | 'historial' (Historial de Órdenes)
  const [activeTab, setActiveTab] = useState('nueva');

  // Catálogos principales
  const [proveedoresList, setProveedoresList] = useState([]);
  const [productosSelect, setProductosSelect] = useState([]);
  const [isLoadingCatalogo, setIsLoadingCatalogo] = useState(false);

  // ----------------------------------------------------
  // ESTADO PARA "NUEVA ORDEN DE COMPRA"
  // ----------------------------------------------------
  // Proveedor seleccionado y buscador con live similarity
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState(null);
  const [searchProveedor, setSearchProveedor] = useState('');
  const [isDropdownProveedorOpen, setIsDropdownProveedorOpen] = useState(false);
  const proveedorDropdownRef = useRef(null);

  // Observación de la orden
  const [observacion, setObservacion] = useState('');

  // Lista de "Productos Solicitados"
  const [productosSolicitados, setProductosSolicitados] = useState([]);

  // Control para añadir un producto
  const [searchProducto, setSearchProducto] = useState('');
  const [isDropdownProductoOpen, setIsDropdownProductoOpen] = useState(false);
  const productoDropdownRef = useRef(null);

  const [productoEnSeleccion, setProductoEnSeleccion] = useState(null);
  const [unidadSeleccionada, setUnidadSeleccionada] = useState(null);
  const [cantidadInput, setCantidadInput] = useState(1);
  const [precioUnitarioInput, setPrecioUnitarioInput] = useState(0);

  // Modales de Nueva Orden
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalExito, setModalExito] = useState(null);

  // Modal para editar ítem de la lista de pedidos
  const [showModalEditarItem, setShowModalEditarItem] = useState(false);
  const [itemEnEdicion, setItemEnEdicion] = useState(null);

  // ----------------------------------------------------
  // ESTADO PARA "HISTORIAL DE ÓRDENES"
  // ----------------------------------------------------
  const [ordenesHistorial, setOrdenesHistorial] = useState([]);
  const [isLoadingHistorial, setIsLoadingHistorial] = useState(false);
  const [searchHistorial, setSearchHistorial] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [paginacion, setPaginacion] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
    per_page: 8,
  });

  // Modal Detalle de Orden en Historial
  const [showModalDetalle, setShowModalDetalle] = useState(false);
  const [ordenDetalle, setOrdenDetalle] = useState(null);
  const [isLoadingDetalle, setIsLoadingDetalle] = useState(false);

  // Modal Cambiar Estado
  const [showModalEstado, setShowModalEstado] = useState(false);
  const [ordenParaEstado, setOrdenParaEstado] = useState(null);
  const [nuevoEstadoSeleccionado, setNuevoEstadoSeleccionado] = useState('C');
  const [motivoCambioEstado, setMotivoCambioEstado] = useState('');
  const [isUpdatingEstado, setIsUpdatingEstado] = useState(false);

  // Modal Confirmar Anulación
  const [showModalAnular, setShowModalAnular] = useState(false);
  const [ordenParaAnular, setOrdenParaAnular] = useState(null);
  const [isAnulando, setIsAnulando] = useState(false);

  // Modal Formato Físico Oficial de Orden de Compra
  const [showModalOficial, setShowModalOficial] = useState(false);
  const [ticketOrdenCompra, setTicketOrdenCompra] = useState(null);
  const [datosEmpresa, setDatosEmpresa] = useState(null);

  useEffect(() => {
    if (api.empresa?.obtener) {
      api.empresa.obtener().then(res => {
        if (res?.data) setDatosEmpresa(res.data);
      }).catch(() => {});
    }
  }, []);

  // Notificaciones unificadas con la librería Sileo
  const showAlert = (mensaje, tipo = 'success') => {
    if (tipo === 'success') {
      sileo.success({ description: mensaje });
    } else if (tipo === 'warning') {
      sileo.warning({ description: mensaje });
    } else if (tipo === 'info') {
      sileo.info({ description: mensaje });
    } else {
      sileo.error({ description: mensaje });
    }
  };

  // ----------------------------------------------------
  // GESTIÓN DEL COPILOTO IA (PRECARGA DE ORDEN DE COMPRA)
  // ----------------------------------------------------
  const lastAiPrefillTimestampRef = useRef(0);

  const aplicarPrefillOrdenCompra = (prefill) => {
    if (!prefill) return;

    const now = Date.now();
    if (now - lastAiPrefillTimestampRef.current < 600) {
      return;
    }
    lastAiPrefillTimestampRef.current = now;

    setActiveTab('nueva');

    // 1. Precargar Proveedor
    if (prefill.proveedor) {
      setProveedorSeleccionado(prefill.proveedor);
    }

    // 2. Precargar Productos Solicitados
    if (Array.isArray(prefill.productos) && prefill.productos.length > 0) {
      setProductosSolicitados(prefill.productos.map(p => ({
        tempId: p.tempId || `${p.productoId}_${p.unidadMedidaId}_${Date.now()}_${Math.random()}`,
        productoId: p.productoId,
        productoNombre: p.productoNombre,
        productoMarca: p.productoMarca || 'Genérico',
        unidadMedidaId: p.unidadMedidaId || 'UND-00001',
        unidadNombre: p.unidadNombre || 'Unidad',
        unidadAbreviatura: p.unidadAbreviatura || 'UND',
        cantidad: Number(p.cantidad) || 1,
        precioUnitario: Number(p.precioUnitario) || 0,
        subtotal: Number(p.subtotal) || (Number(p.cantidad || 1) * Number(p.precioUnitario || 0)),
        unidadesDisponibles: p.unidadesDisponibles || [],
      })));
    }

    // 3. Precargar Observación
    if (prefill.observacion) {
      setObservacion(prefill.observacion);
    }

    // 4. Notificar al usuario con Sileo
    sileo.info({
      title: 'Orden de Compra Precargada por Valencia AI',
      description: `Se han precargado los productos solicitados para ${prefill.proveedor?.ProveedorRazonSocial || 'el proveedor'}. Revisa y presiona "Realizar Pedido" para confirmar.`,
    });
  };

  // 1. Detectar prefill desde props o sessionStorage al montarse
  useEffect(() => {
    let prefillData = aiPrefill;
    if (!prefillData) {
      try {
        const stored = sessionStorage.getItem('valencia_ai_purchase_order_prefill');
        if (stored) {
          prefillData = JSON.parse(stored);
        }
      } catch (err) {
        console.warn('Error al leer valencia_ai_purchase_order_prefill de sessionStorage:', err);
      }
    }

    if (prefillData) {
      aplicarPrefillOrdenCompra(prefillData);
      try {
        sessionStorage.removeItem('valencia_ai_purchase_order_prefill');
      } catch (e) {}
      if (typeof onClearAiPrefill === 'function') {
        onClearAiPrefill();
      }
    }
  }, [aiPrefill]);

  // 2. Escuchar evento en vivo por si el componente ya estaba montado
  useEffect(() => {
    const handleAiOpenPurchaseOrder = (e) => {
      const detail = e.detail || {};
      const prefill = detail.prefill || {};
      if (prefill && (prefill.proveedor || prefill.productos)) {
        aplicarPrefillOrdenCompra(prefill);
      }
    };

    window.addEventListener('valencia-ai:open-purchase-order-form', handleAiOpenPurchaseOrder);
    return () => window.removeEventListener('valencia-ai:open-purchase-order-form', handleAiOpenPurchaseOrder);
  }, []);

  // 3. Escuchar orden guardada o limpiada para vaciar la pantalla
  useEffect(() => {
    const handlePurchaseOrderSavedOrCleared = (e) => {
      setProductosSolicitados([]);
      setProveedorSeleccionado(null);
      setSearchProveedor('');
      setSearchProducto('');
      setProductoEnSeleccion(null);
      setCantidadInput(1);
      setPrecioUnitarioInput(0);
      setObservacion('');
      setShowModalEditarItem(false);
      setItemEnEdicion(null);

      try {
        window._valenciaAiLiveDraft = null;
        sessionStorage.removeItem('valencia_ai_live_draft');
        sessionStorage.removeItem('valencia_ai_purchase_order_prefill');
      } catch (err) {}
      if (typeof onClearAiPrefill === 'function') {
        onClearAiPrefill();
      }

      cargarCatalogos();
      cargarHistorial(1);

      const ordenId = e.detail?.orden_id;
      if (ordenId) {
        sileo.success({
          title: 'Orden de Compra Guardada',
          description: `La orden de compra ${ordenId} se registró exitosamente.`,
        });
      } else {
        sileo.info('El formulario de orden de compra ha sido limpiado.');
      }
    };

    window.addEventListener('valencia-ai:purchase-order-saved', handlePurchaseOrderSavedOrCleared);
    window.addEventListener('valencia-ai:clear-purchase-order-form', handlePurchaseOrderSavedOrCleared);
    return () => {
      window.removeEventListener('valencia-ai:purchase-order-saved', handlePurchaseOrderSavedOrCleared);
      window.removeEventListener('valencia-ai:clear-purchase-order-form', handlePurchaseOrderSavedOrCleared);
    };
  }, [onClearAiPrefill]);

  // 4. Sincronizar borrador en vivo en pantalla para Valencia AI (para respetar productos agregados/editados manualmente)
  useEffect(() => {
    if ((productosSolicitados && productosSolicitados.length > 0) || proveedorSeleccionado) {
      const draft = {
        tipo: 'orden_compra',
        proveedor_id: proveedorSeleccionado?.ProveedorId || null,
        proveedor_nombre: proveedorSeleccionado?.ProveedorRazonSocial || null,
        detalles: (productosSolicitados || []).map(p => ({
          producto_id: p.productoId,
          nombre: p.productoNombre,
          cantidad: Number(p.cantidad) || 1,
          unidad_id: p.unidadMedidaId || 'UND-00001',
          unidad_nombre: p.unidadNombre || 'Unidad',
          precio_unitario: Number(p.precioUnitario) || 0,
          subtotal: Number(p.subtotal) || ((Number(p.cantidad) || 1) * (Number(p.precioUnitario) || 0)),
        })),
        observacion: observacion || '',
      };
      window._valenciaAiLiveDraft = draft;
      try {
        sessionStorage.setItem('valencia_ai_live_draft', JSON.stringify(draft));
      } catch (e) {}
    } else {
      if (window._valenciaAiLiveDraft?.tipo === 'orden_compra') {
        window._valenciaAiLiveDraft = null;
        try {
          sessionStorage.removeItem('valencia_ai_live_draft');
        } catch (e) {}
      }
    }
  }, [proveedorSeleccionado, productosSolicitados, observacion]);

  useEffect(() => {
    return () => {
      if (window._valenciaAiLiveDraft?.tipo === 'orden_compra') {
        window._valenciaAiLiveDraft = null;
        try {
          sessionStorage.removeItem('valencia_ai_live_draft');
        } catch (e) {}
      }
    };
  }, []);

  // ----------------------------------------------------
  // CARGA DE DATOS INICIALES
  // ----------------------------------------------------
  useEffect(() => {
    cargarCatalogos();
  }, []);

  useEffect(() => {
    if (activeTab === 'historial') {
      cargarHistorial(1);
    }
  }, [activeTab, filtroEstado, fechaDesde, fechaHasta]);

  // Click outside para cerrar dropdowns de búsqueda live
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (proveedorDropdownRef.current && !proveedorDropdownRef.current.contains(e.target)) {
        setIsDropdownProveedorOpen(false);
      }
      if (productoDropdownRef.current && !productoDropdownRef.current.contains(e.target)) {
        setIsDropdownProductoOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const cargarCatalogos = async () => {
    setIsLoadingCatalogo(true);
    try {
      const [resProv, resProd] = await Promise.all([
        api.proveedores.listar({ all: true, estado: 'A' }),
        api.inventario.productosSelect(),
      ]);

      if (resProv?.success && resProv?.data) {
        setProveedoresList(resProv.data);
      }
      if (resProd?.success && resProd?.data) {
        setProductosSelect(resProd.data);
      }
    } catch (err) {
      console.error('Error cargando catálogos:', err);
      showAlert('No se pudieron cargar los productos o proveedores.', 'error');
    } finally {
      setIsLoadingCatalogo(false);
    }
  };

  const cargarHistorial = async (page = 1) => {
    setIsLoadingHistorial(true);
    try {
      const params = {
        page,
        per_page: 8,
      };
      if (searchHistorial.trim()) params.search = searchHistorial.trim();
      if (filtroEstado) params.estado = filtroEstado;
      if (fechaDesde) params.fecha_desde = fechaDesde;
      if (fechaHasta) params.fecha_hasta = fechaHasta;

      const res = await api.ordenesCompra.listar(params);
      if (res?.success && res?.data) {
        setOrdenesHistorial(res.data);
        if (res.meta) {
          setPaginacion({
            current_page: res.meta.current_page,
            last_page: res.meta.last_page,
            total: res.meta.total,
            per_page: res.meta.per_page,
          });
        }
      }
    } catch (err) {
      console.error('Error al cargar historial de órdenes:', err);
      showAlert('Error al listar las órdenes de compra.', 'error');
    } finally {
      setIsLoadingHistorial(false);
    }
  };

  // ----------------------------------------------------
  // FILTRADO LIVE POR SIMILITUD: PROVEEDORES
  // ----------------------------------------------------
  const proveedoresFiltrados = proveedoresList.filter((p) => {
    if (!searchProveedor.trim()) return true;
    const term = searchProveedor.toLowerCase();
    const razon = (p.ProveedorRazonSocial || p.razon_social || '').toLowerCase();
    const ruc = (p.ProveedorRuc || p.ruc || '').toLowerCase();
    const tel = (p.ProveedorTelefono || p.telefono || '').toLowerCase();
    const id = (p.ProveedorId || p.id || '').toLowerCase();
    return razon.includes(term) || ruc.includes(term) || tel.includes(term) || id.includes(term);
  });

  const handleSeleccionarProveedor = (p) => {
    setProveedorSeleccionado(p);
    setSearchProveedor('');
    setIsDropdownProveedorOpen(false);
  };

  // ----------------------------------------------------
  // FILTRADO LIVE POR SIMILITUD: PRODUCTOS
  // ----------------------------------------------------
  const productosFiltrados = productosSelect.filter((p) => {
    if (!searchProducto.trim()) return true;
    const term = searchProducto.toLowerCase();
    const nombre = (p.ProductoNombre || p.nombre || '').toLowerCase();
    const marca = (p.ProductoMarca || p.marca || '').toLowerCase();
    const id = (p.ProductoId || p.id || '').toLowerCase();
    const cat = (p.categoria_nombre || '').toLowerCase();
    return nombre.includes(term) || marca.includes(term) || id.includes(term) || cat.includes(term);
  });

  const handleSeleccionarProducto = (prod) => {
    setProductoEnSeleccion(prod);
    setSearchProducto('');
    setIsDropdownProductoOpen(false);

    // Seleccionar por defecto la unidad base o la primera disponible
    const unidades = prod.unidades || [];
    const baseUnit = unidades.find((u) => u.es_base || u.factor_conversion === 1) || unidades[0] || null;
    setUnidadSeleccionada(baseUnit);

    // Asignar precio de compra sugerido
    const precioSugerido = baseUnit ? Number(baseUnit.precio_compra) || 0 : 0;
    setPrecioUnitarioInput(precioSugerido);
    setCantidadInput(1);
  };

  const handleCambiarUnidad = (unidadId) => {
    if (!productoEnSeleccion) return;
    const unit = (productoEnSeleccion.unidades || []).find((u) => u.unidades_medidaId === unidadId);
    if (unit) {
      setUnidadSeleccionada(unit);
      setPrecioUnitarioInput(Number(unit.precio_compra) || 0);
    }
  };

  // ----------------------------------------------------
  // GESTIÓN DE LA LISTA DE PRODUCTOS SOLICITADOS
  // ----------------------------------------------------
  const handleAgregarProductoALista = () => {
    if (!productoEnSeleccion) {
      showAlert('Selecciona un producto primero.', 'warning');
      return;
    }
    const cant = Number(cantidadInput);
    if (isNaN(cant) || cant <= 0) {
      showAlert('La cantidad debe ser mayor a 0.', 'warning');
      return;
    }
    const precio = Number(precioUnitarioInput);
    if (isNaN(precio) || precio < 0) {
      showAlert('El precio unitario no puede ser negativo.', 'warning');
      return;
    }

    const subtotal = Math.round(cant * precio * 100) / 100;
    const unidadId = unidadSeleccionada?.unidades_medidaId || 'UND-00001';
    const unidadDesc = unidadSeleccionada?.descripcion || 'Unidad';
    const unidadAbrev = unidadSeleccionada?.abreviatura || 'UND';

    // Verificar si ya existe en la lista con la misma unidad
    const indexExistente = productosSolicitados.findIndex(
      (item) => item.productoId === productoEnSeleccion.ProductoId && item.unidadMedidaId === unidadId
    );

    if (indexExistente >= 0) {
      // Sumar cantidad
      const actual = productosSolicitados[indexExistente];
      const nuevaCantidad = actual.cantidad + cant;
      const nuevoSubtotal = Math.round(nuevaCantidad * precio * 100) / 100;
      const actualizados = [...productosSolicitados];
      actualizados[indexExistente] = {
        ...actual,
        cantidad: nuevaCantidad,
        precioUnitario: precio,
        subtotal: nuevoSubtotal,
      };
      setProductosSolicitados(actualizados);
      showAlert(`Se actualizó la cantidad de "${productoEnSeleccion.ProductoNombre}".`, 'success');
    } else {
      // Nuevo ítem en la lista
      const nuevoItem = {
        tempId: `${productoEnSeleccion.ProductoId}_${unidadId}_${Date.now()}`,
        productoId: productoEnSeleccion.ProductoId,
        productoNombre: productoEnSeleccion.ProductoNombre,
        productoMarca: productoEnSeleccion.ProductoMarca,
        unidadMedidaId: unidadId,
        unidadNombre: unidadDesc,
        unidadAbreviatura: unidadAbrev,
        cantidad: cant,
        precioUnitario: precio,
        subtotal: subtotal,
        unidadesDisponibles: productoEnSeleccion.unidades || [],
      };
      setProductosSolicitados((prev) => [nuevoItem, ...prev]);
      showAlert(`"${productoEnSeleccion.ProductoNombre}" agregado a los productos solicitados.`, 'success');
    }

    // Resetear selector de producto
    setProductoEnSeleccion(null);
    setUnidadSeleccionada(null);
    setCantidadInput(1);
    setPrecioUnitarioInput(0);
  };

  // Abrir modal para editar ítem
  const handleAbrirEditarItem = (item) => {
    setItemEnEdicion({
      ...item,
      nuevaCantidad: item.cantidad,
      nuevoPrecio: item.precioUnitario,
      nuevaUnidadId: item.unidadMedidaId,
    });
    setShowModalEditarItem(true);
  };

  const handleGuardarEdicionItem = () => {
    if (!itemEnEdicion) return;
    const cant = Number(itemEnEdicion.nuevaCantidad);
    const precio = Number(itemEnEdicion.nuevoPrecio);
    if (isNaN(cant) || cant <= 0) {
      showAlert('La cantidad debe ser mayor a cero.', 'warning');
      return;
    }
    if (isNaN(precio) || precio < 0) {
      showAlert('El precio no puede ser negativo.', 'warning');
      return;
    }

    const unidadObj = (itemEnEdicion.unidadesDisponibles || []).find(
      (u) => u.unidades_medidaId === itemEnEdicion.nuevaUnidadId
    );

    const subtotal = Math.round(cant * precio * 100) / 100;

    setProductosSolicitados((prev) =>
      prev.map((it) =>
        it.tempId === itemEnEdicion.tempId
          ? {
              ...it,
              cantidad: cant,
              precioUnitario: precio,
              subtotal: subtotal,
              unidadMedidaId: unidadObj ? unidadObj.unidades_medidaId : it.unidadMedidaId,
              unidadNombre: unidadObj ? unidadObj.descripcion : it.unidadNombre,
              unidadAbreviatura: unidadObj ? unidadObj.abreviatura : it.unidadAbreviatura,
            }
          : it
      )
    );

    setShowModalEditarItem(false);
    setItemEnEdicion(null);
    showAlert('Producto actualizado en la lista.', 'success');
  };

  const handleEliminarItem = (tempId) => {
    setProductosSolicitados((prev) => prev.filter((it) => it.tempId !== tempId));
    showAlert('Producto retirado de la orden.', 'info');
  };

  // Cálculos de totales económicos
  const subtotalGeneral = productosSolicitados.reduce((acc, it) => acc + (it.subtotal || 0), 0);
  const igvCalculado = Math.round(subtotalGeneral * 0.18 * 100) / 100;
  const totalGeneral = Math.round((subtotalGeneral + igvCalculado) * 100) / 100;

  // Validación para el botón de WhatsApp
  const puedeEnviarPedido = Boolean(proveedorSeleccionado && productosSolicitados.length > 0 && !isSubmitting);

  // ----------------------------------------------------
  // REALIZAR PEDIDO Y ENVIAR POR WHATSAPP
  // ----------------------------------------------------
  const handleRealizarPedidoYEnviarWhatsApp = async () => {
    if (!puedeEnviarPedido) return;

    // Pre-abrir la ventana de WhatsApp inmediatamente en el evento de usuario para que el navegador no bloquee el popup
    const waWindow = window.open('about:blank', '_blank');
    if (waWindow) {
      try {
        waWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head><title>Conectando con WhatsApp...</title><meta charset="utf-8"></head>
            <body style="font-family: system-ui, -apple-system, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #f8fafc; color: #1e293b;">
              <div style="text-align: center; padding: 28px; background: white; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); max-width: 360px;">
                <div style="width: 44px; height: 44px; border: 4px solid #10b981; border-top-color: transparent; border-radius: 50%; margin: 0 auto 16px; animation: spin 1s linear infinite;"></div>
                <h3 style="margin: 0 0 8px; font-size: 16px; font-weight: 700;">Conectando con WhatsApp</h3>
                <p style="margin: 0; font-size: 13px; color: #64748b;">Generando Orden de Compra y preparando el mensaje para el proveedor...</p>
              </div>
              <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
            </body>
          </html>
        `);
      } catch (_) {}
    }

    setIsSubmitting(true);
    try {
      // 1. Preparar payload para el backend
      const detallesPayload = productosSolicitados.map((item) => ({
        producto_id: item.productoId,
        unidad_medida_id: item.unidadMedidaId,
        cantidad: item.cantidad,
        precio_unitario: item.precioUnitario,
      }));

      const payload = {
        proveedor_id: proveedorSeleccionado.ProveedorId || proveedorSeleccionado.id,
        Orden_CompraObservacion: observacion.trim() || undefined,
        detalles: detallesPayload,
      };

      // 2. Registrar en la base de datos
      const resCrear = await api.ordenesCompra.crear(payload);
      if (!resCrear?.success || !resCrear?.data) {
        throw new Error(resCrear?.message || 'Error al registrar la orden de compra.');
      }

      const ordenCreada = resCrear.data;
      const ordenId = ordenCreada.id || ordenCreada.Orden_CompraId;

      // 3. Obtener URL de WhatsApp y registrar auditoría de envío
      let waUrl = '';
      let pdfUrl = api.ordenesCompra.obtenerPdfUrlDirecta(ordenId);

      try {
        const resWa = await api.ordenesCompra.enviarWhatsapp(ordenId);
        if (resWa?.success && resWa?.data?.whatsapp_url) {
          waUrl = resWa.data.whatsapp_url;
          if (resWa.data.pdf_url) pdfUrl = resWa.data.pdf_url;
        }
      } catch (waErr) {
        console.warn('Error al registrar auditoría de WhatsApp:', waErr);
        try {
          const resWaGen = await api.ordenesCompra.whatsapp(ordenId);
          if (resWaGen?.success && resWaGen?.data?.whatsapp_url) {
            waUrl = resWaGen.data.whatsapp_url;
          }
        } catch (e2) {
          console.error('Error generando WhatsApp:', e2);
        }
      }

      // 4. Redirigir la ventana pre-abierta al enlace de WhatsApp
      if (waUrl) {
        if (waWindow && !waWindow.closed) {
          waWindow.location.href = waUrl;
        } else {
          window.open(waUrl, '_blank', 'noopener,noreferrer');
        }
      } else if (waWindow && !waWindow.closed) {
        waWindow.close();
      }

      // 5. Descargar silenciosamente el PDF oficial (vía Blob, sin navegar la pestaña actual)
      try {
        await api.ordenesCompra.descargarPdf(ordenId);
      } catch (pdfErr) {
        console.warn('Descarga silenciosa de PDF omitida:', pdfErr);
      }

      // 6. Configurar modal de éxito y limpiar formulario
      setModalExito({
        ordenId: ordenId,
        total: totalGeneral,
        whatsappUrl: waUrl,
        pdfUrl: pdfUrl,
        proveedorNombre: proveedorSeleccionado.ProveedorRazonSocial || proveedorSeleccionado.razon_social,
        proveedorTelefono: proveedorSeleccionado.ProveedorTelefono || proveedorSeleccionado.telefono,
        ordenCompleta: ordenCreada,
      });

      // Limpiar datos del formulario
      setProductosSolicitados([]);
      setProveedorSeleccionado(null);
      setObservacion('');
      showAlert(`Orden ${ordenId} registrada con éxito. Chat de WhatsApp y PDF iniciados.`, 'success');
    } catch (err) {
      if (waWindow && !waWindow.closed) {
        waWindow.close();
      }
      console.error('Error al procesar pedido:', err);
      showAlert(err.message || 'Error al procesar la orden de compra.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ----------------------------------------------------
  // ACCIONES EN EL HISTORIAL DE ÓRDENES
  // ----------------------------------------------------
  const handleVerDetalleOrden = async (ordenId) => {
    setShowModalDetalle(true);
    setIsLoadingDetalle(true);
    try {
      const res = await api.ordenesCompra.obtener(ordenId);
      if (res?.success && res?.data) {
        setOrdenDetalle(res.data);
      }
    } catch (err) {
      console.error('Error al ver detalle:', err);
      showAlert('No se pudo cargar el detalle de la orden.', 'error');
    } finally {
      setIsLoadingDetalle(false);
    }
  };

  const handleAbrirImpresionOficial = async (orden) => {
    if (!orden) return;
    try {
      const ocId = orden.id || orden.Orden_CompraId;
      if (orden.detalles && orden.detalles.length > 0) {
        setTicketOrdenCompra(orden);
        setShowModalOficial(true);
      } else {
        const res = await api.ordenesCompra.obtener(ocId);
        if (res?.success && res?.data) {
          setTicketOrdenCompra(res.data);
        } else {
          setTicketOrdenCompra(orden);
        }
        setShowModalOficial(true);
      }
    } catch (e) {
      setTicketOrdenCompra(orden);
      setShowModalOficial(true);
    }
  };

  const handleDescargarPdf = async (ordenId) => {
    try {
      await api.ordenesCompra.descargarPdf(ordenId);
      showAlert(`PDF de la orden ${ordenId} descargado correctamente.`, 'success');
    } catch (err) {
      const url = api.ordenesCompra.obtenerPdfUrlDirecta(ordenId);
      window.open(url, '_blank');
    }
  };

  const handleReenviarWhatsApp = async (ordenId) => {
    const waWindow = window.open('about:blank', '_blank');
    if (waWindow) {
      try {
        waWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head><title>Abriendo WhatsApp...</title><meta charset="utf-8"></head>
            <body style="font-family: system-ui, -apple-system, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #f8fafc; color: #1e293b;">
              <div style="text-align: center; padding: 28px; background: white; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); max-width: 360px;">
                <div style="width: 44px; height: 44px; border: 4px solid #10b981; border-top-color: transparent; border-radius: 50%; margin: 0 auto 16px; animation: spin 1s linear infinite;"></div>
                <h3 style="margin: 0 0 8px; font-size: 16px; font-weight: 700;">Abriendo WhatsApp</h3>
                <p style="margin: 0; font-size: 13px; color: #64748b;">Preparando el mensaje estructurado con los detalles del pedido...</p>
              </div>
              <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
            </body>
          </html>
        `);
      } catch (_) {}
    }

    try {
      // 1. Obtener enlace con mensaje estructurado y PDF
      const res = await api.ordenesCompra.whatsapp(ordenId);
      if (res?.success && res?.data?.whatsapp_url) {
        if (waWindow && !waWindow.closed) {
          waWindow.location.href = res.data.whatsapp_url;
        } else {
          window.open(res.data.whatsapp_url, '_blank', 'noopener,noreferrer');
        }
        showAlert(`WhatsApp abierto con el detalle de la orden y enlace al PDF.`, 'success');
      } else {
        if (waWindow && !waWindow.closed) waWindow.close();
        showAlert('No se pudo generar el enlace de WhatsApp.', 'error');
      }

      // 2. Descargar silenciosamente el PDF oficial
      try {
        await api.ordenesCompra.descargarPdf(ordenId);
      } catch (_) {}
    } catch (err) {
      if (waWindow && !waWindow.closed) waWindow.close();
      console.error('Error al abrir WhatsApp:', err);
      showAlert(err.message || 'Error al generar WhatsApp.', 'error');
    }
  };

  // ----------------------------------------------------
  // GENERACIÓN Y COPIADO DE IMAGEN VOUCHER (PARA WHATSAPP)
  // ----------------------------------------------------
  const drawRoundedRect = (ctx, x, y, width, height, radius) => {
    if (ctx.roundRect) {
      ctx.roundRect(x, y, width, height, radius);
    } else {
      ctx.rect(x, y, width, height);
    }
  };

  const generarCanvasOrden = (orden) => {
    const canvas = document.createElement('canvas');
    const dpr = 2; // Alta resolución retina para texto nítido
    const width = 760;

    const detalles = orden.detalles || [];
    const baseHeight = 350;
    const rowHeight = 34;
    const height = Math.max(520, baseHeight + (detalles.length * rowHeight));

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    // Fondo blanco nítido
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Contenedor tipo tarjeta con borde suave
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    drawRoundedRect(ctx, 8, 8, width - 16, height - 16, 12);
    ctx.stroke();

    // 1. Cabecera Emisor
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('COMERCIAL VALENCIA', 28, 42);

    ctx.fillStyle = '#64748b';
    ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('RUC: 20100070970  •  Tel: (01) 456-7890', 28, 59);

    // Badge Orden de Compra (Derecha)
    const ordenId = orden.id || orden.Orden_CompraId || 'OC-00000';
    const fechaStr = orden.fecha || (orden.Orden_CompraFecha ? new Date(orden.Orden_CompraFecha).toLocaleDateString('es-PE') : new Date().toLocaleDateString('es-PE'));

    ctx.fillStyle = '#eff6ff';
    ctx.beginPath();
    drawRoundedRect(ctx, width - 230, 24, 202, 44, 8);
    ctx.fill();
    ctx.strokeStyle = '#bfdbfe';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#1d4ed8';
    ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`ORDEN: ${ordenId}`, width - 215, 43);

    ctx.fillStyle = '#64748b';
    ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`Fecha: ${fechaStr}`, width - 215, 58);

    // 2. Banner de Solicitud Formal
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    drawRoundedRect(ctx, 28, 78, width - 56, 30, 6);
    ctx.fill();

    ctx.fillStyle = '#2563eb';
    ctx.fillRect(28, 78, 3.5, 30);

    ctx.fillStyle = '#1e293b';
    ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Solicito a usted la atención del siguiente pedido de compra:', 42, 97);

    // 3. Ficha de Datos del Proveedor
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    drawRoundedRect(ctx, 28, 118, width - 56, 56, 8);
    ctx.fill();
    ctx.strokeStyle = '#e2e8f0';
    ctx.stroke();

    const provRazon = orden.proveedor?.razon_social || orden.proveedor?.ProveedorRazonSocial || 'Por asignar';
    const provRuc = orden.proveedor?.ruc || orden.proveedor?.ProveedorRuc || '-';
    const provTel = orden.proveedor?.telefono || orden.proveedor?.ProveedorTelefono || '-';

    ctx.fillStyle = '#64748b';
    ctx.font = '9.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('PROVEEDOR:', 42, 137);
    ctx.fillText('RUC:', 360, 137);
    ctx.fillText('TELÉFONO:', 490, 137);
    ctx.fillText('ESTADO:', 630, 137);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(provRazon.slice(0, 35), 42, 157);
    ctx.fillText(provRuc, 360, 157);
    ctx.fillStyle = '#047857';
    ctx.fillText(`+51 ${provTel}`, 490, 157);

    const estado = (orden.estado || orden.Orden_CompraEstado || 'P') === 'C' ? 'Atendida' : 'Pendiente';
    ctx.fillStyle = estado === 'Atendida' ? '#15803d' : '#b45309';
    ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(estado, 630, 157);

    // 4. Cabecera de la Tabla
    let y = 186;
    ctx.fillStyle = '#f1f5f9';
    ctx.beginPath();
    drawRoundedRect(ctx, 28, y, width - 56, 26, 6);
    ctx.fill();

    ctx.fillStyle = '#475569';
    ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('PRODUCTO', 42, y + 17);
    ctx.fillText('UNIDAD', 370, y + 17);
    ctx.fillText('CANTIDAD', 460, y + 17);
    ctx.fillText('P. UNIT.', 560, y + 17);
    ctx.fillText('SUBTOTAL', 645, y + 17);

    y += 26;
    // 5. Filas de Productos
    detalles.forEach((det, idx) => {
      const prodNom = det.producto_nombre || det.producto?.nombre || det.producto?.ProductoNombre || det.Detalle_ProductoId || 'Producto';
      const unAbrev = det.unidad_medida_abreviatura || det.unidad_medida?.abreviatura || det.unidadMedida?.unidades_medidaAbreviatura || 'UND';
      const cant = Number(det.cantidad ?? det.Detalle_Orden_CompraCantidad ?? 0);
      const pu = Number(det.precio_unitario ?? det.Detalle_Orden_CompraPrecioUnitario ?? 0);
      const sub = Number(det.subtotal ?? det.Detalle_Orden_CompraSubtotal ?? (cant * pu));

      if (idx % 2 === 1) {
        ctx.fillStyle = '#fcfcfc';
        ctx.fillRect(28, y, width - 56, rowHeight);
      }

      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(28, y + rowHeight);
      ctx.lineTo(width - 28, y + rowHeight);
      ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 10.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(prodNom.slice(0, 40), 42, y + 21);

      ctx.fillStyle = '#475569';
      ctx.font = '10.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(unAbrev, 370, y + 21);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 10.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(cant.toFixed(2), 470, y + 21);

      ctx.fillStyle = '#475569';
      ctx.font = '10.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(`S/ ${pu.toFixed(2)}`, 560, y + 21);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 10.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(`S/ ${sub.toFixed(2)}`, 645, y + 21);

      y += rowHeight;
    });

    // 6. Resumen de Totales
    y += 12;
    const subtotal = Number(orden.subtotal || orden.Orden_CompraSubtotal || 0).toFixed(2);
    const igv = Number(orden.igv || orden.Orden_CompraIgv || 0).toFixed(2);
    const total = Number(orden.total || orden.Orden_CompraTotal || 0).toFixed(2);

    ctx.fillStyle = '#64748b';
    ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Subtotal:', 530, y + 10);
    ctx.fillText('IGV (18%):', 530, y + 26);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`S/ ${subtotal}`, 645, y + 10);
    ctx.fillText(`S/ ${igv}`, 645, y + 26);

    ctx.strokeStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(525, y + 33);
    ctx.lineTo(width - 35, y + 33);
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('TOTAL:', 530, y + 51);

    ctx.fillStyle = '#2563eb';
    ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`S/ ${total}`, 645, y + 51);

    // 7. Pie de Tarjeta
    ctx.fillStyle = '#94a3b8';
    ctx.font = '9.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Emitido por Comercial Valencia  •  Documento Oficial de Solicitud de Compra', 28, height - 16);

    return canvas;
  };

  const handleCopiarImagenOrden = (orden) => {
    try {
      const canvas = generarCanvasOrden(orden);
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        try {
          if (navigator.clipboard && window.ClipboardItem) {
            const item = new ClipboardItem({ 'image/png': blob });
            await navigator.clipboard.write([item]);
            showAlert('¡Imagen de la orden copiada! Pégala en WhatsApp con Ctrl + V.', 'success');
            return;
          }
        } catch (clipErr) {
          console.warn('Clipboard API no soportada o restringida, descargando archivo:', clipErr);
        }
        // Fallback: descarga directa del PNG
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Orden_Compra_${orden.id || orden.Orden_CompraId || 'OC'}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showAlert('Imagen descargada. Puedes arrastrarla o pegarla en WhatsApp.', 'info');
      }, 'image/png');
    } catch (err) {
      console.error('Error al generar imagen:', err);
      showAlert('No se pudo generar la imagen de la orden.', 'error');
    }
  };

  const handleDescargarImagenOrden = (orden) => {
    try {
      const canvas = generarCanvasOrden(orden);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Orden_Compra_${orden.id || orden.Orden_CompraId || 'OC'}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showAlert('Imagen descargada correctamente.', 'success');
      }, 'image/png');
    } catch (err) {
      console.error('Error descargando imagen:', err);
      showAlert('No se pudo descargar la imagen.', 'error');
    }
  };

  const handleAbrirCambiarEstado = (orden) => {
    const id = orden.id || orden.Orden_CompraId;
    const estado = orden.estado || orden.Orden_CompraEstado;
    setOrdenParaEstado({ ...orden, id, estado });
    setNuevoEstadoSeleccionado(estado === 'P' ? 'C' : 'P');
    setMotivoCambioEstado('');
    setShowModalEstado(true);
  };

  const handleGuardarCambioEstado = async () => {
    if (!ordenParaEstado) return;
    setIsUpdatingEstado(true);
    try {
      const id = ordenParaEstado.id || ordenParaEstado.Orden_CompraId;
      const res = await api.ordenesCompra.cambiarEstado(
        id,
        nuevoEstadoSeleccionado,
        motivoCambioEstado.trim() || undefined
      );
      if (res?.success) {
        showAlert(res.message || 'Estado actualizado correctamente.', 'success');
        setShowModalEstado(false);
        setOrdenParaEstado(null);
        cargarHistorial(paginacion.current_page);
      }
    } catch (err) {
      console.error('Error al cambiar estado:', err);
      showAlert(err.message || 'No se pudo actualizar el estado.', 'error');
    } finally {
      setIsUpdatingEstado(false);
    }
  };

  const handleAbrirAnularOrden = (orden) => {
    const id = orden.id || orden.Orden_CompraId;
    setOrdenParaAnular({ ...orden, id });
    setShowModalAnular(true);
  };

  const handleConfirmarAnular = async () => {
    if (!ordenParaAnular) return;
    setIsAnulando(true);
    try {
      const id = ordenParaAnular.id || ordenParaAnular.Orden_CompraId;
      const res = await api.ordenesCompra.eliminar(id);
      if (res?.success) {
        showAlert(`Orden ${id} anulada correctamente.`, 'info');
        setShowModalAnular(false);
        setOrdenParaAnular(null);
        cargarHistorial(paginacion.current_page);
      }
    } catch (err) {
      console.error('Error al anular orden:', err);
      showAlert(err.message || 'Error al anular la orden.', 'error');
    } finally {
      setIsAnulando(false);
    }
  };

  // ----------------------------------------------------
  // HELPER PARA BADGES DE ESTADO
  // ----------------------------------------------------
  const renderBadgeEstado = (estado) => {
    switch (estado) {
      case 'P':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            Pendiente
          </span>
        );
      case 'C':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            Completada
          </span>
        );
      case 'A':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 text-rose-500" />
            Anulada
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
            {estado || 'N/A'}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* ENCABEZADO Y TABS PRINCIPALES */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Módulo de Órdenes de Compra</h1>
              <p className="text-xs text-slate-500">
                Gestión de pedidos a proveedores con cotización automática, envío por WhatsApp y emisión de PDF oficial.
              </p>
            </div>
          </div>
        </div>

        {/* BOTONES DE PESTAÑA */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl border border-slate-200/70">
          <button
            onClick={() => setActiveTab('nueva')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'nueva'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Generar Pedido</span>
          </button>

          <button
            onClick={() => setActiveTab('historial')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'historial'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Historial de Órdenes</span>
          </button>
        </div>
      </div>

      {/* BANNER SUGERENCIAS DE REABASTECIMIENTO */}
      <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border border-emerald-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500 text-white rounded-xl shadow-xs shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <span>Sugerencias Semanales de Reabastecimiento</span>
              <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide bg-emerald-100 text-emerald-700 rounded-full border border-emerald-200">
                Nuevo
              </span>
            </h3>
            <p className="text-xs text-slate-600">
              ¿No estás seguro de qué productos comprar esta semana? Consulta el cálculo estadístico basado en histórico de consumo, stock actual y órdenes en tránsito.
            </p>
          </div>
        </div>
        {onNavigateToPredicciones && (
          <button
            onClick={onNavigateToPredicciones}
            className="self-start sm:self-auto flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer shrink-0"
          >
            <span>Ver Sugerencias</span>
            <Zap className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* VISTA 1: GENERAR NUEVA ORDEN DE COMPRA                                    */}
      {/* ========================================================================= */}
      {activeTab === 'nueva' && (
        <div className="space-y-6">
          {/* SECCIÓN 1: BUSCADOR Y SELECCIÓN DE PRODUCTOS */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-800">
                  1. Buscar y Agregar Productos al Pedido
                </h2>
              </div>
              <span className="text-xs text-slate-400">
                Selecciona producto, unidad y cantidad
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              {/* Buscador interactivo por similitud */}
              <div className="md:col-span-5 relative" ref={productoDropdownRef}>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Buscar Producto en Catálogo:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchProducto}
                    onChange={(e) => {
                      setSearchProducto(e.target.value);
                      setIsDropdownProductoOpen(true);
                    }}
                    onFocus={() => setIsDropdownProductoOpen(true)}
                    placeholder="Escribe nombre, marca o código..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 pl-10 text-xs font-medium text-slate-800 focus:outline-hidden focus:border-blue-500 focus:bg-white transition"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  {searchProducto && (
                    <button
                      onClick={() => setSearchProducto('')}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Dropdown flotante con resultados por similitud */}
                {isDropdownProductoOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto z-40 animate-in fade-in slide-in-from-top-1 duration-150">
                    {productosFiltrados.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400">
                        No se encontraron productos coincidentes.
                      </div>
                    ) : (
                      productosFiltrados.slice(0, 15).map((prod) => (
                        <div
                          key={prod.ProductoId}
                          onClick={() => handleSeleccionarProducto(prod)}
                          className="px-4 py-2.5 hover:bg-blue-50/70 border-b border-slate-50 last:border-0 cursor-pointer flex items-center justify-between transition-colors"
                        >
                          <div>
                            <div className="text-xs font-bold text-slate-800">
                              {prod.ProductoNombre}
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                              <span>Marca: {prod.ProductoMarca || 'Genérica'}</span>
                              <span>•</span>
                              <span>Stock: {prod.stock_actual_texto}</span>
                            </div>
                          </div>
                          <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                            {prod.categoria_nombre}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Selector de Unidad de Medida */}
              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Presentación / Unidad:
                </label>
                <select
                  disabled={!productoEnSeleccion}
                  value={unidadSeleccionada?.unidades_medidaId || ''}
                  onChange={(e) => handleCambiarUnidad(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-800 focus:outline-hidden focus:border-blue-500 disabled:opacity-50 disabled:bg-slate-100 transition cursor-pointer"
                >
                  {productoEnSeleccion ? (
                    (productoEnSeleccion.unidades || []).map((u) => (
                      <option key={u.unidades_medidaId} value={u.unidades_medidaId}>
                        {u.descripcion} ({u.abreviatura}) - Costo: {u.precio_compra_formateado || `S/ ${u.precio_compra}`}
                      </option>
                    ))
                  ) : (
                    <option value="">-- Selecciona producto --</option>
                  )}
                </select>
              </div>

              {/* Cantidad */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Cantidad:
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  disabled={!productoEnSeleccion}
                  value={cantidadInput}
                  onChange={(e) => setCantidadInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 text-center focus:outline-hidden focus:border-blue-500 disabled:opacity-50 disabled:bg-slate-100 transition"
                />
              </div>

              {/* Botón Agregar a la Orden */}
              <div className="md:col-span-2">
                <button
                  type="button"
                  onClick={handleAgregarProductoALista}
                  disabled={!productoEnSeleccion}
                  className="w-full h-[38px] flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Agregar</span>
                </button>
              </div>
            </div>

            {/* Banner de Previsualización del Producto Seleccionado */}
            {productoEnSeleccion && (
              <div className="mt-3 p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs text-blue-950 animate-in fade-in duration-150">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>
                    Seleccionado: <strong className="text-slate-900">{productoEnSeleccion.ProductoNombre}</strong>{' '}
                    <span className="text-blue-700 font-medium">({unidadSeleccionada?.descripcion || 'Unidad'})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setProductoEnSeleccion(null);
                      setUnidadSeleccionada(null);
                      setCantidadInput(1);
                      setPrecioUnitarioInput(0);
                      setSearchProducto('');
                    }}
                    className="ml-2 inline-flex items-center gap-1 px-2.5 py-1 text-slate-600 hover:text-red-600 bg-white hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-lg font-semibold text-[11px] transition shadow-2xs cursor-pointer active:scale-95"
                    title="Deseleccionar este producto"
                  >
                    <X className="w-3.5 h-3.5 text-red-500" />
                    <span>Deseleccionar</span>
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500">Costo Unit.:</span>
                    <input
                      type="number"
                      step="0.01"
                      value={precioUnitarioInput}
                      onChange={(e) => setPrecioUnitarioInput(e.target.value)}
                      className="w-20 bg-white border border-blue-200 rounded-lg px-2 py-0.5 text-right font-bold text-blue-800 focus:outline-hidden"
                    />
                  </div>
                  <div className="font-bold text-slate-800">
                    Subtotal: S/ {((Number(cantidadInput) || 0) * (Number(precioUnitarioInput) || 0)).toFixed(2)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECCIÓN 2: LISTA DE PRODUCTOS SOLICITADOS (Fiel al diseño en media_1788930262004.png) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800 tracking-tight">
                Productos Solicitados:
              </h2>
              {productosSolicitados.length > 0 && (
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                  {productosSolicitados.length} producto{productosSolicitados.length > 1 ? 's' : ''} en la orden
                </span>
              )}
            </div>

            {productosSolicitados.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center shadow-2xs">
                <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">
                  Aún no has agregado productos a la orden.
                </p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Utiliza el buscador superior para seleccionar productos, especificar la cantidad requerida y agregarlos a esta lista.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {productosSolicitados.map((item) => (
                  /* Tarjeta fiel a captura media_1788930262004.png */
                  <div
                    key={item.tempId}
                    className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs flex items-center justify-between gap-4 transition-all hover:border-slate-300"
                  >
                    {/* LADO IZQUIERDO: CANTIDAD Y NOMBRE DEL PRODUCTO */}
                    <div className="flex items-center gap-6">
                      {/* Recuadro de Cantidad */}
                      <div className="flex flex-col">
                        <span className="text-[11px] font-medium text-slate-400 mb-1">
                          Cantidad
                        </span>
                        <div className="w-16 h-10 bg-slate-50/90 border border-slate-200/90 rounded-xl flex items-center justify-center font-bold text-slate-800 text-base shadow-2xs">
                          {item.cantidad}
                        </div>
                      </div>

                      {/* Información del Producto Identificado */}
                      <div className="flex flex-col">
                        <span className="text-[11px] font-medium text-slate-400 mb-0.5">
                          Producto Identificado
                        </span>
                        <div className="text-sm md:text-base font-bold text-slate-800">
                          {item.unidadNombre} de {item.productoNombre}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                          <span>P. Unit: S/ {Number(item.precioUnitario).toFixed(2)}</span>
                          <span>•</span>
                          <span className="font-semibold text-slate-700">
                            Subtotal: S/ {Number(item.subtotal).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* LADO DERECHO: ACCIONES (EDITAR / ELIMINAR) */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleAbrirEditarItem(item)}
                        title="Editar cantidad o precio"
                        className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition cursor-pointer"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleEliminarItem(item.tempId)}
                        title="Quitar de la lista"
                        className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* RESUMEN ECONÓMICO */}
            {productosSolicitados.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  <span>Precios cotizados calculados en moneda nacional (PEN / Soles)</span>
                </div>

                <div className="flex items-center gap-6 text-sm">
                  <div>
                    <span className="text-xs text-slate-400 block">Subtotal:</span>
                    <span className="font-semibold text-slate-700">
                      S/ {subtotalGeneral.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">IGV (18%):</span>
                    <span className="font-semibold text-slate-700">
                      S/ {igvCalculado.toFixed(2)}
                    </span>
                  </div>
                  <div className="border-l border-slate-200 pl-6">
                    <span className="text-xs text-slate-400 block font-medium">TOTAL ESTIMADO:</span>
                    <span className="text-lg font-extrabold text-slate-900">
                      S/ {totalGeneral.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECCIÓN 3: TARJETA "APROBAR Y ENVIAR PEDIDO" (Fiel a media_1788930189847.png & media_1788930198383.png) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs space-y-5">
            {/* Header de la tarjeta */}
            <div className="flex items-center gap-2 text-slate-800">
              <FileText className="w-4 h-4 text-slate-500" />
              <h2 className="text-sm font-bold text-slate-800">
                Aprobar y Enviar Pedido
              </h2>
            </div>

            {/* Contenido en dos columnas o flex */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end">
              {/* Asignar compra al Proveedor con Buscador Live por Similitud */}
              <div className="md:col-span-6 relative" ref={proveedorDropdownRef}>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Asignar compra al Proveedor:
                </label>

                {/* Proveedor ya seleccionado */}
                {proveedorSeleccionado ? (
                  <div className="w-full bg-slate-50/90 border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between text-xs font-semibold text-slate-800 shadow-2xs">
                    <div className="flex items-center gap-2 truncate">
                      <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="truncate">
                        {proveedorSeleccionado.ProveedorRazonSocial || proveedorSeleccionado.razon_social}{' '}
                        <span className="text-slate-500 font-normal">
                          (+51 {proveedorSeleccionado.ProveedorTelefono || proveedorSeleccionado.telefono || 'Sin teléfono'})
                        </span>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setProveedorSeleccionado(null)}
                      className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-700 transition cursor-pointer shrink-0 ml-2"
                      title="Cambiar proveedor"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  /* Selector / Buscador por similitud en vivo */
                  <div className="relative">
                    <input
                      type="text"
                      value={searchProveedor}
                      onChange={(e) => {
                        setSearchProveedor(e.target.value);
                        setIsDropdownProveedorOpen(true);
                      }}
                      onFocus={() => setIsDropdownProveedorOpen(true)}
                      placeholder="-- Elige el proveedor --"
                      className="w-full bg-slate-50/90 border border-slate-200 rounded-xl px-4 py-3 pr-10 text-xs font-medium text-slate-700 focus:outline-hidden focus:border-blue-500 focus:bg-white transition"
                    />
                    <div className="absolute right-3.5 top-3.5 text-slate-400 pointer-events-none">
                      <ChevronDown className="w-4 h-4" />
                    </div>

                    {/* Dropdown flotante de proveedores por similitud */}
                    {isDropdownProveedorOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto z-40 animate-in fade-in slide-in-from-top-1 duration-150">
                        {proveedoresFiltrados.length === 0 ? (
                          <div className="p-4 text-center text-xs text-slate-400">
                            No se encontraron proveedores que coincidan.
                          </div>
                        ) : (
                          proveedoresFiltrados.map((prov) => (
                            <div
                              key={prov.ProveedorId || prov.id}
                              onClick={() => handleSeleccionarProveedor(prov)}
                              className="px-4 py-2.5 hover:bg-blue-50/70 border-b border-slate-50 last:border-0 cursor-pointer transition-colors"
                            >
                              <div className="text-xs font-bold text-slate-800">
                                {prov.ProveedorRazonSocial || prov.razon_social}
                              </div>
                              <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                                <span>RUC: {prov.ProveedorRuc || prov.ruc}</span>
                                <span>•</span>
                                <span className="font-semibold text-emerald-600">
                                  Tel: +51 {prov.ProveedorTelefono || prov.telefono || 'N/A'}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Botón WhatsApp destacado (fiel a capturas media_1788930189847.png y media_1788930198383.png) */}
              <div className="md:col-span-6">
                <button
                  type="button"
                  disabled={!puedeEnviarPedido}
                  onClick={handleRealizarPedidoYEnviarWhatsApp}
                  className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm flex items-center justify-center gap-3 transition-all duration-200 select-none ${
                    puedeEnviarPedido
                      ? 'bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-white shadow-md shadow-emerald-500/20 cursor-pointer'
                      : 'bg-slate-200/90 text-slate-400 cursor-not-allowed shadow-none'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Generando Pedido y PDF...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 shrink-0" />
                      <span>Realizar Pedido y Enviar PDF por WhatsApp</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Campo opcional de observación */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Observaciones o notas adicionales para el proveedor (opcional):
              </label>
              <input
                type="text"
                value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
                placeholder="Ej. Despachar a primera hora en almacén central..."
                maxLength={250}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-700 focus:outline-hidden focus:border-blue-500 focus:bg-white transition"
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA 2: HISTORIAL DE ÓRDENES DE COMPRA                                   */}
      {/* ========================================================================= */}
      {activeTab === 'historial' && (
        <div className="space-y-6">
          {/* BARRA DE FILTROS */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              {/* Buscador de orden o proveedor */}
              <div className="relative min-w-[220px]">
                <input
                  type="text"
                  value={searchHistorial}
                  onChange={(e) => setSearchHistorial(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && cargarHistorial(1)}
                  placeholder="Buscar por código u orden..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 pl-9 text-xs text-slate-800 focus:outline-hidden focus:border-blue-500 focus:bg-white transition"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              </div>

              {/* Filtro por estado */}
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-hidden focus:border-blue-500 transition cursor-pointer"
              >
                <option value="">Todos los Estados</option>
                <option value="P">Pendientes (P)</option>
                <option value="C">Completadas (C)</option>
                <option value="A">Anuladas (A)</option>
              </select>

              {/* Fechas desde / hasta */}
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 focus:outline-hidden focus:border-blue-500"
                />
                <span className="text-slate-400 text-xs">a</span>
                <input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <button
                onClick={() => cargarHistorial(1)}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Filtrar</span>
              </button>

              {(searchHistorial || filtroEstado || fechaDesde || fechaHasta) && (
                <button
                  onClick={() => {
                    setSearchHistorial('');
                    setFiltroEstado('');
                    setFechaDesde('');
                    setFechaHasta('');
                    setTimeout(() => cargarHistorial(1), 50);
                  }}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Limpiar Filtros
                </button>
              )}
            </div>

            <button
              onClick={() => cargarHistorial(paginacion.current_page)}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              title="Recargar listado"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingHistorial ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* TABLA DE ÓRDENES */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Código</th>
                    <th className="py-3.5 px-4">Fecha Emisión</th>
                    <th className="py-3.5 px-4">Proveedor</th>
                    <th className="py-3.5 px-4 text-center">Ítems</th>
                    <th className="py-3.5 px-4 text-right">Total (PEN)</th>
                    <th className="py-3.5 px-4 text-center">Estado</th>
                    <th className="py-3.5 px-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {isLoadingHistorial ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                        <span>Cargando órdenes de compra...</span>
                      </td>
                    </tr>
                  ) : ordenesHistorial.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-slate-400">
                        No se registraron órdenes de compra con los filtros especificados.
                      </td>
                    </tr>
                  ) : (
                    ordenesHistorial.map((oc) => {
                      const ocId = oc.id || oc.Orden_CompraId;
                      const ocFecha = oc.fecha_formateada || oc.Orden_CompraFecha_Formateada || oc.fecha || '-';
                      const provNombre = oc.proveedor?.razon_social || oc.proveedor?.ProveedorRazonSocial || 'Sin Proveedor';
                      const provTel = oc.proveedor?.telefono || oc.proveedor?.ProveedorTelefono;
                      const ocItems = oc.total_items ?? (oc.detalles ? oc.detalles.length : 0);
                      const ocTotal = Number(oc.total || oc.Orden_CompraTotal || 0);
                      const ocEstado = oc.estado || oc.Orden_CompraEstado;

                      return (
                        <tr key={ocId} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-blue-600">
                            {ocId}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 font-medium">
                            {ocFecha}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-800">
                              {provNombre}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {provTel ? `+51 ${provTel}` : 'Sin teléfono'}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center font-semibold text-slate-700">
                            {ocItems}
                          </td>
                          <td className="py-3.5 px-4 text-right font-extrabold text-slate-800">
                            S/ {ocTotal.toFixed(2)}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {renderBadgeEstado(ocEstado)}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {/* Ver Detalle */}
                              <button
                                onClick={() => handleVerDetalleOrden(ocId)}
                                title="Ver Detalle de la Orden"
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {/* Descargar PDF */}
                              <button
                                onClick={() => handleDescargarPdf(ocId)}
                                title="Ver / Descargar PDF Oficial"
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                              >
                                <Download className="w-4 h-4" />
                              </button>

                              {/* Imprimir Formato Físico Oficial */}
                              <button
                                onClick={() => handleAbrirImpresionOficial(oc)}
                                title="Imprimir Formato Físico Oficial de Orden de Compra"
                                className="p-1.5 text-slate-400 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                              >
                                <Printer className="w-4 h-4" />
                              </button>

                              {/* Reenviar WhatsApp */}
                              <button
                                onClick={() => handleReenviarWhatsApp(ocId)}
                                title="Reenviar por WhatsApp al Proveedor"
                                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                              >
                                <Send className="w-4 h-4" />
                              </button>

                              {/* Cambiar Estado */}
                              <button
                                onClick={() => handleAbrirCambiarEstado(oc)}
                                title="Cambiar Estado de la Orden"
                                className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>

                              {/* Anular si está pendiente */}
                              {ocEstado === 'P' && (
                                <button
                                  onClick={() => handleAbrirAnularOrden(oc)}
                                  title="Anular Orden de Compra"
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {paginacion.last_page > 1 && (
              <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Página {paginacion.current_page} de {paginacion.last_page} ({paginacion.total} órdenes en total)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={paginacion.current_page <= 1}
                    onClick={() => cargarHistorial(paginacion.current_page - 1)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                  >
                    Anterior
                  </button>
                  <button
                    disabled={paginacion.current_page >= 1 && paginacion.current_page === paginacion.last_page}
                    onClick={() => cargarHistorial(paginacion.current_page + 1)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CONFIRMACIÓN EXITOSA DE ORDEN Y WHATSAPP                         */}
      {/* ========================================================================= */}
      {modalExito && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-2xl p-6 text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-800">
                ¡Orden de Compra Generada!
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                La orden fue guardada exitosamente y el pedido estructurado se envió vía WhatsApp.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2 text-left">
              <div className="flex justify-between">
                <span className="text-slate-400">Código de Orden:</span>
                <span className="font-extrabold text-blue-600">{modalExito.ordenId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Proveedor:</span>
                <span className="font-bold text-slate-800 truncate max-w-[200px]">
                  {modalExito.proveedorNombre}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Teléfono:</span>
                <span className="font-semibold text-emerald-700">
                  +51 {modalExito.proveedorTelefono || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2">
                <span className="text-slate-500 font-medium">Monto Total:</span>
                <span className="font-extrabold text-slate-900 text-sm">
                  S/ {Number(modalExito.total).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => window.open(modalExito.pdfUrl, '_blank')}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Ver / Imprimir PDF Oficial</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTicketOrdenCompra(modalExito.ordenCompleta || {
                    id: modalExito.ordenId,
                    total: modalExito.total,
                    proveedor: { razon_social: modalExito.proveedorNombre, telefono: modalExito.proveedorTelefono },
                    detalles: []
                  });
                  setShowModalOficial(true);
                }}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer active:scale-98"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Formato Físico Oficial</span>
              </button>

              {modalExito.ordenCompleta && (
                <button
                  type="button"
                  onClick={() => handleCopiarImagenOrden(modalExito.ordenCompleta)}
                  className="w-full py-2.5 px-4 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer active:scale-98"
                  title="Copiar imagen al portapapeles para pegar en WhatsApp"
                >
                  <Camera className="w-4 h-4 text-blue-600" />
                  <span>Copiar Imagen para WhatsApp (Ctrl + V)</span>
                </button>
              )}

              {modalExito.whatsappUrl && (
                <button
                  type="button"
                  onClick={async () => {
                    window.open(modalExito.whatsappUrl, '_blank', 'noopener,noreferrer');
                    try {
                      await api.ordenesCompra.descargarPdf(modalExito.ordenId);
                    } catch (_) {}
                    showAlert('WhatsApp abierto con los detalles y enlace al PDF oficial.', 'success');
                  }}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Enviar PDF por WhatsApp</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setModalExito(null)}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Crear Otra Orden
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDITAR ÍTEM DE PRODUCTOS SOLICITADOS                             */}
      {/* ========================================================================= */}
      {showModalEditarItem && itemEnEdicion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-sm rounded-2xl border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-800">
                  Editar Ítem de la Orden
                </h3>
              </div>
              <button
                onClick={() => setShowModalEditarItem(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-600">
              Producto: <strong className="text-slate-800">{itemEnEdicion.productoNombre}</strong>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Cantidad:
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  value={itemEnEdicion.nuevaCantidad}
                  onChange={(e) =>
                    setItemEnEdicion({ ...itemEnEdicion, nuevaCantidad: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Precio Unitario (PEN):
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={itemEnEdicion.nuevoPrecio}
                  onChange={(e) =>
                    setItemEnEdicion({ ...itemEnEdicion, nuevoPrecio: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl text-xs flex justify-between items-center font-bold">
                <span className="text-slate-500">Nuevo Subtotal:</span>
                <span className="text-slate-900">
                  S/{' '}
                  {(
                    (Number(itemEnEdicion.nuevaCantidad) || 0) *
                    (Number(itemEnEdicion.nuevoPrecio) || 0)
                  ).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowModalEditarItem(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleGuardarEdicionItem}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: DETALLE COMPLETO DE ORDEN DE COMPRA                              */}
      {/* ========================================================================= */}
      {showModalDetalle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-2xl rounded-2xl border border-slate-200 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-800">
                  Detalle de Orden de Compra {ordenDetalle?.id || ordenDetalle?.Orden_CompraId}
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowModalDetalle(false);
                  setOrdenDetalle(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isLoadingDetalle || !ordenDetalle ? (
              <div className="py-12 text-center text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                <span>Cargando detalle de la orden...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Cabecera Info */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl text-xs">
                  <div>
                    <span className="text-slate-400 block">Proveedor:</span>
                    <span className="font-bold text-slate-800">
                      {ordenDetalle.proveedor?.razon_social || ordenDetalle.proveedor?.ProveedorRazonSocial || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">RUC:</span>
                    <span className="font-semibold text-slate-700">
                      {ordenDetalle.proveedor?.ruc || ordenDetalle.proveedor?.ProveedorRuc || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Teléfono:</span>
                    <span className="font-semibold text-emerald-700">
                      +51 {ordenDetalle.proveedor?.telefono || ordenDetalle.proveedor?.ProveedorTelefono || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Estado:</span>
                    <div className="mt-0.5">
                      {renderBadgeEstado(ordenDetalle.estado || ordenDetalle.Orden_CompraEstado)}
                    </div>
                  </div>
                </div>

                {/* Banner de Solicitud Formal */}
                <div className="px-3.5 py-2.5 bg-blue-50/70 border-l-4 border-blue-600 rounded-r-xl text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <span>Solicito a usted la atención del siguiente pedido de compra:</span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    {ordenDetalle.fecha || (ordenDetalle.Orden_CompraFecha ? new Date(ordenDetalle.Orden_CompraFecha).toLocaleDateString('es-PE') : '')}
                  </span>
                </div>

                {/* Tabla de ítems */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                        <th className="py-2.5 px-3">Producto</th>
                        <th className="py-2.5 px-3 text-center">Unidad</th>
                        <th className="py-2.5 px-3 text-center">Cantidad</th>
                        <th className="py-2.5 px-3 text-right">P. Unitario</th>
                        <th className="py-2.5 px-3 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(ordenDetalle.detalles || []).map((det, idx) => {
                        const prodNom = det.producto_nombre || det.producto?.nombre || det.producto?.ProductoNombre || det.Detalle_ProductoId;
                        const unAbrev = det.unidad_medida_abreviatura || det.unidad_medida?.abreviatura || det.unidadMedida?.unidades_medidaAbreviatura || 'UND';
                        const cant = Number(det.cantidad ?? det.Detalle_Orden_CompraCantidad ?? 0);
                        const pu = Number(det.precio_unitario ?? det.Detalle_Orden_CompraPrecioUnitario ?? 0);
                        const sub = Number(det.subtotal ?? det.Detalle_Orden_CompraSubtotal ?? (cant * pu));

                        return (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-3 font-semibold text-slate-800">
                              {prodNom}
                            </td>
                            <td className="py-2.5 px-3 text-center text-slate-600">
                              {unAbrev}
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold text-slate-800">
                              {cant.toFixed(2)}
                            </td>
                            <td className="py-2.5 px-3 text-right text-slate-600">
                              S/ {pu.toFixed(2)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                              S/ {sub.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Resumen económico */}
                <div className="bg-slate-50 p-4 rounded-xl flex justify-between items-center text-xs">
                  <div className="text-slate-500 max-w-sm">
                    {(ordenDetalle.observacion || ordenDetalle.Orden_CompraObservacion) && (
                      <div>
                        <strong>Obs:</strong> {ordenDetalle.observacion || ordenDetalle.Orden_CompraObservacion}
                      </div>
                    )}
                  </div>
                  <div className="text-right space-y-1">
                    <div>
                      <span className="text-slate-400 mr-2">Subtotal:</span>
                      <span className="font-semibold text-slate-700">
                        S/ {Number(ordenDetalle.subtotal || ordenDetalle.Orden_CompraSubtotal || 0).toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 mr-2">IGV (18%):</span>
                      <span className="font-semibold text-slate-700">
                        S/ {Number(ordenDetalle.igv || ordenDetalle.Orden_CompraIgv || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="text-sm font-extrabold text-slate-900 border-t border-slate-200 pt-1">
                      <span className="mr-2">TOTAL:</span>
                      <span>S/ {Number(ordenDetalle.total || ordenDetalle.Orden_CompraTotal || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Botones de acción modal */}
                <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => handleCopiarImagenOrden(ordenDetalle)}
                    className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer active:scale-95"
                    title="Copiar imagen al portapapeles para pegar en WhatsApp (Ctrl + V)"
                  >
                    <Camera className="w-4 h-4 text-blue-600" />
                    <span>Copiar Imagen (WhatsApp)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDescargarImagenOrden(ordenDetalle)}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                    title="Descargar imagen PNG de la orden"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
                    <span>Descargar Imagen</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDescargarPdf(ordenDetalle.id || ordenDetalle.Orden_CompraId)}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Descargar PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTicketOrdenCompra(ordenDetalle);
                      setShowModalOficial(true);
                    }}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer active:scale-95"
                    title="Imprimir formato físico oficial idéntico a Comercial Valencia"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Imprimir Formato Oficial</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleReenviarWhatsApp(ordenDetalle.id || ordenDetalle.Orden_CompraId)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>Enviar PDF por WhatsApp</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: CAMBIAR ESTADO DE ORDEN                                          */}
      {/* ========================================================================= */}
      {showModalEstado && ordenParaEstado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-sm rounded-2xl border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-800">
                  Cambiar Estado de la Orden
                </h3>
              </div>
              <button
                onClick={() => setShowModalEstado(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-600">
              Orden: <strong className="text-slate-800">{ordenParaEstado.id || ordenParaEstado.Orden_CompraId}</strong>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Nuevo Estado:
                </label>
                <select
                  value={nuevoEstadoSeleccionado}
                  onChange={(e) => setNuevoEstadoSeleccionado(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-blue-500 cursor-pointer"
                >
                  <option value="P">Pendiente (P)</option>
                  <option value="C">Completada / Atendida (C)</option>
                  <option value="A">Anulada (A)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Motivo o comentario (opcional):
                </label>
                <input
                  type="text"
                  value={motivoCambioEstado}
                  onChange={(e) => setMotivoCambioEstado(e.target.value)}
                  placeholder="Ej. Mercadería recibida conforme..."
                  maxLength={250}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowModalEstado(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isUpdatingEstado}
                onClick={handleGuardarCambioEstado}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50"
              >
                {isUpdatingEstado ? 'Actualizando...' : 'Confirmar Estado'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: CONFIRMAR ANULACIÓN                                              */}
      {/* ========================================================================= */}
      {showModalAnular && ordenParaAnular && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-sm rounded-2xl border border-slate-200 shadow-2xl p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-800">
                ¿Anular Orden {ordenParaAnular.id || ordenParaAnular.Orden_CompraId}?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                La orden de compra pasará a estado Anulada y quedará sin efecto administrativo.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowModalAnular(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                No, cancelar
              </button>
              <button
                type="button"
                disabled={isAnulando}
                onClick={handleConfirmarAnular}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50"
              >
                {isAnulando ? 'Anulando...' : 'Sí, anular orden'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* MODAL 6: FORMATO FÍSICO OFICIAL DE ORDEN DE COMPRA (COMERCIAL VALENCIA)     */}
      {/* ========================================================================= */}
      {showModalOficial && ticketOrdenCompra && (
        <DocumentoOrdenOficial
          isOpen={showModalOficial}
          onClose={() => setShowModalOficial(false)}
          headerType="ORDEN DE COMPRA"
          metadata={{
            fecha: ticketOrdenCompra.fecha_formateada?.split(' ')[0] || ticketOrdenCompra.fecha || new Date().toLocaleDateString('es-PE'),
            numero: ticketOrdenCompra.id || ticketOrdenCompra.Orden_CompraId || 'OC-00001',
            usuario: ticketOrdenCompra.usuario_creador || ticketOrdenCompra.auditoria?.usuario_creacion_nombre || ticketOrdenCompra.usuario?.nombre || ticketOrdenCompra.usuario_creacion || undefined,
            pagina: '1 de 1',
            fechaImpresion: new Date().toLocaleString('es-PE', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            }).replace('.', ''),
          }}
          entidad={{
            nombre: ticketOrdenCompra.proveedor?.razon_social || ticketOrdenCompra.proveedor?.ProveedorRazonSocial || ticketOrdenCompra.ProveedorRazonSocial || 'PROVEEDOR GENERAL',
            ruc: ticketOrdenCompra.proveedor?.ruc || ticketOrdenCompra.proveedor?.ProveedorRuc || ticketOrdenCompra.ProveedorRuc || '---',
            direccion: ticketOrdenCompra.proveedor?.direccion || ticketOrdenCompra.proveedor?.ProveedorDireccion || '---',
            responsable: ticketOrdenCompra.usuario_creador || ticketOrdenCompra.auditoria?.usuario_creacion_nombre || ticketOrdenCompra.usuario?.nombre || ticketOrdenCompra.usuario_creacion || undefined,
          }}
          items={(ticketOrdenCompra.detalles || []).map((det) => ({
            codigo: det.producto_id || det.ProductoId || det.id || '---',
            cantidad: det.cantidad || det.Detalle_Orden_CompraCantidad,
            medida: det.unidad_abreviatura || det.medida || 'UND',
            descripcion: det.producto_nombre || det.nombre || 'PRODUCTO',
            suc: 'AC',
            precio: det.costo_unitario || det.precio_unitario || det.Detalle_Orden_CompraCosto_Unitario || 0,
            total: det.subtotal != null ? det.subtotal : ((det.cantidad || det.Detalle_Orden_CompraCantidad || 1) * (det.costo_unitario || det.precio_unitario || det.Detalle_Orden_CompraCosto_Unitario || 0)),
            peso: det.peso || det.ProductoPeso || 0,
          }))}
          totales={{
            subtotal: ticketOrdenCompra.subtotal != null ? ticketOrdenCompra.subtotal : ((ticketOrdenCompra.total || ticketOrdenCompra.Orden_CompraTotal || 0) / 1.18),
            igv: ticketOrdenCompra.igv != null ? ticketOrdenCompra.igv : undefined,
            totalGeneral: ticketOrdenCompra.total || ticketOrdenCompra.Orden_CompraTotal || 0,
          }}
          empresa={{
            nombre: datosEmpresa?.EmpresaRazonSocial || datosEmpresa?.EmpresaNombreComercial || 'COMERCIAL VALENCIA',
            ruc: datosEmpresa?.EmpresaRuc || '10181935451',
            logo: datosEmpresa?.EmpresaLogo || null,
          }}
        />
      )}
    </div>
  );
}
