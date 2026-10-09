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
  Zap,
  Truck,
  Navigation,
  Compass,
  MapPinned,
  CalendarDays
} from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';
import { sileo } from 'sileo';
import api from '../../services/api';
import DocumentoOrdenOficial from '../common/DocumentoOrdenOficial';
import ModalCompraRapida from './ModalCompraRapida';
import StyledSelect from '../dashboard/filters/StyledSelect';
import StyledDatePicker from '../common/StyledDatePicker';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';
const TRUJILLO_CENTER = [-79.0287, -8.1116];

// Delimitación geográfica estricta: Solo provincia de Trujillo
const TRUJILLO_BOUNDS = [
  [-79.25, -8.28], // Suroeste [lng, lat]
  [-78.70, -7.90]  // Noreste [lng, lat]
];

const ZONA_COLORES = {
  'Trujillo Centro': '#3b82f6',
  'Florencia de Mora': '#facc15',
  'El Porvenir': '#fb923c',
  'Alto Trujillo': '#c084fc',
  'La Esperanza': '#f472b6',
  'Víctor Larco Herrera': '#22c55e',
  'Victor Larco Herrera': '#22c55e',
  'Moche': '#eab308',
  'Huanchaco': '#22d3ee',
  'Laredo': '#a3a380',
  'Salaverry': '#e879f9',
  'Poroto': '#fde68a',
  'Simbal': '#86efac',
};

// Catálogo de distritos de Trujillo para validación semántica cruzada
const DISTRITOS_TRUJILLO = [
  { nombre: 'Laredo', id: 'ZD-00008', regex: /\blaredo\b/i },
  { nombre: 'La Esperanza', id: 'ZD-00004', regex: /\b(la\s+esperanza|esperanza)\b/i },
  { nombre: 'El Porvenir', id: 'ZD-00003', regex: /\b(el\s+porvenir|porvenir)\b/i },
  { nombre: 'Florencia de Mora', id: 'ZD-00002', regex: /\b(florencia\s+de\s+mora|florencia)\b/i },
  { nombre: 'Víctor Larco Herrera', id: 'ZD-00005', regex: /\b(v[ií]ctor\s+larco(\s+herrera)?|buenos\s+aires)\b/i },
  { nombre: 'Huanchaco', id: 'ZD-00007', regex: /\bhuanchaco\b/i },
  { nombre: 'Moche', id: 'ZD-00006', regex: /\bmoche\b/i },
  { nombre: 'Salaverry', id: 'ZD-00009', regex: /\bsalaverry\b/i },
  { nombre: 'Alto Trujillo', id: 'ZD-00012', regex: /\balto\s+trujillo\b/i },
  { nombre: 'Poroto', id: 'ZD-00010', regex: /\bporoto\b/i },
  { nombre: 'Simbal', id: 'ZD-00011', regex: /\bsimbal\b/i },
  { nombre: 'Trujillo Centro', id: 'ZD-00001', regex: /\b(trujillo(\s+centro)?|centro\s+hist[oó]rico|urb\.?\s+[a-z]+)\b/i },
];

const detectarDistritoEnTexto = (texto) => {
  if (!texto || typeof texto !== 'string') return null;
  const limpio = texto.trim();
  if (!limpio) return null;
  for (const item of DISTRITOS_TRUJILLO) {
    if (item.regex.test(limpio)) {
      return item;
    }
  }
  return null;
};

// Parser inteligente de coordenadas GPS (ej. "-8.111816, -79.015388", URL de Maps o texto con coords)
const parseCoordenadas = (texto) => {
  if (!texto || typeof texto !== 'string') return null;
  const limpio = texto.trim();
  const match = limpio.match(/(-?\d+\.\d{3,})\s*[,;\s]\s*(-?\d+\.\d{3,})/);
  if (!match) return null;
  const n1 = parseFloat(match[1]);
  const n2 = parseFloat(match[2]);
  if (isNaN(n1) || isNaN(n2)) return null;

  let lat = null;
  let lng = null;

  // En Trujillo/Perú: Latitud es negativa ~ -8.11, Longitud es negativa ~ -79.02
  if (n1 >= -79.35 && n1 <= -78.60 && n2 >= -8.35 && n2 <= -7.80) {
    lng = n1;
    lat = n2;
  } else if (n2 >= -79.35 && n2 <= -78.60 && n1 >= -8.35 && n1 <= -7.80) {
    lat = n1;
    lng = n2;
  } else if (Math.abs(n1) > Math.abs(n2)) {
    lng = n1;
    lat = n2;
  } else {
    lat = n1;
    lng = n2;
  }

  return {
    lat: Number(lat.toFixed(6)),
    lng: Number(lng.toFixed(6)),
  };
};

// Geocodificación directa en Trujillo con Mapbox Places (soporta Direcciones de texto y Coordenadas GPS)
const geocodificarDireccionMapbox = async (query) => {
  if (!query || !query.trim()) return [];

  // 1. Detectar si el usuario pegó o escribió coordenadas GPS directas
  const coords = parseCoordenadas(query);
  if (coords) {
    const { lat, lng } = coords;
    try {
      const revUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&language=es`;
      const revRes = await fetch(revUrl);
      if (revRes.ok) {
        const revData = await revRes.json();
        const topFeature = (revData.features || [])[0];
        const placeName = topFeature
          ? (topFeature.place_name || '')
              .replace(/,?\s*La Libertad,?\s*Perú?$/i, '')
              .replace(/,?\s*Departamento de La Libertad,?\s*Perú?$/i, '')
              .replace(/,?\s*Perú$/i, '')
              .trim()
          : `Coordenadas: ${lat}, ${lng}`;

        const contextDistrict = topFeature?.context?.find(
          (c) => c.id?.startsWith('place') || c.id?.startsWith('locality')
        )?.text || null;

        return [
          {
            id: `coord-${lng}-${lat}`,
            nombre: placeName || `Punto GPS (${lat}, ${lng})`,
            nombreCompleto: topFeature?.place_name || `${lat}, ${lng}`,
            center: [lng, lat],
            lat,
            lng,
            isCoords: true,
            contextDistrict,
          },
        ];
      }
    } catch (err) {
      console.warn('Error en reverse geocoding con coordenadas:', err);
    }

    return [
      {
        id: `coord-${lng}-${lat}`,
        nombre: `Punto GPS (${lat}, ${lng})`,
        nombreCompleto: `${lat}, ${lng}`,
        center: [lng, lat],
        lat,
        lng,
        isCoords: true,
        contextDistrict: null,
      },
    ];
  }

  // 2. Geocodificación por búsqueda de texto en Trujillo
  try {
    const cleanQuery = query.replace(/,?\s*Departamento de\s*/i, ' ').trim();
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(cleanQuery)}.json?access_token=${MAPBOX_TOKEN}&country=PE&bbox=-79.25,-8.28,-78.70,-7.90&language=es&limit=5&types=address,poi,place,neighborhood`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.features || []).map((f) => {
      const placeName = (f.place_name || '')
        .replace(/,?\s*La Libertad,?\s*Perú?$/i, '')
        .replace(/,?\s*Departamento de La Libertad,?\s*Perú?$/i, '')
        .replace(/,?\s*Perú$/i, '')
        .trim();
      const contextDistrict = f.context?.find((c) => c.id?.startsWith('place') || c.id?.startsWith('locality'))?.text || null;
      return {
        id: f.id,
        nombre: placeName,
        nombreCompleto: f.place_name,
        center: f.center, // [lng, lat]
        lat: f.center?.[1] ? Number(f.center[1].toFixed(6)) : null,
        lng: f.center?.[0] ? Number(f.center[0].toFixed(6)) : null,
        isCoords: false,
        contextDistrict,
      };
    });
  } catch (err) {
    console.warn('Error en geocodificación Mapbox:', err);
    return [];
  }
};

