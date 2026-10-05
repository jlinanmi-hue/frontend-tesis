import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FileText,
  Send,
  Pencil,
  Trash2,
  Plus,
  Search,
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
  Printer,
  UserPlus,
  UserCheck,
  UserX,
  Phone,
  Calendar,
  DollarSign,
  Building,
  Store,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  ArrowUpRight,
  MapPin,
  FileCheck2,
  Check,
  ExternalLink,
  MessageSquare,
  Bot,
  User,
  Zap
} from 'lucide-react';
import { sileo } from 'sileo';
import api from '../../services/api';
import DocumentoOrdenOficial from '../common/DocumentoOrdenOficial';
import ModalCompraRapida from './ModalCompraRapida';

export default function GestionOrdenesCliente({ aiPrefill = null, onClearAiPrefill = null }) {
  // Pestaña activa: 'nueva' (Registrar Pedido) | 'historial' (Historial y Monitoreo)
  const [activeTab, setActiveTab] = useState('nueva');

  // Catálogos globales cargados
  const [clientesList, setClientesList] = useState([]);
  const [canalesList, setCanalesList] = useState([]);
  const [productosSelect, setProductosSelect] = useState([]);
  const [isLoadingCatalogos, setIsLoadingCatalogos] = useState(false);

  // ----------------------------------------------------
  // ESTADOS PARA "NUEVO PEDIDO DE CLIENTE"
  // ----------------------------------------------------
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [searchCliente, setSearchCliente] = useState('');
  const [isDropdownClienteOpen, setIsDropdownClienteOpen] = useState(false);
  const clienteDropdownRef = useRef(null);

  // Modal para Crear Cliente Rápido
  const [showModalCrearCliente, setShowModalCrearCliente] = useState(false);
  const [nuevoClienteData, setNuevoClienteData] = useState({
    ClienteNombre: '',
    ClienteRuc: '',
    ClienteNumero: '',
    ClienteDireccion: '',
  });
  const [isConsultandoSunat, setIsConsultandoSunat] = useState(false);
  const [isGuardandoCliente, setIsGuardandoCliente] = useState(false);

  // Canal y Acuerdo Comercial
  const [canalSeleccionado, setCanalSeleccionado] = useState('CNL-00001');
  const [acuerdoComercial, setAcuerdoComercial] = useState('Contado Mostrador');

  // Productos en el borrador del pedido
  const [productosPedido, setProductosPedido] = useState([]);

  // Búsqueda y selección de producto a agregar
  const [searchProducto, setSearchProducto] = useState('');
  const [isDropdownProductoOpen, setIsDropdownProductoOpen] = useState(false);
  const productoDropdownRef = useRef(null);

  const [productoEnSeleccion, setProductoEnSeleccion] = useState(null);
  const [unidadSeleccionada, setUnidadSeleccionada] = useState(null);
  const [cantidadInput, setCantidadInput] = useState(1);
  const [precioUnitarioInput, setPrecioUnitarioInput] = useState(0);

  // Modal de edición de ítem
  const [showModalEditarItem, setShowModalEditarItem] = useState(false);
  const [itemEnEdicion, setItemEnEdicion] = useState(null);

  // Estado de envío del pedido y Modal de Éxito
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const [modalExito, setModalExito] = useState(null);

  // ----------------------------------------------------
  // TELEMETRÍA PASIVA DE TIEMPOS (TBPP - KPI TESIS)
  // ----------------------------------------------------
  const formStartTimeRef = useRef(Date.now());
  const activeMsRef = useRef(0);
  const lastActiveTimestampRef = useRef(Date.now());
  const clienteSelectedTimeRef = useRef(null);
  const productFirstAddedTimeRef = useRef(null);
  const stockValidatedTimeRef = useRef(null);
  const paymentConfirmedTimeRef = useRef(null);
  const correctionsCountRef = useRef(0);

  const getDeviceType = useCallback(() => {
    if (typeof window === 'undefined' || !navigator?.userAgent) return 'DESKTOP';
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return 'TABLET';
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(ua)) return 'MOVIL';
    return 'DESKTOP';
  }, []);

  // Reiniciar telemetría al volver a la pestaña de nueva orden
  useEffect(() => {
    if (activeTab === 'nueva') {
      formStartTimeRef.current = Date.now();
      activeMsRef.current = 0;
      lastActiveTimestampRef.current = Date.now();
      clienteSelectedTimeRef.current = null;
      productFirstAddedTimeRef.current = null;
      stockValidatedTimeRef.current = null;
      paymentConfirmedTimeRef.current = null;
      correctionsCountRef.current = 0;
    }
  }, [activeTab]);

  // Detector de actividad efectiva del usuario (descuenta inactividad o pausas largas)
  useEffect(() => {
    if (activeTab !== 'nueva') return;

    const handleUserActivity = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      const now = Date.now();
      const diff = now - lastActiveTimestampRef.current;
      if (diff > 0 && diff < 20000) {
        activeMsRef.current += diff;
      }
      lastActiveTimestampRef.current = now;
    };

    window.addEventListener('mousemove', handleUserActivity, { passive: true });
    window.addEventListener('keydown', handleUserActivity, { passive: true });
    window.addEventListener('pointerdown', handleUserActivity, { passive: true });
    window.addEventListener('scroll', handleUserActivity, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('pointerdown', handleUserActivity);
      window.removeEventListener('scroll', handleUserActivity);
    };
  }, [activeTab]);

  // Reloj en tiempo real para cuenta regresiva exacta (HH:MM:SS)
  const [currentTime, setCurrentTime] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // ----------------------------------------------------
  // ESTADOS PARA "HISTORIAL Y MONITOREO"
  // ----------------------------------------------------
  const [ordenesHistorial, setOrdenesHistorial] = useState([]);
  const [statsData, setStatsData] = useState(null);
  const [isLoadingHistorial, setIsLoadingHistorial] = useState(false);
  const [searchHistorial, setSearchHistorial] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroCanal, setFiltroCanal] = useState('');
  const [filtroOrigen, setFiltroOrigen] = useState('');
  const [esOrigenIa, setEsOrigenIa] = useState(false);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [soloPorExpirar, setSoloPorExpirar] = useState(false);
  const [paginacion, setPaginacion] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
    per_page: 8,
  });

  // Cálculo del tiempo restante en formato HH:MM:SS anclado a la fecha original de creación
  const formatearCountdown = (orden, currentTimestamp) => {
    if (orden?.estado !== 'P') return null;

    const fechaStr = orden.auditoria?.fecha_creacion || orden.fecha_pedido;
    if (!fechaStr) return null;

    const fechaMs = new Date(fechaStr).getTime();
    if (isNaN(fechaMs)) return null;

    const timeoutHoras = orden.tiempo?.timeout_limite_horas || 12;
    const expiracionMs = fechaMs + (timeoutHoras * 60 * 60 * 1000);
    const diffMs = expiracionMs - currentTimestamp;

    if (diffMs <= 0) {
      return {
        texto: 'Expirado (>12h)',
        expirado: true,
        porExpirar: false,
      };
    }

    const totalSegundos = Math.floor(diffMs / 1000);
    const horas = Math.floor(totalSegundos / 3600);
    const minutos = Math.floor((totalSegundos % 3600) / 60);
    const segundos = totalSegundos % 60;

    const pad = (n) => String(n).padStart(2, '0');
    const texto = `${pad(horas)}:${pad(minutos)}:${pad(segundos)}`;
    const porExpirar = totalSegundos <= 2 * 3600; // Alerta cuando falte 2 horas o menos

    return {
      texto,
      expirado: false,
      porExpirar,
    };
  };

  // Modal Detalle de Pedido
  const [showModalDetalle, setShowModalDetalle] = useState(false);
  const [ordenDetalle, setOrdenDetalle] = useState(null);
  const [isLoadingDetalle, setIsLoadingDetalle] = useState(false);

  // Modal Cancelar Pedido (con reintegro a stock)
  const [showModalCancelar, setShowModalCancelar] = useState(false);
  const [ordenParaCancelar, setOrdenParaCancelar] = useState(null);
  const [motivoCancelacion, setMotivoCancelacion] = useState('');
  const [causaFalloCancelacion, setCausaFalloCancelacion] = useState('RECHAZO_CLIENTE');
  const [isCancelling, setIsCancelling] = useState(false);

  // Modal Completar Pedido
  const [showModalCompletar, setShowModalCompletar] = useState(false);
  const [ordenParaCompletar, setOrdenParaCompletar] = useState(null);
  const [estadoDespachoCompletar, setEstadoDespachoCompletar] = useState('ENTREGADO_COMPLETO');
  const [isCompleting, setIsCompleting] = useState(false);

  // Modal de Compra Rápida por Quiebre de Stock
  const [showModalCompraRapida, setShowModalCompraRapida] = useState(false);
  const [compraRapidaParams, setCompraRapidaParams] = useState({
    producto: null,
    cantidad: 1,
    motivo: ''
  });

  const handleAbrirCompraRapida = (producto, faltante = 1) => {
    setCompraRapidaParams({
      producto: producto,
      cantidad: faltante,
      motivo: `Abastecimiento de emergencia a PYME Vecina por quiebre de stock en pedido cliente (${clienteSeleccionado?.ClienteNombre || 'Cliente'})`
    });
    setShowModalCompraRapida(true);
  };

  const handleCompraRapidaExitosa = async () => {
    await cargarCatalogos();
    sileo.success('⚡ Stock reabastecido con éxito. Ahora puedes continuar con el pedido del cliente.');
  };

  // Modal Imprimir Comprobante / Ticket
  const [showModalTicket, setShowModalTicket] = useState(false);
  const [ticketOrden, setTicketOrden] = useState(null);
  const [datosEmpresa, setDatosEmpresa] = useState(null);

  // ----------------------------------------------------
  // CARGA INICIAL DE CATÁLOGOS
  // ----------------------------------------------------
  const cargarCatalogos = async () => {
    setIsLoadingCatalogos(true);
    try {
      const [resClientes, resCanales, resProductos, resEmpresa] = await Promise.allSettled([
        api.clientes.listar({ per_page: 200 }),
        api.catalogos.canalesPedido(),
        api.inventario.productosSelect(),
        api.empresa.obtener(),
      ]);

      if (resEmpresa.status === 'fulfilled' && resEmpresa.value?.data) {
        setDatosEmpresa(resEmpresa.value.data);
      }

      if (resClientes.status === 'fulfilled' && resClientes.value?.data) {
        const raw = resClientes.value.data;
        const listClientes = Array.isArray(raw) ? raw : (raw?.data || []);
        setClientesList(listClientes);
      }

      if (resCanales.status === 'fulfilled' && resCanales.value?.data) {
        const raw = resCanales.value.data;
        const listCanales = Array.isArray(raw) ? raw : (raw?.data || []);
        setCanalesList(listCanales);
        if (listCanales.length > 0 && !canalSeleccionado) {
          setCanalSeleccionado(listCanales[0].Canal_pedidoId);
        }
      }

      if (resProductos.status === 'fulfilled' && resProductos.value?.data) {
        const rawP = resProductos.value.data;
        const listProds = Array.isArray(rawP) ? rawP : (rawP?.data || []);
        setProductosSelect(listProds);
      }
    } catch (err) {
      console.error('Error al cargar catálogos:', err);
      sileo.error('No se pudieron cargar todos los catálogos.');
    } finally {
      setIsLoadingCatalogos(false);
    }
  };

  useEffect(() => {
    cargarCatalogos();
  }, []);

  const lastAppliedTimestampRef = useRef(0);

  // Función reutilizable para precargar datos de Valencia AI en el formulario
  const aplicarPrefillPedido = (prefill) => {
    if (!prefill) return;

    // Evitar ejecuciones duplicadas simultáneas (evento vs prop en el mismo instante)
    const now = Date.now();
    if (now - lastAppliedTimestampRef.current < 600) {
      return;
    }
    lastAppliedTimestampRef.current = now;

    // 1. Cambiar a la pestaña de 'nueva' orden y marcar origen IA
    setActiveTab('nueva');
    setEsOrigenIa(true);

    // 2. Precargar cliente si viene en prefill
    if (prefill.cliente) {
      const cli = prefill.cliente;
      setClienteSeleccionado({
        id: cli.id || cli.ClienteId,
        nombre: cli.nombre || cli.ClienteNombre || 'Cliente',
        dni_ruc: cli.dni_ruc || cli.documento || cli.ClienteRuc || '',
        telefono: cli.telefono || cli.ClienteNumero || '',
        direccion: cli.direccion || cli.ClienteDireccion || '',
      });
    }

    // 3. Precargar productos si vienen en prefill
    if (Array.isArray(prefill.productos) && prefill.productos.length > 0) {
      setProductosPedido(prefill.productos.map(p => ({
        producto_id: p.producto_id,
        producto_nombre: p.producto_nombre || p.nombre,
        producto_marca: p.producto_marca || p.marca || 'Genérico',
        categoria_nombre: p.categoria_nombre || '',
        unidad_id: p.unidad_id,
        unidad_abreviatura: p.unidad_abreviatura || p.presentacion || 'UND',
        unidad_descripcion: p.unidad_descripcion || p.presentacion || 'Unidades',
        factor_conversion: parseFloat(p.factor_conversion) || 1,
        stock_fisico: parseFloat(p.stock_fisico || p.stock_total || 0) || 0,
        stock_total: parseFloat(p.stock_total || p.stock_fisico || 0) || 0,
        cantidad_fisica_estimada: parseFloat(p.cantidad_fisica_estimada || p.cantidad || 0) || 0,
        precio_unitario: parseFloat(p.precio_unitario) || 0,
        cantidad: parseFloat(p.cantidad) || 1,
        subtotal: parseFloat(p.subtotal) || (parseFloat(p.cantidad || 1) * parseFloat(p.precio_unitario || 0)),
      })));
    }

    // 4. Precargar acuerdo comercial y canal si aplican
    if (prefill.acuerdo_comercial) {
      setAcuerdoComercial(prefill.acuerdo_comercial);
    }
    if (prefill.canal_id) {
      setCanalSeleccionado(prefill.canal_id);
    }

    // 5. Notificar al usuario con Sileo
    sileo.info({
      title: 'Pedido Precargado por Valencia AI',
      description: `Se han precargado los datos para ${prefill.cliente?.nombre || 'el cliente'}. Revisa las cantidades y presiona "Guardar Pedido" para confirmar.`,
    });
  };

  // 1. Detectar prefill desde props o sessionStorage al montarse o cambiar aiPrefill
  useEffect(() => {
    let prefillData = aiPrefill;
    if (!prefillData) {
      try {
        const stored = sessionStorage.getItem('valencia_ai_order_prefill');
        if (stored) {
          prefillData = JSON.parse(stored);
        }
      } catch (err) {
        console.warn('Error al leer valencia_ai_order_prefill de sessionStorage:', err);
      }
    }

    if (prefillData) {
      aplicarPrefillPedido(prefillData);
      try {
        sessionStorage.removeItem('valencia_ai_order_prefill');
      } catch (e) {}
      if (typeof onClearAiPrefill === 'function') {
        onClearAiPrefill();
      }
    }
  }, [aiPrefill]);

  // 2. Escuchar evento en tiempo real por si el componente ya estaba montado
  useEffect(() => {
    const handleAiOpenOrder = (e) => {
      const detail = e.detail || {};
      const prefill = detail.prefill || {};
      if (prefill && (prefill.cliente || prefill.productos)) {
        aplicarPrefillPedido(prefill);
      }
    };

    window.addEventListener('valencia-ai:open-order-form', handleAiOpenOrder);
    return () => window.removeEventListener('valencia-ai:open-order-form', handleAiOpenOrder);
  }, []);

  // 3. Escuchar evento de orden guardada o limpiada por Valencia AI para vaciar el formulario
  useEffect(() => {
    const handleOrderSavedOrCleared = (e) => {
      // Vaciar todos los campos y productos del formulario
      setProductosPedido([]);
      setClienteSeleccionado(null);
      setSearchCliente('');
      setSearchProducto('');
      setProductoEnSeleccion(null);
      setCantidadInput(1);
      setPrecioUnitarioInput(0);
      setAcuerdoComercial('Contado Mostrador');
      setShowModalEditarItem(false);
      setItemEnEdicion(null);
      setEsOrigenIa(false);

      // Limpiar sessionStorage y referencia de props
      try {
        window._valenciaAiLiveDraft = null;
        sessionStorage.removeItem('valencia_ai_live_draft');
        sessionStorage.removeItem('valencia_ai_order_prefill');
      } catch (err) {}
      if (typeof onClearAiPrefill === 'function') {
        onClearAiPrefill();
      }

      // Recargar catálogos para actualizar el stock real descontado y los contadores
      cargarCatalogos();
      cargarHistorial(1);
      cargarEstadisticas();

      const pedidoId = e.detail?.pedido_id;
      if (pedidoId) {
        sileo.success({
          title: 'Pedido Confirmado y Guardado',
          description: `La orden ${pedidoId} se guardó exitosamente. La interfaz ha quedado limpia para un nuevo pedido.`,
        });
      } else {
        sileo.info('El formulario de pedido ha sido limpiado.');
      }
    };

    window.addEventListener('valencia-ai:order-saved', handleOrderSavedOrCleared);
    window.addEventListener('valencia-ai:clear-order-form', handleOrderSavedOrCleared);
    return () => {
      window.removeEventListener('valencia-ai:order-saved', handleOrderSavedOrCleared);
      window.removeEventListener('valencia-ai:clear-order-form', handleOrderSavedOrCleared);
    };
  }, [onClearAiPrefill]);

  // 4. Sincronizar borrador en vivo en pantalla para Valencia AI (para respetar productos agregados/editados manualmente)
  useEffect(() => {
    if ((productosPedido && productosPedido.length > 0) || clienteSeleccionado) {
      const draft = {
        tipo: 'pedido_cliente',
        cliente_id: clienteSeleccionado?.ClienteId || null,
        cliente_nombre: clienteSeleccionado?.ClienteNombre || null,
        detalles: (productosPedido || []).map(p => ({
          producto_id: p.producto_id || p.productoId,
          nombre: p.producto_nombre || p.nombre || p.productoNombre,
          cantidad: Number(p.cantidad) || 1,
          unidad_id: p.unidad_id || p.unidadMedidaId || 'UND-00001',
          unidad_abreviatura: p.unidad_abreviatura || 'UND',
          precio_unitario: Number(p.precio_unitario) || 0,
          subtotal: Number(p.subtotal) || ((Number(p.cantidad) || 1) * (Number(p.precio_unitario) || 0)),
        })),
        canal_id: canalSeleccionado || 'CNL-00001',
        acuerdo_comercial: acuerdoComercial || 'Contado Mostrador',
      };
      window._valenciaAiLiveDraft = draft;
      try {
        sessionStorage.setItem('valencia_ai_live_draft', JSON.stringify(draft));
      } catch (e) {}
    } else {
      if (window._valenciaAiLiveDraft?.tipo === 'pedido_cliente') {
        window._valenciaAiLiveDraft = null;
        try {
          sessionStorage.removeItem('valencia_ai_live_draft');
        } catch (e) {}
      }
    }
  }, [clienteSeleccionado, productosPedido, canalSeleccionado, acuerdoComercial]);

  useEffect(() => {
    return () => {
      if (window._valenciaAiLiveDraft?.tipo === 'pedido_cliente') {
        window._valenciaAiLiveDraft = null;
        try {
          sessionStorage.removeItem('valencia_ai_live_draft');
        } catch (e) {}
      }
    };
  }, []);

  // Cargar Historial y Estadísticas cuando se entra a la pestaña 'historial'
  useEffect(() => {
    if (activeTab === 'historial') {
      cargarHistorial(1);
      cargarEstadisticas();
    }
  }, [activeTab, filtroEstado, filtroCanal, filtroOrigen, fechaDesde, fechaHasta, soloPorExpirar]);

  const cargarEstadisticas = async (customParams = null) => {
    try {
      const params = customParams || {
        search: searchHistorial.trim() || undefined,
        estado: filtroEstado || undefined,
        canal_id: filtroCanal || undefined,
        origen_ia: filtroOrigen || undefined,
        fecha_desde: fechaDesde || undefined,
        fecha_hasta: fechaHasta || undefined,
      };
      const res = await api.pedidosCliente.stats(params);
      if (res?.success && res.data) {
        setStatsData(res.data);
      }
    } catch (err) {
      console.error('Error al obtener estadísticas:', err);
    }
  };

  const cargarHistorial = async (page = 1) => {
    setIsLoadingHistorial(true);
    try {
      const params = {
        page,
        per_page: paginacion.per_page,
        search: searchHistorial.trim() || undefined,
        estado: filtroEstado || undefined,
        canal_id: filtroCanal || undefined,
        origen_ia: filtroOrigen || undefined,
        fecha_desde: fechaDesde || undefined,
        fecha_hasta: fechaHasta || undefined,
      };

      const res = await api.pedidosCliente.listar(params);
      if (res?.success && res.data) {
        const items = res.data.data || [];
        // Filtro local si marcó "Solo por expirar"
        const finalItems = soloPorExpirar
          ? items.filter(o => o.estado === 'P' && (o.tiempo?.por_expirar || o.tiempo?.expirado))
          : items;

        setOrdenesHistorial(finalItems);
        if (res.data.meta) {
          setPaginacion({
            current_page: res.data.meta.current_page || 1,
            last_page: res.data.meta.last_page || 1,
            total: res.data.meta.total || items.length,
            per_page: res.data.meta.per_page || 8,
          });
        }
      } else {
        setOrdenesHistorial([]);
      }
    } catch (err) {
      console.error('Error al cargar órdenes de clientes:', err);
      sileo.error('Error al obtener el historial de pedidos.');
    } finally {
      setIsLoadingHistorial(false);
    }
  };

  // Escuchar actualizaciones de pedidos desde el ChatBot (cancelaciones, completados, modificaciones)
  useEffect(() => {
    const handleOrdersUpdated = (e) => {
      cargarHistorial(paginacion.current_page || 1);
      cargarEstadisticas();
      cargarCatalogos();
    };

    window.addEventListener('valencia-ai:orders-updated', handleOrdersUpdated);
    return () => {
      window.removeEventListener('valencia-ai:orders-updated', handleOrdersUpdated);
    };
  }, [paginacion.current_page, searchHistorial, filtroEstado, filtroCanal, filtroOrigen, fechaDesde, fechaHasta, soloPorExpirar]);

  // Cierre de dropdowns al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(e) {
      if (clienteDropdownRef.current && !clienteDropdownRef.current.contains(e.target)) {
        setIsDropdownClienteOpen(false);
      }
      if (productoDropdownRef.current && !productoDropdownRef.current.contains(e.target)) {
        setIsDropdownProductoOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ----------------------------------------------------
  // MANEJO DE CLIENTE ANÓNIMO / MOSTRADOR
  // ----------------------------------------------------
  const seleccionarClienteAnonimo = () => {
    const anon = (Array.isArray(clientesList) ? clientesList : []).find(c =>
      c.ClienteRuc === '00000000000' ||
      (c.ClienteNombre && c.ClienteNombre.toUpperCase().includes('VENTA AL POR MENOR')) ||
      (c.ClienteNombre && c.ClienteNombre.toUpperCase().includes('CLIENTE GENERAL'))
    );

    if (clienteSeleccionado) {
      correctionsCountRef.current += 1;
    }
    clienteSelectedTimeRef.current = Date.now();

    if (anon) {
      setClienteSeleccionado({
        id: anon.ClienteId,
        nombre: anon.ClienteNombre,
        dni_ruc: anon.ClienteRuc,
        telefono: anon.ClienteNumero || '000000000',
        direccion: anon.ClienteDireccion || 'Venta en Mostrador',
        is_anon: true,
      });
    } else {
      setClienteSeleccionado({
        id: 'CLI-00011',
        nombre: 'CLIENTE GENERAL / VENTA AL POR MENOR',
        dni_ruc: '00000000000',
        telefono: '000000000',
        direccion: 'Venta en Tienda / Mostrador',
        is_anon: true,
      });
    }

    setCanalSeleccionado('CNL-00001'); // Tienda Presencial
    setAcuerdoComercial('Contado Mostrador');
    setSearchCliente('');
    setIsDropdownClienteOpen(false);
    sileo.info('Cliente Mostrador asignado para venta rápida.');
  };

  // ----------------------------------------------------
  // CREACIÓN RÁPIDA DE CLIENTE
  // ----------------------------------------------------
  const handleConsultarSunat = async () => {
    const doc = nuevoClienteData.ClienteRuc.trim();
    if (!doc || (doc.length !== 8 && doc.length !== 11)) {
      sileo.warning('Ingrese un DNI (8 dígitos) o RUC (11 dígitos) válido.');
      return;
    }

    setIsConsultandoSunat(true);
    try {
      const res = await api.clientes.consultarSunat(doc);
      if (res?.success && res.data) {
        setNuevoClienteData(prev => ({
          ...prev,
          ClienteNombre: res.data.razon_social || res.data.nombre || prev.ClienteNombre,
          ClienteDireccion: res.data.direccion || prev.ClienteDireccion,
          ClienteNumero: res.data.telefono || prev.ClienteNumero,
        }));
        sileo.success('Datos consultados exitosamente de SUNAT/RENIEC.');
      } else {
        sileo.info('No se encontró información automática. Complete los campos manualmente.');
      }
    } catch (err) {
      console.error('Error al consultar SUNAT:', err);
      sileo.warning('No se pudo autocompletar con SUNAT. Puede llenar los datos manualmente.');
    } finally {
      setIsConsultandoSunat(false);
    }
  };

  const handleGuardarNuevoCliente = async (e) => {
    e.preventDefault();
    if (!nuevoClienteData.ClienteNombre.trim()) {
      sileo.error('El nombre o razón social es obligatorio.');
      return;
    }
    if (!nuevoClienteData.ClienteRuc.trim()) {
      sileo.error('El RUC o DNI es obligatorio.');
      return;
    }

    setIsGuardandoCliente(true);
    try {
      const payload = {
        ClienteNombre: nuevoClienteData.ClienteNombre.trim(),
        ClienteRuc: nuevoClienteData.ClienteRuc.trim(),
        ClienteNumero: nuevoClienteData.ClienteNumero.trim() || '000000000',
        ClienteDireccion: nuevoClienteData.ClienteDireccion.trim() || 'Dirección de Entrega',
        ClienteEstado: 'A',
      };

      const res = await api.clientes.crear(payload);
      if (res?.success && res.data) {
        const nuevo = res.data;
        setClienteSeleccionado({
          id: nuevo.ClienteId,
          nombre: nuevo.ClienteNombre,
          dni_ruc: nuevo.ClienteRuc,
          telefono: nuevo.ClienteNumero,
          direccion: nuevo.ClienteDireccion,
        });

        setClientesList(prev => [nuevo, ...prev]);
        setShowModalCrearCliente(false);
        setNuevoClienteData({
          ClienteNombre: '',
          ClienteRuc: '',
          ClienteNumero: '',
          ClienteDireccion: '',
        });
        sileo.success(`Cliente ${nuevo.ClienteNombre} registrado y seleccionado.`);
      }
    } catch (err) {
      console.error('Error al registrar cliente rápido:', err);
      const msg = err.response?.data?.message || err.message || 'Error al registrar cliente';
      sileo.error(msg);
    } finally {
      setIsGuardandoCliente(false);
    }
  };

  // ----------------------------------------------------
  // SELECCIÓN Y AGREGADO DE PRODUCTOS
  // ----------------------------------------------------
  const handleSelectProducto = (prod) => {
    setProductoEnSeleccion(prod);
    setSearchProducto(prod.ProductoNombre);
    setIsDropdownProductoOpen(false);

    const unidades = prod.unidades || [];
    const baseUnit = unidades.find(u => u.es_base) || unidades[0] || {
      unidades_medidaId: 'UND-00001',
      descripcion: prod.unidad_base_nombre || 'Unidad',
      abreviatura: prod.unidad_base || 'UND',
      factor_conversion: 1,
      precio_venta: 10,
    };

    setUnidadSeleccionada(baseUnit);
    setPrecioUnitarioInput(baseUnit.precio_venta || 0);
    setCantidadInput(1);
  };

  const handleCambiarUnidad = (unidadId) => {
    if (!productoEnSeleccion) return;
    const u = (productoEnSeleccion.unidades || []).find(item => item.unidades_medidaId === unidadId);
    if (u) {
      setUnidadSeleccionada(u);
      setPrecioUnitarioInput(u.precio_venta || 0);
    }
  };

  const handleAgregarProducto = () => {
    if (!productFirstAddedTimeRef.current) {
      productFirstAddedTimeRef.current = Date.now();
    }
    stockValidatedTimeRef.current = Date.now();

    if (!productoEnSeleccion) {
      sileo.warning('Seleccione un producto del catálogo.');
      return;
    }

    const cantidad = parseFloat(cantidadInput);
    if (isNaN(cantidad) || cantidad <= 0) {
      sileo.warning('La cantidad debe ser mayor a 0.');
      return;
    }

    const precio = parseFloat(precioUnitarioInput);
    if (isNaN(precio) || precio < 0) {
      sileo.warning('El precio unitario no es válido.');
      return;
    }

    const rawStock = productoEnSeleccion.ProductoStockActual;
    const stockFisico = (rawStock !== null && rawStock !== undefined && !isNaN(Number(rawStock)))
      ? parseFloat(rawStock)
      : 0;
    const stockTotal = Math.max(0, stockFisico);
    const factorConversion = parseFloat(unidadSeleccionada?.factor_conversion || 1);
    const totalEnUnidadBase = parseFloat((cantidad * factorConversion).toFixed(2));
    const unidadTexto = productoEnSeleccion.unidad_base || 'UND';

    if (totalEnUnidadBase > stockTotal) {
      const faltante = parseFloat((totalEnUnidadBase - stockTotal).toFixed(2));
      const faltanteEnUnidad = Math.ceil(faltante / factorConversion);
      handleAbrirCompraRapida(productoEnSeleccion, faltanteEnUnidad);
      sileo.error({
        title: 'Stock Insuficiente',
        description: `No hay stock suficiente para cubrir ${totalEnUnidadBase} ${unidadTexto}. Faltan ${faltante} ${unidadTexto}. Se ha habilitado la opción de Compra Rápida a PYME Vecina para reabastecer al instante.`,
      });
      return;
    }

    const indexExistente = productosPedido.findIndex(p => p.producto_id === productoEnSeleccion.ProductoId);

    if (indexExistente >= 0) {
      correctionsCountRef.current += 1;
      const cantidadPrevia = productosPedido[indexExistente].cantidad;
      const nuevaCantidad = cantidadPrevia + cantidad;
      const nuevoTotalBase = parseFloat((nuevaCantidad * factorConversion).toFixed(2));

      if (nuevoTotalBase > stockTotal) {
        const faltante = parseFloat((nuevoTotalBase - stockTotal).toFixed(2));
        const faltanteEnUnidad = Math.ceil(faltante / factorConversion);
        handleAbrirCompraRapida(productoEnSeleccion, faltanteEnUnidad);
        sileo.error({
          title: 'Stock Insuficiente',
          description: `Supera el stock físico disponible (${stockTotal} ${unidadTexto}). Ya tenía ${cantidadPrevia} y solicitó ${cantidad} más (Total: ${nuevoTotalBase} ${unidadTexto}). Faltan ${faltante} ${unidadTexto}. Se ha habilitado la opción de Compra Rápida.`,
        });
        return;
      }

      const copia = [...productosPedido];
      copia[indexExistente].cantidad = nuevaCantidad;
      copia[indexExistente].subtotal = parseFloat((nuevaCantidad * precio).toFixed(2));
      copia[indexExistente].cantidad_fisica_estimada = nuevoTotalBase;
      setProductosPedido(copia);
      sileo.info(`Se actualizó la cantidad de "${productoEnSeleccion.ProductoNombre}".`);
    } else {
      const nuevoItem = {
        producto_id: productoEnSeleccion.ProductoId,
        producto_nombre: productoEnSeleccion.ProductoNombre,
        producto_marca: productoEnSeleccion.ProductoMarca || 'Genérico',
        categoria_nombre: productoEnSeleccion.categoria_nombre,
        unidad_id: unidadSeleccionada?.unidades_medidaId,
        unidad_abreviatura: unidadSeleccionada?.abreviatura || productoEnSeleccion.unidad_base || 'UND',
        unidad_descripcion: unidadSeleccionada?.descripcion,
        factor_conversion: factorConversion,
        stock_fisico: stockTotal,
        stock_total: stockTotal,
        cantidad_fisica_estimada: totalEnUnidadBase,
        precio_unitario: precio,
        cantidad: cantidad,
        subtotal: parseFloat((cantidad * precio).toFixed(2)),
      };

      setProductosPedido(prev => [...prev, nuevoItem]);
      sileo.success(`"${productoEnSeleccion.ProductoNombre}" agregado al pedido.`);
    }

    setProductoEnSeleccion(null);
    setSearchProducto('');
    setCantidadInput(1);
    setPrecioUnitarioInput(0);
  };

  const handleEliminarItem = (index) => {
    correctionsCountRef.current += 1;
    const item = productosPedido[index];
    setProductosPedido(prev => prev.filter((_, i) => i !== index));
    sileo.info(`"${item.producto_nombre}" eliminado del pedido.`);
  };

  const abrirModalEditarItem = (item, index) => {
    setItemEnEdicion({ ...item, indexOriginal: index });
    setShowModalEditarItem(true);
  };

  const guardarItemEditado = () => {
    if (!itemEnEdicion) return;
    correctionsCountRef.current += 1;
    const cant = parseFloat(itemEnEdicion.cantidad);
    const prec = parseFloat(itemEnEdicion.precio_unitario);

    if (isNaN(cant) || cant <= 0) {
      sileo.warning('La cantidad debe ser mayor a 0.');
      return;
    }
    if (isNaN(prec) || prec < 0) {
      sileo.warning('El precio no es válido.');
      return;
    }

    const factor = itemEnEdicion.factor_conversion || 1;
    const totalBase = parseFloat((cant * factor).toFixed(2));
    const stockTotal = itemEnEdicion.stock_total ?? (itemEnEdicion.stock_actual || 0);

    if (totalBase > stockTotal) {
      const faltante = parseFloat((totalBase - stockTotal).toFixed(2));
      sileo.error({
        title: 'Stock Insuficiente',
        description: `Supera el stock total vendible (${stockTotal}). Faltan ${faltante} unidades para cubrir la cantidad solicitada.`,
      });
      return;
    }

    const copia = [...productosPedido];
    copia[itemEnEdicion.indexOriginal] = {
      ...itemEnEdicion,
      cantidad: cant,
      precio_unitario: prec,
      subtotal: parseFloat((cant * prec).toFixed(2)),
      cantidad_fisica_estimada: totalBase,
    };

    setProductosPedido(copia);
    setShowModalEditarItem(false);
    setItemEnEdicion(null);
    sileo.success('Ítem actualizado.');
  };

  // ----------------------------------------------------
  // CÁLCULOS TOTALES DEL PEDIDO
  // ----------------------------------------------------
  const subtotalNeto = productosPedido.reduce((sum, item) => sum + (item.subtotal || 0), 0);
  const igvCalculado = parseFloat((subtotalNeto * 0.18).toFixed(2));
  const totalGeneral = parseFloat((subtotalNeto + igvCalculado).toFixed(2));
  const totalUnidades = productosPedido.reduce((sum, item) => sum + (item.cantidad || 0), 0);

  // ----------------------------------------------------
  // REGISTRAR PEDIDO DE VENTA
  // ----------------------------------------------------
  const handleRegistrarPedido = async () => {
    if (isSubmittingRef.current || isSubmitting) return;

    if (!clienteSeleccionado) {
      sileo.error('Debe seleccionar un cliente o elegir "Cliente Mostrador (Anónimo)".');
      return;
    }

    if (productosPedido.length === 0) {
      sileo.warning('Debe agregar al menos un producto al pedido.');
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      const now = Date.now();
      const t0 = formStartTimeRef.current || now;
      const totalSeg = Math.max(1, Math.round((now - t0) / 1000));
      const activeSeg = Math.max(1, Math.min(totalSeg, Math.round((activeMsRef.current || 0) / 1000)));

      // Tiempos por sub-tareas (milisegundos)
      const tSelClienteMs = clienteSelectedTimeRef.current
        ? Math.max(300, clienteSelectedTimeRef.current - t0)
        : Math.min(15000, Math.round(totalSeg * 200));

      const tCargaProdMs = productFirstAddedTimeRef.current
        ? Math.max(800, productFirstAddedTimeRef.current - (clienteSelectedTimeRef.current || t0))
        : Math.min(45000, Math.round(totalSeg * 500));

      const tValStockMs = stockValidatedTimeRef.current
        ? Math.max(300, stockValidatedTimeRef.current - (productFirstAddedTimeRef.current || t0))
        : Math.min(10000, Math.round(totalSeg * 150));

      const tConfPagoMs = Math.max(500, now - (stockValidatedTimeRef.current || productFirstAddedTimeRef.current || t0));

      const dispositivo = getDeviceType();
      const intentosCorreccion = correctionsCountRef.current || 0;

      const payload = {
        cliente_id: clienteSeleccionado.id,
        canal_id: canalSeleccionado || 'CNL-00001',
        acuerdo_comercial: acuerdoComercial.trim() || 'Contado Mostrador',
        origen_ia: esOrigenIa ? 'S' : 'N',
        detalles: productosPedido.map(item => ({
          producto_id: item.producto_id,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
          unidad_id: item.unidad_id,
          factor_conversion: item.factor_conversion,
        })),
        // Telemetría pasiva de rendimiento (TBPP - Tesis)
        tiempo_registro_segundos: totalSeg,
        tiempo_activo_segundos: activeSeg,
        tiempo_seleccion_cliente_ms: tSelClienteMs,
        tiempo_carga_productos_ms: tCargaProdMs,
        tiempo_validacion_stock_ms: tValStockMs,
        tiempo_confirmacion_pago_ms: tConfPagoMs,
        tiempo_seleccion_cliente_seg: Math.round(tSelClienteMs / 1000),
        tiempo_agregado_productos_seg: Math.round(tCargaProdMs / 1000),
        tiempo_validacion_stock_seg: Math.round(tValStockMs / 1000),
        tiempo_confirmacion_seg: Math.round(tConfPagoMs / 1000),
        tiempo_pausas_inactivo_seg: Math.max(0, totalSeg - activeSeg),
        intentos_correccion_formulario: intentosCorreccion,
        dispositivo_registro: dispositivo,
        telemetria: {
          tiempo_registro_seg: totalSeg,
          tiempo_efectivo_seg: activeSeg,
          tiempo_seleccion_cliente_ms: tSelClienteMs,
          tiempo_carga_productos_ms: tCargaProdMs,
          tiempo_validacion_stock_ms: tValStockMs,
          tiempo_confirmacion_pago_ms: tConfPagoMs,
          intentos_correccion: intentosCorreccion,
          dispositivo: dispositivo,
        },
      };

      const res = await api.pedidosCliente.crear(payload);
      if (res?.success && res.data) {
        const ordenCreada = res.data;
        sileo.success(`¡Orden de pedido ${ordenCreada.id} generada exitosamente! Stock descontado de almacén.`);

        setModalExito({
          orden: ordenCreada,
          cliente: clienteSeleccionado,
          total: totalGeneral,
          subtotal: subtotalNeto,
          igv: igvCalculado,
          detalles: [...productosPedido],
          canal: (Array.isArray(canalesList) ? canalesList : []).find(c => c.Canal_pedidoId === canalSeleccionado)?.Canal_pedidoDescripcion || 'Tienda Presencial',
          acuerdo: acuerdoComercial,
        });

        // Actualización optimista del stock físico en el catálogo del selector de productos
        const itemsDescontados = [...productosPedido];
        setProductosSelect(prevProds => {
          return (Array.isArray(prevProds) ? prevProds : []).map(prod => {
            const matchItem = itemsDescontados.find(p => p.producto_id === prod.ProductoId);
            if (matchItem) {
              const cantFactor = (parseFloat(matchItem.cantidad) || 0) * (parseFloat(matchItem.factor_conversion) || 1);
              const stockActual = parseFloat(prod.ProductoStockActual ?? 0) || 0;
              const nuevoStock = Math.max(0, stockActual - cantFactor);
              return {
                ...prod,
                ProductoStockActual: nuevoStock,
                stock_total_vendible: nuevoStock,
                stock_actual_texto: `${Math.round(nuevoStock)} ${prod.unidad_base || 'UND'}`,
              };
            }
            return prod;
          });
        });

        // Recargar catálogos frescos en segundo plano
        cargarCatalogos();

        setProductosPedido([]);
        setClienteSeleccionado(null);
        setSearchCliente('');
        setAcuerdoComercial('Contado Mostrador');
        
        // Reset de telemetría para la próxima orden
        formStartTimeRef.current = Date.now();
        activeMsRef.current = 0;
        lastActiveTimestampRef.current = Date.now();
        clienteSelectedTimeRef.current = null;
        productFirstAddedTimeRef.current = null;
        stockValidatedTimeRef.current = null;
        paymentConfirmedTimeRef.current = null;
        correctionsCountRef.current = 0;

        try {
          sessionStorage.removeItem('valencia_ai_order_prefill');
        } catch (e) {}
        if (typeof onClearAiPrefill === 'function') {
          onClearAiPrefill();
        }
      }
    } catch (err) {
      console.error('Error al crear orden de cliente:', err);
      const data = err.response?.data;
      let msg = data?.message;
      if (data?.errors) {
        const errorEntries = Object.values(data.errors).flat();
        if (errorEntries.length > 0) {
          msg = errorEntries.join(' ');
        }
      }
      msg = msg || err.message || 'Error al procesar la orden de pedido.';
      sileo.error({
        title: 'Stock Insuficiente / Error de Orden',
        description: msg,
      });
    } finally {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  // ----------------------------------------------------
  // ACCIONES SOBRE ÓRDENES EXISTENTES
  // ----------------------------------------------------
  const verDetalleOrden = async (id) => {
    setIsLoadingDetalle(true);
    setShowModalDetalle(true);
    try {
      const res = await api.pedidosCliente.obtener(id);
      if (res?.success && res.data) {
        setOrdenDetalle(res.data);
      }
    } catch (err) {
      console.error('Error al obtener detalle de orden:', err);
      sileo.error('No se pudo cargar el detalle de la orden.');
      setShowModalDetalle(false);
    } finally {
      setIsLoadingDetalle(false);
    }
  };

  const abrirModalCompletar = (orden) => {
    setOrdenParaCompletar(orden);
    setEstadoDespachoCompletar('ENTREGADO_COMPLETO');
    setShowModalCompletar(true);
  };

  const confirmarCompletarOrden = async () => {
    if (!ordenParaCompletar) return;
    setIsCompleting(true);
    try {
      const res = await api.pedidosCliente.completar(ordenParaCompletar.id, {
        estado_despacho: estadoDespachoCompletar || 'ENTREGADO_COMPLETO',
      });
      if (res?.success) {
        sileo.success(`Orden ${ordenParaCompletar.id} marcada como COMPLETADA (${estadoDespachoCompletar === 'ENTREGADO_PARCIAL' ? 'Entrega Parcial' : 'Entrega Completa'}).`);
        setShowModalCompletar(false);
        setOrdenParaCompletar(null);
        if (showModalDetalle) setShowModalDetalle(false);
        cargarHistorial(paginacion.current_page);
        cargarEstadisticas();
      }
    } catch (err) {
      console.error('Error al completar orden:', err);
      const msg = err.response?.data?.message || 'Error al completar orden.';
      sileo.error(msg);
    } finally {
      setIsCompleting(false);
    }
  };

  const abrirModalCancelar = (orden) => {
    setOrdenParaCancelar(orden);
    setMotivoCancelacion('');
    setCausaFalloCancelacion('RECHAZO_CLIENTE');
    setShowModalCancelar(true);
  };

  const confirmarCancelarOrden = async () => {
    if (!ordenParaCancelar) return;
    if (!motivoCancelacion.trim()) {
      sileo.warning('Por favor ingrese el motivo de la cancelación.');
      return;
    }

    setIsCancelling(true);
    try {
      const res = await api.pedidosCliente.cancelar(ordenParaCancelar.id, {
        motivo: motivoCancelacion.trim(),
        causa_fallo: causaFalloCancelacion || 'RECHAZO_CLIENTE',
        estado_despacho: 'RECHAZADO',
      });
      if (res?.success) {
        sileo.success(`Orden ${ordenParaCancelar.id} CANCELADA. El stock fue retornado al inventario y registrado en Kárdex.`);
        setShowModalCancelar(false);
        setOrdenParaCancelar(null);
        if (showModalDetalle) setShowModalDetalle(false);
        cargarHistorial(paginacion.current_page);
        cargarEstadisticas();
        cargarCatalogos();
      }
    } catch (err) {
      console.error('Error al cancelar orden:', err);
      const msg = err.response?.data?.message || 'Error al cancelar la orden.';
      sileo.error(msg);
    } finally {
      setIsCancelling(false);
    }
  };

  const eliminarOrdenPendiente = async (orden) => {
    if (!window.confirm(`¿Confirmas eliminar permanentemente la orden pendiente ${orden.id}? El stock será retornado al inventario.`)) {
      return;
    }

    try {
      const res = await api.pedidosCliente.eliminar(orden.id);
      if (res?.success) {
        sileo.success(`Orden ${orden.id} eliminada. Stock reincorporado.`);
        cargarHistorial(paginacion.current_page);
        cargarEstadisticas();
        cargarCatalogos();
      }
    } catch (err) {
      console.error('Error al eliminar orden:', err);
      sileo.error(err.response?.data?.message || 'Error al eliminar orden.');
    }
  };

  // ----------------------------------------------------
  // ENVIAR POR WHATSAPP
  // ----------------------------------------------------
  const handleEnviarWhatsApp = (orden) => {
    if (!orden) return;
    const cliente = orden.cliente || orden;
    const rawPhone = cliente.telefono || cliente.ClienteNumero || '';
    const cleanPhone = rawPhone.replace(/\D/g, '');

    let mensaje = `*COMERCIAL VALENCIA*\n`;
    mensaje += `*Orden de Pedido:* ${orden.id}\n`;
    mensaje += `*Fecha:* ${orden.fecha_formateada || new Date().toLocaleString('es-PE')}\n`;
    mensaje += `*Cliente:* ${cliente.nombre || cliente.ClienteNombre || 'Cliente General'}\n`;
    if (cliente.dni_ruc || cliente.ClienteRuc) {
      mensaje += `*RUC/DNI:* ${cliente.dni_ruc || cliente.ClienteRuc}\n`;
    }
    mensaje += `----------------------------------------\n`;
    mensaje += `*DETALLE DE PRODUCTOS:*\n`;

    const detalles = orden.detalles || [];
    detalles.forEach(d => {
      const cant = d.cantidad || d.Detalle_Pedido_Productos_cantidad;
      const nom = d.producto_nombre || d.producto?.ProductoNombre || 'Producto';
      const prec = parseFloat(d.precio_unitario || d.Detalle_Pedido_Productos_precio_unitario_venta || 0).toFixed(2);
      const sub = parseFloat(d.subtotal || d.Detalle_Pedido_Productos_subtotal || (cant * prec)).toFixed(2);
      mensaje += `• ${cant}x ${nom} (S/ ${prec}) = S/ ${sub}\n`;
    });

    mensaje += `----------------------------------------\n`;
    mensaje += `*Subtotal:* S/ ${parseFloat(orden.subtotal || 0).toFixed(2)}\n`;
    mensaje += `*IGV (18%):* S/ ${parseFloat(orden.igv || 0).toFixed(2)}\n`;
    mensaje += `*TOTAL A PAGAR:* S/ ${parseFloat(orden.total || 0).toFixed(2)}\n\n`;
    mensaje += `*Estado:* ${orden.estado_texto || (orden.estado === 'C' ? 'Completada' : 'Pendiente')}\n`;
    mensaje += `¡Muchas gracias por su preferencia! 🛒✨`;

    const url = cleanPhone
      ? `https://wa.me/${cleanPhone.startsWith('51') ? cleanPhone : '51' + cleanPhone}?text=${encodeURIComponent(mensaje)}`
      : `https://wa.me/?text=${encodeURIComponent(mensaje)}`;

    window.open(url, '_blank');
    sileo.success('Abriendo WhatsApp con el resumen de la orden...');
  };

  // ----------------------------------------------------
  // IMPRIMIR COMPROBANTE / TICKET
  // ----------------------------------------------------
  const abrirTicketImpresion = (orden) => {
    setTicketOrden(orden);
    setShowModalTicket(true);
  };

  const ejecutarImpresion = () => {
    window.print();
  };

  const listaClientesSegura = Array.isArray(clientesList) ? clientesList : [];
  const clientesFiltrados = searchCliente.trim() === ''
    ? listaClientesSegura.slice(0, 10)
    : listaClientesSegura.filter(c =>
        (c.ClienteNombre || '').toLowerCase().includes(searchCliente.toLowerCase()) ||
        (c.ClienteRuc || '').includes(searchCliente)
      ).slice(0, 15);

  const listaProductosSegura = Array.isArray(productosSelect) ? productosSelect : [];
  const productosFiltrados = searchProducto.trim() === ''
    ? listaProductosSegura.slice(0, 10)
    : listaProductosSegura.filter(p =>
        (p.ProductoNombre || '').toLowerCase().includes(searchProducto.toLowerCase()) ||
        (p.ProductoMarca || '').toLowerCase().includes(searchProducto.toLowerCase()) ||
        (p.categoria_nombre || '').toLowerCase().includes(searchProducto.toLowerCase())
      ).slice(0, 15);

  return (
    <div className="space-y-6">
      {/* ---------------------------------------------------- */}
      {/* CABECERA Y SELECTOR DE PESTAÑAS */}
      {/* ---------------------------------------------------- */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800 tracking-tight">
                  Gestión de Órdenes de Clientes
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Recepción de órdenes de cliente, control de inventario con descuento automático y seguimiento de órdenes
                </p>
              </div>
            </div>
          </div>

          {/* Navegación por pestañas */}
          <div className="flex items-center gap-1.5 p-1.5 bg-slate-100/80 rounded-xl border border-slate-200/80 self-start lg:self-auto">
            <button
              onClick={() => setActiveTab('nueva')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'nueva'
                  ? 'bg-white text-blue-600 shadow-xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Orden de Pedido</span>
            </button>
            <button
              onClick={() => setActiveTab('historial')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'historial'
                  ? 'bg-white text-blue-600 shadow-xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Historial & Seguimiento</span>
              {statsData?.conteo_estados?.pendientes > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-amber-500 text-white rounded-full text-[10px] font-bold">
                  {statsData.conteo_estados.pendientes}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* PESTAÑA 1: NUEVA ORDEN DE PEDIDO */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'nueva' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* COLUMNA IZQUIERDA Y CENTRAL: SELECCIÓN Y PRODUCTOS (2/3) */}
          <div className="xl:col-span-2 space-y-6">
            {/* 1. SELECCIÓN DE CLIENTE Y CONDICIONES */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                    1. Información del Cliente y Venta
                  </h2>
                </div>
                {/* Botones de acción rápida: Cliente Anónimo y Nuevo Cliente */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={seleccionarClienteAnonimo}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold transition cursor-pointer"
                    title="Asignar Cliente General / Venta de Mostrador sin registrar datos personales"
                  >
                    <UserX className="w-3.5 h-3.5" />
                    <span>Venta Rápida / Mostrador</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModalCrearCliente(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold transition cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>+ Crear Cliente Rápido</span>
                  </button>
                </div>
              </div>

              {/* Ficha de cliente seleccionado */}
              {clienteSeleccionado ? (
                <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl flex items-center justify-between animate-in fade-in duration-200">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                      {clienteSeleccionado.nombre.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 text-sm">{clienteSeleccionado.nombre}</span>
                        {clienteSeleccionado.is_anon && (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold">
                            Mostrador / Anónimo
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                        <span><strong>Doc:</strong> {clienteSeleccionado.dni_ruc || 'Sin documento'}</span>
                        <span><strong>Tel:</strong> {clienteSeleccionado.telefono || 'Sin teléfono'}</span>
                        <span><strong>Dirección:</strong> {clienteSeleccionado.direccion || 'No especificada'}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      correctionsCountRef.current += 1;
                      setClienteSeleccionado(null);
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                    title="Cambiar cliente"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                /* Buscador de Cliente */
                <div className="relative" ref={clienteDropdownRef}>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Buscar Cliente por Nombre, Razón Social o RUC/DNI:
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={searchCliente}
                      onChange={(e) => {
                        setSearchCliente(e.target.value);
                        setIsDropdownClienteOpen(true);
                      }}
                      onFocus={() => setIsDropdownClienteOpen(true)}
                      placeholder="Escriba para buscar cliente... (Ej: Bodega, 2060..., Don Pepe)"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    />
                  </div>

                  {/* Dropdown sugerencias de clientes */}
                  {isDropdownClienteOpen && (
                    <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto divide-y divide-slate-100">
                      {clientesFiltrados.length > 0 ? (
                        clientesFiltrados.map((cli) => (
                          <div
                            key={cli.ClienteId}
                            onClick={() => {
                              if (clienteSeleccionado && clienteSeleccionado.id !== cli.ClienteId) {
                                correctionsCountRef.current += 1;
                              }
                              clienteSelectedTimeRef.current = Date.now();
                              setClienteSeleccionado({
                                id: cli.ClienteId,
                                nombre: cli.ClienteNombre,
                                dni_ruc: cli.ClienteRuc,
                                telefono: cli.ClienteNumero,
                                direccion: cli.ClienteDireccion,
                              });
                              setSearchCliente('');
                              setIsDropdownClienteOpen(false);
                            }}
                            className="p-3 hover:bg-blue-50/60 cursor-pointer transition flex items-center justify-between"
                          >
                            <div>
                              <p className="text-xs font-bold text-slate-800">{cli.ClienteNombre}</p>
                              <p className="text-[11px] text-slate-500">
                                RUC/DNI: <span className="font-semibold text-slate-700">{cli.ClienteRuc || 'N/A'}</span> • Tel: {cli.ClienteNumero || 'S/N'}
                              </p>
                            </div>
                            <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                              {cli.ClienteId}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-xs text-slate-400">
                          No se encontraron clientes con "{searchCliente}".
                          <button
                            type="button"
                            onClick={() => setShowModalCrearCliente(true)}
                            className="block mx-auto mt-2 text-blue-600 font-bold hover:underline"
                          >
                            + Crear nuevo cliente
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Canales de Pedido y Acuerdo Comercial */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Canal de Pedido / Origen:
                  </label>
                  <select
                    value={canalSeleccionado}
                    onChange={(e) => setCanalSeleccionado(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  >
                    {(Array.isArray(canalesList) ? canalesList : []).map(c => (
                      <option key={c.Canal_pedidoId} value={c.Canal_pedidoId}>
                        {c.Canal_pedidoDescripcion} ({c.Canal_pedidoId})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Condición / Acuerdo Comercial:
                  </label>
                  <select
                    value={acuerdoComercial}
                    onChange={(e) => {
                      paymentConfirmedTimeRef.current = Date.now();
                      setAcuerdoComercial(e.target.value);
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  >
                    <option value="Contado Mostrador">Contado Mostrador</option>
                    <option value="Contado Efectivo">Contado Efectivo</option>
                    <option value="Yape / Plin">Yape / Plin</option>
                    <option value="Transferencia Bancaria">Transferencia Bancaria (BCP / BBVA / Interbank)</option>
                    <option value="Contra Entrega">Contra Entrega (Efectivo al recibir)</option>
                    <option value="Crédito 7 días">Crédito 7 días</option>
                    <option value="Crédito 15 días">Crédito 15 días</option>
                    <option value="Crédito 30 días">Crédito 30 días</option>
                    <option value="Especial / Por Definir">Especial / Por Definir</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 2. BUSCADOR & AGREGADO DE PRODUCTOS */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                    2. Catálogo & Agregar Productos
                  </h2>
                </div>
                <span className="text-xs text-slate-400">
                  {productosSelect.length} productos disponibles
                </span>
              </div>

              {/* Buscador de Producto */}
              <div className="relative" ref={productoDropdownRef}>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Buscar Producto en Catálogo Maestro:
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchProducto}
                    onChange={(e) => {
                      setSearchProducto(e.target.value);
                      setIsDropdownProductoOpen(true);
                    }}
                    onFocus={() => setIsDropdownProductoOpen(true)}
                    placeholder="Escriba nombre de producto o marca... (Ej: Arroz Delite, Pepsi, Aceite)"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                  {searchProducto && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchProducto('');
                        setProductoEnSeleccion(null);
                        setCantidadInput(1);
                        setPrecioUnitarioInput(0);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                      title="Limpiar búsqueda y deseleccionar"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Dropdown sugerencias de productos */}
                {isDropdownProductoOpen && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-64 overflow-y-auto divide-y divide-slate-100">
                    {productosFiltrados.length > 0 ? (
                      productosFiltrados.map((p) => {
                        const rawStock = p.ProductoStockActual;
                        const stockFisico = (rawStock !== null && rawStock !== undefined && !isNaN(Number(rawStock)))
                          ? parseFloat(rawStock)
                          : 0;
                        const stockTotal = Math.max(0, stockFisico);
                        const tieneStock = stockTotal > 0;
                        return (
                          <div
                            key={p.ProductoId}
                            onClick={() => handleSelectProducto(p)}
                            className="p-3 hover:bg-blue-50/60 cursor-pointer transition flex items-center justify-between"
                          >
                            <div>
                              <p className="text-xs font-bold text-slate-800">{p.ProductoNombre}</p>
                              <p className="text-[11px] text-slate-500">
                                Marca: <span className="font-semibold text-slate-700">{p.ProductoMarca}</span> • Categoría: {p.categoria_nombre}
                              </p>
                            </div>
                            <div className="text-right flex flex-col items-end gap-0.5">
                              <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                                tieneStock
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}>
                                {tieneStock ? `Stock: ${stockTotal} ${p.unidad_base || 'UND'}` : 'Sin Stock'}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-4 text-center text-xs text-slate-400">
                        No se encontraron productos coincidentes.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Controles de Configuración del Producto Seleccionado */}
              {productoEnSeleccion && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">
                        {productoEnSeleccion.ProductoNombre}
                      </h4>
                      {(() => {
                        const rawStock = productoEnSeleccion.ProductoStockActual;
                        const sFisico = (rawStock !== null && rawStock !== undefined && !isNaN(Number(rawStock)))
                          ? parseFloat(rawStock)
                          : 0;
                        const sTotal = Math.max(0, sFisico);
                        return (
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <span className="text-[11px] text-slate-500">
                              Marca: <strong className="text-slate-700">{productoEnSeleccion.ProductoMarca}</strong>
                            </span>
                            <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold border border-emerald-200">
                              Stock Disponible: {sTotal} {productoEnSeleccion.unidad_base || 'UND'}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-bold">
                        {productoEnSeleccion.ProductoId}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setProductoEnSeleccion(null);
                          setSearchProducto('');
                          setCantidadInput(1);
                          setPrecioUnitarioInput(0);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition cursor-pointer"
                        title="Deseleccionar / Quitar este producto"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Cancelar</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Selector de Unidad / Presentación */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Unidad de Medida / Presentación:
                      </label>
                      <select
                        value={unidadSeleccionada?.unidades_medidaId || ''}
                        onChange={(e) => handleCambiarUnidad(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        {(productoEnSeleccion.unidades || []).map(u => {
                          const label = (u.descripcion || '').includes(`(${u.abreviatura})`)
                            ? u.descripcion
                            : `${u.descripcion} (${u.abreviatura})`;
                          return (
                            <option key={u.unidades_medidaId} value={u.unidades_medidaId}>
                              {label} - Factor: {u.factor_conversion}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* Cantidad */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Cantidad a Pedir:
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="any"
                        value={cantidadInput}
                        onChange={(e) => setCantidadInput(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    {/* Precio Unitario */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Precio Unitario (S/):
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.10"
                        value={precioUnitarioInput}
                        onChange={(e) => setPrecioUnitarioInput(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Banner de Quiebre de Stock / Compra Rápida a PYME Vecina */}
                  {(() => {
                    const rawStockSel = productoEnSeleccion.ProductoStockActual;
                    const stockFisicoSel = (rawStockSel !== null && rawStockSel !== undefined && !isNaN(Number(rawStockSel))) ? parseFloat(rawStockSel) : 0;
                    const factorConversionSel = parseFloat(unidadSeleccionada?.factor_conversion || 1);
                    const cantDeseadaBase = (parseFloat(cantidadInput) || 0) * factorConversionSel;
                    const hayQuiebre = cantDeseadaBase > stockFisicoSel;
                    const faltanteBase = Math.max(0, parseFloat((cantDeseadaBase - stockFisicoSel).toFixed(2)));
                    const faltanteEnUnidad = Math.ceil(faltanteBase / factorConversionSel);

                    if (!hayQuiebre || cantDeseadaBase <= 0) return null;

                    return (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 animate-in fade-in">
                        <div className="flex items-center gap-2 text-amber-900">
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>
                            <strong>Stock insuficiente:</strong> Faltan {faltanteBase} {productoEnSeleccion.unidad_base || 'UND'} para cubrir la cantidad solicitada.
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAbrirCompraRapida(productoEnSeleccion, faltanteEnUnidad)}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer self-start sm:self-auto shadow-xs"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span>⚡ Registrar Compra Rápida a PYME Vecina</span>
                        </button>
                      </div>
                    );
                  })()}

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                    <div className="text-xs text-slate-600">
                      Subtotal Estimado: <strong className="text-slate-900 font-bold">
                        S/ {((parseFloat(cantidadInput) || 0) * (parseFloat(precioUnitarioInput) || 0)).toFixed(2)}
                      </strong>
                    </div>
                    <button
                      type="button"
                      onClick={handleAgregarProducto}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Agregar al Pedido</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 3. TABLA DE PRODUCTOS EN EL PEDIDO */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                    3. Detalle de Productos Solicitados ({productosPedido.length})
                  </h2>
                </div>
                {productosPedido.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('¿Desea vaciar todos los productos del pedido?')) {
                        setProductosPedido([]);
                      }
                    }}
                    className="text-xs text-rose-600 hover:underline font-semibold"
                  >
                    Vaciar Lista
                  </button>
                )}
              </div>

              {productosPedido.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                    <Package className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-slate-700">No hay productos en el pedido</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Busque productos en el catálogo superior y agréguelos para generar la orden.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase border-y border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Producto</th>
                        <th className="py-2.5 px-3">Presentación</th>
                        <th className="py-2.5 px-3 text-right">Precio Unit.</th>
                        <th className="py-2.5 px-3 text-center">Cantidad</th>
                        <th className="py-2.5 px-3 text-right">Subtotal</th>
                        <th className="py-2.5 px-3 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {productosPedido.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-3 font-semibold text-slate-400">{idx + 1}</td>
                          <td className="py-3 px-3">
                            <p className="font-bold text-slate-800">{item.producto_nombre}</p>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                              <span>{item.producto_marca} • {item.producto_id}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-semibold border border-slate-200">
                              {item.unidad_abreviatura}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-medium text-slate-700">
                            S/ {item.precio_unitario.toFixed(2)}
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-slate-800">
                            {item.cantidad}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-blue-700">
                            S/ {item.subtotal.toFixed(2)}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => abrirModalEditarItem(item, idx)}
                                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                                title="Editar cantidad o precio"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEliminarItem(idx)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                                title="Eliminar ítem"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* COLUMNA DERECHA: RESUMEN DE LIQUIDACIÓN Y BOTÓN PRINCIPAL (1/3) */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs sticky top-6 space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                  Resumen de la Orden
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Liquidación de orden comercial</p>
              </div>

              {/* Datos resumidos del cliente */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Cliente:</span>
                  <span className="font-bold text-slate-800 text-right truncate max-w-[180px]">
                    {clienteSeleccionado ? clienteSeleccionado.nombre : 'No seleccionado'}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Canal:</span>
                  <span className="font-semibold text-slate-700">
                    {(Array.isArray(canalesList) ? canalesList : []).find(c => c.Canal_pedidoId === canalSeleccionado)?.Canal_pedidoDescripcion || 'Tienda Presencial'}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Total Ítems:</span>
                  <span className="font-bold text-slate-800">{productosPedido.length}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Total Unidades:</span>
                  <span className="font-bold text-slate-800">{totalUnidades}</span>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-200 pt-4 space-y-2.5">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Subtotal Neto:</span>
                  <span className="font-semibold text-slate-800">S/ {subtotalNeto.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-600">
                  <span>IGV (18%):</span>
                  <span className="font-semibold text-slate-800">S/ {igvCalculado.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-200">
                  <span>TOTAL A PAGAR:</span>
                  <span className="text-blue-600 text-lg">S/ {totalGeneral.toFixed(2)}</span>
                </div>
              </div>

              {/* Botón principal de registro */}
              <button
                type="button"
                disabled={isSubmitting || productosPedido.length === 0 || !clienteSeleccionado}
                onClick={handleRegistrarPedido}
                className={`w-full py-3.5 px-4 rounded-xl text-xs font-bold text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                  isSubmitting || productosPedido.length === 0 || !clienteSeleccionado
                    ? 'bg-slate-300 cursor-not-allowed shadow-none'
                    : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98]'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Registrando Pedido y Descontando Stock...</span>
                  </>
                ) : (
                  <>
                    <FileCheck2 className="w-4 h-4" />
                    <span>REGISTRAR PEDIDO DE CLIENTE</span>
                  </>
                )}
              </button>

              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-[11px] text-slate-500 space-y-1">
                <p className="flex items-center gap-1.5 font-semibold text-slate-700">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Descuento automático de inventario
                </p>
                <p>Al confirmar, el stock disponible se reservará y quedará registrado el movimiento de salida en el Kárdex.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* PESTAÑA 2: HISTORIAL & SEGUIMIENTO DE PEDIDOS */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'historial' && (
        <div className="space-y-6">
          {/* KPI Cards Banner */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Órdenes</span>
              <p className="text-2xl font-bold text-slate-800 mt-1">
                {statsData?.total_ordenes || 0}
              </p>
              <span className="text-[11px] text-slate-400">
                {filtroEstado === 'P'
                  ? 'Filtro: Pendientes (P)'
                  : filtroEstado === 'C'
                  ? 'Filtro: Completadas (C)'
                  : filtroEstado === 'A'
                  ? 'Filtro: Canceladas (A)'
                  : 'Registros bajo filtros'}
              </span>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
              <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Órdenes Facturadas</span>
              <p className="text-2xl font-bold text-emerald-600 mt-1">
                S/ {parseFloat(statsData?.total_ventas_completadas || 0).toFixed(2)}
              </p>
              <span className="text-[11px] text-slate-400">
                {statsData?.conteo_estados?.completadas || 0} órdenes cobradas
              </span>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
              <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Pendientes de Despacho</span>
              <p className="text-2xl font-bold text-amber-600 mt-1">
                S/ {parseFloat(statsData?.total_monto_pendiente || 0).toFixed(2)}
              </p>
              <span className="text-[11px] text-slate-400">
                {statsData?.conteo_estados?.pendientes || 0} en cola
              </span>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
              <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Órdenes de Hoy</span>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                S/ {parseFloat(statsData?.hoy?.total_ventas || 0).toFixed(2)}
              </p>
              <span className="text-[11px] text-slate-400">
                {statsData?.hoy?.total_ordenes || 0} órdenes hoy
              </span>
            </div>
          </div>

          {/* Barra de Filtros */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Buscador */}
              <div className="lg:col-span-2 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchHistorial}
                  onChange={(e) => setSearchHistorial(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      cargarHistorial(1);
                      cargarEstadisticas();
                    }
                  }}
                  placeholder="Buscar por ID (PED-...) o nombre de cliente..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Filtro Estado */}
              <div>
                <select
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Todos los Estados</option>
                  <option value="P">Pendientes (P)</option>
                  <option value="C">Completadas (C)</option>
                  <option value="A">Canceladas (A)</option>
                </select>
              </div>

              {/* Filtro Canal */}
              <div>
                <select
                  value={filtroCanal}
                  onChange={(e) => setFiltroCanal(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Todos los Canales</option>
                  {(Array.isArray(canalesList) ? canalesList : []).map(c => (
                    <option key={c.Canal_pedidoId} value={c.Canal_pedidoId}>
                      {c.Canal_pedidoDescripcion}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro Origen */}
              <div>
                <select
                  value={filtroOrigen}
                  onChange={(e) => setFiltroOrigen(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Todos los Orígenes</option>
                  <option value="S">🤖 Valencia AI</option>
                  <option value="N">👤 Manual Convencional</option>
                </select>
              </div>

              {/* Botón Refrescar y Filtro Rápido */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSoloPorExpirar(!soloPorExpirar)}
                  className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    soloPorExpirar
                      ? 'bg-rose-500 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                  title="Filtrar órdenes pendientes próximas al límite de 12 horas"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Por Expirar</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    cargarHistorial(paginacion.current_page);
                    cargarEstadisticas();
                  }}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition cursor-pointer"
                  title="Refrescar lista"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Tabla de Órdenes */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Orden ID</th>
                    <th className="py-3 px-4">Fecha / Hora</th>
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4">Canal</th>
                    <th className="py-3 px-4 text-center">Origen</th>
                    <th className="py-3 px-4 text-right">Total (S/)</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-4 text-center">Tiempo Límite</th>
                    <th className="py-3 px-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoadingHistorial ? (
                    <tr>
                      <td colSpan="9" className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                        <span>Cargando órdenes de clientes...</span>
                      </td>
                    </tr>
                  ) : ordenesHistorial.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="py-12 text-center text-slate-400">
                        No se encontraron órdenes registradas con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    ordenesHistorial.map((orden) => {
                      const isPendiente = orden.estado === 'P';
                      const isCompletada = orden.estado === 'C';
                      const isCancelada = orden.estado === 'A';

                      return (
                        <tr key={orden.id} className="hover:bg-slate-50/80 transition">
                          {/* ID */}
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            {orden.id}
                          </td>

                          {/* Fecha */}
                          <td className="py-3.5 px-4 text-slate-600">
                            {orden.fecha_formateada || 'N/A'}
                          </td>

                          {/* Cliente */}
                          <td className="py-3.5 px-4">
                            <p className="font-bold text-slate-800">{orden.cliente?.nombre || 'Cliente General'}</p>
                            <p className="text-[10px] text-slate-400">Doc: {orden.cliente?.dni_ruc || 'Sin doc'}</p>
                          </td>

                          {/* Canal */}
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-semibold">
                              {orden.canal?.descripcion || 'Tienda'}
                            </span>
                          </td>

                          {/* Origen */}
                          <td className="py-3.5 px-4 text-center">
                            {orden.origen_ia ? (
                              <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-[10px] font-bold inline-flex items-center gap-1 shadow-2xs" title="Orden asistida y validada por Valencia AI">
                                <Bot className="w-3 h-3 text-indigo-600" />
                                Valencia AI
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 bg-slate-100 text-slate-600 border border-slate-200 rounded-full text-[10px] font-medium inline-flex items-center gap-1" title="Orden registrada por personal administrativo">
                                <User className="w-3 h-3 text-slate-400" />
                                Manual
                              </span>
                            )}
                          </td>

                          {/* Total */}
                          <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                            S/ {parseFloat(orden.total || 0).toFixed(2)}
                          </td>

                          {/* Estado */}
                          <td className="py-3.5 px-4 text-center">
                            {isPendiente && (
                              <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Pendiente
                              </span>
                            )}
                            {isCompletada && (
                              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                Completada
                              </span>
                            )}
                            {isCancelada && (
                              <span className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
                                <XCircle className="w-3 h-3" />
                                Cancelada
                              </span>
                            )}
                          </td>

                          {/* Tiempo límite con reloj en tiempo real HH:MM:SS */}
                          <td className="py-3.5 px-4 text-center">
                            {isPendiente ? (
                              (() => {
                                const cd = formatearCountdown(orden, currentTime);
                                if (!cd) return <span className="text-slate-300">-</span>;
                                if (cd.expirado) {
                                  return (
                                    <span className="px-2.5 py-1 bg-rose-600 text-white rounded-lg text-[10px] font-bold inline-flex items-center gap-1 shadow-2xs">
                                      <AlertCircle className="w-3 h-3" />
                                      {cd.texto}
                                    </span>
                                  );
                                }
                                if (cd.porExpirar) {
                                  return (
                                    <span className="px-2.5 py-1 bg-amber-500 text-white rounded-lg text-[10px] font-bold font-mono inline-flex items-center gap-1 shadow-2xs animate-pulse" title="Próximo al límite de 12h">
                                      <Clock className="w-3 h-3" />
                                      {cd.texto}
                                    </span>
                                  );
                                }
                                return (
                                  <span className="px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-bold font-mono inline-flex items-center gap-1" title="Tiempo restante antes del timeout de 12h">
                                    <Clock className="w-3 h-3 text-slate-400" />
                                    {cd.texto}
                                  </span>
                                );
                              })()
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>

                          {/* Acciones */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {/* Ver detalle */}
                              <button
                                type="button"
                                onClick={() => verDetalleOrden(orden.id)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                title="Ver detalle completo"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {/* WhatsApp */}
                              <button
                                type="button"
                                onClick={() => handleEnviarWhatsApp(orden)}
                                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                                title="Enviar resumen por WhatsApp"
                              >
                                <Send className="w-4 h-4" />
                              </button>

                              {/* Imprimir Ticket */}
                              <button
                                type="button"
                                onClick={() => abrirTicketImpresion(orden)}
                                className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                                title="Imprimir Comprobante / Ticket"
                              >
                                <Printer className="w-4 h-4" />
                              </button>

                              {/* Completar si está pendiente */}
                              {isPendiente && (
                                <button
                                  type="button"
                                  onClick={() => abrirModalCompletar(orden)}
                                  className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                                  title="Marcar como completada"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </button>
                              )}

                              {/* Cancelar si está pendiente */}
                              {isPendiente && (
                                <button
                                  type="button"
                                  onClick={() => abrirModalCancelar(orden)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                  title="Cancelar orden y reponer stock"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              )}

                              {/* Eliminar permanente si está pendiente */}
                              {isPendiente && (
                                <button
                                  type="button"
                                  onClick={() => eliminarOrdenPendiente(orden)}
                                  className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                                  title="Eliminar orden"
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
              <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <span>
                  Mostrando página <strong>{paginacion.current_page}</strong> de <strong>{paginacion.last_page}</strong> ({paginacion.total} pedidos en total)
                </span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={paginacion.current_page <= 1}
                    onClick={() => cargarHistorial(paginacion.current_page - 1)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold transition"
                  >
                    Anterior
                  </button>
                  <button
                    disabled={paginacion.current_page >= paginacion.last_page}
                    onClick={() => cargarHistorial(paginacion.current_page + 1)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold transition"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 1: CREAR CLIENTE RÁPIDO */}
      {/* ---------------------------------------------------- */}
      {showModalCrearCliente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-blue-600">
                <UserPlus className="w-5 h-5" />
                <h3 className="font-bold text-slate-800 text-sm">Registrar Cliente Rápido</h3>
              </div>
              <button
                onClick={() => setShowModalCrearCliente(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleGuardarNuevoCliente} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  DNI (8 dígitos) o RUC (11 dígitos) *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={11}
                    value={nuevoClienteData.ClienteRuc}
                    onChange={(e) => setNuevoClienteData({ ...nuevoClienteData, ClienteRuc: e.target.value })}
                    placeholder="Ej: 20601234567 o 72839401"
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={handleConsultarSunat}
                    disabled={isConsultandoSunat}
                    className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    {isConsultandoSunat ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    <span>SUNAT</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Nombre Completo o Razón Social *
                </label>
                <input
                  type="text"
                  value={nuevoClienteData.ClienteNombre}
                  onChange={(e) => setNuevoClienteData({ ...nuevoClienteData, ClienteNombre: e.target.value })}
                  placeholder="Ej: Comercial Hermanos S.A.C."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Teléfono / Celular:
                </label>
                <input
                  type="text"
                  value={nuevoClienteData.ClienteNumero}
                  onChange={(e) => setNuevoClienteData({ ...nuevoClienteData, ClienteNumero: e.target.value })}
                  placeholder="Ej: 987654321"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Dirección:
                </label>
                <input
                  type="text"
                  value={nuevoClienteData.ClienteDireccion}
                  onChange={(e) => setNuevoClienteData({ ...nuevoClienteData, ClienteDireccion: e.target.value })}
                  placeholder="Ej: Av. Las Begonias 450"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModalCrearCliente(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isGuardandoCliente}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {isGuardandoCliente ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>Registrar y Seleccionar</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 2: EDITAR ÍTEM EN BORRADOR */}
      {/* ---------------------------------------------------- */}
      {showModalEditarItem && itemEnEdicion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm">Modificar Ítem del Pedido</h3>
              <button
                onClick={() => setShowModalEditarItem(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-800">{itemEnEdicion.producto_nombre}</p>
              <p className="text-[11px] text-slate-400">{itemEnEdicion.producto_marca} • {itemEnEdicion.unidad_abreviatura}</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Cantidad:
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="any"
                  value={itemEnEdicion.cantidad}
                  onChange={(e) => setItemEnEdicion({ ...itemEnEdicion, cantidad: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Precio Unitario (S/):
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={itemEnEdicion.precio_unitario}
                  onChange={(e) => setItemEnEdicion({ ...itemEnEdicion, precio_unitario: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowModalEditarItem(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={guardarItemEditado}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 3: ÉXITO DE CREACIÓN */}
      {/* ---------------------------------------------------- */}
      {modalExito && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
              <Check className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-800">
                ¡Orden de Pedido Registrada!
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                La orden <strong className="text-blue-600">{modalExito.orden?.id}</strong> ha sido creada con éxito.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Cliente:</span>
                <span className="font-bold text-slate-800">{modalExito.cliente?.nombre}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Canal:</span>
                <span className="font-semibold text-slate-700">{modalExito.canal}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Facturado:</span>
                <span className="font-bold text-blue-700 text-sm">S/ {modalExito.total.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={() => abrirTicketImpresion(modalExito.orden)}
                className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Comprobante</span>
              </button>

              <button
                type="button"
                onClick={() => handleEnviarWhatsApp(modalExito.orden)}
                className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Enviar por WhatsApp</span>
              </button>
            </div>

            <div className="flex items-center justify-center gap-4 pt-2">
              <button
                type="button"
                onClick={() => {
                  setModalExito(null);
                  setActiveTab('historial');
                }}
                className="text-xs font-semibold text-blue-600 hover:underline"
              >
                Ver en Historial
              </button>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={() => setModalExito(null)}
                className="text-xs font-semibold text-slate-600 hover:underline"
              >
                Crear Otro Pedido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 4: DETALLE COMPLETO DE ORDEN */}
      {/* ---------------------------------------------------- */}
      {showModalDetalle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Cabecera modal */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">
                    Detalle de Orden: {ordenDetalle?.id || 'Cargando...'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Fecha de emisión: {ordenDetalle?.fecha_formateada || '-'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModalDetalle(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido scrolleable */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
              {isLoadingDetalle ? (
                <div className="py-16 text-center text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                  <span>Cargando información del pedido...</span>
                </div>
              ) : ordenDetalle ? (
                <>
                  {/* Banner de Estado y Timeout */}
                  <div className={`p-4 rounded-xl border flex items-center justify-between ${
                    ordenDetalle.estado === 'P'
                      ? 'bg-amber-50/60 border-amber-200 text-amber-900'
                      : ordenDetalle.estado === 'C'
                      ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50/60 border-rose-200 text-rose-900'
                  }`}>
                    <div className="flex items-center gap-2.5">
                      {ordenDetalle.estado === 'P' && <Clock className="w-5 h-5 text-amber-600" />}
                      {ordenDetalle.estado === 'C' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                      {ordenDetalle.estado === 'A' && <XCircle className="w-5 h-5 text-rose-600" />}
                      <div>
                        <p className="font-bold text-sm">Estado: {ordenDetalle.estado_texto}</p>
                        {ordenDetalle.estado === 'P' && (() => {
                          const cd = formatearCountdown(ordenDetalle, currentTime);
                          if (!cd) return null;
                          return (
                            <p className="text-[11px] opacity-90 mt-0.5 flex items-center gap-1.5">
                              <span>Tiempo límite de atención (12h):</span>
                              <strong className={`font-mono px-2 py-0.5 rounded text-xs ${
                                cd.expirado
                                  ? 'bg-rose-600 text-white'
                                  : cd.porExpirar
                                  ? 'bg-amber-600 text-white animate-pulse'
                                  : 'bg-amber-200 text-amber-950'
                              }`}>
                                {cd.texto}
                              </strong>
                              {cd.porExpirar && <span className="text-[10px] text-amber-700 font-bold">(¡Próximo a expirar!)</span>}
                            </p>
                          );
                        })()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold px-2.5 py-1 bg-white/80 rounded-lg shadow-2xs">
                        Canal: {ordenDetalle.canal?.descripcion || 'Presencial'}
                      </span>
                      {ordenDetalle.origen_ia ? (
                        <span className="text-[11px] font-bold px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg shadow-2xs flex items-center gap-1">
                          <Bot className="w-3.5 h-3.5 text-indigo-600" />
                          Valencia AI
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg shadow-2xs flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-500" />
                          Manual
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Datos del Cliente y Acuerdo */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-200/80 rounded-xl">
                    <div>
                      <span className="font-bold text-slate-500 block mb-1">CLIENTE</span>
                      <p className="font-bold text-slate-900">{ordenDetalle.cliente?.nombre || 'Cliente General'}</p>
                      <p className="text-slate-500">Doc: {ordenDetalle.cliente?.dni_ruc || 'N/A'}</p>
                      <p className="text-slate-500">Teléfono: {ordenDetalle.cliente?.telefono || 'No especificado'}</p>
                    </div>
                    <div>
                      <span className="font-bold text-slate-500 block mb-1">CONDICIONES COMERCIALES</span>
                      <p className="font-semibold text-slate-800">
                        Acuerdo: {ordenDetalle.acuerdo_comercial || 'Contado Mostrador'}
                      </p>
                      <p className="text-slate-500">Registrado por: {ordenDetalle.usuario_registro || 'Sistema'}</p>
                    </div>
                  </div>

                  {/* Detalle de Productos */}
                  <div>
                    <h4 className="font-bold text-slate-800 mb-2">Productos en la Orden:</h4>
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left">
                        <thead className="bg-slate-100 text-slate-600 text-[11px] font-bold border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3">Producto</th>
                            <th className="py-2.5 px-3 text-center">Cant. Total</th>
                            <th className="py-2.5 px-3 text-center min-w-[140px]">Stock Físico Comprometido</th>
                            <th className="py-2.5 px-3 text-right">Precio</th>
                            <th className="py-2.5 px-3 text-right">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(ordenDetalle.detalles || []).map((d, i) => {
                            const cantTotal = parseFloat(d.cantidad || 0);
                            const cantFisica = parseFloat(d.cantidad_fisica !== undefined ? d.cantidad_fisica : cantTotal);
                            return (
                              <tr key={i}>
                                <td className="py-2.5 px-3">
                                  <p className="font-bold text-slate-800">{d.producto_nombre}</p>
                                  <p className="text-[10px] text-slate-400">{d.producto_marca || d.producto_id}</p>
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <span className="font-bold text-slate-800">
                                    {d.cantidad} {d.unidad_abreviatura ? d.unidad_abreviatura : ''}
                                  </span>
                                  {d.factor_conversion > 1 && (
                                    <span className="block text-[10px] text-blue-600 font-semibold">
                                      (= {d.cantidad_base || (d.cantidad * d.factor_conversion)} UND)
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-center min-w-[140px]">
                                  <div className="inline-flex flex-col items-center gap-0.5">
                                    <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                                      {cantFisica} Físico Real
                                    </span>
                                    {d.factor_conversion > 1 && (
                                      <span className="text-[9px] text-blue-600 font-medium">
                                        Total: {d.cantidad_base || (cantFisica * d.factor_conversion)} UND
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-right">S/ {parseFloat(d.precio_unitario || 0).toFixed(2)}</td>
                                <td className="py-2.5 px-3 text-right font-bold text-blue-700">
                                  S/ {parseFloat(d.subtotal || 0).toFixed(2)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Resumen Financiero */}
                  <div className="flex justify-end pt-2">
                    <div className="w-64 space-y-1.5 text-right">
                      <div className="flex justify-between text-slate-500">
                        <span>Subtotal:</span>
                        <span className="font-semibold text-slate-800">S/ {parseFloat(ordenDetalle.subtotal || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>IGV (18%):</span>
                        <span className="font-semibold text-slate-800">S/ {parseFloat(ordenDetalle.igv || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold text-slate-900 pt-1 border-t border-slate-200">
                        <span>TOTAL GENERAL:</span>
                        <span className="text-blue-600">S/ {parseFloat(ordenDetalle.total || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            {/* Pie del modal con acciones */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => abrirTicketImpresion(ordenDetalle)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir Comprobante</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleEnviarWhatsApp(ordenDetalle)}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {ordenDetalle?.estado === 'P' && (
                  <>
                    <button
                      type="button"
                      onClick={() => abrirModalCompletar(ordenDetalle)}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      Completar Pedido
                    </button>
                    <button
                      type="button"
                      onClick={() => abrirModalCancelar(ordenDetalle)}
                      className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      Cancelar Pedido
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setShowModalDetalle(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 5: CANCELAR PEDIDO (CON REINTEGRO A KÁRDEX) */}
      {/* ---------------------------------------------------- */}
      {showModalCancelar && ordenParaCancelar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-2.5 text-rose-600 border-b border-slate-100 pb-3">
              <XCircle className="w-6 h-6" />
              <h3 className="font-bold text-slate-800 text-sm">Cancelar Orden {ordenParaCancelar.id}</h3>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                Reintegro Automático de Inventario
              </p>
              <p className="text-[11px] leading-relaxed">
                Al cancelar esta orden, los productos reservados serán <strong>reintegrados físicamente al stock</strong> y se asentará un movimiento de entrada tipo devolución en el Kárdex.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Causa Raíz de No Despacho (KPI PODE) *
              </label>
              <select
                value={causaFalloCancelacion}
                onChange={(e) => setCausaFalloCancelacion(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-rose-500 mb-2 font-medium"
              >
                <option value="RECHAZO_CLIENTE">Rechazo por Cliente (Desistió / Canceló)</option>
                <option value="FALTA_STOCK">Falta de Stock Físico (Quiebre)</option>
                <option value="ERROR_DIRECCION">Error en Dirección / Zona No Cubierta</option>
                <option value="ERROR_FACTURACION">Error de Facturación / Precios</option>
                <option value="PROBLEMA_LOGISTICO">Problema Logístico / Reparto</option>
                <option value="OTRO">Otro Motivo Operativo</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Detalle / Observación de la Cancelación *
              </label>
              <textarea
                rows="3"
                value={motivoCancelacion}
                onChange={(e) => setMotivoCancelacion(e.target.value)}
                placeholder="Indique el motivo detallado..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowModalCancelar(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Volver
              </button>
              <button
                type="button"
                disabled={isCancelling}
                onClick={confirmarCancelarOrden}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                {isCancelling ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Cancelando y reintegrando stock...</span>
                  </>
                ) : (
                  <span>Confirmar Cancelación</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 6: COMPLETAR PEDIDO */}
      {/* ---------------------------------------------------- */}
      {showModalCompletar && ordenParaCompletar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-bold text-slate-800 text-base">¿Completar y Facturar Orden?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Orden <strong className="text-slate-800">{ordenParaCompletar.id}</strong> por un importe de{' '}
                <strong className="text-blue-600">S/ {parseFloat(ordenParaCompletar.total || 0).toFixed(2)}</strong>.
              </p>
            </div>

            <div className="text-left bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Estado Final de la Entrega (KPI PODE):
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setEstadoDespachoCompletar('ENTREGADO_COMPLETO')}
                  className={`py-2 px-3 rounded-lg border font-semibold transition text-left cursor-pointer ${
                    estadoDespachoCompletar === 'ENTREGADO_COMPLETO'
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-800'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  ✓ Entregado Completo
                </button>
                <button
                  type="button"
                  onClick={() => setEstadoDespachoCompletar('ENTREGADO_PARCIAL')}
                  className={`py-2 px-3 rounded-lg border font-semibold transition text-left cursor-pointer ${
                    estadoDespachoCompletar === 'ENTREGADO_PARCIAL'
                      ? 'bg-amber-50 border-amber-400 text-amber-800'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  ⚠️ Entregado Parcial
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              Esta acción marcará el pedido como entregado y cobrado. El stock ya fue deducido previamente y no sufrirá alteraciones.
            </p>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowModalCompletar(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Volver
              </button>
              <button
                type="button"
                disabled={isCompleting}
                onClick={confirmarCompletarOrden}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                {isCompleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Completando...</span>
                  </>
                ) : (
                  <span>Sí, Marcar Completada</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 7: FORMATO FÍSICO OFICIAL DE ORDEN IMPRIMIBLE   */}
      {/* ---------------------------------------------------- */}
      {showModalTicket && ticketOrden && (
        <DocumentoOrdenOficial
          isOpen={showModalTicket}
          onClose={() => setShowModalTicket(false)}
          headerType={
            ticketOrden.estado === 'C'
              ? 'ORDEN DE FACTURACION'
              : 'ORDEN DE PEDIDO'
          }
          metadata={{
            fecha: ticketOrden.fecha_formateada?.split(' ')[0] || ticketOrden.fecha || new Date().toLocaleDateString('es-PE'),
            numero: ticketOrden.id || '---',
            usuario: ticketOrden.usuario_creador || ticketOrden.usuario_registro_nombre || ticketOrden.auditoria?.usuario_creacion_nombre || ticketOrden.usuario?.nombre || ticketOrden.usuario?.UsuarioUserName || ticketOrden.usuario_creacion || ticketOrden.usuario_registro || undefined,
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
            nombre: ticketOrden.cliente?.nombre || ticketOrden.cliente?.ClienteNombre || 'CLIENTE GENERAL',
            ruc: ticketOrden.cliente?.dni_ruc || ticketOrden.cliente?.ClienteRuc || ticketOrden.cliente?.ClienteDni || '---',
            direccion: ticketOrden.cliente?.direccion || ticketOrden.cliente?.ClienteDireccion || '---',
            responsable: ticketOrden.usuario_creador || ticketOrden.usuario_registro_nombre || ticketOrden.auditoria?.usuario_creacion_nombre || ticketOrden.usuario?.nombre || ticketOrden.usuario_creacion || undefined,
          }}
          items={(ticketOrden.detalles || []).map((det) => ({
            codigo: det.producto_id || det.ProductoId || det.codigo || det.id || '---',
            cantidad: det.cantidad,
            medida: det.unidad_abreviatura || det.medida || 'UND',
            descripcion: det.producto_nombre || det.nombre || 'PRODUCTO',
            suc: 'AC',
            precio: det.precio_unitario || det.precio || 0,
            total: det.subtotal != null ? det.subtotal : (det.cantidad * (det.precio_unitario || 0)),
            peso: det.peso || det.ProductoPeso || 0,
          }))}
          totales={{
            subtotal: ticketOrden.subtotal != null ? ticketOrden.subtotal : ((ticketOrden.total || 0) / 1.18),
            igv: ticketOrden.igv != null ? ticketOrden.igv : undefined,
            totalGeneral: ticketOrden.total || 0,
          }}
          empresa={{
            nombre: datosEmpresa?.EmpresaRazonSocial || datosEmpresa?.EmpresaNombreComercial || 'COMERCIAL VALENCIA',
            ruc: datosEmpresa?.EmpresaRuc || '10181935451',
            logo: datosEmpresa?.EmpresaLogo || null,
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL COMPRA RÁPIDA POR ROTURA DE STOCK                                  */}
      {/* ========================================================================= */}
      {showModalCompraRapida && (
        <ModalCompraRapida
          isOpen={showModalCompraRapida}
          onClose={() => setShowModalCompraRapida(false)}
          productoInicial={compraRapidaParams.producto}
          cantidadInicial={compraRapidaParams.cantidad}
          motivoInicial={compraRapidaParams.motivo}
          onCompraExitosa={handleCompraRapidaExitosa}
        />
      )}
    </div>
  );
}
