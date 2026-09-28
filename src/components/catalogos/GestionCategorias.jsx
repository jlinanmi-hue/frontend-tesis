import React, { useState, useEffect } from 'react';
import {
  Tag,
  PlusCircle,
  Search,
  Pencil,
  Trash2,
  RotateCcw,
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  FolderTree
} from 'lucide-react';
import api from '../../services/api';
import { sileo } from 'sileo';

export default function GestionCategorias() {
  const [categorias, setCategorias] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState('activos'); // 'activos' | 'eliminados'
  const [editingId, setEditingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Formulario
  const initialFormState = {
    Categoria_ProductoDescripcion_categoria: '',
    Categoria_ProductoEstado: 'A',
  };
  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterTab, searchQuery]);

  const cargarDatos = async () => {
    setIsLoading(true);
    try {
      const res = await api.catalogos.categorias({ todos: 1, per_page: 100 });
      if (res?.success && res?.data) {
        const lista = Array.isArray(res.data) ? res.data : res.data?.data || [];
        setCategorias(lista);
      }
    } catch (err) {
      console.error('Error al cargar categorías:', err);
      sileo.error({
        title: 'Error al cargar',
        description: err.message || 'No se pudo conectar con el catálogo de categorías.',
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

  const handleStartEdit = (cat) => {
    setEditingId(cat.Categoria_ProductoId);
    setFormData({
      Categoria_ProductoDescripcion_categoria: cat.Categoria_ProductoDescripcion_categoria || '',
      Categoria_ProductoEstado: cat.Categoria_ProductoEstado || 'A',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.Categoria_ProductoDescripcion_categoria.trim()) {
      sileo.warning({
        title: 'Campo obligatorio',
        description: 'Ingrese la descripción de la categoría.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingId) {
        await sileo.promise(api.catalogos.actualizarCategoria(editingId, formData), {
          loading: { title: 'Actualizando categoría...' },
          success: () => {
            cargarDatos();
            handleCancelEdit();
            return { title: 'Categoría actualizada exitosamente.' };
          },
          error: (err) => ({
            title: 'Error al actualizar',
            description: err.data?.message || err.message,
          }),
        });
      } else {
        await sileo.promise(api.catalogos.crearCategoria(formData), {
          loading: { title: 'Registrando categoría...' },
          success: () => {
            cargarDatos();
            handleCancelEdit();
            return { title: 'Categoría creada exitosamente.' };
          },
          error: (err) => ({
            title: 'Error al crear',
            description: err.data?.message || err.message,
          }),
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangeEstado = async (cat, nuevoEstado) => {
    try {
      await sileo.promise(api.catalogos.cambiarEstadoCategoria(cat.Categoria_ProductoId, nuevoEstado), {
        loading: { title: 'Cambiando estado...' },
        success: () => {
          cargarDatos();
          return { title: `Categoría marcada como ${nuevoEstado === 'A' ? 'Activa' : 'Inactiva'}.` };
        },
        error: (err) => ({ title: 'Error al cambiar estado', description: err.message }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (cat) => {
    if (!window.confirm(`¿Confirmas la baja lógica de la categoría "${cat.Categoria_ProductoDescripcion_categoria}"? Podrás restaurarla en cualquier momento desde la pestaña "Eliminadas".`)) {
      return;
    }
    try {
      await sileo.promise(api.catalogos.eliminarCategoria(cat.Categoria_ProductoId), {
        loading: {
          title: 'Procesando baja lógica...',
          description: `Desactivando categoría en el servidor`,
        },
        success: () => {
          cargarDatos();
          return {
            title: 'Baja lógica procesada',
            description: `La categoría ${cat.Categoria_ProductoDescripcion_categoria} fue marcada como eliminada en la base de datos.`,
          };
        },
        error: (err) => ({ title: 'Error al eliminar', description: err.message }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleRestore = async (cat) => {
    try {
      await sileo.promise(api.catalogos.restaurarCategoria(cat.Categoria_ProductoId), {
        loading: { title: 'Restaurando categoría...' },
        success: () => {
          cargarDatos();
          return { title: 'Categoría restaurada exitosamente.' };
        },
        error: (err) => ({ title: 'Error al restaurar', description: err.message }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Conteo
  const countActivos = categorias.filter((c) => c.Categoria_ProductoEliminado !== 'S').length;
  const countEliminados = categorias.filter((c) => c.Categoria_ProductoEliminado === 'S').length;

  // Filtrado
  const categoriasFiltradas = categorias.filter((cat) => {
    const isEliminado = cat.Categoria_ProductoEliminado === 'S';
    if (filterTab === 'activos' && isEliminado) return false;
    if (filterTab === 'eliminados' && !isEliminado) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (cat.Categoria_ProductoDescripcion_categoria || '').toLowerCase().includes(q) ||
      (cat.Categoria_ProductoId || '').toLowerCase().includes(q)
    );
  });

  // Paginación a 5
  const ITEMS_PER_PAGE = 5;
  const totalItems = categoriasFiltradas.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedItems = categoriasFiltradas.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="space-y-7">
      
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2.5">
            <FolderTree className="w-7 h-7 text-blue-600" />
            <span>Categorías de Productos</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Gestión de familias y agrupaciones de productos del inventario.
          </p>
        </div>
        <button
          onClick={cargarDatos}
          disabled={isLoading}
          className="self-start sm:self-auto flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
          <span>Actualizar Lista</span>
        </button>
      </div>

      {/* Grid: Formulario a la Izquierda | Directorio a la Derecha */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
        
        {/* Formulario */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-xs p-7">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-600 shadow-2xs">
                {editingId ? <Pencil className="w-4 h-4" /> : <PlusCircle className="w-4.5 h-4.5" />}
              </div>
              <h2 className="text-base font-bold text-slate-800 tracking-tight">
                {editingId ? 'Modificar Categoría' : 'Nueva Categoría'}
              </h2>
            </div>
            {editingId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 px-2.5 py-1 rounded-lg bg-slate-100 transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancelar</span>
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Descripción de la Categoría *
              </label>
              <input
                type="text"
                name="Categoria_ProductoDescripcion_categoria"
                value={formData.Categoria_ProductoDescripcion_categoria}
                onChange={handleInputChange}
                placeholder="Ej. Bebidas, Abarrotes, Papelería..."
                required
                className="w-full h-11 px-3.5 text-sm bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Estado Inicial
              </label>
              <select
                name="Categoria_ProductoEstado"
                value={formData.Categoria_ProductoEstado}
                onChange={handleInputChange}
                className="w-full h-11 px-3.5 text-sm bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer"
              >
                <option value="A">Activo (Disponible en inventario)</option>
                <option value="I">Inactivo</option>
              </select>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 bg-[#0b132b] hover:bg-[#1a2542] text-white font-semibold px-4 rounded-xl text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-70"
              >
                {isSubmitting ? (
                  <span>Guardando...</span>
                ) : (
                  <span>{editingId ? 'Actualizar Categoría' : 'Guardar Categoría'}</span>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Directorio */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-xs p-7">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-2.5">
              <Tag className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-bold text-slate-800 tracking-tight">
                Listado de Categorías
              </h2>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar categoría..."
                className="w-full h-10 pl-9 pr-3.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
            </div>
          </div>

          {/* Filtros */}
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
            <button
              onClick={() => setFilterTab('activos')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                filterTab === 'activos'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <span>Activas</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                filterTab === 'activos' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-800'
              }`}>
                {countActivos}
              </span>
            </button>

            <button
              onClick={() => setFilterTab('eliminados')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                filterTab === 'eliminados'
                  ? 'bg-rose-600 text-white shadow-sm shadow-rose-500/25'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Eliminadas</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                filterTab === 'eliminados' ? 'bg-rose-700 text-white' : 'bg-slate-200 text-slate-800'
              }`}>
                {countEliminados}
              </span>
            </button>
          </div>

          {/* Tabla */}
          <div className="overflow-x-auto pt-2">
            {isLoading ? (
              <div className="py-14 flex flex-col items-center justify-center text-slate-400 gap-2.5">
                <RefreshCw className="w-7 h-7 animate-spin text-blue-600" />
                <span className="text-sm font-medium">Cargando categorías...</span>
              </div>
            ) : paginatedItems.length === 0 ? (
              <div className="py-14 text-center text-slate-400">
                <FolderTree className="w-12 h-12 mx-auto text-slate-300 mb-2.5" />
                <p className="text-sm font-medium">No se encontraron categorías registradas.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Código</th>
                    <th className="py-3.5 px-4">Descripción</th>
                    <th className="py-3.5 px-4">Estado</th>
                    <th className="py-3.5 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                  {paginatedItems.map((cat) => {
                    const isEliminado = cat.Categoria_ProductoEliminado === 'S';
                    return (
                      <tr key={cat.Categoria_ProductoId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-4 font-mono font-semibold text-blue-600 text-xs">
                          {cat.Categoria_ProductoId}
                        </td>
                        <td className="py-4 px-4 font-semibold text-slate-800">
                          {cat.Categoria_ProductoDescripcion_categoria}
                        </td>
                        <td className="py-4 px-4">
                          {isEliminado ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              ELIMINADO
                            </span>
                          ) : cat.Categoria_ProductoEstado === 'A' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              ACTIVO
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              INACTIVO
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="inline-flex items-center justify-end gap-2">
                            {!isEliminado && (
                              <>
                                <button
                                  onClick={() => handleStartEdit(cat)}
                                  className="flex items-center gap-1 px-3 py-1.5 text-slate-700 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 rounded-lg text-xs font-semibold transition cursor-pointer"
                                  title="Editar"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                  <span>Editar</span>
                                </button>
                                <button
                                  onClick={() => handleDelete(cat)}
                                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                  title="Eliminar"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            {isEliminado && (
                              <button
                                onClick={() => handleRestore(cat)}
                                className="flex items-center gap-1 px-3 py-1.5 text-emerald-700 hover:bg-emerald-50 border border-emerald-300 rounded-lg text-xs font-semibold transition cursor-pointer"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Restaurar</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Paginación a 5 */}
          {!isLoading && totalItems > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-5 mt-3 border-t border-slate-100 text-xs text-slate-500">
              <div>
                <span>Mostrando </span>
                <span className="font-semibold text-slate-800">{startIndex + 1}</span>
                <span> a </span>
                <span className="font-semibold text-slate-800">{Math.min(startIndex + ITEMS_PER_PAGE, totalItems)}</span>
                <span> de </span>
                <span className="font-semibold text-slate-800">{totalItems}</span>
                <span> categorías</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition text-xs font-semibold cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Anterior</span>
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                    <button
                      key={num}
                      onClick={() => setCurrentPage(num)}
                      className={`w-8 h-8 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center ${
                        currentPage === num
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition text-xs font-semibold cursor-pointer"
                >
                  <span>Siguiente</span>
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