// Componente interactivo de búsqueda de direcciones en Trujillo
function BuscadorDireccionMapbox({ onSelectUbicacion, placeholder = 'Buscar dirección o lugar en Trujillo (ej. Li-1084 Laredo, Av. Larco...)' }) {
  const [query, setQuery] = useState('');
  const [sugerencias, setSugerencias] = useState([]);
  const [isBuscando, setIsBuscando] = useState(false);
  const [mostrarDropdown, setMostrarDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setSugerencias([]);
      setMostrarDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsBuscando(true);
      const res = await geocodificarDireccionMapbox(query);
      setSugerencias(res);
      setMostrarDropdown(res.length > 0);
      setIsBuscando(false);
    }, 280);

    return () => clearTimeout(timer);
  }, [query]);

  // Cierra el dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setMostrarDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (item) => {
    onSelectUbicacion(item);
    setQuery(item.nombre);
    setMostrarDropdown(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (sugerencias.length > 0) {
        handleSelect(sugerencias[0]);
      }
    }
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div className="relative flex items-center">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => sugerencias.length > 0 && setMostrarDropdown(true)}
          placeholder={placeholder}
          className="w-full pl-9 pr-16 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition shadow-2xs"
        />
        <div className="absolute right-2 flex items-center gap-1">
          {isBuscando && (
            <RefreshCw className="w-3.5 h-3.5 text-blue-500 animate-spin mr-1" />
          )}
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setSugerencias([]);
                setMostrarDropdown(false);
              }}
              className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {mostrarDropdown && sugerencias.length > 0 && (
        <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100 animate-in fade-in duration-100">
          {sugerencias.map((item) => (
            <div
              key={item.id}
              onClick={() => handleSelect(item)}
              className="p-2.5 hover:bg-blue-50/70 cursor-pointer transition flex items-center justify-between gap-2 text-xs"
            >
              <div className="flex items-center gap-2 truncate">
                <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="font-semibold text-slate-800 truncate">{item.nombre}</span>
              </div>
              {item.contextDistrict && (
                <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                  {item.contextDistrict}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function GestionOrdenesCliente({ aiPrefill = null, onClearAiPrefill = null }) {
  // Pestaña activa: 'nueva' (Registrar Pedido) | 'historial' (Historial y Monitoreo)
  const [activeTab, setActiveTab] = useState('nueva');

  // Catálogos globales cargados
  const [clientesList, setClientesList] = useState([]);
  const [canalesList, setCanalesList] = useState([]);
  const [productosSelect, setProductosSelect] = useState([]);
  const [zonasDeliveryList, setZonasDeliveryList] = useState([]);
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

  // Canal y Tipo de Registro (Cotización vs Pedido)
  const [canalSeleccionado, setCanalSeleccionado] = useState('CNL-00001');
  const [acuerdoComercial, setAcuerdoComercial] = useState('Pedido');

  // Helper para verificar si una orden es Cotización
  const esCotizacionOrden = (orden) => {
    if (!orden) return false;
    if (orden.es_cotizacion !== undefined) return Boolean(orden.es_cotizacion);
    const ac = String(orden.tipo_registro || orden.acuerdo_comercial || orden.PedidoAcuerdo_Comercial || '').toLowerCase();
    return ac.includes('cotiz');
  };

  // Despacho, Fecha de Entrega y Delivery
  const [fechaEntrega, setFechaEntrega] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [esDelivery, setEsDelivery] = useState(false);
  const [zonaSeleccionada, setZonaSeleccionada] = useState(null);
  const [direccionEntrega, setDireccionEntrega] = useState('');
  const [referenciaEntrega, setReferenciaEntrega] = useState('');
  const [customerCoords, setCustomerCoords] = useState(null);
  const [zonaError, setZonaError] = useState(null);

  const deliveryMapContainerRef = useRef(null);
  const deliveryMapRef = useRef(null);
  const deliveryCustomerMarkerRef = useRef(null);
  const deliveryStoreMarkerRef = useRef(null);
  const zonaSeleccionadaRef = useRef(null);
  const direccionEntregaRef = useRef('');

  useEffect(() => {
    zonaSeleccionadaRef.current = zonaSeleccionada;
    try {
      deliveryMapRef.current?._aplicarSeleccionZona?.();
    } catch {}
  }, [zonaSeleccionada]);

  useEffect(() => {
    direccionEntregaRef.current = direccionEntrega;
  }, [direccionEntrega]);

  const [sugerenciaMapa, setSugerenciaMapa] = useState(null);

  // Geocodificación inversa Mapbox: sugiere la dirección del pin
  const sugerirDireccionMapa = async (lng, lat) => {
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&language=es&limit=1&types=address,poi,place,neighborhood`;
      const res = await fetch(url);
      const data = await res.json();
      const nombre = data?.features?.[0]?.place_name;
      if (!nombre) {
        setSugerenciaMapa(null);
        return;
      }
      const corta = nombre
        .replace(/,?\s*Departamento de La Libertad,?\s*Perú?$/i, '')
        .replace(/,?\s*La Libertad,?\s*Perú?$/i, '')
        .replace(/,?\s*Perú$/i, '')
        .trim();
      setSugerenciaMapa(corta);
    } catch {
      setSugerenciaMapa(null);
    }
  };

  // Acciones de geocodificación y sincronización de dirección
  const handleSelectUbicacionEnFormulario = (item) => {
    if (!item?.center) return;
    const [lng, lat] = item.center;
    const fixedLng = Number(lng.toFixed(6));
    const fixedLat = Number(lat.toFixed(6));
    setCustomerCoords([fixedLng, fixedLat]);

    if (deliveryCustomerMarkerRef.current) {
      deliveryCustomerMarkerRef.current.setLngLat([fixedLng, fixedLat]);
    }
    if (deliveryMapRef.current) {
      deliveryMapRef.current.flyTo({ center: [fixedLng, fixedLat], zoom: 15 });
    }

    let zona = detectarZonaPorCoordenadas(fixedLng, fixedLat, item.contextDistrict);
    if (!zona && item.contextDistrict) {
      const match = (zonasDeliveryList || []).find((z) =>
        (z.nombre || z.Zona_DeliveryNombre || '').toLowerCase().includes(item.contextDistrict.toLowerCase())
      );
      if (match) {
        zona = {
          id: match.id || match.Zona_DeliveryId,
          nombre: match.nombre || match.Zona_DeliveryNombre,
          tarifa: parseFloat(match.tarifa || match.Zona_DeliveryTarifa || 0),
          raw: match,
        };
      }
    }

    if (zona) {
      setZonaSeleccionada(zona);
      setZonaError(null);
      sileo.success(`Zona detectada: ${zona.nombre} (Tarifa: S/ ${zona.tarifa.toFixed(2)})`);
    } else {
      setZonaSeleccionada(null);
      setZonaError('Ubicación fuera de zonas activas de Trujillo.');
    }

    setDireccionEntrega(item.nombre);
    setSugerenciaMapa(null);
  };

  const handleUbicarDireccionTexto = async () => {
    if (!direccionEntrega.trim()) {
      sileo.warning('Escribe primero una dirección para buscar en el mapa.');
      return;
    }
    const resultados = await geocodificarDireccionMapbox(direccionEntrega);
    if (resultados && resultados.length > 0) {
      handleSelectUbicacionEnFormulario(resultados[0]);
    } else {
      sileo.info('No se ubicó la dirección exacta. Puedes arrastrar el pin azul manualmente en el mapa.');
    }
  };

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

  // Modal para Modificar Despacho / Reprogramar Fecha en órdenes 'P'
  const [showModalEditarDespacho, setShowModalEditarDespacho] = useState(false);
  const [ordenParaEditarDespacho, setOrdenParaEditarDespacho] = useState(null);
  const [despachoEditFecha, setDespachoEditFecha] = useState('');
  const [despachoEditAcuerdo, setDespachoEditAcuerdo] = useState('Pedido');
  const [despachoEditEsDelivery, setDespachoEditEsDelivery] = useState(false);
  const [despachoEditZona, setDespachoEditZona] = useState(null);
  const [despachoEditDireccion, setDespachoEditDireccion] = useState('');
  const [despachoEditReferencia, setDespachoEditReferencia] = useState('');
  const [isGuardandoDespacho, setIsGuardandoDespacho] = useState(false);
  const [despachoEditCoords, setDespachoEditCoords] = useState(null);
  const [despachoEditZonaError, setDespachoEditZonaError] = useState(null);
  const editDespachoMapContainerRef = useRef(null);
  const editDespachoMapRef = useRef(null);
  const editDespachoCustomerMarkerRef = useRef(null);
  const editDespachoStoreMarkerRef = useRef(null);
  const despachoEditZonaRef = useRef(null);

  useEffect(() => {
    despachoEditZonaRef.current = despachoEditZona;
    try {
      editDespachoMapRef.current?._aplicarSeleccionZona?.();
    } catch {}
  }, [despachoEditZona]);

  const handleSelectUbicacionEnEditModal = (item) => {
    if (!item?.center) return;
    const [lng, lat] = item.center;
    const fixedLng = Number(lng.toFixed(6));
    const fixedLat = Number(lat.toFixed(6));
    setDespachoEditCoords([fixedLng, fixedLat]);

    if (editDespachoCustomerMarkerRef.current) {
      editDespachoCustomerMarkerRef.current.setLngLat([fixedLng, fixedLat]);
    }
    if (editDespachoMapRef.current) {
      editDespachoMapRef.current.flyTo({ center: [fixedLng, fixedLat], zoom: 15 });
    }

    let zona = detectarZonaPorCoordenadas(fixedLng, fixedLat, item.contextDistrict);
    if (!zona && item.contextDistrict) {
      const match = (zonasDeliveryList || []).find((z) =>
        (z.nombre || z.Zona_DeliveryNombre || '').toLowerCase().includes(item.contextDistrict.toLowerCase())
      );
      if (match) {
        zona = {
          id: match.id || match.Zona_DeliveryId,
          nombre: match.nombre || match.Zona_DeliveryNombre,
          tarifa: parseFloat(match.tarifa || match.Zona_DeliveryTarifa || 0),
          raw: match,
        };
      }
    }

    if (zona) {
      const zonaCompleta = (zonasDeliveryList || []).find((z) => (z.Zona_DeliveryId || z.id) === (zona.id || zona.Zona_DeliveryId)) || zona;
      setDespachoEditZona(zonaCompleta);
      setDespachoEditZonaError(null);
      sileo.success(`Zona reasignada: ${zonaCompleta.Zona_DeliveryNombre || zonaCompleta.nombre} (Flete: S/ ${parseFloat(zonaCompleta.Zona_DeliveryTarifa || zonaCompleta.tarifa || 0).toFixed(2)})`);
    } else {
      setDespachoEditZona(null);
      setDespachoEditZonaError('Ubicación fuera de zonas activas de Trujillo.');
    }

    setDespachoEditDireccion(item.nombre);
  };

  const handleUbicarDireccionTextoEditModal = async () => {
    if (!despachoEditDireccion.trim()) {
      sileo.warning('Escribe primero una dirección para ubicar en el mapa.');
      return;
    }
    const resultados = await geocodificarDireccionMapbox(despachoEditDireccion);
    if (resultados && resultados.length > 0) {
      handleSelectUbicacionEnEditModal(resultados[0]);
    } else {
      sileo.info('No se ubicó la dirección exacta. Puedes arrastrar el pin azul manualmente en el mapa.');
    }
  };


  // ----------------------------------------------------
  // CARGA INICIAL DE CATÁLOGOS
  // ----------------------------------------------------
  const cargarCatalogos = async () => {
    setIsLoadingCatalogos(true);
    try {
      const [resClientes, resCanales, resProductos, resEmpresa, resZonas] = await Promise.allSettled([
        api.clientes.listar({ per_page: 200 }),
        api.catalogos.canalesPedido(),
        api.inventario.productosSelect(),
        api.empresa.obtener(),
        api.zonasDelivery.activas(),
      ]);

      if (resEmpresa.status === 'fulfilled' && resEmpresa.value?.data) {
        setDatosEmpresa(resEmpresa.value.data);
      }

      if (resZonas.status === 'fulfilled' && resZonas.value?.data) {
        const rawZ = resZonas.value.data;
        const listZ = Array.isArray(rawZ) ? rawZ : (rawZ?.data || []);
        setZonasDeliveryList(listZ);
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

    // 4. Precargar tipo de registro (Cotización vs Pedido) y canal si aplican
    if (prefill.acuerdo_comercial) {
      const esCotiz = String(prefill.acuerdo_comercial).toLowerCase().includes('cotiz');
      setAcuerdoComercial(esCotiz ? 'Cotización' : 'Pedido');
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
      setAcuerdoComercial('Pedido');
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
        acuerdo_comercial: acuerdoComercial || 'Pedido',
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
    setAcuerdoComercial('Pedido');
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
  // LOGÍSTICA DE DELIVERY Y GEOLOCALIZACIÓN CON TURF & MAPBOX
  // ----------------------------------------------------
  const detectarZonaPorCoordenadas = useCallback((lng, lat, hintDistrito = null) => {
    if (!zonasDeliveryList || zonasDeliveryList.length === 0) return null;

    // Match prioritario por hint de distrito si proviene del geocodificador o texto
    if (hintDistrito) {
      const matchHint = zonasDeliveryList.find((z) => {
        const nom = (z.nombre || z.Zona_DeliveryNombre || '').toLowerCase();
        return nom.includes(hintDistrito.toLowerCase()) || hintDistrito.toLowerCase().includes(nom);
      });
      if (matchHint) {
        return {
          id: matchHint.id || matchHint.Zona_DeliveryId,
          nombre: matchHint.nombre || matchHint.Zona_DeliveryNombre,
          tarifa: parseFloat(matchHint.tarifa || matchHint.Zona_DeliveryTarifa || 0),
          raw: matchHint,
          esAproximada: false,
        };
      }
    }

    const pt = point([lng, lat]);

    // Area plana del anillo (shoelace) para priorizar el distrito más
    // pequeño cuando hay solapes (ej. Huanchaco contiene al centro urbano).
    const ringArea = (ring) => {
      if (!ring || ring.length < 4) return Infinity;
      let s = 0;
      for (let i = 0; i < ring.length - 1; i++) {
        s += (ring[i][0] * ring[i + 1][1]) - (ring[i + 1][0] * ring[i][1]);
      }
      return Math.abs(s / 2);
    };

    const matches = [];
    for (const z of zonasDeliveryList) {
      try {
        const rawGeo = z.poligono_geojson || z.Zona_DeliveryPoligonoGeoJSON;
        if (!rawGeo) continue;
        const parsed = typeof rawGeo === 'string' ? JSON.parse(rawGeo) : rawGeo;
        if (booleanPointInPolygon(pt, parsed)) {
          const geom = parsed.geometry || parsed;
          matches.push({
            z,
            area: ringArea(geom?.coordinates?.[0]),
          });
        }
      } catch (err) {
        console.warn('Error comprobando polígono de zona:', err);
      }
    }
    if (matches.length > 0) {
      matches.sort((a, b) => a.area - b.area);
      const z = matches[0].z;
      return {
        id: z.id || z.Zona_DeliveryId,
        nombre: z.nombre || z.Zona_DeliveryNombre,
        tarifa: parseFloat(z.tarifa || z.Zona_DeliveryTarifa || 0),
        raw: z,
        esAproximada: false,
      };
    }

    // Fallback: sin huecos. Si está dentro de Trujillo pero cayó en un
    // intersticio entre polígonos, asigna la zona activa más cercana por centroide.
    try {
      const toRad = (d) => (d * Math.PI) / 180;
      const havKm = (aLng, aLat, bLng, bLat) => {
        const R = 6371;
        const dLat = toRad(bLat - aLat);
        const dLng = toRad(bLng - aLng);
        const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
        return 2 * R * Math.asin(Math.sqrt(s));
      };
      let mejor = null;
      let mejorDist = Infinity;
      for (const z of zonasDeliveryList) {
        try {
          const rawGeo = z.poligono_geojson || z.Zona_DeliveryPoligonoGeoJSON;
          if (!rawGeo) continue;
          const parsed = typeof rawGeo === 'string' ? JSON.parse(rawGeo) : rawGeo;
          const geom = parsed.geometry || parsed;
          const ring = geom?.coordinates?.[0];
          if (!ring || ring.length === 0) continue;
          const cLng = ring.reduce((acc, c) => acc + c[0], 0) / ring.length;
          const cLat = ring.reduce((acc, c) => acc + c[1], 0) / ring.length;
          const d = havKm(lng, lat, cLng, cLat);
          if (d < mejorDist) {
            mejorDist = d;
            mejor = z;
          }
        } catch {}
      }
      if (mejor) {
        return {
          id: mejor.id || mejor.Zona_DeliveryId,
          nombre: mejor.nombre || mejor.Zona_DeliveryNombre,
          tarifa: parseFloat(mejor.tarifa || mejor.Zona_DeliveryTarifa || 0),
          raw: mejor,
          esAproximada: true,
          distanciaKm: Number(mejorDist.toFixed(2)),
        };
      }
    } catch {}
    return null;
  }, [zonasDeliveryList]);

  const handleSeleccionarDistritoManual = (zonaId) => {
    const z = (zonasDeliveryList || []).find(item => (item.id || item.Zona_DeliveryId) === zonaId);
    if (!z) return;

    const zonaObj = {
      id: z.id || z.Zona_DeliveryId,
      nombre: z.nombre || z.Zona_DeliveryNombre,
      tarifa: parseFloat(z.tarifa || z.Zona_DeliveryTarifa || 0),
      raw: z,
    };
    setZonaSeleccionada(zonaObj);
    setZonaError(null);

    try {
      const rawGeo = z.poligono_geojson || z.Zona_DeliveryPoligonoGeoJSON;
      if (rawGeo) {
        const parsed = typeof rawGeo === 'string' ? JSON.parse(rawGeo) : rawGeo;
        const coords = parsed.geometry ? parsed.geometry.coordinates[0] : parsed.coordinates?.[0];
        if (coords && coords.length > 0) {
          const sumLng = coords.reduce((acc, c) => acc + c[0], 0);
          const sumLat = coords.reduce((acc, c) => acc + c[1], 0);
          const avgLng = Number((sumLng / coords.length).toFixed(6));
          const avgLat = Number((sumLat / coords.length).toFixed(6));
          setCustomerCoords([avgLng, avgLat]);

          if (deliveryCustomerMarkerRef.current) {
            deliveryCustomerMarkerRef.current.setLngLat([avgLng, avgLat]);
          }
          if (deliveryMapRef.current) {
            deliveryMapRef.current.flyTo({ center: [avgLng, avgLat], zoom: 14 });
            try {
              deliveryMapRef.current._aplicarSeleccionZona?.();
            } catch {}
          }
        }
      }
    } catch (e) {
      console.warn('Error centrando en distrito manual:', e);
    }
  };

  useEffect(() => {
    if (!esDelivery || !deliveryMapContainerRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const storeLng = Number(datosEmpresa?.EmpresaLongitud) || TRUJILLO_CENTER[0];
    const storeLat = Number(datosEmpresa?.EmpresaLatitud) || TRUJILLO_CENTER[1];
    const initialLngLat = customerCoords || [storeLng, storeLat];

    const map = new mapboxgl.Map({
      container: deliveryMapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: initialLngLat,
      zoom: 12.8,
      minZoom: 10,
      maxZoom: 18,
      maxBounds: TRUJILLO_BOUNDS,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: true }), 'top-right');

    const storeEl = document.createElement('div');
    storeEl.className = 'w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg border-2 border-white font-bold cursor-pointer text-sm';
    storeEl.title = 'Comercial Valencia (Tienda - Origen)';
    storeEl.innerHTML = '🏪';

    const storeMarker = new mapboxgl.Marker({ element: storeEl })
      .setLngLat([storeLng, storeLat])
      .setPopup(
        new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div style="font-size:12px; font-family:sans-serif; padding:4px;">
            <strong style="color:#059669;">Comercial Valencia</strong><br/>
            <span>Punto de Origen / Despacho</span><br/>
            <small style="color:#64748b;">${datosEmpresa?.EmpresaDireccion || 'Trujillo'}</small>
          </div>
        `)
      )
      .addTo(map);

    deliveryStoreMarkerRef.current = storeMarker;

    const customerMarker = new mapboxgl.Marker({
      draggable: true,
      color: '#2563eb',
    })
      .setLngLat(initialLngLat)
      .addTo(map);

    deliveryCustomerMarkerRef.current = customerMarker;

    const actualizarUbicacionCliente = (lng, lat, sugerir = false) => {
      const fixedLng = Number(lng.toFixed(6));
      const fixedLat = Number(lat.toFixed(6));
      setCustomerCoords([fixedLng, fixedLat]);

      // Delimitación geográfica estricta: Solo provincia de Trujillo
      const dentroDeTrujillo = fixedLng >= -79.25 && fixedLng <= -78.70 && fixedLat >= -8.28 && fixedLat <= -7.90;
      if (!dentroDeTrujillo) {
        setZonaSeleccionada(null);
        setZonaError('Ubicación fuera de Trujillo. Actualmente el servicio de delivery solo opera dentro de la provincia de Trujillo.');
        return;
      }

      const zona = detectarZonaPorCoordenadas(fixedLng, fixedLat);
      if (zona) {
        setZonaSeleccionada(zona);
        setZonaError(null);
      } else {
        setZonaSeleccionada(null);
        setZonaError('La ubicación está en Trujillo pero fuera de las zonas activas de delivery.');
      }

      // La dirección del registro la digita el usuario (domicilio real).
      // El mapa solo sugiere la calle del pin como ayuda opcional.
      if (sugerir) {
        sugerirDireccionMapa(fixedLng, fixedLat);
      }
    };

    customerMarker.on('dragend', () => {
      const pos = customerMarker.getLngLat();
      actualizarUbicacionCliente(pos.lng, pos.lat, true);
    });

    map.on('click', (e) => {
      customerMarker.setLngLat(e.lngLat);
      actualizarUbicacionCliente(e.lngLat.lng, e.lngLat.lat, true);
    });

    map.on('load', () => {
      try {
        const features = (zonasDeliveryList || []).map((z, idx) => {
          const rawGeo = z.poligono_geojson || z.Zona_DeliveryPoligonoGeoJSON;
          if (!rawGeo) return null;
          const parsed = typeof rawGeo === 'string' ? JSON.parse(rawGeo) : rawGeo;
          const geom = parsed.geometry || parsed;
          if (!geom || !geom.coordinates) return null;
          const zid = String(z.Zona_DeliveryId || z.id || idx);
          const zname = z.Zona_DeliveryNombre || z.nombre || zid;
          return {
            type: 'Feature',
            id: zid,
            properties: {
              zonaId: zid,
              nombre: zname,
              color: ZONA_COLORES[zname] || '#3b82f6',
            },
            geometry: geom,
          };
        }).filter(Boolean);

        const collection = { type: 'FeatureCollection', features };

        if (map.getSource('zonas-delivery')) {
          map.getSource('zonas-delivery').setData(collection);
        } else {
          map.addSource('zonas-delivery', { type: 'geojson', data: collection });
        }

        if (!map.getLayer('zonas-fill')) {
          map.addLayer({
            id: 'zonas-fill',
            type: 'fill',
            source: 'zonas-delivery',
            paint: {
              'fill-color': ['get', 'color'],
              'fill-opacity': [
                'case',
                ['boolean', ['feature-state', 'selected'], false],
                0.55,
                0.28,
              ],
            },
          });
        }
        if (!map.getLayer('zonas-line')) {
          map.addLayer({
            id: 'zonas-line',
            type: 'line',
            source: 'zonas-delivery',
            paint: {
              'line-color': ['get', 'color'],
              'line-width': [
                'case',
                ['boolean', ['feature-state', 'selected'], false],
                3,
                1.5,
              ],
              'line-opacity': 0.95,
            },
          });
        }

        // Resalta el distrito seleccionado (todo el polígono queda pintado)
        const aplicarSeleccion = () => {
          features.forEach((f) => {
            try {
              map.setFeatureState(
                { source: 'zonas-delivery', id: f.id },
                { selected: zonaSeleccionadaRef.current?.id === String(f.properties.zonaId) }
              );
            } catch {}
          });
        };
        map._aplicarSeleccionZona = aplicarSeleccion;
        aplicarSeleccion();
      } catch (e) {
        console.warn('Error dibujando zonas en mapa:', e);
      }

      if (customerCoords) {
        actualizarUbicacionCliente(initialLngLat[0], initialLngLat[1], false);
      }
    });

    deliveryMapRef.current = map;

    return () => {
      if (deliveryMapRef.current) {
        deliveryMapRef.current.remove();
        deliveryMapRef.current = null;
      }
    };
  }, [esDelivery, zonasDeliveryList]);

  // ----------------------------------------------------
  // MAPBOX GL: MAPA INTERACTIVO EN MODAL MODIFICAR DESPACHO
  // ----------------------------------------------------
  useEffect(() => {
    if (!showModalEditarDespacho || !despachoEditEsDelivery) {
      if (editDespachoMapRef.current) {
        editDespachoMapRef.current.remove();
        editDespachoMapRef.current = null;
      }
      return;
    }

    const timer = setTimeout(() => {
      if (!editDespachoMapContainerRef.current) return;
      if (editDespachoMapRef.current) {
        editDespachoMapRef.current.remove();
        editDespachoMapRef.current = null;
      }

      mapboxgl.accessToken = MAPBOX_TOKEN;

      const storeLng = Number(datosEmpresa?.EmpresaLongitud) || TRUJILLO_CENTER[0];
      const storeLat = Number(datosEmpresa?.EmpresaLatitud) || TRUJILLO_CENTER[1];
      const initialLngLat = despachoEditCoords || [storeLng, storeLat];

      const map = new mapboxgl.Map({
        container: editDespachoMapContainerRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: initialLngLat,
        zoom: 12.8,
        minZoom: 10,
        maxZoom: 18,
        maxBounds: TRUJILLO_BOUNDS,
      });

      map.addControl(new mapboxgl.NavigationControl({ showCompass: true }), 'top-right');

      // Marcador de Tienda (Origen)
      const storeEl = document.createElement('div');
      storeEl.className = 'w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg border-2 border-white font-bold cursor-pointer text-xs';
      storeEl.title = 'Comercial Valencia (Tienda - Origen)';
      storeEl.innerHTML = '🏪';

      const storeMarker = new mapboxgl.Marker({ element: storeEl })
        .setLngLat([storeLng, storeLat])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(`
            <div style="font-size:12px; font-family:sans-serif; padding:4px;">
              <strong style="color:#059669;">Comercial Valencia</strong><br/>
              <span>Punto de Origen / Despacho</span><br/>
              <small style="color:#64748b;">${datosEmpresa?.EmpresaDireccion || 'Trujillo'}</small>
            </div>
          `)
        )
        .addTo(map);
      editDespachoStoreMarkerRef.current = storeMarker;

      // Marcador de Destino del Cliente (Arrastrable)
      const customerMarker = new mapboxgl.Marker({
        draggable: true,
        color: '#2563eb',
      })
        .setLngLat(initialLngLat)
        .addTo(map);
      editDespachoCustomerMarkerRef.current = customerMarker;

      const actualizarUbicacionModal = (lng, lat) => {
        const fixedLng = Number(lng.toFixed(6));
        const fixedLat = Number(lat.toFixed(6));
        setDespachoEditCoords([fixedLng, fixedLat]);

        // Delimitación geográfica estricta: Solo provincia de Trujillo
        const dentroDeTrujillo = fixedLng >= -79.25 && fixedLng <= -78.70 && fixedLat >= -8.28 && fixedLat <= -7.90;
        if (!dentroDeTrujillo) {
          setDespachoEditZona(null);
          setDespachoEditZonaError('Ubicación fuera de Trujillo. Solo despachamos en la provincia de Trujillo.');
          return;
        }

        const zona = detectarZonaPorCoordenadas(fixedLng, fixedLat);
        if (zona) {
          const zonaCompleta = (zonasDeliveryList || []).find(z => (z.Zona_DeliveryId || z.id) === (zona.id || zona.Zona_DeliveryId)) || zona;
          setDespachoEditZona(zonaCompleta);
          setDespachoEditZonaError(null);
        } else {
          setDespachoEditZona(null);
          setDespachoEditZonaError('La ubicación está en Trujillo pero fuera de las zonas activas de delivery.');
        }
      };

      customerMarker.on('dragend', () => {
        const pos = customerMarker.getLngLat();
        actualizarUbicacionModal(pos.lng, pos.lat);
      });

      map.on('click', (e) => {
        customerMarker.setLngLat(e.lngLat);
        actualizarUbicacionModal(e.lngLat.lng, e.lngLat.lat);
      });

      map.on('load', () => {
        try {
          const features = (zonasDeliveryList || []).map((z, idx) => {
            const rawGeo = z.poligono_geojson || z.Zona_DeliveryPoligonoGeoJSON;
            if (!rawGeo) return null;
            const parsed = typeof rawGeo === 'string' ? JSON.parse(rawGeo) : rawGeo;
            const geom = parsed.geometry || parsed;
            if (!geom || !geom.coordinates) return null;
            const zid = String(z.Zona_DeliveryId || z.id || idx);
            const zname = z.Zona_DeliveryNombre || z.nombre || zid;
            return {
              type: 'Feature',
              id: zid,
              properties: {
                zonaId: zid,
                nombre: zname,
                color: ZONA_COLORES[zname] || '#3b82f6',
              },
              geometry: geom,
            };
          }).filter(Boolean);

          const collection = { type: 'FeatureCollection', features };

          if (!map.getSource('zonas-delivery-edit')) {
            map.addSource('zonas-delivery-edit', { type: 'geojson', data: collection });
          }

          if (!map.getLayer('zonas-fill-edit')) {
            map.addLayer({
              id: 'zonas-fill-edit',
              type: 'fill',
              source: 'zonas-delivery-edit',
              paint: {
                'fill-color': ['get', 'color'],
                'fill-opacity': [
                  'case',
                  ['boolean', ['feature-state', 'selected'], false],
                  0.55,
                  0.22,
                ],
              },
            });
          }

          if (!map.getLayer('zonas-line-edit')) {
            map.addLayer({
              id: 'zonas-line-edit',
              type: 'line',
              source: 'zonas-delivery-edit',
              paint: {
                'line-color': ['get', 'color'],
                'line-width': [
                  'case',
                  ['boolean', ['feature-state', 'selected'], false],
                  3,
                  1.5,
                ],
                'line-opacity': 0.85,
              },
            });
          }

          const aplicarSeleccionEdit = () => {
            const currentSelId = despachoEditZonaRef.current?.Zona_DeliveryId || despachoEditZonaRef.current?.id;
            features.forEach((f) => {
              try {
                map.setFeatureState(
                  { source: 'zonas-delivery-edit', id: f.id },
                  { selected: String(currentSelId) === String(f.properties.zonaId) }
                );
              } catch {}
            });
          };
          map._aplicarSeleccionZona = aplicarSeleccionEdit;
          aplicarSeleccionEdit();

          // Clic sobre polígono en mapa del modal
          map.on('click', 'zonas-fill-edit', (e) => {
            if (e.features && e.features[0]) {
              const clickedId = e.features[0].properties.zonaId;
              const found = (zonasDeliveryList || []).find(z => (z.Zona_DeliveryId || z.id) === clickedId);
              if (found) {
                setDespachoEditZona(found);
                setDespachoEditZonaError(null);
                customerMarker.setLngLat(e.lngLat);
                actualizarUbicacionModal(e.lngLat.lng, e.lngLat.lat);
                aplicarSeleccionEdit();
              }
            }
          });

          map.resize();
          setTimeout(() => map.resize(), 100);
          setTimeout(() => map.resize(), 300);
          setTimeout(() => map.resize(), 600);
        } catch (err) {
          console.warn('Error loading polygons on edit modal map:', err);
        }
      });

      editDespachoMapRef.current = map;
    }, 150);

    return () => {
      clearTimeout(timer);
      if (editDespachoMapRef.current) {
        editDespachoMapRef.current.remove();
        editDespachoMapRef.current = null;
      }
    };
  }, [showModalEditarDespacho, despachoEditEsDelivery]);

  // La dirección de entrega es el domicilio marcado en el mapa y se digita
  // manualmente. NUNCA se copia la dirección fiscal del cliente.
  // Fallback: si el campo está vacío al elegir cliente, se sugiere su
  // dirección fiscal como punto de partida (se reemplaza al mover el pin).
  useEffect(() => {
    if (clienteSeleccionado?.direccion && !direccionEntregaRef.current && clienteSeleccionado.direccion !== 'Venta en Mostrador') {
      setDireccionEntrega(clienteSeleccionado.direccion);
    }
  }, [clienteSeleccionado]);

  // ----------------------------------------------------
  // CÁLCULOS TOTALES DEL PEDIDO
  // ----------------------------------------------------
  const subtotalNeto = productosPedido.reduce((sum, item) => sum + (item.subtotal || 0), 0);
  const igvCalculado = parseFloat((subtotalNeto * 0.18).toFixed(2));
  const costoDeliveryCalculado = (esDelivery && zonaSeleccionada) ? parseFloat(zonaSeleccionada.tarifa || 0) : 0;
  const totalGeneral = parseFloat((subtotalNeto + igvCalculado + costoDeliveryCalculado).toFixed(2));
  const totalUnidades = productosPedido.reduce((sum, item) => sum + (item.cantidad || 0), 0);
  const esElegibleParaDelivery = subtotalNeto >= 100.00;

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

    if (esDelivery) {
      if (subtotalNeto < 100.00) {
        sileo.error(`El pedido requiere un subtotal mínimo de S/ 100.00 en productos para habilitar delivery. Subtotal actual: S/ ${subtotalNeto.toFixed(2)}`);
        return;
      }
      if (!direccionEntrega.trim()) {
        sileo.error('Debe indicar la dirección exacta de entrega a domicilio.');
        return;
      }

      // Auto-alineación semántica y validación de seguridad
      let zonaParaPayload = zonaSeleccionada;
      const distDetectado = detectarDistritoEnTexto(direccionEntrega);
      if (distDetectado && (!zonaSeleccionada || distDetectado.id !== zonaSeleccionada.id)) {
        const zonaMatch = (zonasDeliveryList || []).find((z) => (z.id || z.Zona_DeliveryId) === distDetectado.id);
        if (zonaMatch) {
          zonaParaPayload = {
            id: zonaMatch.id || zonaMatch.Zona_DeliveryId,
            nombre: zonaMatch.nombre || zonaMatch.Zona_DeliveryNombre,
            tarifa: parseFloat(zonaMatch.tarifa || zonaMatch.Zona_DeliveryTarifa || 0),
            raw: zonaMatch,
          };
          setZonaSeleccionada(zonaParaPayload);
          sileo.info(`Se sincronizó la zona con la dirección a ${distDetectado.nombre} (Tarifa: S/ ${zonaParaPayload.tarifa.toFixed(2)}).`);
        }
      }

      if (!zonaParaPayload) {
        sileo.error('Debe ubicar o seleccionar una zona de delivery válida en Trujillo.');
        return;
      }
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

      // Determinación final de zona de delivery: Máxima prioridad a la zona seleccionada en formulario/mapa
      let zonaIdFinal = null;
      if (esDelivery) {
        if (zonaSeleccionada?.id) {
          zonaIdFinal = zonaSeleccionada.id;
        } else {
          const distFinal = detectarDistritoEnTexto(direccionEntrega);
          zonaIdFinal = distFinal?.id || null;
        }
      }

      const payload = {
        cliente_id: clienteSeleccionado.id,
        canal_id: canalSeleccionado || 'CNL-00001',
        acuerdo_comercial: acuerdoComercial.trim() || 'Pedido',
        origen_ia: esOrigenIa ? 'S' : 'N',
        fecha_entrega: fechaEntrega || null,
        es_delivery: esDelivery ? 'S' : 'N',
        zona_delivery_id: zonaIdFinal,
        direccion_entrega: esDelivery ? direccionEntrega.trim() : null,
        referencia_entrega: esDelivery ? (referenciaEntrega.trim() || null) : null,
        latitud: esDelivery && customerCoords ? customerCoords[1] : null,
        longitud: esDelivery && customerCoords ? customerCoords[0] : null,
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
        const esCotiz = acuerdoComercial === 'Cotización';
        if (esCotiz) {
          sileo.success(`¡Cotización ${ordenCreada.id} registrada exitosamente! Stock de almacén permanece intacto.`);
        } else {
          sileo.success(`¡Orden de pedido ${ordenCreada.id} generada exitosamente! Stock descontado de almacén.`);
        }

        setModalExito({
          orden: ordenCreada,
          cliente: clienteSeleccionado,
          total: totalGeneral,
          subtotal: subtotalNeto,
          igv: igvCalculado,
          es_delivery: esDelivery,
          costo_delivery: costoDeliveryCalculado,
          zona_delivery: zonaSeleccionada?.nombre,
          direccion_entrega: direccionEntrega,
          referencia_entrega: referenciaEntrega,
          fecha_entrega: fechaEntrega,
          detalles: [...productosPedido],
          canal: (Array.isArray(canalesList) ? canalesList : []).find(c => c.Canal_pedidoId === canalSeleccionado)?.Canal_pedidoDescripcion || 'Tienda Presencial',
          acuerdo: acuerdoComercial,
        });

        // Actualización optimista del stock físico en el catálogo (solo si es Pedido)
        if (!esCotiz) {
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
        }

        // Recargar catálogos frescos en segundo plano
        cargarCatalogos();

        setProductosPedido([]);
        setClienteSeleccionado(null);
        setSearchCliente('');
        setAcuerdoComercial('Pedido');
        setEsDelivery(false);
        setZonaSeleccionada(null);
        setCustomerCoords(null);
        setDireccionEntrega('');
        setReferenciaEntrega('');
        setSugerenciaMapa(null);
        setZonaError(null);
        setFechaEntrega(new Date().toISOString().split('T')[0]);
        
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
    if (esDeliveryOrden(orden)) {
      mensaje += `*Costo Delivery:* S/ ${parseFloat(orden.costo_delivery || 0).toFixed(2)}\n`;
    }
    mensaje += `*TOTAL A PAGAR:* S/ ${parseFloat(orden.total || 0).toFixed(2)}\n\n`;

    if (esDeliveryOrden(orden)) {
      mensaje += `*MODALIDAD: DELIVERY A DOMICILIO* 🛵\n`;
      mensaje += `*Zona / Distrito:* ${getNombreZonaOrden(orden)}\n`;
      mensaje += `*Dirección:* ${orden.direccion_entrega || 'No indicada'}\n`;
      if (orden.referencia_entrega) {
        mensaje += `*Referencia:* ${orden.referencia_entrega}\n`;
      }
      const lat = orden.latitud_entrega ?? orden.PedidoLatitudEntrega;
      const lng = orden.longitud_entrega ?? orden.PedidoLongitudEntrega;
      if (lat && lng) {
        mensaje += `*📍 Ubicación GPS Google Maps:* https://www.google.com/maps/search/?api=1&query=${lat},${lng}\n`;
      }
      mensaje += `\n`;
    } else {
      mensaje += `*MODALIDAD: RECOJO EN TIENDA* 🏪\n\n`;
    }

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

  // ----------------------------------------------------
  // GESTIÓN DE DESPACHO Y FECHA (ÓRDENES PENDIENTES)
  // ----------------------------------------------------
  const esDeliveryOrden = (o) => Boolean(
    o?.es_delivery === true ||
    o?.es_delivery === 'S' ||
    o?.es_delivery === 's' ||
    Number(o?.costo_delivery) > 0 ||
    Boolean(o?.zona_delivery_id)
  );

  const getNombreZonaOrden = (o) => {
    if (o?.zona_delivery?.nombre) return o.zona_delivery.nombre;
    if (o?.zona_delivery?.Zona_DeliveryNombre) return o.zona_delivery.Zona_DeliveryNombre;
    const currentId = o?.zona_delivery_id || o?.zona_delivery?.id;
    if (currentId && Array.isArray(zonasDeliveryList)) {
      const match = zonasDeliveryList.find(z => (z.Zona_DeliveryId || z.id) === currentId);
      if (match) return match.Zona_DeliveryNombre || match.nombre;
    }
    return 'Trujillo';
  };

  const abrirModalEditarDespacho = (orden) => {
    if (!orden) return;
    setOrdenParaEditarDespacho(orden);

    // Tipo de registro (Cotización vs Pedido)
    setDespachoEditAcuerdo(esCotizacionOrden(orden) ? 'Cotización' : 'Pedido');

    // Fecha de entrega
    let fechaVal = '';
    if (orden.fecha_entrega) {
      fechaVal = orden.fecha_entrega.substring(0, 10);
    } else {
      fechaVal = new Date().toISOString().split('T')[0];
    }
    setDespachoEditFecha(fechaVal);

    // Es delivery
    const esDeliv = esDeliveryOrden(orden);
    setDespachoEditEsDelivery(esDeliv);

    // Zona de delivery
    const currentZonaId = orden.zona_delivery_id || orden.zona_delivery?.id || orden.zona_delivery?.Zona_DeliveryId;
    const zonaEncontrada = zonasDeliveryList.find(z => (z.Zona_DeliveryId || z.id) === currentZonaId) || orden.zona_delivery || null;
    setDespachoEditZona(zonaEncontrada);

    // Coordenadas iniciales para el mapa
    let initCoords = null;
    const ordenLat = orden.latitud_entrega ?? orden.PedidoLatitudEntrega ?? null;
    const ordenLng = orden.longitud_entrega ?? orden.PedidoLongitudEntrega ?? null;
    if (ordenLat && ordenLng && !isNaN(Number(ordenLat)) && !isNaN(Number(ordenLng))) {
      initCoords = [Number(Number(ordenLng).toFixed(6)), Number(Number(ordenLat).toFixed(6))];
    } else if (zonaEncontrada) {
      const rawGeo = zonaEncontrada.poligono_geojson || zonaEncontrada.Zona_DeliveryPoligonoGeoJSON;
      if (rawGeo) {
        try {
          const parsed = typeof rawGeo === 'string' ? JSON.parse(rawGeo) : rawGeo;
          const coords = parsed.geometry ? parsed.geometry.coordinates[0] : parsed.coordinates?.[0];
          if (coords && coords.length > 0) {
            const sumLng = coords.reduce((acc, c) => acc + c[0], 0);
            const sumLat = coords.reduce((acc, c) => acc + c[1], 0);
            initCoords = [Number((sumLng / coords.length).toFixed(6)), Number((sumLat / coords.length).toFixed(6))];
          }
        } catch {}
      }
    }
    if (!initCoords) {
      const storeLng = Number(datosEmpresa?.EmpresaLongitud) || TRUJILLO_CENTER[0];
      const storeLat = Number(datosEmpresa?.EmpresaLatitud) || TRUJILLO_CENTER[1];
      initCoords = [storeLng, storeLat];
    }
    setDespachoEditCoords(initCoords);
    setDespachoEditZonaError(null);

    // Dirección y referencia: solo la congelada en el pedido, nunca la fiscal del cliente
    setDespachoEditDireccion(orden.direccion_entrega || '');
    setDespachoEditReferencia(orden.referencia_entrega || '');

    setShowModalEditarDespacho(true);
  };

  const handleCambiarDistritoEditModal = (zonaId) => {
    const encontrada = (zonasDeliveryList || []).find(z => (z.Zona_DeliveryId || z.id) === zonaId) || null;
    setDespachoEditZona(encontrada);
    setDespachoEditZonaError(null);

    if (encontrada) {
      const rawGeo = encontrada.poligono_geojson || encontrada.Zona_DeliveryPoligonoGeoJSON;
      if (rawGeo) {
        try {
          const parsed = typeof rawGeo === 'string' ? JSON.parse(rawGeo) : rawGeo;
          const coords = parsed.geometry ? parsed.geometry.coordinates[0] : parsed.coordinates?.[0];
          if (coords && coords.length > 0) {
            const sumLng = coords.reduce((acc, c) => acc + c[0], 0);
            const sumLat = coords.reduce((acc, c) => acc + c[1], 0);
            const avgLng = Number((sumLng / coords.length).toFixed(6));
            const avgLat = Number((sumLat / coords.length).toFixed(6));
            setDespachoEditCoords([avgLng, avgLat]);
            if (editDespachoCustomerMarkerRef.current) {
              editDespachoCustomerMarkerRef.current.setLngLat([avgLng, avgLat]);
            }
            if (editDespachoMapRef.current) {
              editDespachoMapRef.current.flyTo({ center: [avgLng, avgLat], zoom: 13.5 });
            }
          }
        } catch (e) {
          console.warn('Error centrando mapa de edición:', e);
        }
      }
    }
  };

  const handleGuardarEditarDespacho = async () => {
    if (!ordenParaEditarDespacho) return;

    if (!despachoEditFecha) {
      sileo.warning('Por favor especifica una fecha de entrega.');
      return;
    }

    const hoyStr = new Date().toISOString().split('T')[0];
    if (despachoEditFecha < hoyStr) {
      sileo.warning('La fecha de entrega no puede ser anterior al día de hoy.');
      return;
    }

    const subtotalProd = parseFloat(ordenParaEditarDespacho.subtotal || 0);
    const totalSinDelivery = parseFloat(ordenParaEditarDespacho.total || 0) - parseFloat(ordenParaEditarDespacho.costo_delivery || 0);
    const baseProductos = subtotalProd > 0 ? subtotalProd : totalSinDelivery;

    if (despachoEditEsDelivery) {
      if (baseProductos < 100) {
        sileo.warning(`El pedido tiene un subtotal de S/ ${baseProductos.toFixed(2)}, pero el delivery exige un mínimo de S/ 100.00.`);
        return;
      }

      if (!despachoEditDireccion.trim()) {
        sileo.warning('Por favor ingresa la dirección exacta de entrega.');
        return;
      }

      // Determinación de zona final: La selección explícita del usuario o la detectada en el mapa TIENE MÁXIMA PRIORIDAD
      let zonaFinalId = null;
      if (despachoEditZona) {
        zonaFinalId = despachoEditZona.Zona_DeliveryId || despachoEditZona.id || null;
      } else {
        const distDetectado = detectarDistritoEnTexto(despachoEditDireccion);
        zonaFinalId = distDetectado?.id || null;
      }

      if (!zonaFinalId) {
        sileo.warning('Por favor selecciona la zona / distrito de delivery.');
        return;
      }
    }

    setIsGuardandoDespacho(true);
    try {
      const zonaIdFinal = despachoEditEsDelivery
        ? (despachoEditZona?.Zona_DeliveryId || despachoEditZona?.id || detectarDistritoEnTexto(despachoEditDireccion)?.id || null)
        : null;

      const payload = {
        fecha_entrega: despachoEditFecha,
        es_delivery: despachoEditEsDelivery ? 'S' : 'N',
        zona_delivery_id: zonaIdFinal,
        direccion_entrega: despachoEditEsDelivery ? despachoEditDireccion.trim() : null,
        referencia_entrega: despachoEditEsDelivery ? (despachoEditReferencia.trim() || null) : null,
        latitud: despachoEditEsDelivery && despachoEditCoords ? despachoEditCoords[1] : null,
        longitud: despachoEditEsDelivery && despachoEditCoords ? despachoEditCoords[0] : null,
        acuerdo_comercial: despachoEditAcuerdo,
      };

      const res = await api.pedidosCliente.actualizar(ordenParaEditarDespacho.id, payload);
      if (res?.success) {
        const eraCotizacion = esCotizacionOrden(ordenParaEditarDespacho);
        const ahoraEsPedido = despachoEditAcuerdo === 'Pedido';
        const msgExito = (eraCotizacion && ahoraEsPedido)
          ? `¡Cotización ${ordenParaEditarDespacho.id} convertida a Pedido! Stock validado y descontado exitosamente.`
          : `Registro ${ordenParaEditarDespacho.id} actualizado correctamente.`;
        sileo.success(msgExito);
        setShowModalEditarDespacho(false);
        setOrdenParaEditarDespacho(null);
        if (showModalDetalle) {
          setShowModalDetalle(false);
        }
        cargarHistorial(paginacion.current_page);
        cargarEstadisticas();
      } else {
        sileo.error(res?.message || 'No se pudo actualizar el registro de la orden.');
      }
    } catch (err) {
      console.error('Error al actualizar despacho:', err);
      const msg = err.response?.data?.message || err.message || 'Error al actualizar el despacho.';
      sileo.error(msg);
    } finally {
      setIsGuardandoDespacho(false);
    }
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
                  <StyledSelect
                    value={canalSeleccionado}
                    onChange={(v) => setCanalSeleccionado(v)}
                    options={(Array.isArray(canalesList) ? canalesList : []).map(c => ({
                      value: c.Canal_pedidoId,
                      label: `${c.Canal_pedidoDescripcion} (${c.Canal_pedidoId})`
                    }))}
                    icon={<Store className="w-4 h-4 text-slate-400" />}
                    placeholder="Seleccionar canal..."
                    searchable
                    panelWidth={280}
                    size="form"
                    ariaLabel="Canal de Pedido / Origen"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center justify-between">
                    <span>Tipo de Registro:</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      acuerdoComercial === 'Cotización'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {acuerdoComercial === 'Cotización' ? '📄 Stock intacto' : '⚡ Descuenta stock'}
                    </span>
                  </label>
                  <StyledSelect
                    value={acuerdoComercial}
                    onChange={(v) => {
                      paymentConfirmedTimeRef.current = Date.now();
                      setAcuerdoComercial(v);
                    }}
                    options={[
                      { value: 'Cotización', label: 'Cotización (No descuenta stock)' },
                      { value: 'Pedido', label: 'Pedido (Descuenta stock)' },
                    ]}
                    icon={acuerdoComercial === 'Cotización' ? <FileText className="w-4 h-4 text-amber-500" /> : <FileCheck2 className="w-4 h-4 text-blue-500" />}
                    placeholder="Seleccionar tipo..."
                    panelWidth={280}
                    size="form"
                    ariaLabel="Tipo de Registro"
                  />
                </div>
              </div>
            </div>

            {/* 2. DESPACHO, MODALIDAD DE ENTREGA Y FECHA PROGRAMADA */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Truck className="w-4 h-4 text-blue-600" />
                    2. Modalidad de Entrega y Despacho
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">Fecha de Entrega:</span>
                  <StyledDatePicker
                    value={fechaEntrega}
                    onChange={(v) => setFechaEntrega(v)}
                    min={new Date().toISOString().split('T')[0]}
                    ariaLabel="Fecha de Entrega"
                  />
                </div>
              </div>

              {/* Selector de Modalidad: Recojo vs Delivery */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* Opción A: Recojo en Tienda */}
                <div
                  onClick={() => setEsDelivery(false)}
                  className={`p-4 rounded-xl border-2 transition cursor-pointer flex flex-col justify-between gap-2 ${
                    !esDelivery
                      ? 'border-emerald-500 bg-emerald-50/40 text-emerald-950 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-lg ${!esDelivery ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        <Store className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs">Recojo en Tienda</h4>
                        <p className="text-[11px] text-slate-500">Retiro directo en mostrador</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      Gratis (S/ 0.00)
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Dirección: {datosEmpresa?.EmpresaDireccion || 'Trujillo Centro'}
                  </p>
                </div>

                {/* Opción B: Entrega a Domicilio (Delivery) */}
                <div
                  onClick={() => {
                    if (!esElegibleParaDelivery && !esDelivery) {
                      sileo.warning(`El servicio de delivery requiere una compra mínima de S/ 100.00 en productos. Subtotal actual: S/ ${subtotalNeto.toFixed(2)}`);
                      return;
                    }
                    setEsDelivery(true);
                  }}
                  className={`p-4 rounded-xl border-2 transition cursor-pointer flex flex-col justify-between gap-2 ${
                    esDelivery
                      ? 'border-blue-600 bg-blue-50/40 text-blue-950 shadow-xs'
                      : esElegibleParaDelivery
                      ? 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                      : 'border-slate-200 bg-slate-50/70 text-slate-400 opacity-90'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-lg ${esDelivery ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        <Truck className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs">Entrega a Domicilio (Delivery)</h4>
                        <p className="text-[11px] text-slate-500">Despacho en distritos de Trujillo</p>
                      </div>
                    </div>
                    {esElegibleParaDelivery ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                        {zonaSeleccionada ? `S/ ${zonaSeleccionada.tarifa.toFixed(2)}` : 'Tarifa según zona'}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                        Min. S/ 100
                      </span>
                    )}
                  </div>

                  <div className="mt-1">
                    {esElegibleParaDelivery ? (
                      <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Califica para delivery (Subtotal S/ {subtotalNeto.toFixed(2)} ≥ S/ 100.00)
                      </p>
                    ) : (
                      <p className="text-[10px] text-amber-600 font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Faltan S/ {(100 - subtotalNeto).toFixed(2)} en productos para habilitar delivery
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Si está activo el Delivery: Mapa Mapbox y controles de zona */}
              {esDelivery && (
                <div className="pt-2 border-t border-slate-100 space-y-4 animate-in fade-in duration-200">
                  {/* Selector rápido por Distrito y Badge de Estado */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Distrito / Zona Asignada:
                      </label>
                      <StyledSelect
                        value={zonaSeleccionada?.id || ''}
                        onChange={(v) => handleSeleccionarDistritoManual(v)}
                        options={[
                          { value: '', label: '-- Seleccionar o detectar en mapa --' },
                          ...(zonasDeliveryList || []).map((z) => ({
                            value: z.Zona_DeliveryId || z.id,
                            label: `${z.Zona_DeliveryNombre || z.nombre} (Tarifa: S/ ${parseFloat(z.Zona_DeliveryTarifa || z.tarifa || 0).toFixed(2)})`
                          }))
                        ]}
                        icon={<MapPin className="w-4 h-4 text-slate-400" />}
                        placeholder="Seleccionar o detectar en mapa..."
                        searchable
                        panelWidth={280}
                        size="form"
                        ariaLabel="Distrito / Zona Asignada"
                      />
                    </div>

                    {/* Tarifa Detectada */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Estado de Detección Geográfica:
                      </label>
                      {zonaSeleccionada ? (
                        <div className="px-3.5 py-2 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl flex items-center justify-between text-xs">
                          <span className="font-semibold flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-blue-600" />
                            {zonaSeleccionada.nombre}
                          </span>
                          <span className="font-bold bg-blue-600 text-white px-2 py-0.5 rounded text-[11px]">
                            + S/ {zonaSeleccionada.tarifa.toFixed(2)}
                          </span>
                        </div>
                      ) : (
                        <div className="px-3.5 py-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl flex items-center gap-1.5 text-xs">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>{zonaError || 'Arrastre el pin azul en el mapa para ubicar el destino.'}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Buscador de Dirección Mapbox */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Búsqueda Rápida de Dirección / Lugar en Trujillo:
                    </label>
                    <BuscadorDireccionMapbox
                      onSelectUbicacion={handleSelectUbicacionEnFormulario}
                      placeholder="Buscar por calle o lugar (ej. Li-1084 Laredo, Av. Larco 1450, Urb. La Merced...)"
                    />
                  </div>

                  {/* Contenedor del Mapa Mapbox GL */}
                  <div className="relative">
                    <div
                      ref={deliveryMapContainerRef}
                      className="w-full h-64 rounded-xl border border-slate-200 overflow-hidden shadow-2xs"
                    />
                    <div className="absolute top-2.5 left-2.5 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-slate-200 text-[10px] text-slate-600 shadow-xs pointer-events-none flex items-center gap-1.5">
                      <Navigation className="w-3 h-3 text-blue-600" />
                      <span>Arrastre el pin azul hasta el domicilio o haga clic en el mapa para posicionarlo</span>
                    </div>
                  </div>

                  {/* Sugerencia de calle según el pin (opcional, un clic para usar) */}
                  {sugerenciaMapa && (
                    <div className="px-3 py-2 bg-sky-50 border border-sky-200 rounded-xl flex items-center justify-between gap-2 text-xs">
                      <span className="text-sky-900 truncate">
                        <span className="font-semibold">Sugerencia del mapa:</span> {sugerenciaMapa}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setDireccionEntrega(sugerenciaMapa);
                          setSugerenciaMapa(null);
                        }}
                        className="shrink-0 px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-[11px] font-semibold transition cursor-pointer"
                      >
                        Usar
                      </button>
                    </div>
                  )}

                  {/* Dirección y Referencia de Entrega */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Dirección de Entrega Exacta: <span className="text-rose-500">*</span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={direccionEntrega}
                          onChange={(e) => setDireccionEntrega(e.target.value)}
                          placeholder="Domicilio de entrega. Ej. Av. Larco 1450, Urb. La Merced"
                          className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                        />
                        <button
                          type="button"
                          onClick={handleUbicarDireccionTexto}
                          className="px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shrink-0 cursor-pointer shadow-xs"
                          title="Ubicar esta dirección en el mapa"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          <span>Ubicar</span>
                        </button>
                      </div>

                      {/* Alerta de discrepancia semántica entre dirección escrita y zona asignada */}
                      {(() => {
                        const distritoDetectado = detectarDistritoEnTexto(direccionEntrega);
                        const zonaActualId = zonaSeleccionada?.id || zonaSeleccionada?.Zona_DeliveryId;
                        const zonaActualNom = (zonaSeleccionada?.nombre || zonaSeleccionada?.Zona_DeliveryNombre || '').toLowerCase();
                        if (distritoDetectado && zonaSeleccionada && (zonaActualId !== distritoDetectado.id && !zonaActualNom.includes(distritoDetectado.nombre.toLowerCase()))) {
                          return (
                            <div className="mt-2 p-2.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-center justify-between gap-2 animate-in fade-in">
                              <div className="flex items-center gap-1.5">
                                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                                <span className="text-[11px]">
                                  La dirección menciona <strong>{distritoDetectado.nombre}</strong> pero la zona asignada es <strong>{zonaSeleccionada.nombre}</strong>.
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleSeleccionarDistritoManual(distritoDetectado.id)}
                                className="shrink-0 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold transition cursor-pointer"
                              >
                                Corregir a {distritoDetectado.nombre}
                              </button>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Referencia de Entrega (Opcional):
                      </label>
                      <input
                        type="text"
                        value={referenciaEntrega}
                        onChange={(e) => setReferenciaEntrega(e.target.value)}
                        placeholder="Ej. Casa verde de dos pisos, frente al parque"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                      />
                    </div>
                  </div>

                  {/* Coordenadas GPS del Punto de Entrega */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                        <Compass className="w-3.5 h-3.5 text-blue-600" />
                        Coordenadas GPS de Entrega (Latitud / Longitud):
                      </span>
                      {customerCoords && (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${customerCoords[1]},${customerCoords[0]}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Probar en Google Maps
                        </a>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] text-slate-500 font-medium mb-0.5">Latitud GPS:</label>
                        <input
                          type="number"
                          step="any"
                          value={customerCoords ? customerCoords[1] : ''}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val)) {
                              const newCoords = [customerCoords ? customerCoords[0] : TRUJILLO_CENTER[0], val];
                              setCustomerCoords(newCoords);
                              if (deliveryCustomerMarkerRef.current) deliveryCustomerMarkerRef.current.setLngLat(newCoords);
                              if (deliveryMapRef.current) deliveryMapRef.current.flyTo({ center: newCoords, zoom: 15 });
                              const z = detectarZonaPorCoordenadas(newCoords[0], newCoords[1]);
                              if (z) setZonaSeleccionada(z);
                            }
                          }}
                          placeholder="Ej: -8.111816"
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 font-medium mb-0.5">Longitud GPS:</label>
                        <input
                          type="number"
                          step="any"
                          value={customerCoords ? customerCoords[0] : ''}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val)) {
                              const newCoords = [val, customerCoords ? customerCoords[1] : TRUJILLO_CENTER[1]];
                              setCustomerCoords(newCoords);
                              if (deliveryCustomerMarkerRef.current) deliveryCustomerMarkerRef.current.setLngLat(newCoords);
                              if (deliveryMapRef.current) deliveryMapRef.current.flyTo({ center: newCoords, zoom: 15 });
                              const z = detectarZonaPorCoordenadas(newCoords[0], newCoords[1]);
                              if (z) setZonaSeleccionada(z);
                            }
                          }}
                          placeholder="Ej: -79.015388"
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      {customerCoords
                        ? `📍 Coordenadas activas: ${customerCoords[1]}, ${customerCoords[0]} — Se registrarán en el pedido para la navegación del transportista al momento del despacho.`
                        : 'Arrastre el pin azul en el mapa o pegue las coordenadas para fijar la ubicación exacta.'}
                    </p>
                  </div>

                  <p className="text-[11px] text-slate-400 italic">
                    * La dirección de entrega y la tarifa quedan congeladas en esta orden y no se alteran ante cambios futuros en la ficha del cliente.
                  </p>
                </div>
              )}
            </div>

            {/* 3. BUSCADOR & AGREGADO DE PRODUCTOS */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                    3. Catálogo & Agregar Productos
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
                      <StyledSelect
                        value={unidadSeleccionada?.unidades_medidaId || ''}
                        onChange={(v) => handleCambiarUnidad(v)}
                        options={(productoEnSeleccion.unidades || []).map(u => {
                          const label = (u.descripcion || '').includes(`(${u.abreviatura})`)
                            ? u.descripcion
                            : `${u.descripcion} (${u.abreviatura})`;
                          return {
                            value: u.unidades_medidaId,
                            label: `${label} - Factor: ${u.factor_conversion}`
                          };
                        })}
                        icon={<Package className="w-4 h-4 text-slate-400" />}
                        placeholder="Seleccionar unidad..."
                        panelWidth={260}
                        size="form"
                        ariaLabel="Unidad de Medida / Presentación"
                      />
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

            {/* 4. TABLA DE PRODUCTOS EN EL PEDIDO */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                    4. Detalle de Productos Solicitados ({productosPedido.length})
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
                  <span>Modalidad:</span>
                  <span className={`font-bold ${esDelivery ? 'text-blue-700' : 'text-slate-700'}`}>
                    {esDelivery ? `Delivery (${zonaSeleccionada?.nombre || 'Por detectar'})` : 'Recojo en Tienda'}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Fecha Entrega:</span>
                  <span className="font-semibold text-slate-700">
                    {fechaEntrega || 'Hoy'}
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
                  <span>Subtotal Productos:</span>
                  <span className="font-semibold text-slate-800">S/ {subtotalNeto.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-600">
                  <span>IGV (18%):</span>
                  <span className="font-semibold text-slate-800">S/ {igvCalculado.toFixed(2)}</span>
                </div>
                {esDelivery && (
                  <div className="flex justify-between text-xs text-blue-700 bg-blue-50 px-2 py-1.5 rounded-lg border border-blue-100">
                    <span className="flex items-center gap-1 font-semibold">
                      <Truck className="w-3.5 h-3.5 text-blue-600" />
                      Flete Delivery ({zonaSeleccionada?.nombre || 'Zona'}):
                    </span>
                    <span className="font-bold">
                      + S/ {costoDeliveryCalculado.toFixed(2)}
                    </span>
                  </div>
                )}
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
                    : acuerdoComercial === 'Cotización'
                      ? 'bg-amber-600 hover:bg-amber-700 active:scale-[0.98]'
                      : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98]'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>
                      {acuerdoComercial === 'Cotización'
                        ? 'Guardando Cotización...'
                        : 'Registrando Pedido y Descontando Stock...'}
                    </span>
                  </>
                ) : (
                  <>
                    {acuerdoComercial === 'Cotización' ? (
                      <>
                        <FileText className="w-4 h-4" />
                        <span>GUARDAR COTIZACIÓN</span>
                      </>
                    ) : (
                      <>
                        <FileCheck2 className="w-4 h-4" />
                        <span>REGISTRAR PEDIDO DE CLIENTE</span>
                      </>
                    )}
                  </>
                )}
              </button>

              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-[11px] text-slate-500 space-y-1">
                {acuerdoComercial === 'Cotización' ? (
                  <>
                    <p className="flex items-center gap-1.5 font-semibold text-amber-700">
                      <FileText className="w-3.5 h-3.5 text-amber-600" />
                      Modo Cotización: Stock de almacén intacto
                    </p>
                    <p>No se descontará stock ni se generará movimiento de salida en Kárdex. Podrás convertirla a Pedido en cualquier momento.</p>
                  </>
                ) : (
                  <>
                    <p className="flex items-center gap-1.5 font-semibold text-slate-700">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      Descuento automático de inventario
                    </p>
                    <p>Al confirmar, el stock disponible se reservará y quedará registrado el movimiento de salida en el Kárdex.</p>
                  </>
                )}
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
                <StyledSelect
                  value={filtroEstado}
                  onChange={(v) => setFiltroEstado(v)}
                  options={[
                    { value: '', label: 'Todos los Estados' },
                    { value: 'P', label: 'Pendientes (P)' },
                    { value: 'C', label: 'Completadas (C)' },
                    { value: 'A', label: 'Canceladas (A)' }
                  ]}
                  icon={<CheckCircle2 className="w-4 h-4 text-slate-400" />}
                  placeholder="Todos los Estados"
                  panelWidth={220}
                  ariaLabel="Filtro por Estado"
                />
              </div>

              {/* Filtro Canal */}
              <div>
                <StyledSelect
                  value={filtroCanal}
                  onChange={(v) => setFiltroCanal(v)}
                  options={[
                    { value: '', label: 'Todos los Canales' },
                    ...(Array.isArray(canalesList) ? canalesList : []).map(c => ({
                      value: c.Canal_pedidoId,
                      label: c.Canal_pedidoDescripcion
                    }))
                  ]}
                  icon={<Store className="w-4 h-4 text-slate-400" />}
                  placeholder="Todos los Canales"
                  searchable
                  panelWidth={240}
                  ariaLabel="Filtro por Canal"
                />
              </div>

              {/* Filtro Origen */}
              <div>
                <StyledSelect
                  value={filtroOrigen}
                  onChange={(v) => setFiltroOrigen(v)}
                  options={[
                    { value: '', label: 'Todos los Orígenes' },
                    { value: 'S', label: '🤖 Valencia AI' },
                    { value: 'N', label: '👤 Manual Convencional' }
                  ]}
                  icon={<Bot className="w-4 h-4 text-slate-400" />}
                  placeholder="Todos los Orígenes"
                  panelWidth={240}
                  ariaLabel="Filtro por Origen"
                />
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
                    <th className="py-3 px-4">Despacho</th>
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
                      <td colSpan="10" className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                        <span>Cargando órdenes de clientes...</span>
                      </td>
                    </tr>
                  ) : ordenesHistorial.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="py-12 text-center text-slate-400">
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
                            <div>{orden.id}</div>
                            {esCotizacionOrden(orden) ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 mt-0.5" title="Cotización - Sin descuento de stock">
                                <FileText className="w-2.5 h-2.5" /> Cotización
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 mt-0.5" title="Pedido - Stock descontado">
                                <FileCheck2 className="w-2.5 h-2.5" /> Pedido
                              </span>
                            )}
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

                          {/* Despacho */}
                          <td className="py-3.5 px-4">
                            {esDeliveryOrden(orden) ? (
                              <div>
                                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-bold inline-flex items-center gap-1 shadow-2xs">
                                  <Truck className="w-3 h-3 text-blue-600" />
                                  Delivery ({getNombreZonaOrden(orden)})
                                </span>
                                <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                                  <Calendar className="w-2.5 h-2.5 text-slate-400" />
                                  {orden.fecha_entrega_formateada || (orden.fecha_entrega ? orden.fecha_entrega.split('T')[0] : 'Programada')}
                                </p>
                              </div>
                            ) : (
                              <div>
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded text-[10px] font-medium inline-flex items-center gap-1">
                                  <Store className="w-3 h-3 text-slate-500" />
                                  Recojo en Tienda
                                </span>
                                {orden.fecha_entrega && (
                                  <p className="text-[10px] text-slate-400 mt-0.5">
                                    {orden.fecha_entrega_formateada || orden.fecha_entrega.split('T')[0]}
                                  </p>
                                )}
                              </div>
                            )}
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

                              {/* Modificar Despacho / Cotización si está pendiente */}
                              {isPendiente && (
                                <button
                                  type="button"
                                  onClick={() => abrirModalEditarDespacho(orden)}
                                  className={`p-1.5 rounded-lg transition ${
                                    esCotizacionOrden(orden)
                                      ? 'text-amber-600 hover:text-amber-800 hover:bg-amber-50'
                                      : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
                                  }`}
                                  title={esCotizacionOrden(orden) ? 'Editar Cotización / Convertir a Pedido' : 'Modificar Despacho o Reprogramar Fecha'}
                                >
                                  {esCotizacionOrden(orden) ? <Pencil className="w-4 h-4 text-amber-600" /> : <Truck className="w-4 h-4" />}
                                </button>
                              )}

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

                  {/* Datos del Cliente y Tipo de Registro */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-200/80 rounded-xl">
                    <div>
                      <span className="font-bold text-slate-500 block mb-1">CLIENTE</span>
                      <p className="font-bold text-slate-900">{ordenDetalle.cliente?.nombre || 'Cliente General'}</p>
                      <p className="text-slate-500">Doc: {ordenDetalle.cliente?.dni_ruc || 'N/A'}</p>
                      <p className="text-slate-500">Teléfono: {ordenDetalle.cliente?.telefono || 'No especificado'}</p>
                    </div>
                    <div>
                      <span className="font-bold text-slate-500 block mb-1">TIPO DE REGISTRO</span>
                      <div className="flex items-center gap-2 mb-1">
                        {esCotizacionOrden(ordenDetalle) ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            <FileText className="w-3.5 h-3.5" /> Cotización (Stock intacto)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
                            <FileCheck2 className="w-3.5 h-3.5" /> Pedido (Stock descontado)
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500">Registrado por: {ordenDetalle.usuario_registro || 'Sistema'}</p>
                    </div>
                  </div>

                  {/* Banner de acción rápida si es Cotización pendiente */}
                  {esCotizacionOrden(ordenDetalle) && ordenDetalle.estado === 'P' && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 text-amber-900">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Este registro es una <strong>Cotización</strong>. El stock de almacén no ha sido descontado.</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowModalDetalle(false);
                          abrirModalEditarDespacho(ordenDetalle);
                          setDespachoEditAcuerdo('Pedido');
                        }}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer transition"
                      >
                        <FileCheck2 className="w-3.5 h-3.5" />
                        <span>Convertir a Pedido</span>
                      </button>
                    </div>
                  )}

                  {/* Información de Despacho y Entrega */}
                  <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700 uppercase text-[11px] flex items-center gap-1.5">
                        {esDeliveryOrden(ordenDetalle) ? (
                          <>
                            <Truck className="w-4 h-4 text-blue-600" />
                            Entrega a Domicilio (Delivery)
                          </>
                        ) : (
                          <>
                            <Store className="w-4 h-4 text-emerald-600" />
                            Recojo en Tienda Presencial
                          </>
                        )}
                      </span>
                      {ordenDetalle.estado === 'P' && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowModalDetalle(false);
                            abrirModalEditarDespacho(ordenDetalle);
                          }}
                          className="text-[11px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                        >
                          <Pencil className="w-3 h-3" />
                          Modificar Despacho
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                      <div>
                        <span className="text-slate-400 block text-[10px]">FECHA PROGRAMADA:</span>
                        <span className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          {ordenDetalle.fecha_entrega_formateada || (ordenDetalle.fecha_entrega ? ordenDetalle.fecha_entrega.split('T')[0] : 'No especificada')}
                        </span>
                      </div>
                      {esDeliveryOrden(ordenDetalle) ? (
                        <>
                          <div>
                            <span className="text-slate-400 block text-[10px]">ZONA / TARIFA FLETE:</span>
                            <span className="font-bold text-blue-700 mt-0.5 block">
                              {getNombreZonaOrden(ordenDetalle)} — S/ {parseFloat(ordenDetalle.costo_delivery || 0).toFixed(2)}
                            </span>
                          </div>
                          <div className="sm:col-span-2 bg-white p-3 rounded-lg border border-slate-200/80 space-y-2">
                            <div>
                              <span className="text-slate-400 block text-[10px]">DIRECCIÓN DE ENTREGA (CONGELADA):</span>
                              <p className="font-semibold text-slate-800 mt-0.5">{ordenDetalle.direccion_entrega || 'No indicada'}</p>
                              {ordenDetalle.referencia_entrega && (
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  <strong>Ref:</strong> {ordenDetalle.referencia_entrega}
                                </p>
                              )}
                            </div>
                            {/* Navegación y Coordenadas GPS para la Salida del Repartidor */}
                            {(ordenDetalle.latitud_entrega ?? ordenDetalle.PedidoLatitudEntrega) && (ordenDetalle.longitud_entrega ?? ordenDetalle.PedidoLongitudEntrega) && (
                              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 text-xs text-slate-700">
                                  <Compass className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                  <span className="font-mono text-[11px]">
                                    GPS: <strong>{ordenDetalle.latitud_entrega ?? ordenDetalle.PedidoLatitudEntrega}</strong>, <strong>{ordenDetalle.longitud_entrega ?? ordenDetalle.PedidoLongitudEntrega}</strong>
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <a
                                    href={ordenDetalle.link_google_maps || `https://www.google.com/maps/search/?api=1&query=${ordenDetalle.latitud_entrega ?? ordenDetalle.PedidoLatitudEntrega},${ordenDetalle.longitud_entrega ?? ordenDetalle.PedidoLongitudEntrega}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold flex items-center gap-1 transition"
                                    title="Abrir destino en Google Maps"
                                  >
                                    <MapPin className="w-3 h-3 text-blue-600" />
                                    Google Maps
                                  </a>
                                  <a
                                    href={ordenDetalle.link_waze || `https://waze.com/ul?ll=${ordenDetalle.latitud_entrega ?? ordenDetalle.PedidoLatitudEntrega},${ordenDetalle.longitud_entrega ?? ordenDetalle.PedidoLongitudEntrega}&navigate=yes`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2.5 py-1 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200 rounded-lg text-xs font-bold flex items-center gap-1 transition"
                                    title="Abrir destino en Waze"
                                  >
                                    <Navigation className="w-3 h-3 text-cyan-600" />
                                    Waze
                                  </a>
                                </div>
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        <div>
                          <span className="text-slate-400 block text-[10px]">PUNTO DE RETIRO:</span>
                          <span className="font-semibold text-slate-800 mt-0.5 block">
                            Mostrador Principal — {datosEmpresa?.EmpresaDireccion || 'Trujillo Centro'}
                          </span>
                        </div>
                      )}
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
                        <span>Subtotal Productos:</span>
                        <span className="font-semibold text-slate-800">
                          S/ {parseFloat(ordenDetalle.subtotal_productos ?? ordenDetalle.subtotal ?? 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>IGV (18%):</span>
                        <span className="font-semibold text-slate-800">S/ {parseFloat(ordenDetalle.igv || 0).toFixed(2)}</span>
                      </div>
                      {esDeliveryOrden(ordenDetalle) && (
                        <div className="flex justify-between text-blue-700 font-medium">
                          <span>Flete Delivery:</span>
                          <span className="font-bold">
                            S/ {parseFloat(ordenDetalle.costo_delivery || 0).toFixed(2)}
                          </span>
                        </div>
                      )}
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
                      onClick={() => {
                        setShowModalDetalle(false);
                        abrirModalEditarDespacho(ordenDetalle);
                      }}
                      className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>Editar Despacho</span>
                    </button>
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
              <StyledSelect
                value={causaFalloCancelacion}
                onChange={(v) => setCausaFalloCancelacion(v)}
                options={[
                  { value: 'RECHAZO_CLIENTE', label: 'Rechazo por Cliente (Desistió / Canceló)' },
                  { value: 'FALTA_STOCK', label: 'Falta de Stock Físico (Quiebre)' },
                  { value: 'ERROR_DIRECCION', label: 'Error en Dirección / Zona No Cubierta' },
                  { value: 'ERROR_FACTURACION', label: 'Error de Facturación / Precios' },
                  { value: 'PROBLEMA_LOGISTICO', label: 'Problema Logístico / Reparto' },
                  { value: 'OTRO', label: 'Otro Motivo Operativo' }
                ]}
                icon={<AlertCircle className="w-4 h-4 text-slate-400" />}
                placeholder="Seleccionar causa..."
                panelWidth={280}
                size="form"
                ariaLabel="Causa Raíz de No Despacho (KPI PODE)"
              />
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
      {/* MODAL 8: MODIFICAR DESPACHO / REPROGRAMAR ENTREGA     */}
      {/* ---------------------------------------------------- */}
      {showModalEditarDespacho && ordenParaEditarDespacho && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Cabecera */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5 text-blue-600">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Editar Registro / Despacho</h3>
                  <p className="text-[11px] text-slate-500">Orden: <span className="font-semibold text-slate-700">{ordenParaEditarDespacho.id}</span></p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModalEditarDespacho(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Resumen Comercial */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Cliente</span>
                <span className="font-semibold text-slate-800 truncate block">
                  {ordenParaEditarDespacho.cliente?.nombre || ordenParaEditarDespacho.cliente?.ClienteNombre || 'Cliente General'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Subtotal Productos</span>
                <span className="font-bold text-blue-600">
                  S/ {parseFloat(ordenParaEditarDespacho.subtotal || (ordenParaEditarDespacho.total - (ordenParaEditarDespacho.costo_delivery || 0))).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Tipo de Registro: Cotización vs Pedido */}
            <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-600" />
                  Tipo de Registro:
                </label>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  despachoEditAcuerdo === 'Cotización'
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                }`}>
                  {despachoEditAcuerdo === 'Cotización' ? '📄 Stock intacto (Sin descuento)' : '⚡ Descuenta stock de almacén'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDespachoEditAcuerdo('Cotización')}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex items-center gap-2 ${
                    despachoEditAcuerdo === 'Cotización'
                      ? 'bg-amber-50 border-amber-400 text-amber-900 shadow-xs ring-1 ring-amber-300 font-bold'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <FileText className={`w-4 h-4 ${despachoEditAcuerdo === 'Cotización' ? 'text-amber-600' : 'text-slate-400'}`} />
                  <div>
                    <p className="text-xs">Cotización</p>
                    <p className="text-[10px] text-slate-500 font-normal">No descuenta stock</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setDespachoEditAcuerdo('Pedido')}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex items-center gap-2 ${
                    despachoEditAcuerdo === 'Pedido'
                      ? 'bg-blue-50 border-blue-400 text-blue-900 shadow-xs ring-1 ring-blue-300 font-bold'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <FileCheck2 className={`w-4 h-4 ${despachoEditAcuerdo === 'Pedido' ? 'text-blue-600' : 'text-slate-400'}`} />
                  <div>
                    <p className="text-xs">Pedido</p>
                    <p className="text-[10px] text-slate-500 font-normal">Descuenta stock</p>
                  </div>
                </button>
              </div>
              {esCotizacionOrden(ordenParaEditarDespacho) && despachoEditAcuerdo === 'Pedido' && (
                <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-[11px] flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Al guardar como <strong>Pedido</strong>, el stock será validado y descontado inmediatamente en el Kárdex.</span>
                </div>
              )}
            </div>

            {/* Fecha de Entrega */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-blue-600" />
                Fecha de Entrega Solicitada *
              </label>
              <StyledDatePicker
                value={despachoEditFecha}
                onChange={(v) => setDespachoEditFecha(v)}
                min={new Date().toISOString().split('T')[0]}
                ariaLabel="Fecha de Entrega Solicitada"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                La fecha no puede ser anterior a hoy. Se recalculará la programación logística.
              </p>
            </div>

            {/* Selector de Modalidad */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Modalidad de Entrega *
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setDespachoEditEsDelivery(false)}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-center gap-2.5 ${
                    !despachoEditEsDelivery
                      ? 'bg-blue-50 border-blue-400 text-blue-900 shadow-xs ring-1 ring-blue-300'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Store className="w-4 h-4 text-blue-600 shrink-0" />
                  <div>
                    <p className="text-xs font-bold">Recojo en Tienda</p>
                    <p className="text-[10px] text-slate-500">Sin costo de flete (S/ 0.00)</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setDespachoEditEsDelivery(true)}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-center gap-2.5 ${
                    despachoEditEsDelivery
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-900 shadow-xs ring-1 ring-emerald-300'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Truck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-xs font-bold">Delivery a Domicilio</p>
                    <p className="text-[10px] text-slate-500">Tarifa según distrito</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Opciones cuando es Delivery */}
            {despachoEditEsDelivery && (
              <div className="space-y-3 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200 animate-in fade-in duration-150">
                {/* Alerta de mínimo S/ 100 */}
                {parseFloat(ordenParaEditarDespacho.subtotal || 0) < 100 && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px] flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      Atención: El subtotal de productos es menor a S/ 100.00. El servicio de delivery requiere alcanzar el importe mínimo.
                    </span>
                  </div>
                )}

                {/* Distrito / Zona y Estado de Detección */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Distrito / Zona de Entrega (Trujillo) *
                    </label>
                    <StyledSelect
                      value={despachoEditZona?.Zona_DeliveryId || despachoEditZona?.id || ''}
                      onChange={(v) => handleCambiarDistritoEditModal(v)}
                      options={[
                        { value: '', label: '-- Seleccione o detecte en mapa --' },
                        ...zonasDeliveryList.map((z) => {
                          const zid = z.Zona_DeliveryId || z.id;
                          const nom = z.Zona_DeliveryNombre || z.nombre;
                          const tar = parseFloat(z.Zona_DeliveryTarifa || z.tarifa || 0).toFixed(2);
                          return {
                            value: zid,
                            label: `${nom} (Flete: S/ ${tar})`
                          };
                        })
                      ]}
                      icon={<MapPin className="w-4 h-4 text-slate-400" />}
                      placeholder="Seleccione o detecte en mapa..."
                      searchable
                      panelWidth={280}
                      size="form"
                      ariaLabel="Distrito / Zona de Entrega (Trujillo)"
                    />
                  </div>

                  <div>
                    {despachoEditZona ? (
                      <div className="px-3 py-2 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl flex items-center justify-between text-xs font-semibold">
                        <span className="flex items-center gap-1.5 truncate">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          {despachoEditZona.Zona_DeliveryNombre || despachoEditZona.nombre}
                        </span>
                        <span className="text-emerald-700 font-bold shrink-0">
                          S/ {parseFloat(despachoEditZona.Zona_DeliveryTarifa || despachoEditZona.tarifa || 0).toFixed(2)}
                        </span>
                      </div>
                    ) : (
                      <div className="px-3 py-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span className="truncate">{despachoEditZonaError || 'Ubique el pin en el mapa'}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Buscador de Dirección en Modal */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Búsqueda de Nueva Dirección / Lugar en Trujillo:
                  </label>
                  <BuscadorDireccionMapbox
                    onSelectUbicacion={handleSelectUbicacionEnEditModal}
                    placeholder="Buscar calle o lugar (ej. Li-1084 Laredo, Av. Larco 1450...)"
                  />
                </div>

                {/* Mapa Interactivo Mapbox GL para reubicar destino */}
                <div className="relative">
                  <div
                    ref={editDespachoMapContainerRef}
                    className="w-full h-52 rounded-xl border border-slate-200 overflow-hidden shadow-2xs"
                  />
                  <div className="absolute top-2 left-2 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-slate-200 text-[10px] text-slate-700 shadow-xs pointer-events-none flex items-center gap-1.5">
                    <Navigation className="w-3 h-3 text-blue-600" />
                    <span>Arrastre el pin azul o haga clic en un distrito de Trujillo para reasignar la zona</span>
                  </div>
                </div>

                {/* Dirección Congelada */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Dirección Exacta de Entrega *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={despachoEditDireccion}
                      onChange={(e) => setDespachoEditDireccion(e.target.value)}
                      placeholder="Ej: Av. España 1234, Urb. Centro"
                      className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={handleUbicarDireccionTextoEditModal}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shrink-0 cursor-pointer shadow-xs"
                      title="Geocodificar y ubicar en el mapa"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Ubicar</span>
                    </button>
                  </div>

                  {/* Alerta de discrepancia semántica en Modal Edición */}
                  {(() => {
                    const distritoDetectado = detectarDistritoEnTexto(despachoEditDireccion);
                    const zonaActualId = despachoEditZona?.Zona_DeliveryId || despachoEditZona?.id;
                    const zonaActualNom = (despachoEditZona?.Zona_DeliveryNombre || despachoEditZona?.nombre || '').toLowerCase();
                    if (distritoDetectado && despachoEditZona && (zonaActualId !== distritoDetectado.id && !zonaActualNom.includes(distritoDetectado.nombre.toLowerCase()))) {
                      return (
                        <div className="mt-2 p-2.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-center justify-between gap-2 animate-in fade-in">
                          <div className="flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                            <span className="text-[11px]">
                              La dirección menciona <strong>{distritoDetectado.nombre}</strong> pero la zona es <strong>{despachoEditZona.Zona_DeliveryNombre || despachoEditZona.nombre}</strong>.
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCambiarDistritoEditModal(distritoDetectado.id)}
                            className="shrink-0 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold transition cursor-pointer"
                          >
                            Corregir a {distritoDetectado.nombre}
                          </button>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>

                {/* Referencia */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Referencia de Entrega (Opcional)
                  </label>
                  <input
                    type="text"
                    value={despachoEditReferencia}
                    onChange={(e) => setDespachoEditReferencia(e.target.value)}
                    placeholder="Ej: Frente al parque, portón verde"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {/* Coordenadas GPS del Despacho Editado */}
                <div className="bg-white p-3 rounded-xl border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5 text-emerald-600" />
                      Coordenadas GPS de Entrega (Latitud / Longitud):
                    </span>
                    {despachoEditCoords && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${despachoEditCoords[1]},${despachoEditCoords[0]}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Ver en Google Maps
                      </a>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-500 font-medium mb-0.5">Latitud GPS:</label>
                      <input
                        type="number"
                        step="any"
                        value={despachoEditCoords ? despachoEditCoords[1] : ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) {
                            const newC = [despachoEditCoords ? despachoEditCoords[0] : TRUJILLO_CENTER[0], val];
                            setDespachoEditCoords(newC);
                            if (editDespachoCustomerMarkerRef.current) editDespachoCustomerMarkerRef.current.setLngLat(newC);
                            if (editDespachoMapRef.current) editDespachoMapRef.current.flyTo({ center: newC, zoom: 15 });
                            const z = detectarZonaPorCoordenadas(newC[0], newC[1]);
                            if (z) setDespachoEditZona(z);
                          }
                        }}
                        placeholder="Ej: -8.111816"
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 font-medium mb-0.5">Longitud GPS:</label>
                      <input
                        type="number"
                        step="any"
                        value={despachoEditCoords ? despachoEditCoords[0] : ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) {
                            const newC = [val, despachoEditCoords ? despachoEditCoords[1] : TRUJILLO_CENTER[1]];
                            setDespachoEditCoords(newC);
                            if (editDespachoCustomerMarkerRef.current) editDespachoCustomerMarkerRef.current.setLngLat(newC);
                            if (editDespachoMapRef.current) editDespachoMapRef.current.flyTo({ center: newC, zoom: 15 });
                            const z = detectarZonaPorCoordenadas(newC[0], newC[1]);
                            if (z) setDespachoEditZona(z);
                          }
                        }}
                        placeholder="Ej: -79.015388"
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    {despachoEditCoords
                      ? `📍 Coordenadas activas: ${despachoEditCoords[1]}, ${despachoEditCoords[0]} — Se actualizarán en la orden para guiar al repartidor.`
                      : 'Ubique el pin en el mapa para capturar las coordenadas.'}
                  </p>
                </div>

                {/* Desglose de Flete y Total proyectado */}
                <div className="bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200/60 text-xs flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-emerald-800 font-bold block">Flete de Delivery:</span>
                    <span className="text-emerald-900 font-semibold">
                      S/ {parseFloat(despachoEditZona?.Zona_DeliveryTarifa || despachoEditZona?.tarifa || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-emerald-800 font-bold block">Nuevo Total Estimado:</span>
                    <span className="text-base font-extrabold text-emerald-700">
                      S/ {(
                        parseFloat(ordenParaEditarDespacho.subtotal || (ordenParaEditarDespacho.total - (ordenParaEditarDespacho.costo_delivery || 0))) +
                        parseFloat(ordenParaEditarDespacho.igv || 0) +
                        parseFloat(despachoEditZona?.Zona_DeliveryTarifa || despachoEditZona?.tarifa || 0)
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Si es recojo en tienda, preview de ahorro */}
            {!despachoEditEsDelivery && (
              <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200/60 text-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-blue-800 font-bold block">Modalidad:</span>
                  <span className="text-blue-900 font-semibold">Recojo en Tienda Comercial Valencia</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-blue-800 font-bold block">Total Sin Flete:</span>
                  <span className="text-base font-extrabold text-blue-700">
                    S/ {(
                      parseFloat(ordenParaEditarDespacho.total || 0) - parseFloat(ordenParaEditarDespacho.costo_delivery || 0)
                    ).toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* Botones de acción */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowModalEditarDespacho(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isGuardandoDespacho}
                onClick={handleGuardarEditarDespacho}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isGuardandoDespacho ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Guardando cambios...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Guardar Cambios</span>
                  </>
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
            es_delivery: ticketOrden.es_delivery,
            direccion_entrega: ticketOrden.direccion_entrega,
            referencia_entrega: ticketOrden.referencia_entrega,
            zona_delivery: ticketOrden.zona_delivery?.nombre || ticketOrden.zona_delivery?.Zona_DeliveryNombre || (typeof ticketOrden.zona_delivery === 'string' ? ticketOrden.zona_delivery : null),
            fecha_entrega: ticketOrden.fecha_entrega,
          }}
          entidad={{
            nombre: ticketOrden.cliente?.nombre || ticketOrden.cliente?.ClienteNombre || 'CLIENTE GENERAL',
            ruc: ticketOrden.cliente?.dni_ruc || ticketOrden.cliente?.ClienteRuc || ticketOrden.cliente?.ClienteDni || '---',
            direccion: ticketOrden.cliente?.direccion || ticketOrden.cliente?.ClienteDireccion || '---',
            responsable: ticketOrden.usuario_creador || ticketOrden.usuario_registro_nombre || ticketOrden.auditoria?.usuario_creacion_nombre || ticketOrden.usuario?.nombre || ticketOrden.usuario_creacion || undefined,
            direccion_entrega: ticketOrden.direccion_entrega,
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
            subtotal: ticketOrden.subtotal != null ? ticketOrden.subtotal : (((ticketOrden.total || 0) - (ticketOrden.costo_delivery || 0)) / 1.18),
            igv: ticketOrden.igv != null ? ticketOrden.igv : undefined,
            costo_delivery: ticketOrden.costo_delivery != null ? ticketOrden.costo_delivery : 0,
            flete: ticketOrden.costo_delivery != null ? ticketOrden.costo_delivery : 0,
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
