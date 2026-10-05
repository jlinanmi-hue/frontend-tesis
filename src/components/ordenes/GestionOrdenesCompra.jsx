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
  Printer,
  Zap,
  History,
  PackageCheck,
  AlertOctagon,
  Calendar,
  MoreVertical
} from 'lucide-react';
import { sileo } from 'sileo';
import api from '../../services/api';
import DocumentoOrdenOficial from '../common/DocumentoOrdenOficial';
import ModalRecepcionMercaderia from './ModalRecepcionMercaderia';
import ModalAnularRecepcion from './ModalAnularRecepcion';
import ModalHistorialRecepcion from './ModalHistorialRecepcion';
import ModalCompraRapida from './ModalCompraRapida';

export default function GestionOrdenesCompra({ 
  aiPrefill = null, 
  onClearAiPrefill = null, 
  onNavigateToPredicciones = null,
  onNavigateToRecepcion = null
}) {
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

  // Menú de Acciones (3 puntos) y Modal de Eliminación
  const [openActionMenuId, setOpenActionMenuId] = useState(null);
  const [showModalEliminar, setShowModalEliminar] = useState(false);
  const [ordenParaEliminar, setOrdenParaEliminar] = useState(null);
  const [isEliminando, setIsEliminando] = useState(false);


  // Modal Formato Físico Oficial de Orden de Compra
  const [showModalOficial, setShowModalOficial] = useState(false);
  const [ticketOrdenCompra, setTicketOrdenCompra] = useState(null);
  const [datosEmpresa, setDatosEmpresa] = useState(null);

  // Fecha Estimada de Llegada (Lead Time)
  const [fechaEntregaEstimada, setFechaEntregaEstimada] = useState('');

  // Modales de Recepción Oficial, Anulación y Compra Rápida
  const [showModalRecepcion, setShowModalRecepcion] = useState(false);
  const [ordenIdParaRecepcion, setOrdenIdParaRecepcion] = useState(null);

  const [showModalAnularRecepcion, setShowModalAnularRecepcion] = useState(false);
  const [ordenIdParaAnularRecepcion, setOrdenIdParaAnularRecepcion] = useState(null);

  const [showModalHistorialRecepcion, setShowModalHistorialRecepcion] = useState(false);
  const [ordenIdParaHistorial, setOrdenIdParaHistorial] = useState(null);

  const [showModalCompraRapida, setShowModalCompraRapida] = useState(false);

  useEffect(() => {
    if (api.empresa?.obtener) {
      api.empresa.obtener().then(res => {
        if (res?.data) setDatosEmpresa(res.data);
      }).catch(() => {});
    }
  }, []);

  // Cerrar menú de acciones al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('[data-dropdown]')) {
        setOpenActionMenuId(null);
      }
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
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

  // Métricas del requerimiento de compra
  const totalItemsSolicitados = productosSolicitados.length;
  const totalUnidadesSolicitadas = productosSolicitados.reduce((acc, it) => acc + (Number(it.cantidad) || 0), 0);
  const subtotalGeneral = productosSolicitados.reduce((acc, it) => acc + (it.subtotal || 0), 0);
  const igvCalculado = Math.round(subtotalGeneral * 0.18 * 100) / 100;
  const totalGeneral = Math.round((subtotalGeneral + igvCalculado) * 100) / 100;

  // Validación para guardar la orden de compra
  const puedeGuardarOrden = Boolean(proveedorSeleccionado && productosSolicitados.length > 0 && !isSubmitting);

  // ----------------------------------------------------
  // GUARDAR ORDEN DE COMPRA (SIN POPUP NI ENVÍO FORZADO A WHATSAPP)
  // ----------------------------------------------------
  const handleGuardarOrdenCompra = async () => {
    if (!puedeGuardarOrden) return;

    setIsSubmitting(true);
    try {
      // 1. Preparar payload para el backend con los productos solicitados
      const detallesPayload = productosSolicitados.map((item) => ({
        producto_id: item.productoId,
        unidad_medida_id: item.unidadMedidaId,
        cantidad: item.cantidad,
        precio_unitario: Number(item.precioUnitario) || 0,
      }));

      const payload = {
        proveedor_id: proveedorSeleccionado.ProveedorId || proveedorSeleccionado.id,
        Orden_CompraObservacion: observacion.trim() || undefined,
        fecha_entrega_estimada: fechaEntregaEstimada || undefined,
        detalles: detallesPayload,
      };

      // 2. Registrar en la base de datos (se crea directamente como PENDIENTE_RECEPCION)
      const resCrear = await api.ordenesCompra.crear(payload);
      if (!resCrear?.success || !resCrear?.data) {
        throw new Error(resCrear?.message || 'Error al registrar la orden de compra.');
      }

      const ordenCreada = resCrear.data;
      const ordenId = ordenCreada.id || ordenCreada.Orden_CompraId;

      sileo.success({
        title: 'Orden Guardada Correctamente',
        description: `La orden de compra ${ordenId} se registró exitosamente como Pendiente de Recepción.`,
      });

      // 3. Limpiar formulario de nueva orden
      setProductosSolicitados([]);
      setProveedorSeleccionado(null);
      setObservacion('');
      setFechaEntregaEstimada('');

      // 4. Cambiar a la pestaña de Historial, recargar y abrir el detalle de la orden
      setActiveTab('historial');
      await cargarHistorial(1);
      handleVerDetalleOrden(ordenId);
    } catch (err) {
      console.error('Error al guardar la orden de compra:', err);
      const msg = err.response?.data?.message || err.message || 'Error al guardar la orden de compra.';
      sileo.error({
        title: 'Error al Guardar',
        description: msg,
      });
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
  // ELIMINACIÓN DE ORDEN DE COMPRA
  // ----------------------------------------------------
  const handleAbrirEliminarOrden = (orden) => {
    const id = orden.id || orden.Orden_CompraId;
    setOrdenParaEliminar({ ...orden, id });
    setShowModalEliminar(true);
    setOpenActionMenuId(null);
  };

  const handleConfirmarEliminar = async () => {
    if (!ordenParaEliminar) return;
    setIsEliminando(true);
    try {
      const id = ordenParaEliminar.id || ordenParaEliminar.Orden_CompraId;
      const res = await api.ordenesCompra.eliminar(id);
      if (res?.success) {
        showAlert(res.message || `Orden ${id} eliminada correctamente.`, 'info');
        setShowModalEliminar(false);
        setOrdenParaEliminar(null);
        cargarHistorial(paginacion.current_page);
      }
    } catch (err) {
      console.error('Error al eliminar orden:', err);
      showAlert(err.response?.data?.message || err.message || 'Error al eliminar la orden de compra.', 'error');
    } finally {
      setIsEliminando(false);
    }
  };

  const handleIniciarRecepcion = async (ordenId) => {
    try {
      const res = await api.ordenesCompra.iniciarRecepcion(ordenId);
      if (res?.success) {
        sileo.info(`Recepción iniciada para la orden ${ordenId}.`);
        setOrdenIdParaRecepcion(ordenId);
        setShowModalRecepcion(true);
        cargarHistorial(paginacion.current_page);
      }
    } catch (err) {
      console.error('Error al iniciar recepción:', err);
      sileo.error(err.response?.data?.message || err.message || 'Error al iniciar recepción');
    }
  };

  // ----------------------------------------------------
  // HELPER PARA BADGES DE ESTADO (8 ESTADOS OFICIALES + LEGACY)
  // ----------------------------------------------------
  const renderBadgeEstado = (estado) => {
    switch (estado) {
      case 'EMITIDA':
      case 'BORRADOR':
      case 'ENVIADA':
      case 'PENDIENTE_RECEPCION':
      case 'P':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3.5 h-3.5 text-blue-500" />
            Emitida
          </span>
        );
      case 'RECEPCION_PARCIAL':
      case 'EN_RECEPCION':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <RefreshCw className="w-3.5 h-3.5 text-amber-500 animate-spin" />
            En Recepción Parcial
          </span>
        );
      case 'CERRADA_CONFORME':
      case 'CERRADA':
      case 'C':
      case 'R':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            Cerrada Conforme
          </span>
        );
      case 'CERRADA_CON_FALTANTE':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">
            <AlertCircle className="w-3.5 h-3.5 text-orange-500" />
            Cerrada con Faltante
          </span>
        );
      case 'ANULADA':
      case 'A':
      case 'CANCELADA_PROVEEDOR':
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

        {/* BOTONES DE PESTAÑA Y ACCIÓN RÁPIDA */}
        <div className="flex items-center gap-2.5 flex-wrap">
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

          <button
            type="button"
            onClick={() => setShowModalCompraRapida(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            title="Registrar compra directa de emergencia sin esperar pedido formal"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Compra Rápida</span>
          </button>

          {onNavigateToRecepcion && (
            <button
              type="button"
              onClick={onNavigateToRecepcion}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 active:scale-95 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              title="Ir al módulo oficial de Recepción de Mercadería"
            >
              <PackageCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>Recepción de Mercadería</span>
            </button>
          )}
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
                        {u.descripcion} ({u.abreviatura})
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
                <div className="flex items-center gap-3 text-xs text-slate-600">
                  <span>Marca: <strong className="text-slate-800">{productoEnSeleccion.ProductoMarca || 'Genérico'}</strong></span>
                  <span>•</span>
                  <span>Categoría: <strong className="text-slate-800">{productoEnSeleccion.categoria_nombre || 'General'}</strong></span>
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
                          {item.productoNombre}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                          <span>Marca: <strong className="text-slate-700 font-semibold">{item.productoMarca || 'Genérico'}</strong></span>
                          <span>•</span>
                          <span>Presentación: <strong className="text-slate-700 font-semibold">{item.unidadNombre}</strong> ({item.unidadAbreviatura || 'UND'})</span>
                        </div>
                      </div>
                    </div>

                    {/* LADO DERECHO: ACCIONES (EDITAR / ELIMINAR) */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleAbrirEditarItem(item)}
                        title="Modificar cantidad a solicitar"
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

            {/* RESUMEN DEL REQUERIMIENTO */}
            {productosSolicitados.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  <span>Lista oficial de requerimiento de mercadería para emisión a proveedor.</span>
                </div>

                <div className="flex items-center gap-6 text-sm">
                  <div>
                    <span className="text-xs text-slate-400 block">Variedades de Producto:</span>
                    <span className="font-bold text-slate-800">
                      {totalItemsSolicitados} producto{totalItemsSolicitados > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="border-l border-slate-200 pl-6">
                    <span className="text-xs text-slate-400 block font-medium">TOTAL UNIDADES A SOLICITAR:</span>
                    <span className="text-lg font-extrabold text-blue-600">
                      {totalUnidadesSolicitadas} unidades
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECCIÓN 3: TARJETA "CONFIRMAR Y GUARDAR ORDEN DE COMPRA" */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs space-y-5">
            {/* Header de la tarjeta */}
            <div className="flex items-center gap-2 text-slate-800">
              <FileText className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-800">
                Confirmar y Guardar Orden de Compra
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

              {/* Botón Guardar Orden de Compra */}
              <div className="md:col-span-6">
                <button
                  type="button"
                  disabled={!puedeGuardarOrden}
                  onClick={handleGuardarOrdenCompra}
                  className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm flex items-center justify-center gap-3 transition-all duration-200 select-none ${
                    puedeGuardarOrden
                      ? 'bg-blue-600 hover:bg-blue-700 active:scale-98 text-white shadow-md shadow-blue-600/20 cursor-pointer'
                      : 'bg-slate-200/90 text-slate-400 cursor-not-allowed shadow-none'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Guardando Orden de Compra...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5 shrink-0" />
                      <span>Guardar Orden de Compra</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Campos de Fecha Estimada de Llegada y Observación */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-4">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span>Fecha Estimada de Llegada (Lead Time):</span>
                </label>
                <input
                  type="date"
                  value={fechaEntregaEstimada}
                  onChange={(e) => setFechaEntregaEstimada(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-700 font-medium focus:outline-hidden focus:border-blue-500 focus:bg-white transition cursor-pointer"
                />
              </div>

              <div className="md:col-span-8">
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
                <option value="EMITIDA">Emitida</option>
                <option value="RECEPCION_PARCIAL">En Recepción Parcial</option>
                <option value="CERRADA_CONFORME">Cerrada Conforme</option>
                <option value="CERRADA_CON_FALTANTE">Cerrada con Faltante</option>
                <option value="ANULADA">Anulada</option>
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

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowModalCompraRapida(true)}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Registrar compra directa inmediata de emergencia a comercio aliado"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>⚡ Compra Rápida</span>
              </button>

              <button
                onClick={() => cargarHistorial(paginacion.current_page)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                title="Recargar listado"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingHistorial ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* TABLA DE ÓRDENES */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="overflow-x-auto min-h-[380px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-3">Código</th>
                    <th className="py-3.5 px-3">Fecha Emisión</th>
                    <th className="py-3.5 px-2.5">F. Estimada</th>
                    <th className="py-3.5 px-2.5">F. Recepción</th>
                    <th className="py-3.5 px-3">Proveedor</th>
                    <th className="py-3.5 px-2 text-center">Ítems</th>
                    <th className="py-3.5 px-3 text-right">Total (PEN)</th>
                    <th className="py-3.5 px-3 text-center">Estado</th>
                    <th className="py-3.5 px-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {isLoadingHistorial ? (
                    <tr>
                      <td colSpan="9" className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                        <span>Cargando órdenes de compra...</span>
                      </td>
                    </tr>
                  ) : ordenesHistorial.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="py-12 text-center text-slate-400">
                        No se registraron órdenes de compra con los filtros especificados.
                      </td>
                    </tr>
                  ) : (
                    ordenesHistorial.map((oc) => {
                      const ocId = oc.id || oc.Orden_CompraId;
                      const ocFecha = oc.fecha_formateada || oc.Orden_CompraFecha_Formateada || oc.fecha || '-';
                      const ocFechaEstimada = oc.fecha_entrega_estimada || '-';
                      const ocFechaReal = oc.fecha_recepcion_real ? new Date(oc.fecha_recepcion_real).toLocaleDateString('es-PE') : '-';
                      const provNombre = oc.proveedor?.razon_social || oc.proveedor?.ProveedorRazonSocial || 'Sin Proveedor';
                      const provTel = oc.proveedor?.telefono || oc.proveedor?.ProveedorTelefono;
                      const ocItems = oc.total_items ?? (oc.detalles ? oc.detalles.length : 0);
                      const ocTotal = Number(oc.total || oc.Orden_CompraTotal || 0);
                      const ocEstado = oc.estado || oc.Orden_CompraEstado;

                      const puedeIniciarRecepcion = ocEstado === 'PENDIENTE_RECEPCION' || ocEstado === 'ENVIADA' || ocEstado === 'P' || ocEstado === 'BORRADOR';
                      const puedeContinuarRecepcion = ocEstado === 'EN_RECEPCION';
                      const puedeAnularRecepcion = ocEstado === 'CERRADA' || ocEstado === 'CERRADA_CON_FALTANTE' || ocEstado === 'EN_RECEPCION' || ocEstado === 'C';

                      return (
                        <tr key={ocId} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-3 font-bold text-blue-600">
                            {ocId}
                          </td>
                          <td className="py-3.5 px-3 text-slate-600 font-medium">
                            {ocFecha}
                          </td>
                          <td className="py-3.5 px-2.5 text-slate-500 font-medium">
                            {ocFechaEstimada}
                          </td>
                          <td className="py-3.5 px-2.5 text-slate-500 font-medium">
                            {ocFechaReal}
                          </td>
                          <td className="py-3.5 px-3">
                            <div className="font-bold text-slate-800">
                              {provNombre}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {provTel ? `+51 ${provTel}` : 'Sin teléfono'}
                            </div>
                          </td>
                          <td className="py-3.5 px-2 text-center font-semibold text-slate-700">
                            {ocItems}
                          </td>
                          <td className="py-3.5 px-3 text-right font-extrabold text-slate-800">
                            S/ {ocTotal.toFixed(2)}
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            {renderBadgeEstado(ocEstado)}
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <div className="relative inline-block text-left" data-dropdown>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenActionMenuId(openActionMenuId === ocId ? null : ocId);
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                                title="Acciones"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>

                              {openActionMenuId === ocId && (
                                <div className="absolute right-0 mt-1 w-52 bg-white rounded-xl shadow-xl border border-slate-200/90 py-1.5 z-40 animate-in fade-in duration-100 text-left">
                                  <button
                                    onClick={() => {
                                      handleVerDetalleOrden(ocId);
                                      setOpenActionMenuId(null);
                                    }}
                                    className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Ver orden</span>
                                  </button>

                                  <button
                                    onClick={() => {
                                      handleAbrirImpresionOficial(oc);
                                      setOpenActionMenuId(null);
                                    }}
                                    className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
                                  >
                                    <Printer className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Imprimir documento</span>
                                  </button>

                                  <button
                                    onClick={() => {
                                      handleDescargarPdf(ocId);
                                      setOpenActionMenuId(null);
                                    }}
                                    className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
                                  >
                                    <Download className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Descargar PDF</span>
                                  </button>

                                  <button
                                    onClick={() => {
                                      handleReenviarWhatsApp(ocId);
                                      setOpenActionMenuId(null);
                                    }}
                                    className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
                                  >
                                    <Send className="w-3.5 h-3.5 text-emerald-500" />
                                    <span>Enviar por WhatsApp</span>
                                  </button>

                                  <button
                                    onClick={() => {
                                      setOrdenIdParaHistorial(ocId);
                                      setShowModalHistorialRecepcion(true);
                                      setOpenActionMenuId(null);
                                    }}
                                    className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
                                  >
                                    <History className="w-3.5 h-3.5 text-purple-500" />
                                    <span>Auditoría / Kárdex</span>
                                  </button>

                                  {puedeIniciarRecepcion && (
                                    <button
                                      onClick={() => {
                                        handleIniciarRecepcion(ocId);
                                        setOpenActionMenuId(null);
                                      }}
                                      className="w-full px-3 py-1.5 text-xs text-emerald-700 hover:bg-emerald-50 flex items-center gap-2.5 cursor-pointer font-medium"
                                    >
                                      <PackageCheck className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>Iniciar recepción</span>
                                    </button>
                                  )}

                                  {puedeContinuarRecepcion && (
                                    <button
                                      onClick={() => {
                                        setOrdenIdParaRecepcion(ocId);
                                        setShowModalRecepcion(true);
                                        setOpenActionMenuId(null);
                                      }}
                                      className="w-full px-3 py-1.5 text-xs text-blue-700 hover:bg-blue-50 flex items-center gap-2.5 cursor-pointer font-medium"
                                    >
                                      <PackageCheck className="w-3.5 h-3.5 text-blue-600" />
                                      <span>Continuar recepción</span>
                                    </button>
                                  )}

                                  {puedeAnularRecepcion && (
                                    <button
                                      onClick={() => {
                                        setOrdenIdParaAnularRecepcion(ocId);
                                        setShowModalAnularRecepcion(true);
                                        setOpenActionMenuId(null);
                                      }}
                                      className="w-full px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 cursor-pointer"
                                    >
                                      <AlertOctagon className="w-3.5 h-3.5 text-rose-500" />
                                      <span>Anular recepción</span>
                                    </button>
                                  )}

                                  <div className="my-1 border-t border-slate-100" />

                                  <button
                                    onClick={() => {
                                      handleAbrirEliminarOrden(oc);
                                      setOpenActionMenuId(null);
                                    }}
                                    className="w-full px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 cursor-pointer font-medium"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                    <span>Eliminar orden</span>
                                  </button>
                                </div>
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
                  Cantidad a Solicitar:
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

              {itemEnEdicion.unidadesDisponibles && itemEnEdicion.unidadesDisponibles.length > 1 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Presentación / Unidad:
                  </label>
                  <select
                    value={itemEnEdicion.nuevaUnidadId}
                    onChange={(e) =>
                      setItemEnEdicion({ ...itemEnEdicion, nuevaUnidadId: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-hidden focus:border-blue-500"
                  >
                    {itemEnEdicion.unidadesDisponibles.map((u) => (
                      <option key={u.unidades_medidaId} value={u.unidades_medidaId}>
                        {u.descripcion} ({u.abreviatura})
                      </option>
                    ))}
                  </select>
                </div>
              )}
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

                {/* Tabla de requerimiento de productos */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <th className="py-2.5 px-3 text-center w-12">#</th>
                        <th className="py-2.5 px-3">Producto Solicitado</th>
                        <th className="py-2.5 px-3">Marca</th>
                        <th className="py-2.5 px-3 text-center">Presentación</th>
                        <th className="py-2.5 px-3 text-center">Cant. Solicitada</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(ordenDetalle.detalles || []).map((det, idx) => {
                        const prodNom = det.producto_nombre || det.producto?.nombre || det.producto?.ProductoNombre || det.Detalle_ProductoId;
                        const marca = det.producto_marca || det.producto?.marca || det.producto?.ProductoMarca || 'Genérico';
                        const factor = Number(det.factor_conversion || 1);
                        const unAbrev = det.unidad_medida_abreviatura || det.unidad_abreviatura || det.unidad_nombre || det.unidadMedida?.unidades_medidaAbreviatura || 'UND';
                        const cant = Number(det.cantidad ?? det.Detalle_Orden_CompraCantidad ?? 0);

                        return (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-3 text-center text-slate-400 font-semibold">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-slate-800">
                              {prodNom}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 font-medium">
                              {marca}
                            </td>
                            <td className="py-2.5 px-3 text-center text-slate-700">
                              <span className="px-2 py-0.5 bg-slate-100 rounded-md border border-slate-200 font-semibold text-slate-800">
                                {unAbrev}
                              </span>
                              {factor > 1 && (
                                <div className="text-[10px] text-blue-600 font-medium mt-0.5">
                                  x {factor} unidades
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center font-extrabold text-blue-600">
                              <div>{cant}</div>
                              {factor > 1 && (
                                <div className="text-[10px] font-normal text-slate-400">
                                  ({cant * factor} unid. físicas)
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Resumen del requerimiento */}
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
                      <span className="text-slate-400 mr-2">Total Productos:</span>
                      <span className="font-semibold text-slate-700">
                        {ordenDetalle.detalles?.length || 0} variedad(es)
                      </span>
                    </div>
                    <div className="text-sm font-extrabold text-slate-900 border-t border-slate-200 pt-1">
                      <span className="mr-2">TOTAL UNIDADES:</span>
                      <span className="text-blue-600">
                        {(ordenDetalle.detalles || []).reduce((acc, d) => acc + Number(d.cantidad ?? d.Detalle_Orden_CompraCantidad ?? 0), 0)} unidades
                      </span>
                    </div>
                  </div>
                </div>

                {/* Botones de acción modal */}
                <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
                  {/* Iniciar Recepción directa si la orden está pendiente */}
                  {(['PENDIENTE_RECEPCION', 'BORRADOR', 'P', 'ENVIADA'].includes(ordenDetalle.estado || ordenDetalle.Orden_CompraEstado)) && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowModalDetalle(false);
                        handleIniciarRecepcion(ordenDetalle.id || ordenDetalle.Orden_CompraId);
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer active:scale-95"
                      title="Ingresar productos recibidos a stock físico"
                    >
                      <PackageCheck className="w-4 h-4" />
                      <span>Iniciar Recepción</span>
                    </button>
                  )}


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
      {/* MODAL: ELIMINAR ORDEN DE COMPRA                                           */}
      {/* ========================================================================= */}
      {showModalEliminar && ordenParaEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-sm rounded-2xl border border-slate-200 shadow-2xl p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-800">
                ¿Eliminar Orden {ordenParaEliminar.id || ordenParaEliminar.Orden_CompraId}?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                La orden de compra será eliminada del sistema. Esta acción solo se permite si la orden no registra mercadería ingresada a stock.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowModalEliminar(false);
                  setOrdenParaEliminar(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                No, cancelar
              </button>
              <button
                type="button"
                disabled={isEliminando}
                onClick={handleConfirmarEliminar}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50"
              >
                {isEliminando ? 'Eliminando...' : 'Sí, eliminar orden'}
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

      {/* ========================================================================= */}
      {/* MODAL 7: RECEPCIÓN OFICIAL DE MERCADERÍA                                  */}
      {/* ========================================================================= */}
      {showModalRecepcion && ordenIdParaRecepcion && (
        <ModalRecepcionMercaderia
          isOpen={showModalRecepcion}
          onClose={() => {
            setShowModalRecepcion(false);
            setOrdenIdParaRecepcion(null);
          }}
          ordenId={ordenIdParaRecepcion}
          onRecepcionFinalizada={() => {
            cargarHistorial(paginacion.current_page);
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 8: ANULACIÓN DE RECEPCIÓN CON CONTRA-MOVIMIENTO                     */}
      {/* ========================================================================= */}
      {showModalAnularRecepcion && ordenIdParaAnularRecepcion && (
        <ModalAnularRecepcion
          isOpen={showModalAnularRecepcion}
          onClose={() => {
            setShowModalAnularRecepcion(false);
            setOrdenIdParaAnularRecepcion(null);
          }}
          ordenId={ordenIdParaAnularRecepcion}
          onAnulacionExitosa={() => {
            cargarHistorial(paginacion.current_page);
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 9: AUDITORÍA E HISTORIAL DE RECEPCIÓN Y KARDEX                     */}
      {/* ========================================================================= */}
      {showModalHistorialRecepcion && ordenIdParaHistorial && (
        <ModalHistorialRecepcion
          isOpen={showModalHistorialRecepcion}
          onClose={() => {
            setShowModalHistorialRecepcion(false);
            setOrdenIdParaHistorial(null);
          }}
          ordenId={ordenIdParaHistorial}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 10: COMPRA RÁPIDA A COMERCIO ALIADO (PYME VECINA)                   */}
      {/* ========================================================================= */}
      {showModalCompraRapida && (
        <ModalCompraRapida
          isOpen={showModalCompraRapida}
          onClose={() => setShowModalCompraRapida(false)}
          onCompraExitosa={() => {
            cargarHistorial(1);
          }}
        />
      )}
    </div>
  );
}
