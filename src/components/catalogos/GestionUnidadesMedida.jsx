import React, { useState, useEffect } from 'react';
import {
  Scale,
  PlusCircle,
  Search,
  Pencil,
  Trash2,
  RotateCcw,
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Tag,
  Layers,
  CheckCircle2
} from 'lucide-react';
import api from '../../services/api';
import { sileo } from 'sileo';
import StyledSelect from '../dashboard/filters/StyledSelect';

export default function GestionUnidadesMedida() {
  const [unidades, setUnidades] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState('activos'); // 'activos' | 'inactivos' | 'eliminados'
  const [editingId, setEditingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Formulario
  const initialFormState = {
    unidades_medidaDescripcionUnidades: '',
    unidades_medidaAbreviatura: '',
    unidades_medidaEsBase: false,
    unidades_medidaEstadoUnidades: 'A',
  };
  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterTab, searchQuery]);

  const cargarDatos = async () => {
    setIsLoading(true);
    try {
      const res = await api.catalogos.unidadesMedida({ todos: 1, per_page: 100 });
      if (res?.success && res?.data) {
        const lista = Array.isArray(res.data) ? res.data : res.data?.data || [];
        setUnidades(lista);
      }
    } catch (err) {
      console.error('Error al cargar unidades de medida:', err);
      sileo.error({
        title: 'Error al cargar',
        description: err.message || 'No se pudo conectar con el catálogo de unidades de medida.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData(initialFormState);
  };

  const handleStartEdit = (item) => {
    setEditingId(item.unidades_medidaId);
    setFormData({
      unidades_medidaDescripcionUnidades: item.unidades_medidaDescripcionUnidades || '',
      unidades_medidaAbreviatura: item.unidades_medidaAbreviatura || '',
      unidades_medidaEsBase: Boolean(item.unidades_medidaEsBase),
      unidades_medidaEstadoUnidades: item.unidades_medidaEstadoUnidades || 'A',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.unidades_medidaDescripcionUnidades.trim()) {
      sileo.warning({
        title: 'Campo obligatorio',
        description: 'Ingrese la descripción de la unidad de medida.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingId) {
        await sileo.promise(api.catalogos.actualizarUnidadMedida(editingId, formData), {
          loading: { title: 'Actualizando unidad de medida...' },
          success: () => {
            cargarDatos();
            handleCancelEdit();
            return { title: 'Unidad de medida actualizada exitosamente.' };
          },
          error: (err) => ({
            title: 'Error al actualizar',
            description: err.message || 'No se pudo guardar los cambios.',
          }),
        });
      } else {
        await sileo.promise(api.catalogos.crearUnidadMedida(formData), {
          loading: { title: 'Registrando nueva unidad...' },
          success: () => {
            cargarDatos();
            handleCancelEdit();
            return { title: 'Unidad de medida registrada exitosamente.' };
          },
          error: (err) => ({
            title: 'Error al crear',
            description: err.message || 'No se pudo registrar la unidad de medida.',
          }),
        });
      }
    } catch (err) {
      console.error('Error al guardar unidad:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleEstado = async (item) => {
    const nuevoEstado = item.unidades_medidaEstadoUnidades === 'A' ? 'I' : 'A';
    const accion = nuevoEstado === 'A' ? 'activar' : 'desactivar';

    try {
      await sileo.promise(api.catalogos.cambiarEstadoUnidadMedida(item.unidades_medidaId, nuevoEstado), {
        loading: { title: `${accion === 'activar' ? 'Activando' : 'Desactivando'} unidad...` },
        success: () => {
          cargarDatos();
          return { title: `Unidad de medida ${accion === 'activar' ? 'activada' : 'desactivada'} exitosamente.` };
        },
        error: (err) => ({
          title: 'Error al cambiar estado',
          description: err.message || `No se pudo ${accion} la unidad de medida.`,
        }),
      });
    } catch (err) {
      console.error('Error al cambiar estado:', err);
    }
  };

  const handleEliminar = async (item) => {
    if (!window.confirm(`¿Está seguro de enviar a baja lógica la unidad "${item.unidades_medidaDescripcionUnidades}"?`)) {
      return;
    }

    try {
      await sileo.promise(api.catalogos.eliminarUnidadMedida(item.unidades_medidaId), {
        loading: { title: 'Dando de baja unidad...' },
        success: () => {
          cargarDatos();
          if (editingId === item.unidades_medidaId) handleCancelEdit();
          return { title: 'Unidad de medida dada de baja lógicamente.' };
        },
        error: (err) => ({
          title: 'Error al dar de baja',
          description: err.message || 'No se pudo eliminar lógicamente la unidad.',
        }),
      });
    } catch (err) {
      console.error('Error al eliminar:', err);
    }
  };

  const handleRestaurar = async (item) => {
    try {
      await sileo.promise(api.catalogos.restaurarUnidadMedida(item.unidades_medidaId), {
        loading: { title: 'Restaurando unidad de medida...' },
        success: () => {
          cargarDatos();
          return { title: 'Unidad de medida restaurada exitosamente.' };
        },
        error: (err) => ({
          title: 'Error al restaurar',
          description: err.message || 'No se pudo restaurar la unidad de medida.',
        }),
      });
    } catch (err) {
      console.error('Error al restaurar:', err);
    }
  };

  // Filtrado de listas
  const unidadesFiltradas = unidades.filter((item) => {
    if (filterTab === 'activos') {
      if (item.unidades_medidaEliminado === 'S' || item.unidades_medidaEstadoUnidades !== 'A') return false;
    } else if (filterTab === 'inactivos') {
      if (item.unidades_medidaEliminado === 'S' || item.unidades_medidaEstadoUnidades !== 'I') return false;
    } else if (filterTab === 'eliminados') {
      if (item.unidades_medidaEliminado !== 'S') return false;
    }

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const idMatch = item.unidades_medidaId?.toLowerCase().includes(q);
    const descMatch = item.unidades_medidaDescripcionUnidades?.toLowerCase().includes(q);
    const abrevMatch = item.unidades_medidaAbreviatura?.toLowerCase().includes(q);
    return idMatch || descMatch || abrevMatch;
  });

  const countActivos = unidades.filter((i) => i.unidades_medidaEliminado === 'N' && i.unidades_medidaEstadoUnidades === 'A').length;
  const countInactivos = unidades.filter((i) => i.unidades_medidaEliminado === 'N' && i.unidades_medidaEstadoUnidades === 'I').length;
  const countEliminados = unidades.filter((i) => i.unidades_medidaEliminado === 'S').length;

  const totalPages = Math.ceil(unidadesFiltradas.length / itemsPerPage) || 1;
  const paginatedUnidades = unidadesFiltradas.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6">
      {/* Encabezado del Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200/70 flex items-center justify-center text-indigo-600 shrink-0">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-slate-800 text-base font-bold tracking-tight">
              Gestión de Unidades de Medida (Unidades_Medida)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Definición de unidades base del inventario, presentaciones comerciales y abreviaturas.
            </p>
          </div>
        </div>
        <button
          onClick={cargarDatos}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition cursor-pointer disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* Grid de 2 Columnas: Formulario (Izquierda) + Directorio (Derecha) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Columna Izquierda: Formulario de Registro / Edición */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs sticky top-4">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
                {editingId ? <Pencil className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
              </div>
              <div>
                <h3 className="text-slate-800 text-sm font-bold">
                  {editingId ? 'Editar Unidad de Medida' : 'Nueva Unidad de Medida'}
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
                Descripción de la Unidad <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="unidades_medidaDescripcionUnidades"
                  value={formData.unidades_medidaDescripcionUnidades}
                  onChange={handleInputChange}
                  placeholder="Ej. Docena (DOC - 12 UND) o Kilogramo (KG)"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition outline-none"
                  required
                />
                <Scale className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Nombre descriptivo completo de la unidad o presentación.
              </p>
            </div>

            {/* Campo Abreviatura */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Abreviatura Comercial
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="unidades_medidaAbreviatura"
                  value={formData.unidades_medidaAbreviatura}
                  onChange={handleInputChange}
                  placeholder="Ej. UND, DOC, KG, CJ24..."
                  maxLength={10}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition outline-none uppercase font-mono"
                />
                <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Abreviatura corta utilizada en comprobantes (máx. 10 car.).
              </p>
            </div>

            {/* Checkbox: ¿Es Unidad Base? */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="unidades_medidaEsBase"
                  checked={formData.unidades_medidaEsBase}
                  onChange={handleInputChange}
                  className="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span>Unidad Base del Sistema</span>
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    Marque esta casilla si esta unidad sirve como referencia física mínima (Factor = 1) para el control del inventario (ej. Unidad, Litro, Kilo).
                  </p>
                </div>
              </label>
            </div>

            {/* Campo Estado */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Estado Operativo
              </label>
              <StyledSelect
                size="form"
                value={formData.unidades_medidaEstadoUnidades}
                onChange={(v) => handleInputChange({ target: { name: 'unidades_medidaEstadoUnidades', value: v } })}
                options={[
                  { value: 'A', label: 'Activo (Disponible para asignar a productos)' },
                  { value: 'I', label: 'Inactivo (No seleccionable en nuevos productos)' },
                ]}
                placeholder="Seleccionar estado..."
                ariaLabel="Estado operativo de la unidad de medida"
                panelWidth={240}
              />
            </div>

            {/* Botones de Acción */}
            <div className="pt-2 flex items-center gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow-md transition cursor-pointer disabled:opacity-50"
              >
                {editingId ? <Pencil className="w-3.5 h-3.5" /> : <PlusCircle className="w-3.5 h-3.5" />}
                <span>{editingId ? 'Guardar Cambios' : 'Registrar Unidad'}</span>
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

        {/* Columna Derecha: Directorio de Unidades */}
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
                    ? 'bg-white text-indigo-600 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Activos</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-50 text-indigo-600 font-bold">
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
                placeholder="Buscar unidad o abrev..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 transition outline-none"
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

          {/* Tabla de Unidades de Medida */}
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-left text-xs text-slate-600 border-collapse">
              <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-400 font-bold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-3.5">Código</th>
                  <th className="py-3 px-3.5">Descripción y Abrev.</th>
                  <th className="py-3 px-3.5 text-center">Tipo</th>
                  <th className="py-3 px-3.5 text-center">Estado</th>
                  <th className="py-3 px-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
                      <span>Cargando unidades de medida...</span>
                    </td>
                  </tr>
                ) : paginatedUnidades.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      <Scale className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="font-semibold text-slate-600">No se encontraron unidades de medida</p>
                      <p className="text-[11px] mt-0.5">
                        {searchQuery ? 'Pruebe con otro término de búsqueda' : 'No hay registros en esta sección'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedUnidades.map((u) => {
                    const isEliminado = u.unidades_medidaEliminado === 'S';
                    const isActivo = u.unidades_medidaEstadoUnidades === 'A';
                    const isBase = Boolean(u.unidades_medidaEsBase);

                    return (
                      <tr
                        key={u.unidades_medidaId}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          editingId === u.unidades_medidaId ? 'bg-indigo-50/40' : ''
                        }`}
                      >
                        {/* Código */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 font-mono">
                            {u.unidades_medidaId}
                          </span>
                        </td>

                        {/* Descripción y Abreviatura */}
                        <td className="py-3 px-3.5">
                          <div className="font-semibold text-slate-800 leading-snug flex items-center gap-1.5">
                            <span>{u.unidades_medidaDescripcionUnidades}</span>
                            {u.unidades_medidaAbreviatura && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                                {u.unidades_medidaAbreviatura}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Tipo de Unidad: Base vs Presentación */}
                        <td className="py-3 px-3.5 text-center whitespace-nowrap">
                          {isBase ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/70">
                              <Sparkles className="w-3 h-3 text-amber-500" />
                              <span>Unidad Base</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-50 text-slate-500 border border-slate-200/60">
                              <span>Presentación</span>
                            </span>
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
                              onClick={() => handleToggleEstado(u)}
                              title="Clic para cambiar a Inactivo"
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/60 transition cursor-pointer"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              <span>Activo</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleEstado(u)}
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
                                  onClick={() => handleStartEdit(u)}
                                  className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition cursor-pointer"
                                  title="Editar unidad de medida"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleEliminar(u)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                                  title="Baja lógica"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleRestaurar(u)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-[11px] rounded-lg border border-indigo-200/70 transition cursor-pointer"
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
                {Math.min(currentPage * itemsPerPage, unidadesFiltradas.length)} de{' '}
                {unidadesFiltradas.length} registros
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
