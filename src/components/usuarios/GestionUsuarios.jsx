import { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Pencil,
  Trash2,
  RotateCcw,
  Phone,
  Mail,
  Palmtree,
  FileBadge,
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import api from '../../services/api';
import { sileo } from 'sileo';

export default function GestionUsuarios() {
  const [empleados, setEmpleados] = useState([]);
  const [cargos, setCargos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState('activos'); // 'activos' | 'vacaciones' | 'licencias' | 'eliminados'
  const [editingId, setEditingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Reiniciar a la página 1 cuando cambia el filtro o la búsqueda
  useEffect(() => {
    setCurrentPage(1);
  }, [filterTab, searchQuery]);


  const initialFormState = {
    EmpleadoNombres: '',
    EmpleadoApellidos: '',
    EmpleadoDni: '',
    EmpleadoTelefono: '',
    EmpleadoCorreo: '',
    EmpleadoSexo: 'M',
    Empleado_cargoId: '',
    EmpleadoFechaIngreso: new Date().toISOString().split('T')[0],
    EmpleadoEstado: 'A',
  };

  const [formData, setFormData] = useState(initialFormState);

  // Cargar lista de empleados y cargos desde el Backend
  const cargarDatos = async () => {
    setIsLoading(true);
    try {
      const [resPersonal, resCargos] = await Promise.all([
        api.personal.listar({ todos: 1, per_page: 100 }),
        api.personal.cargos(),
      ]);

      if (resPersonal?.success && resPersonal?.data) {
        const lista = Array.isArray(resPersonal.data)
          ? resPersonal.data
          : resPersonal.data?.data || [];
        setEmpleados(lista);
      }

      if (resCargos?.success && resCargos?.data) {
        setCargos(resCargos.data);
        if (!formData.Empleado_cargoId && resCargos.data.length > 0) {
          setFormData((prev) => ({
            ...prev,
            Empleado_cargoId: resCargos.data[0].cargoId,
          }));
        }
      }
    } catch (err) {
      console.error('Error al cargar datos:', err);
      sileo.error({
        title: 'Error de conexión',
        description: err.message || 'No se pudo conectar con el backend de personal.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // Manejador de cambios en el formulario
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Limpiar formulario y salir de edición
  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({
      ...initialFormState,
      Empleado_cargoId: cargos[0]?.cargoId || '',
    });
  };

  // Cargar datos en formulario para editar
  const handleStartEdit = (emp) => {
    setEditingId(emp.EmpleadoId);
    setFormData({
      EmpleadoNombres: emp.EmpleadoNombres || '',
      EmpleadoApellidos: emp.EmpleadoApellidos || '',
      EmpleadoDni: emp.EmpleadoDni || '',
      EmpleadoTelefono: emp.EmpleadoTelefono || '',
      EmpleadoCorreo: emp.EmpleadoCorreo || '',
      EmpleadoSexo: emp.EmpleadoSexo || 'M',
      Empleado_cargoId: emp.Empleado_cargoId || emp.cargo?.cargoId || '',
      EmpleadoFechaIngreso: emp.EmpleadoFechaIngreso || initialFormState.EmpleadoFechaIngreso,
      EmpleadoEstado: emp.EmpleadoEstado || 'A',
    });

    sileo.info({
      title: 'Modo edición activado',
      description: `Editando datos de ${emp.EmpleadoNombres} ${emp.EmpleadoApellidos}`,
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Envío del formulario (Crear o Actualizar)
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.EmpleadoNombres.trim() || !formData.EmpleadoApellidos.trim()) {
      sileo.warning({
        title: 'Datos requeridos',
        description: 'Ingrese los nombres y apellidos del empleado.',
      });
      return;
    }

    if (!formData.EmpleadoDni.trim() || formData.EmpleadoDni.trim().length !== 8) {
      sileo.warning({
        title: 'DNI inválido',
        description: 'El DNI debe contener exactamente 8 dígitos numéricos.',
      });
      return;
    }

    if (!formData.EmpleadoCorreo.trim()) {
      sileo.warning({
        title: 'Correo obligatorio',
        description: 'Ingrese el correo electrónico del empleado.',
      });
      return;
    }

    if (!formData.Empleado_cargoId) {
      sileo.warning({
        title: 'Cargo requerido',
        description: 'Seleccione un cargo para el empleado.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingId) {
        await sileo.promise(api.personal.actualizar(editingId, formData), {
          loading: {
            title: 'Actualizando empleado...',
            description: 'Guardando modificaciones en el servidor',
          },
          success: () => {
            cargarDatos();
            handleCancelEdit();
            return {
              title: 'Empleado actualizado',
              description: 'Los cambios fueron guardados exitosamente.',
            };
          },
          error: (err) => ({
            title: 'Error al actualizar',
            description: err.data?.message || err.message || 'No se pudo guardar la modificación.',
          }),
        });
      } else {
        await sileo.promise(api.personal.crear(formData), {
          loading: {
            title: 'Registrando empleado...',
            description: 'Enviando datos al sistema',
          },
          success: () => {
            cargarDatos();
            handleCancelEdit();
            return {
              title: '¡Registro exitoso!',
              description: `${formData.EmpleadoNombres} ha sido incorporado al personal.`,
            };
          },
          error: (err) => ({
            title: 'Error en el registro',
            description: err.data?.message || err.message || 'Verifique los datos ingresados.',
          }),
        });
      }
    } catch (err) {
      console.error('Error al procesar formulario:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cambio rápido de estado laboral en backend
  const handleChangeEstado = async (emp, nuevoEstado) => {
    const estadosTexto = {
      A: 'Activo',
      V: 'Vacaciones',
      L: 'Licencia',
      I: 'Inactivo',
    };

    try {
      await sileo.promise(api.personal.cambiarEstado(emp.EmpleadoId, nuevoEstado), {
        loading: {
          title: 'Cambiando estado...',
          description: `Asignando estado ${estadosTexto[nuevoEstado]} a ${emp.EmpleadoNombres}`,
        },
        success: () => {
          cargarDatos();
          return {
            title: 'Estado actualizado',
            description: `${emp.EmpleadoNombres} ahora figura en: ${estadosTexto[nuevoEstado]}.`,
          };
        },
        error: (err) => ({
          title: 'Error al cambiar estado',
          description: err.data?.message || err.message,
        }),
      });
    } catch (err) {
      console.error('Error en cambio de estado:', err);
    }
  };

  // Eliminar empleado (Baja lógica en Backend Laravel)
  const handleDelete = async (emp) => {
    if (!window.confirm(`¿Confirmas la baja lógica del empleado ${emp.EmpleadoNombres} ${emp.EmpleadoApellidos}? Podrás restaurarlo en cualquier momento desde la pestaña "Eliminados".`)) {
      return;
    }

    try {
      await sileo.promise(api.personal.eliminar(emp.EmpleadoId), {
        loading: {
          title: 'Procesando baja lógica...',
          description: `Desactivando registro de ${emp.EmpleadoNombres} en el servidor`,
        },
        success: () => {
          cargarDatos();
          return {
            title: 'Baja lógica completada',
            description: `${emp.EmpleadoNombres} fue marcado como eliminado en la base de datos.`,
          };
        },
        error: (err) => ({
          title: 'Error al procesar baja',
          description: err.data?.message || err.message,
        }),
      });
    } catch (err) {
      console.error('Error al eliminar empleado:', err);
    }
  };

  // Restaurar empleado eliminado (Backend restore)
  const handleRestore = async (emp) => {
    try {
      await sileo.promise(api.personal.restaurar(emp.EmpleadoId), {
        loading: {
          title: 'Restaurando empleado...',
          description: 'Reintegrando al personal activo en la base de datos',
        },
        success: () => {
          cargarDatos();
          return {
            title: 'Empleado restaurado',
            description: `${emp.EmpleadoNombres} vuelve a estar activo en el directorio.`,
          };
        },
        error: (err) => ({
          title: 'Error al restaurar',
          description: err.data?.message || err.message,
        }),
      });
    } catch (err) {
      console.error('Error al restaurar empleado:', err);
    }
  };

  // Conteo para las pestañas de filtro
  const countActivos = empleados.filter(
    (e) => e.EmpleadoEliminado !== 'S' && (e.EmpleadoEstado === 'A' || !e.EmpleadoEstado)
  ).length;

  const countVacaciones = empleados.filter(
    (e) => e.EmpleadoEliminado !== 'S' && e.EmpleadoEstado === 'V'
  ).length;

  const countLicencias = empleados.filter(
    (e) => e.EmpleadoEliminado !== 'S' && e.EmpleadoEstado === 'L'
  ).length;

  const countEliminados = empleados.filter(
    (e) => e.EmpleadoEliminado === 'S' || e.EmpleadoEstado === 'I'
  ).length;

  // Filtrado según pestaña activa y buscador
  const empleadosFiltrados = empleados.filter((emp) => {
    const isEliminado = emp.EmpleadoEliminado === 'S' || emp.EmpleadoEstado === 'I';

    if (filterTab === 'activos') {
      if (isEliminado || (emp.EmpleadoEstado && emp.EmpleadoEstado !== 'A')) return false;
    } else if (filterTab === 'vacaciones') {
      if (isEliminado || emp.EmpleadoEstado !== 'V') return false;
    } else if (filterTab === 'licencias') {
      if (isEliminado || emp.EmpleadoEstado !== 'L') return false;
    } else if (filterTab === 'eliminados') {
      if (!isEliminado) return false;
    }

    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const nombreCompleto = `${emp.EmpleadoNombres || ''} ${emp.EmpleadoApellidos || ''}`.toLowerCase();
    const dni = (emp.EmpleadoDni || '').toLowerCase();
    const cargo = (emp.cargo?.cargoDescripcion || '').toLowerCase();
    const correo = (emp.EmpleadoCorreo || '').toLowerCase();

    return (
      nombreCompleto.includes(query) ||
      dni.includes(query) ||
      cargo.includes(query) ||
      correo.includes(query)
    );
  });

  // Lógica de Paginación (Máximo 5 resultados por página)
  const ITEMS_PER_PAGE = 5;
  const totalItems = empleadosFiltrados.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedEmpleados = empleadosFiltrados.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="space-y-7">
      
      {/* Encabezado del Módulo (Grande, nítido y espacioso como en la referencia) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            Registro y Gestión de Personal
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Administra altas, modificaciones y estados laborales de los empleados en tiempo real.
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

      {/* Grid Principal: Formulario a la Izquierda | Directorio a la Derecha */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
        
        {/* ============================================================ */}
        {/* CONTENEDOR IZQUIERDO: Formulario de Registro / Modificación  */}
        {/* ============================================================ */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-xs p-7">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-600 shadow-2xs">
                {editingId ? <Pencil className="w-4 h-4" /> : <UserPlus className="w-4.5 h-4.5" />}
              </div>
              <h2 className="text-base font-bold text-slate-800 tracking-tight">
                {editingId ? 'Modificar Empleado' : 'Registro de Empleado'}
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
            
            {/* Nombres y Apellidos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nombres *
                </label>
                <input
                  type="text"
                  name="EmpleadoNombres"
                  value={formData.EmpleadoNombres}
                  onChange={handleInputChange}
                  placeholder="Juan Carlos"
                  required
                  className="w-full h-11 px-3.5 text-sm bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Apellidos *
                </label>
                <input
                  type="text"
                  name="EmpleadoApellidos"
                  value={formData.EmpleadoApellidos}
                  onChange={handleInputChange}
                  placeholder="Pérez García"
                  required
                  className="w-full h-11 px-3.5 text-sm bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>
            </div>

            {/* DNI y Celular */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  DNI (8 dígitos) *
                </label>
                <input
                  type="text"
                  name="EmpleadoDni"
                  maxLength={8}
                  value={formData.EmpleadoDni}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setFormData((prev) => ({ ...prev, EmpleadoDni: val }));
                  }}
                  placeholder="71234567"
                  required
                  className="w-full h-11 px-3.5 text-sm bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Celular / Teléfono
                </label>
                <input
                  type="text"
                  name="EmpleadoTelefono"
                  value={formData.EmpleadoTelefono}
                  onChange={handleInputChange}
                  placeholder="987654321"
                  className="w-full h-11 px-3.5 text-sm bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>
            </div>

            {/* Correo Electrónico */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Correo Electrónico *
              </label>
              <input
                type="email"
                name="EmpleadoCorreo"
                value={formData.EmpleadoCorreo}
                onChange={handleInputChange}
                placeholder="empleado@valencia.com"
                required
                className="w-full h-11 px-3.5 text-sm bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
            </div>

            {/* Sexo y Cargo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Sexo *
                </label>
                <select
                  name="EmpleadoSexo"
                  value={formData.EmpleadoSexo}
                  onChange={handleInputChange}
                  className="w-full h-11 px-3.5 text-sm bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer"
                >
                  <option value="M">Masculino (M)</option>
                  <option value="F">Femenino (F)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Cargo *
                </label>
                <select
                  name="Empleado_cargoId"
                  value={formData.Empleado_cargoId}
                  onChange={handleInputChange}
                  required
                  className="w-full h-11 px-3.5 text-sm bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer"
                >
                  <option value="">Seleccione cargo...</option>
                  {cargos.map((cargo) => (
                    <option key={cargo.cargoId} value={cargo.cargoId}>
                      {cargo.cargoDescripcion}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Fecha de Ingreso y Estado */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Fecha de Ingreso *
                </label>
                <input
                  type="date"
                  name="EmpleadoFechaIngreso"
                  value={formData.EmpleadoFechaIngreso}
                  onChange={handleInputChange}
                  required
                  className="w-full h-11 px-3.5 text-sm bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Estado Laboral *
                </label>
                <select
                  name="EmpleadoEstado"
                  value={formData.EmpleadoEstado}
                  onChange={handleInputChange}
                  className="w-full h-11 px-3.5 text-sm bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer"
                >
                  <option value="A">Activo</option>
                  <option value="V">De Vacaciones</option>
                  <option value="L">Con Licencia</option>
                  <option value="I">Inactivo</option>
                </select>
              </div>
            </div>

            {/* Botón Principal (Azul Marino Oscuro idéntico al mockup) */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 bg-[#0b132b] hover:bg-[#1a2542] active:bg-[#060a17] text-white font-semibold px-4 rounded-xl text-sm flex items-center justify-center gap-2 shadow-md shadow-slate-900/10 transition-all cursor-pointer disabled:opacity-70"
              >
                {isSubmitting ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Procesando...</span>
                  </span>
                ) : (
                  <span>{editingId ? 'Actualizar Empleado' : 'Guardar Empleado'}</span>
                )}
              </button>
            </div>

          </form>
        </div>

        {/* ============================================================ */}
        {/* CONTENEDOR DERECHO: Directorio y Listado con Filtros        */}
        {/* ============================================================ */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-xs p-7">
          
          {/* Cabecera del Directorio y Buscador */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-2.5">
              <Users className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-bold text-slate-800 tracking-tight">
                Directorio de Personal
              </h2>
            </div>

            {/* Barra de Búsqueda Rápida */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre, DNI o cargo..."
                className="w-full h-10 pl-9 pr-3.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
            </div>
          </div>

          {/* Pestañas de Filtros (Pills con tamaño visible y cómodo) */}
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 flex-wrap">
            <button
              onClick={() => setFilterTab('activos')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                filterTab === 'activos'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <span>Activos</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                filterTab === 'activos' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-800'
              }`}>
                {countActivos}
              </span>
            </button>

            <button
              onClick={() => setFilterTab('vacaciones')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                filterTab === 'vacaciones'
                  ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/25'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Palmtree className="w-3.5 h-3.5" />
              <span>De Vacaciones</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                filterTab === 'vacaciones' ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-800'
              }`}>
                {countVacaciones}
              </span>
            </button>

            <button
              onClick={() => setFilterTab('licencias')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                filterTab === 'licencias'
                  ? 'bg-purple-600 text-white shadow-sm shadow-purple-500/25'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <FileBadge className="w-3.5 h-3.5" />
              <span>Con Licencia</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                filterTab === 'licencias' ? 'bg-purple-700 text-white' : 'bg-slate-200 text-slate-800'
              }`}>
                {countLicencias}
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
              <span>Eliminados</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                filterTab === 'eliminados' ? 'bg-rose-700 text-white' : 'bg-slate-200 text-slate-800'
              }`}>
                {countEliminados}
              </span>
            </button>
          </div>

          {/* Tabla de Empleados con tipografía grande y clara */}
          <div className="overflow-x-auto pt-2">
            {isLoading ? (
              <div className="py-14 flex flex-col items-center justify-center text-slate-400 gap-2.5">
                <RefreshCw className="w-7 h-7 animate-spin text-blue-600" />
                <span className="text-sm font-medium">Cargando personal desde SQL Server...</span>
              </div>
            ) : paginatedEmpleados.length === 0 ? (
              <div className="py-14 text-center text-slate-400">
                <Users className="w-12 h-12 mx-auto text-slate-300 mb-2.5" />
                <p className="text-sm font-medium">No se encontraron empleados en esta sección.</p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="mt-2 text-xs text-blue-600 font-semibold hover:underline"
                  >
                    Limpiar búsqueda
                  </button>
                )}
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Empleado</th>
                    <th className="py-3.5 px-4">DNI / Contacto</th>
                    <th className="py-3.5 px-4">Cargo & Usuario</th>
                    <th className="py-3.5 px-4">Ingreso</th>
                    <th className="py-3.5 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                  {paginatedEmpleados.map((emp) => {
                    const isEliminado = emp.EmpleadoEliminado === 'S' || emp.EmpleadoEstado === 'I';
                    const userSys = emp.usuarios?.[0]?.UsuarioUserName;

                    return (
                      <tr key={emp.EmpleadoId} className="hover:bg-slate-50/80 transition-colors">
                        
                        {/* Columna: Empleado y Badge de Estado */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3.5">
                            <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-200 text-blue-700 font-bold text-sm flex items-center justify-center shrink-0 shadow-2xs">
                              {(emp.EmpleadoNombres?.[0] || 'E') + (emp.EmpleadoApellidos?.[0] || '')}
                            </div>
                            <div>
                              <div className="font-bold text-slate-800 text-sm">
                                {emp.EmpleadoNombres} {emp.EmpleadoApellidos}
                              </div>
                              <div className="mt-1">
                                {isEliminado ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                    ELIMINADO
                                  </span>
                                ) : emp.EmpleadoEstado === 'V' ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                    VACACIONES
                                  </span>
                                ) : emp.EmpleadoEstado === 'L' ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                    LICENCIA
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    ACTIVO
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Columna: DNI / Contacto */}
                        <td className="py-4 px-4">
                          <div className="font-mono font-medium text-slate-800 text-xs">
                            DNI: {emp.EmpleadoDni}
                          </div>
                          {emp.EmpleadoTelefono && (
                            <div className="text-slate-600 text-xs flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{emp.EmpleadoTelefono}</span>
                            </div>
                          )}
                          <div className="text-slate-400 text-xs flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span className="truncate max-w-[170px]">{emp.EmpleadoCorreo}</span>
                          </div>
                        </td>

                        {/* Columna: Cargo y Usuario */}
                        <td className="py-4 px-4">
                          <div className="font-semibold text-slate-800 text-sm">
                            {emp.cargo?.cargoDescripcion || 'Sin Cargo'}
                          </div>
                          {userSys ? (
                            <div className="text-xs text-blue-600 font-mono mt-0.5 flex items-center gap-1.5 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                              <span>@{userSys}</span>
                            </div>
                          ) : (
                            <div className="text-xs text-slate-400 mt-0.5">
                              Sin acceso sistema
                            </div>
                          )}
                        </td>

                        {/* Columna: Fecha Ingreso */}
                        <td className="py-4 px-4 text-xs font-mono text-slate-600 font-medium">
                          {emp.EmpleadoFechaIngreso || '—'}
                        </td>

                        {/* Columna: Acciones */}
                        <td className="py-4 px-4 text-right">
                          <div className="inline-flex items-center justify-end gap-2">
                            
                            {/* Botón Editar */}
                            {!isEliminado && (
                              <button
                                onClick={() => handleStartEdit(emp)}
                                className="flex items-center gap-1 px-3 py-1.5 text-slate-700 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 rounded-lg text-xs font-semibold transition cursor-pointer"
                                title="Editar empleado"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                <span>Editar</span>
                              </button>
                            )}

                            {/* Selector rápido de estado */}
                            {!isEliminado && (
                              <select
                                value={emp.EmpleadoEstado || 'A'}
                                onChange={(e) => handleChangeEstado(emp, e.target.value)}
                                className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium cursor-pointer focus:outline-none"
                                title="Cambiar estado laboral"
                              >
                                <option value="A">Activo</option>
                                <option value="V">Vacaciones</option>
                                <option value="L">Licencia</option>
                              </select>
                            )}

                            {/* Botón Eliminar o Restaurar */}
                            {isEliminado ? (
                              <button
                                onClick={() => handleRestore(emp)}
                                className="flex items-center gap-1 px-3 py-1.5 text-emerald-700 hover:bg-emerald-50 border border-emerald-300 rounded-lg text-xs font-semibold transition cursor-pointer"
                                title="Restaurar empleado"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Restaurar</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleDelete(emp)}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                title="Baja lógica"
                              >
                                <Trash2 className="w-4 h-4" />
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

          {/* Paginación (Máximo 5 resultados por página con tamaño nítido) */}
          {!isLoading && totalItems > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-5 mt-3 border-t border-slate-100 text-xs text-slate-500">
              <div>
                <span>Mostrando </span>
                <span className="font-semibold text-slate-800">{startIndex + 1}</span>
                <span> a </span>
                <span className="font-semibold text-slate-800">
                  {Math.min(startIndex + ITEMS_PER_PAGE, totalItems)}
                </span>
                <span> de </span>
                <span className="font-semibold text-slate-800">{totalItems}</span>
                <span> empleados</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition text-xs font-semibold cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Anterior</span>
                </button>

                {/* Números de página */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
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
