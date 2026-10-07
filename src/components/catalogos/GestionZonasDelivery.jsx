import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Search,
  Plus,
  Edit2,
  Power,
  Eye,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Layers,
  X,
  Save,
  Check
} from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { api } from '../../services/api';
import StyledSelect from '../dashboard/filters/StyledSelect';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

// Centro por defecto: Trujillo, Perú
const TRUJILLO_CENTER = [-79.0287, -8.1116];

// Delimitación geográfica estricta: Solo provincia de Trujillo
const TRUJILLO_BOUNDS = [
  [-79.25, -8.28], // Suroeste [lng, lat]
  [-78.70, -7.90]  // Noreste [lng, lat]
];

export default function GestionZonasDelivery() {
  const [zonas, setZonas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('TODAS'); // 'TODAS' | 'S' | 'N'
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Modal para Crear / Editar Zona
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('crear'); // 'crear' | 'editar' | 'ver'
  const [selectedZona, setSelectedZona] = useState(null);

  // Campos de formulario
  const [formData, setFormData] = useState({
    nombre: '',
    tarifa: '10.00',
    estado: 'S',
    poligonoGeoJSON: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Referencias para Mapbox
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    cargarZonas();
  }, []);

  const cargarZonas = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.zonasDelivery.listar({ per_page: 100 });
      if (res && res.data) {
        // Manejar estructura de paginador o array directo
        const items = Array.isArray(res.data) ? res.data : (res.data.data || []);
        setZonas(items);
      }
    } catch (err) {
      console.error('Error cargando zonas de delivery:', err);
      setError('No se pudieron cargar las zonas de delivery. Verifica la conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEstado = async (zona) => {
    try {
      const nuevoEstado = zona.Zona_DeliveryEstado === 'S' ? 'N' : 'S';
      const res = await api.zonasDelivery.cambiarEstado(zona.Zona_DeliveryId, nuevoEstado);
      if (res && res.success) {
        setSuccessMsg(`Zona "${zona.Zona_DeliveryNombre}" ${nuevoEstado === 'S' ? 'activada' : 'desactivada'} correctamente.`);
        setTimeout(() => setSuccessMsg(null), 4000);
        cargarZonas();
      }
    } catch (err) {
      console.error('Error cambiando estado:', err);
      alert('Error al actualizar el estado de la zona.');
    }
  };

  const handleOpenCrear = () => {
    setModalMode('crear');
    setSelectedZona(null);
    // Polígono por defecto: cuadrilátero inicial en Trujillo
    const defaultPolygon = {
      type: 'Polygon',
      coordinates: [[
        [-79.035, -8.115],
        [-79.020, -8.115],
        [-79.020, -8.105],
        [-79.035, -8.105],
        [-79.035, -8.115]
      ]]
    };

    setFormData({
      nombre: '',
      tarifa: '10.00',
      estado: 'S',
      poligonoGeoJSON: JSON.stringify(defaultPolygon, null, 2)
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const handleOpenEditar = (zona, mode = 'editar') => {
    setModalMode(mode);
    setSelectedZona(zona);

    let rawGeo = zona.Zona_DeliveryPoligonoGeoJSON;
    let geoFormatted = '';
    try {
      if (typeof rawGeo === 'string') {
        geoFormatted = JSON.stringify(JSON.parse(rawGeo), null, 2);
      } else if (typeof rawGeo === 'object' && rawGeo !== null) {
        geoFormatted = JSON.stringify(rawGeo, null, 2);
      }
    } catch {
      geoFormatted = typeof rawGeo === 'string' ? rawGeo : '';
    }

    setFormData({
      nombre: zona.Zona_DeliveryNombre || '',
      tarifa: zona.Zona_DeliveryTarifa !== undefined ? String(zona.Zona_DeliveryTarifa) : '10.00',
      estado: zona.Zona_DeliveryEstado || 'S',
      poligonoGeoJSON: geoFormatted
    });
    setFormErrors({});
    setModalOpen(true);
  };

  // Inicializar o actualizar el mapa dentro del modal
  useEffect(() => {
    if (!modalOpen) {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      return;
    }

    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;

      mapboxgl.accessToken = MAPBOX_TOKEN;

      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: TRUJILLO_CENTER,
        zoom: 12,
        minZoom: 10,
        maxZoom: 18,
        maxBounds: TRUJILLO_BOUNDS
      });

      map.addControl(new mapboxgl.NavigationControl(), 'top-right');

      map.on('load', () => {
        mapRef.current = map;
        renderPolygonOnMap(map, formData.poligonoGeoJSON);
      });
    }, 150);

    return () => {
      clearTimeout(timer);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [modalOpen]);

  const renderPolygonOnMap = (mapInstance, geoJsonStr) => {
    if (!mapInstance) return;

    try {
      const parsedGeo = typeof geoJsonStr === 'string' ? JSON.parse(geoJsonStr) : geoJsonStr;
      if (!parsedGeo || parsedGeo.type !== 'Polygon') return;

      const sourceId = 'zona-source';
      const fillLayerId = 'zona-fill';
      const lineLayerId = 'zona-line';

      if (mapInstance.getSource(sourceId)) {
        mapInstance.getSource(sourceId).setData(parsedGeo);
      } else {
        mapInstance.addSource(sourceId, {
          type: 'geojson',
          data: parsedGeo
        });

        mapInstance.addLayer({
          id: fillLayerId,
          type: 'fill',
          source: sourceId,
          paint: {
            'fill-color': '#2563eb',
            'fill-opacity': 0.35
          }
        });

        mapInstance.addLayer({
          id: lineLayerId,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': '#1d4ed8',
            'line-width': 2.5
          }
        });
      }

      // Ajustar la vista a los límites del polígono
      const coords = parsedGeo.coordinates[0];
      if (coords && coords.length > 0) {
        const bounds = coords.reduce(
          (b, coord) => b.extend(coord),
          new mapboxgl.LngLatBounds(coords[0], coords[0])
        );
        mapInstance.fitBounds(bounds, { padding: 40, maxZoom: 14 });
      }
    } catch (e) {
      console.warn('GeoJSON no válido para previsualización en mapa:', e);
    }
  };

  const handleGeoJsonChange = (val) => {
    setFormData(prev => ({ ...prev, poligonoGeoJSON: val }));
    if (mapRef.current) {
      renderPolygonOnMap(mapRef.current, val);
    }
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    const errors = {};

    if (!formData.nombre.trim()) {
      errors.nombre = 'El nombre del distrito o zona es requerido.';
    }

    const numTarifa = parseFloat(formData.tarifa);
    if (isNaN(numTarifa) || numTarifa < 0) {
      errors.tarifa = 'La tarifa debe ser un número mayor o igual a 0.';
    }

    let parsedGeo = null;
    try {
      parsedGeo = JSON.parse(formData.poligonoGeoJSON);
      if (parsedGeo.type !== 'Polygon' || !Array.isArray(parsedGeo.coordinates)) {
        errors.poligonoGeoJSON = 'El GeoJSON debe ser de tipo "Polygon" con array de coordenadas.';
      }
    } catch {
      errors.poligonoGeoJSON = 'El texto ingresado no es un formato JSON válido.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSaving(true);
    setFormErrors({});

    try {
      const payload = {
        Zona_DeliveryNombre: formData.nombre.trim(),
        Zona_DeliveryTarifa: numTarifa,
        Zona_DeliveryPoligonoGeoJSON: JSON.stringify(parsedGeo),
        Zona_DeliveryEstado: formData.estado
      };

      if (modalMode === 'crear') {
        await api.zonasDelivery.crear(payload);
        setSuccessMsg(`Zona "${formData.nombre}" creada correctamente.`);
      } else {
        await api.zonasDelivery.actualizar(selectedZona.Zona_DeliveryId, payload);
        setSuccessMsg(`Zona "${formData.nombre}" actualizada con éxito.`);
      }

      setModalOpen(false);
      setTimeout(() => setSuccessMsg(null), 4000);
      cargarZonas();
    } catch (err) {
      console.error('Error guardando zona:', err);
      const errMsg = err?.data?.message || err?.message || 'Error al guardar la zona.';
      setFormErrors({ submit: errMsg });
    } finally {
      setSaving(false);
    }
  };

  // Filtrado de zonas
  const zonasFiltradas = zonas.filter(z => {
    const matchSearch = search.trim() === '' || 
      z.Zona_DeliveryNombre.toLowerCase().includes(search.toLowerCase()) ||
      z.Zona_DeliveryId.toLowerCase().includes(search.toLowerCase());
    const matchEstado = filterEstado === 'TODAS' || z.Zona_DeliveryEstado === filterEstado;
    return matchSearch && matchEstado;
  });

  const totalZonas = zonas.length;
  const activasCount = zonas.filter(z => z.Zona_DeliveryEstado === 'S').length;
  const inactivasCount = zonas.filter(z => z.Zona_DeliveryEstado === 'N').length;
  const tarifaPromedio = totalZonas > 0
    ? (zonas.reduce((acc, z) => acc + (parseFloat(z.Zona_DeliveryTarifa) || 0), 0) / totalZonas).toFixed(2)
    : '0.00';

  return (
    <div className="space-y-6">
      {/* Encabezado y estadísticas */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-slate-900">Zonas de Delivery Geográficas</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Gestión territorial de distritos de Trujillo con tarifas asignadas y polígonos Mapbox.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={cargarZonas}
            disabled={loading}
            className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg shadow-2xs hover:bg-slate-50 transition cursor-pointer"
            title="Recargar listado"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
          <button
            onClick={handleOpenCrear}
            className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Zona</span>
          </button>
        </div>
      </div>

      {/* Alerta de Éxito / Error */}
      {successMsg && (
        <div className="flex items-center gap-2.5 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2.5 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl shadow-2xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tarjetas de Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-medium text-slate-500">Total Distritos</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{totalZonas}</p>
          <span className="text-[11px] text-slate-400">Provincia de Trujillo</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-medium text-emerald-600">Zonas Activas</span>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{activasCount}</p>
          <span className="text-[11px] text-emerald-500">Habilitadas para delivery</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-medium text-amber-600">Zonas Inactivas</span>
          <p className="text-2xl font-bold text-amber-700 mt-1">{inactivasCount}</p>
          <span className="text-[11px] text-amber-500">Bloqueadas lógicamente</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-medium text-blue-600">Tarifa Promedio</span>
          <p className="text-2xl font-bold text-blue-700 mt-1">S/ {tarifaPromedio}</p>
          <span className="text-[11px] text-blue-400">Costo promedio de envío</span>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por distrito o código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          {['TODAS', 'S', 'N'].map((est) => (
            <button
              key={est}
              onClick={() => setFilterEstado(est)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                filterEstado === est
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-slate-600 hover:bg-slate-100 border border-transparent'
              }`}
            >
              {est === 'TODAS' ? 'Todas' : est === 'S' ? 'Activas' : 'Inactivas'}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla de Zonas */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-3 px-4">Código</th>
                <th className="py-3 px-4">Distrito / Zona</th>
                <th className="py-3 px-4 text-right">Tarifa Delivery</th>
                <th className="py-3 px-4 text-center">Polígono GeoJSON</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    <span>Cargando zonas de delivery...</span>
                  </td>
                </tr>
              ) : zonasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    <MapPin className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <span>No se encontraron zonas que coincidan con la búsqueda.</span>
                  </td>
                </tr>
              ) : (
                zonasFiltradas.map((zona) => {
                  const isActiva = zona.Zona_DeliveryEstado === 'S';
                  return (
                    <tr key={zona.Zona_DeliveryId} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 px-4 font-mono font-medium text-slate-600">
                        {zona.Zona_DeliveryId}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {zona.Zona_DeliveryNombre}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-900">
                        S/ {Number(zona.Zona_DeliveryTarifa || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                          <Layers className="w-3 h-3" />
                          <span>GeoJSON</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            isActiva
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isActiva ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          {isActiva ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                        <button
                          onClick={() => handleOpenEditar(zona, 'ver')}
                          className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition cursor-pointer"
                          title="Visualizar en mapa"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEditar(zona, 'editar')}
                          className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-md transition cursor-pointer"
                          title="Editar zona"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleEstado(zona)}
                          className={`p-1.5 rounded-md transition cursor-pointer ${
                            isActiva
                              ? 'text-slate-600 hover:text-rose-600 hover:bg-rose-50'
                              : 'text-slate-600 hover:text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={isActiva ? 'Desactivar zona' : 'Activar zona'}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Detalle / Edición / Creación con Mapa Mapbox */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Cabecera del Modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-100/70 text-blue-700 rounded-lg">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {modalMode === 'crear'
                      ? 'Registrar Nueva Zona de Delivery'
                      : modalMode === 'editar'
                      ? `Editar Zona: ${selectedZona?.Zona_DeliveryNombre}`
                      : `Visualización de Zona: ${selectedZona?.Zona_DeliveryNombre}`}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {modalMode === 'ver'
                      ? 'Inspección de polígono y tarifa en Trujillo'
                      : 'Configura las coordenadas GeoJSON y el costo de envío'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cuerpo del Modal: Grid Mapa + Formulario */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto">
              {/* Contenedor del Mapa Mapbox */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <span>Mapa de Delimitación Territorial (Mapbox)</span>
                </label>
                <div
                  ref={mapContainerRef}
                  className="w-full h-72 md:h-96 rounded-xl border border-slate-200 overflow-hidden shadow-inner bg-slate-100"
                />
                <span className="text-[11px] text-slate-400 italic">
                  El polígono azul representa la cobertura oficial para este distrito.
                </span>
              </div>

              {/* Formulario */}
              <form onSubmit={handleGuardar} className="flex flex-col justify-between gap-4">
                <div className="space-y-4">
                  {formErrors.submit && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
                      {formErrors.submit}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nombre del Distrito / Zona *
                    </label>
                    <input
                      type="text"
                      disabled={modalMode === 'ver'}
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      placeholder="Ej. Trujillo Centro, Víctor Larco Herrera..."
                      className={`w-full px-3 py-2 text-xs border rounded-lg focus:outline-hidden focus:ring-2 ${
                        formErrors.nombre
                          ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-500'
                          : 'border-slate-200 focus:ring-blue-500/20 focus:border-blue-500'
                      }`}
                    />
                    {formErrors.nombre && (
                      <p className="text-[11px] text-rose-500 mt-1">{formErrors.nombre}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Tarifa de Envío (S/) *
                      </label>
                      <div className="relative">
                        <DollarSign className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                        <input
                          type="number"
                          step="0.50"
                          min="0"
                          disabled={modalMode === 'ver'}
                          value={formData.tarifa}
                          onChange={(e) => setFormData({ ...formData, tarifa: e.target.value })}
                          className={`w-full pl-8 pr-3 py-2 text-xs border rounded-lg focus:outline-hidden focus:ring-2 ${
                            formErrors.tarifa
                              ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-500'
                              : 'border-slate-200 focus:ring-blue-500/20 focus:border-blue-500'
                          }`}
                        />
                      </div>
                      {formErrors.tarifa && (
                        <p className="text-[11px] text-rose-500 mt-1">{formErrors.tarifa}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Estado Operativo
                      </label>
                      <StyledSelect
                        size="form"
                        value={formData.estado}
                        onChange={(v) => setFormData({ ...formData, estado: v })}
                        options={[
                          { value: 'S', label: 'Activa (Habilitada)' },
                          { value: 'N', label: 'Inactiva (Bloqueada)' },
                        ]}
                        disabled={modalMode === 'ver'}
                        placeholder="Seleccionar estado..."
                        ariaLabel="Estado operativo de la zona"
                        panelWidth={240}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Coordenadas GeoJSON (Polígono) *
                    </label>
                    <textarea
                      rows={6}
                      disabled={modalMode === 'ver'}
                      value={formData.poligonoGeoJSON}
                      onChange={(e) => handleGeoJsonChange(e.target.value)}
                      placeholder='{ "type": "Polygon", "coordinates": [[[lng, lat], ...]] }'
                      className={`w-full font-mono text-[11px] p-2.5 border rounded-lg focus:outline-hidden focus:ring-2 ${
                        formErrors.poligonoGeoJSON
                          ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-500'
                          : 'border-slate-200 focus:ring-blue-500/20 focus:border-blue-500'
                      }`}
                    />
                    {formErrors.poligonoGeoJSON && (
                      <p className="text-[11px] text-rose-500 mt-1">{formErrors.poligonoGeoJSON}</p>
                    )}
                  </div>
                </div>

                {/* Acciones del pie */}
                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50 transition cursor-pointer"
                  >
                    Cerrar
                  </button>
                  {modalMode !== 'ver' && (
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-60"
                    >
                      {saving ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      <span>{saving ? 'Guardando...' : 'Guardar Zona'}</span>
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
