import React, { useState, useEffect } from 'react';
import {
  MapPin,
  PlusCircle,
  Search,
  Pencil,
  Trash2,
  RotateCcw,
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
  Compass,
  FileText,
  Warehouse
} from 'lucide-react';
import api from '../../services/api';
import { sileo } from 'sileo';
import StyledSelect from '../dashboard/filters/StyledSelect';

export default function GestionUbicaciones() {
  const [ubicaciones, setUbicaciones] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState('activos'); // 'activos' | 'inactivos' | 'eliminados'
  const [editingId, setEditingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Formulario
  const initialFormState = {
    producto_ubi_descripcion: '',
    producto_ubi_observacion: '',
    producto_ubi_estado: 'A',
  };
  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterTab, searchQuery]);

  const cargarDatos = async () => {
    setIsLoading(true);
    try {
      const res = await api.catalogos.ubicaciones({ todos: 1, per_page: 100 });
      if (res?.success && res?.data) {
        const lista = Array.isArray(res.data) ? res.data : res.data?.data || [];
        setUbicaciones(lista);
      }
    } catch (err) {
      console.error('Error al cargar ubicaciones:', err);
      sileo.error({
        title: 'Error al cargar',
        description: err.message || 'No se pudo conectar con el catálogo de ubicaciones.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData(initialFormState);
  };

  const handleStartEdit = (item) => {
    setEditingId(item.producto_ubi_id);
    setFormData({
      producto_ubi_descripcion: item.producto_ubi_descripcion || '',
      producto_ubi_observacion: item.producto_ubi_observacion || '',
      producto_ubi_estado: item.producto_ubi_estado || 'A',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.producto_ubi_descripcion.trim()) {
      sileo.warning({
        title: 'Campo obligatorio',
        description: 'Ingrese la descripción de la ubicación de almacén.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingId) {
        await sileo.promise(api.catalogos.actualizarUbicacion(editingId, formData), {
          loading: { title: 'Actualizando ubicación...' },
          success: () => {
            cargarDatos();
            handleCancelEdit();
            return { title: 'Ubicación de producto actualizada exitosamente.' };
          },
          error: (err) => ({
            title: 'Error al actualizar',
            description: err.message || 'No se pudo guardar los cambios en la ubicación.',
          }),
        });
      } else {
        await sileo.promise(api.catalogos.crearUbicacion(formData), {
          loading: { title: 'Registrando nueva ubicación...' },
          success: () => {
            cargarDatos();
            handleCancelEdit();
            return { title: 'Ubicación registrada exitosamente.' };
          },
          error: (err) => ({
            title: 'Error al crear',
            description: err.message || 'No se pudo registrar la ubicación.',
          }),
        });
      }
    } catch (err) {
      console.error('Error al guardar ubicación:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleEstado = async (item) => {
    const nuevoEstado = item.producto_ubi_estado === 'A' ? 'I' : 'A';
    const accion = nuevoEstado === 'A' ? 'activar' : 'desactivar';

    try {
      await sileo.promise(api.catalogos.cambiarEstadoUbicacion(item.producto_ubi_id, nuevoEstado), {
        loading: { title: `${accion === 'activar' ? 'Activando' : 'Desactivando'} ubicación...` },
        success: () => {
          cargarDatos();
          return { title: `Ubicación ${accion === 'activar' ? 'activada' : 'desactivada'} exitosamente.` };
        },
        error: (err) => ({
          title: 'Error al cambiar estado',
          description: err.message || `No se pudo ${accion} la ubicación.`,
        }),
      });
    } catch (err) {
      console.error('Error al cambiar estado:', err);
    }
  };

  const handleEliminar = async (item) => {
    if (!window.confirm(`¿Está seguro de enviar a baja lógica la ubicación "${item.producto_ubi_descripcion}"?`)) {
      return;
    }

    try {
      await sileo.promise(api.catalogos.eliminarUbicacion(item.producto_ubi_id), {
        loading: { title: 'Dando de baja ubicación...' },
        success: () => {
          cargarDatos();
          if (editingId === item.producto_ubi_id) handleCancelEdit();
          return { title: 'Ubicación dada de baja lógicamente.' };
        },
        error: (err) => ({
          title: 'Error al dar de baja',
          description: err.message || 'No se pudo eliminar lógicamente la ubicación.',
        }),
      });
    } catch (err) {
      console.error('Error al eliminar:', err);
    }
  };

  const handleRestaurar = async (item) => {
    try {
      await sileo.promise(api.catalogos.restaurarUbicacion(item.producto_ubi_id), {
        loading: { title: 'Restaurando ubicación...' },
        success: () => {
          cargarDatos();
          return { title: 'Ubicación restaurada exitosamente.' };
        },
        error: (err) => ({
          title: 'Error al restaurar',
          description: err.message || 'No se pudo restaurar la ubicación.',
        }),
      });
    } catch (err) {
      console.error('Error al restaurar:', err);
    }
  };

  // Filtrado de listas según pestañas y buscador
  const ubicacionesFiltradas = ubicaciones.filter((item) => {
    // 1. Filtro por pestaña
    if (filterTab === 'activos') {
      if (item.producto_ubi_Eliminado === 'S' || item.producto_ubi_estado !== 'A') return false;
    } else if (filterTab === 'inactivos') {
      if (item.producto_ubi_Eliminado === 'S' || item.producto_ubi_estado !== 'I') return false;
    } else if (filterTab === 'eliminados') {
      if (item.producto_ubi_Eliminado !== 'S') return false;
    }

    // 2. Filtro por búsqueda
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const idMatch = item.producto_ubi_id?.toLowerCase().includes(q);
    const descMatch = item.producto_ubi_descripcion?.toLowerCase().includes(q);
    const obsMatch = item.producto_ubi_observacion?.toLowerCase().includes(q);
    return idMatch || descMatch || obsMatch;
  });

  // Conteo de items para las pestañas
  const countActivos = ubicaciones.filter((i) => i.producto_ubi_Eliminado === 'N' && i.producto_ubi_estado === 'A').length;
  const countInactivos = ubicaciones.filter((i) => i.producto_ubi_Eliminado === 'N' && i.producto_ubi_estado === 'I').length;
  const countEliminados = ubicaciones.filter((i) => i.producto_ubi_Eliminado === 'S').length;

  // Paginación
  const totalPages = Math.ceil(ubicacionesFiltradas.length / itemsPerPage) || 1;
  const paginatedUbicaciones = ubicacionesFiltradas.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6">
      {/* Encabezado del Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/70 flex items-center justify-center text-blue-600 shrink-0">
            <Warehouse className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-slate-800 text-base font-bold tracking-tight">
              Gestión de Ubicaciones de Almacén (Productos_Ubi)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Administración de pasillos, estantes, niveles y zonas de almacenamiento físico.
            </p>
          </div>
        </div>
        <button
          onClick={cargarDatos}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition cursor-pointer disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* Grid de 2 Columnas: Formulario (Izquierda) + Directorio (Derecha) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Columna Izquierda: Formulario de Registro / Edición */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs sticky top-4">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
                {editingId ? <Pencil className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
              </div>
              <div>
                <h3 className="text-slate-800 text-sm font-bold">
                  {editingId ? 'Editar Ubicación' : 'Nueva Ubicación'}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {editingId ? `Modificando código: ${editingId}` : 'Complete los campos para registrar'}
                </p>
              </div>
            </div>
            {editingId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
                title="Cancelar edición"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Campo Código ID (solo en edición) */}
            {editingId && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Código Asignado
                </label>
                <input
                  type="text"
                  value={editingId}
                  disabled
                  className="w-full px-3.5 py-2.5 bg-slate-100/80 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 cursor-not-allowed"
                />
              </div>
            )}

            {/* Campo Descripción */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Descripción de Ubicación <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="producto_ubi_descripcion"
                  value={formData.producto_ubi_descripcion}
                  onChange={handleInputChange}
                  placeholder="Ej. Almacén Central - Estante A, Nivel 2"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition outline-none"
                  required
                />
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Indique zona, pasillo, estante o posición en almacén.
              </p>
            </div>

            {/* Campo Observación */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Observación / Referencia
              </label>
              <div className="relative">
                <textarea
                  name="producto_ubi_observacion"
                  value={formData.producto_ubi_observacion}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Ej. Productos secos, abarrotes de alta rotación, refrigerados..."
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition outline-none resize-none"
                />
                <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            {/* Campo Estado */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Estado Operativo
              </label>
              <StyledSelect
                size="form"
                value={formData.producto_ubi_estado}
                onChange={(v) => handleInputChange({ target: { name: 'producto_ubi_estado', value: v } })}
                options={[
                  { value: 'A', label: 'Activo (Disponible para asignar productos)' },
                  { value: 'I', label: 'Inactivo (Temporalmente fuera de servicio)' },
                ]}
                placeholder="Seleccionar estado..."
                ariaLabel="Estado operativo de la ubicación"
                panelWidth={240}
              />
            </div>

            {/* Botones de Acción */}
            <div className="pt-2 flex items-center gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow-md transition cursor-pointer disabled:opacity-50"
              >
                {editingId ? <Pencil className="w-3.5 h-3.5" /> : <PlusCircle className="w-3.5 h-3.5" />}
                <span>{editingId ? 'Guardar Cambios' : 'Registrar Ubicación'}</span>
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Columna Derecha: Directorio de Ubicaciones */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
          
          {/* Barra de Filtros: Pestañas + Buscador */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            {/* Pestañas */}
            <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setFilterTab('activos')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  filterTab === 'activos'
                    ? 'bg-white text-blue-600 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Activos</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-50 text-blue-600 font-bold">
                  {countActivos}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('inactivos')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  filterTab === 'inactivos'
                    ? 'bg-white text-slate-800 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Inactivos</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 font-bold">
                  {countInactivos}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('eliminados')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  filterTab === 'eliminados'
                    ? 'bg-white text-rose-600 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Bajas Lógicas</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-50 text-rose-600 font-bold">
                  {countEliminados}
                </span>
              </button>
            </div>

            {/* Buscador */}
            <div className="relative w-full sm:w-56">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar ubicación..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition outline-none"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Tabla de Ubicaciones */}
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-left text-xs text-slate-600 border-collapse">
              <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-400 font-bold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-3.5">Código</th>
                  <th className="py-3 px-3.5">Ubicación y Referencia</th>
                  <th className="py-3 px-3.5 text-center">Estado</th>
                  <th className="py-3 px-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" />
                      <span>Cargando ubicaciones...</span>
                    </td>
                  </tr>
                ) : paginatedUbicaciones.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-400">
                      <Compass className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="font-semibold text-slate-600">No se encontraron ubicaciones</p>
                      <p className="text-[11px] mt-0.5">
                        {searchQuery ? 'Pruebe con otro término de búsqueda' : 'No hay registros en esta sección'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedUbicaciones.map((ubi) => {
                    const isEliminado = ubi.producto_ubi_Eliminado === 'S';
                    const isActivo = ubi.producto_ubi_estado === 'A';

                    return (
                      <tr
                        key={ubi.producto_ubi_id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          editingId === ubi.producto_ubi_id ? 'bg-blue-50/40' : ''
                        }`}
                      >
                        {/* Código */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 font-mono">
                            {ubi.producto_ubi_id}
                          </span>
                        </td>

                        {/* Descripción y Observación */}
                        <td className="py-3 px-3.5">
                          <div className="font-semibold text-slate-800 leading-snug">
                            {ubi.producto_ubi_descripcion}
                          </div>
                          {ubi.producto_ubi_observacion && (
                            <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                              {ubi.producto_ubi_observacion}
                            </div>
                          )}
                        </td>

                        {/* Estado */}
                        <td className="py-3 px-3.5 text-center whitespace-nowrap">
                          {isEliminado ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200/60">
                              Baja Lógica
                            </span>
                          ) : isActivo ? (
                            <button
                              type="button"
                              onClick={() => handleToggleEstado(ubi)}
                              title="Clic para cambiar a Inactivo"
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/60 transition cursor-pointer"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              <span>Activo</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleEstado(ubi)}
                              title="Clic para cambiar a Activo"
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition cursor-pointer"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                              <span>Inactivo</span>
                            </button>
                          )}
                        </td>

                        {/* Acciones */}
                        <td className="py-3 px-3.5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            {!isEliminado ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(ubi)}
                                  className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition cursor-pointer"
                                  title="Editar ubicación"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleEliminar(ubi)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                                  title="Baja lógica"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleRestaurar(ubi)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-[11px] rounded-lg border border-blue-200/70 transition cursor-pointer"
                                title="Restaurar registro"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Restaurar</span>
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
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
              <span>
                Mostrando {(currentPage - 1) * itemsPerPage + 1} -{' '}
                {Math.min(currentPage * itemsPerPage, ubicacionesFiltradas.length)} de{' '}
                {ubicacionesFiltradas.length} registros
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2.5 py-1 font-semibold text-slate-700">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
