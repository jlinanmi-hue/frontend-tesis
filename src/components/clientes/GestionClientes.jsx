import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Users,
  Search,
  Plus,
  Pencil,
  Trash2,
  RotateCcw,
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Phone,
  MapPin,
  ShoppingBag,
  TrendingUp,
  Clock,
  Building2,
  Calendar,
  FileText,
  DollarSign,
  UserX,
  Eye,
  Copy,
  Check,
  MoreVertical
} from 'lucide-react';
import api from '../../services/api';
import { sileo } from 'sileo';
import StyledSelect from '../dashboard/filters/StyledSelect';

export default function GestionClientes() {
  // Estados de datos
  const [clientes, setClientes] = useState([]);
  const [resumen, setResumen] = useState({
    total_clientes_activos: 0,
    total_recurrentes: 0,
    total_inactivos: 0,
    total_compras_acumuladas: 0,
    total_monto_acumulado: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtros y pestañas
  const [activeTab, setActiveTab] = useState('activos'); // 'activos' | 'recurrentes' | 'mas_compras' | 'inactivos' | 'eliminados'
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [paginationInfo, setPaginationInfo] = useState({
    total: 0,
    perPage: 10,
    lastPage: 1,
  });

  // Atajos, copiado y menú contextual
  const searchInputRef = useRef(null);
  const [copiedDoc, setCopiedDoc] = useState(null);
  const [openActionMenuId, setOpenActionMenuId] = useState(null);
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);

  // Modal de Crear / Editar
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const initialFormState = {
    ClienteNombre: '',
    ClienteRuc: '',
    ClienteNumero: '',
    ClienteDireccion: '',
    ClienteEstado: 'A',
  };
  const [formData, setFormData] = useState(initialFormState);
  const [formErrors, setFormErrors] = useState({});
  const [isSearchingSunat, setIsSearchingSunat] = useState(false);
  const [sunatInfo, setSunatInfo] = useState(null);

  // Modal de Historial de Pedidos
  const [historyModalClient, setHistoryModalClient] = useState(null);
  const [clientOrders, setClientOrders] = useState([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  // Cargar resumen de contadores
  const cargarResumen = async () => {
    try {
      const res = await api.clientes.resumen();
      if (res?.success && res?.data) {
        setResumen(res.data);
      }
    } catch (err) {
      console.error('Error al cargar resumen de clientes:', err);
    }
  };

  // Cargar listado de clientes
  const cargarClientes = async () => {
    setIsLoading(true);
    try {
      const params = {
        page: currentPage,
        per_page: perPage,
      };

      if (activeTab === 'eliminados') {
        params.eliminados = 1;
      } else {
        params.tab = activeTab;
      }

      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const res = await api.clientes.listar(params);
      if (res?.success && res?.data) {
        const dataObj = res.data;
        const items = Array.isArray(dataObj) ? dataObj : dataObj.data || [];
        setClientes(items);
        setPaginationInfo({
          total: dataObj.total || items.length,
          perPage: dataObj.per_page || perPage,
          lastPage: dataObj.last_page || 1,
        });
      }
    } catch (err) {
      console.error('Error al cargar clientes:', err);
      sileo.error({
        title: 'Error al conectar',
        description: err.message || 'No se pudo cargar la lista de clientes.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    cargarResumen();
    try {
      const storedPrefill = sessionStorage.getItem('valencia_ai_cliente_prefill');
      if (storedPrefill) {
        const prefill = JSON.parse(storedPrefill);
        sessionStorage.removeItem('valencia_ai_cliente_prefill');
        setEditingClient(null);
        setFormData({
          ClienteNombre: prefill.nombre || '',
          ClienteRuc: prefill.documento || prefill.numero_documento || '',
          ClienteNumero: prefill.telefono || '',
          ClienteDireccion: prefill.direccion || '',
          ClienteEstado: 'A',
        });
        setFormErrors({});
        setIsModalOpen(true);
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    const handleAiOpenForm = (e) => {
      const detail = e.detail;
      if (detail?.form === 'cliente') {
        const prefill = detail.prefill || {};
        setEditingClient(null);
        setFormData({
          ClienteNombre: prefill.nombre || '',
          ClienteRuc: prefill.documento || prefill.numero_documento || '',
          ClienteNumero: prefill.telefono || '',
          ClienteDireccion: prefill.direccion || '',
          ClienteEstado: 'A',
        });
        setFormErrors({});
        setIsModalOpen(true);
      }
    };

    window.addEventListener('valencia-ai:open-form', handleAiOpenForm);

    const handleClientSaved = () => {
      setIsModalOpen(false);
      cargarClientes();
      cargarResumen();
    };
    window.addEventListener('valencia-ai:client-saved', handleClientSaved);

    return () => {
      window.removeEventListener('valencia-ai:open-form', handleAiOpenForm);
      window.removeEventListener('valencia-ai:client-saved', handleClientSaved);
    };
  }, []);

  useEffect(() => {
    cargarClientes();
  }, [activeTab, currentPage, searchQuery, perPage]);

  // Atajo de teclado Ctrl+K / Cmd+K y cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    const handleClickOutside = (e) => {
      if (!e.target.closest('[data-dropdown]')) {
        setOpenActionMenuId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('click', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('click', handleClickOutside);
    };
  }, []);

  // Helper para copiar RUC / DNI al portapapeles con feedback
  const handleCopiarDoc = (doc) => {
    if (!doc) return;
    navigator.clipboard.writeText(doc);
    setCopiedDoc(doc);
    setTimeout(() => setCopiedDoc(null), 1800);
    sileo.success({
      title: 'Documento Copiado',
      description: `${doc} copiado al portapapeles.`,
    });
  };

  // Manejar cambio de pestaña
  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    setCurrentPage(1);
    cargarResumen();
  };

  // Validaciones del formulario RUC / DNI
  const validarRucDni = (val) => {
    const clean = val.trim();
    if (!clean) return 'El RUC o DNI es obligatorio.';
    if (!/^\d+$/.test(clean)) return 'Solo se permiten números.';
    if (clean.length !== 8 && clean.length !== 11) {
      return 'Debe tener 8 dígitos (DNI) u 11 dígitos (RUC SUNAT).';
    }
    if (clean.length === 11) {
      const prefix = clean.substring(0, 2);
      if (!['10', '15', '17', '20'].includes(prefix)) {
        return 'Un RUC válido debe iniciar con 10, 15, 17 o 20.';
      }
      // Algoritmo módulo 11
      const factors = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
      let sum = 0;
      for (let i = 0; i < 10; i++) {
        sum += parseInt(clean[i], 10) * factors[i];
      }
      const remainder = sum % 11;
      let check = 11 - remainder;
      if (check === 10) check = 0;
      else if (check === 11) check = 1;
      if (parseInt(clean[10], 10) !== check) {
        return `Dígito verificador inválido para SUNAT (esperado: ${check}).`;
      }
    }
    return null;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Limpiar error específico
    if (formErrors[name]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  // Consultar RUC / DNI ante SUNAT y autocompletar formulario
  const handleConsultarSunat = async () => {
    const doc = (formData.ClienteRuc || '').trim();

    if (!doc) {
      setFormErrors((prev) => ({
        ...prev,
        ClienteRuc: 'Ingrese un número de RUC o DNI para consultar.',
      }));
      sileo.warning({
        title: 'Documento requerido',
        description: 'Ingrese un número de RUC (11 dígitos) o DNI (8 dígitos) antes de presionar la lupa.',
      });
      return;
    }

    if (doc.length !== 8 && doc.length !== 11) {
      setFormErrors((prev) => ({
        ...prev,
        ClienteRuc: 'El documento debe tener 8 dígitos (DNI) u 11 dígitos (RUC SUNAT).',
      }));
      sileo.warning({
        title: 'Formato incorrecto',
        description: 'Debe contener exactamente 8 dígitos (DNI) u 11 dígitos (RUC SUNAT).',
      });
      return;
    }

    setIsSearchingSunat(true);
    const toastId = sileo.show({
      type: 'loading',
      title: doc.length === 11 ? 'Consultando SUNAT...' : 'Consultando RENIEC...',
      description: `Buscando información oficial para el documento ${doc}`,
      duration: null,
    });

    try {
      const res = await api.clientes.consultarSunat(doc);
      if (res?.success && res?.data) {
        const payload = res.data;
        const clienteObj = payload.cliente || payload.data || {};
        const rawObj = payload.raw_data || {};

        // Extraer datos principales soportando todas las variantes de la estructura actualizada
        const nombre = (
          clienteObj.ClienteNombre ||
          payload.razon_social ||
          rawObj.razon_social ||
          rawObj.nombre ||
          clienteObj.nombre ||
          ''
        ).trim();

        const direccion = (
          clienteObj.ClienteDireccion ||
          clienteObj.direccion ||
          payload.direccion ||
          payload.direccion_completa ||
          rawObj.direccion_fiscal ||
          rawObj.direccion ||
          ''
        ).trim();

        const telefono = (
          clienteObj.ClienteNumero ||
          payload.telefono ||
          rawObj.telefono ||
          ''
        ).trim();

        const rawEstado = (
          clienteObj.ClienteEstado ||
          payload.estado ||
          rawObj.estado ||
          ''
        ).toString().toUpperCase();
        const estado = (rawEstado === 'A' || rawEstado === 'ACTIVO') ? 'A' : 'I';

        if (!nombre) {
          throw new Error('No se encontraron datos registrados para este documento.');
        }

        // Datos tributarios y descriptivos extendidos
        const estadoTexto = payload.estado || rawObj.estado || (estado === 'A' ? 'ACTIVO' : 'INACTIVO');
        const condicion = payload.condicion || rawObj.condicion || 'HABIDO';
        const tipoContribuyente = payload.tipo_contribuyente || rawObj.tipo_contribuyente || '';
        const nombreComercial = (payload.nombre_comercial && payload.nombre_comercial !== '-')
          ? payload.nombre_comercial
          : ((rawObj.nombre_comercial && rawObj.nombre_comercial !== '-') ? rawObj.nombre_comercial : '');
        const departamento = payload.departamento || clienteObj.departamento || rawObj.departamento || '';
        const provincia = payload.provincia || clienteObj.provincia || rawObj.provincia || '';
        const distrito = payload.distrito || clienteObj.distrito || rawObj.distrito || '';
        const ubigeo = payload.ubigeo || rawObj.ubigeo || '';
        const actividadEconomica = (payload.actividad_economica && payload.actividad_economica !== '-')
          ? payload.actividad_economica
          : ((rawObj.actividad_economica && rawObj.actividad_economica !== '-') ? rawObj.actividad_economica : '');
        const isFromDb = Boolean(payload.from_db);
        const isDni = doc.length === 8;

        setFormData((prev) => ({
          ...prev,
          ClienteNombre: nombre,
          ClienteDireccion: direccion || prev.ClienteDireccion,
          ClienteNumero: telefono || prev.ClienteNumero,
          ClienteEstado: estado || prev.ClienteEstado,
        }));

        setSunatInfo({
          doc,
          isDni,
          nombre,
          direccion,
          telefono,
          estado: estadoTexto,
          condicion,
          tipoContribuyente,
          nombreComercial,
          departamento,
          provincia,
          distrito,
          ubigeo,
          actividadEconomica,
          isFromDb,
        });

        setFormErrors((prev) => {
          const next = { ...prev };
          delete next.ClienteRuc;
          delete next.ClienteNombre;
          return next;
        });

        sileo.dismiss(toastId);
        sileo.success({
          title: isDni ? '¡DNI Encontrado!' : '¡RUC Encontrado en SUNAT!',
          description: `Datos autocompletados: ${nombre}`,
        });
      } else {
        throw new Error(res?.message || 'No se pudo obtener información de SUNAT.');
      }
    } catch (err) {
      console.error('Error al consultar SUNAT:', err);
      setSunatInfo(null);
      sileo.dismiss(toastId);
      sileo.error({
        title: 'Consulta no completada',
        description: err.data?.message || err.message || 'No se encontró información para el documento ingresado.',
      });
    } finally {
      setIsSearchingSunat(false);
    }
  };

  const openCreateModal = () => {
    setEditingClient(null);
    setFormData(initialFormState);
    setFormErrors({});
    setSunatInfo(null);
    setIsModalOpen(true);
  };

  const openEditModal = (cliente) => {
    setEditingClient(cliente);
    setFormData({
      ClienteNombre: cliente.ClienteNombre || '',
      ClienteRuc: cliente.ClienteRuc || '',
      ClienteNumero: cliente.ClienteNumero || '',
      ClienteDireccion: cliente.ClienteDireccion || '',
      ClienteEstado: cliente.ClienteEstado || 'A',
    });
    setFormErrors({});
    setSunatInfo(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingClient(null);
    setFormData(initialFormState);
    setFormErrors({});
    setSunatInfo(null);
  };

  // Guardar (Crear o Editar)
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = {};

    if (!formData.ClienteNombre.trim()) {
      errors.ClienteNombre = 'El nombre o razón social es obligatorio.';
    }

    const rucError = validarRucDni(formData.ClienteRuc);
    if (rucError) {
      errors.ClienteRuc = rucError;
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      sileo.warning({
        title: 'Formulario incompleto',
        description: 'Por favor corrija los campos marcados en rojo.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingClient) {
        await sileo.promise(api.clientes.actualizar(editingClient.ClienteId, formData), {
          loading: { title: 'Actualizando cliente...' },
          success: () => {
            closeModal();
            cargarClientes();
            cargarResumen();
            return { title: 'Cliente actualizado exitosamente.' };
          },
          error: (err) => ({
            title: 'Error al actualizar',
            description: err.message || 'No se pudo actualizar el cliente.',
          }),
        });
      } else {
        try {
          const res = await api.clientes.crear(formData);
          if (res?.success || res?.data) {
            closeModal();
            cargarClientes();
            cargarResumen();
            sileo.success({ title: 'Cliente registrado exitosamente.' });

            // Detectar si hay un pedido pendiente esperando por este cliente
            try {
              const rawDraft = sessionStorage.getItem('valencia_ai_pending_order_draft');
              if (rawDraft) {
                const draft = JSON.parse(rawDraft);
                if (draft && draft.expires_at && new Date() < new Date(draft.expires_at)) {
                  const nuevoCliente = res?.data?.data || res?.data || {};
                  const clienteId = nuevoCliente.ClienteId || nuevoCliente.cliente_id || null;
                  const clienteNombre = nuevoCliente.ClienteNombre || nuevoCliente.nombre || formData.ClienteNombre || '';

                  if (clienteId) {
                    const prefill = {
                      cliente: {
                        id: clienteId,
                        nombre: clienteNombre,
                        dni_ruc: nuevoCliente.ClienteRuc || formData.ClienteRuc || '',
                        telefono: nuevoCliente.ClienteNumero || formData.ClienteNumero || '',
                        direccion: nuevoCliente.ClienteDireccion || formData.ClienteDireccion || '',
                      },
                      productos: draft.productos || [],
                      acuerdo_comercial: draft.acuerdo_comercial || 'Contado Mostrador',
                      canal_id: draft.canal_id || 'CNL-00001',
                      totales: draft.totales || {},
                    };

                    sessionStorage.setItem('valencia_ai_order_prefill', JSON.stringify(prefill));
                    sessionStorage.removeItem('valencia_ai_pending_order_draft');

                    window.dispatchEvent(
                      new CustomEvent('valencia-ai:open-order-form', {
                        detail: { type: 'open_order_form', form: 'pedido', prefill },
                      })
                    );
                  }
                } else if (draft?.expires_at && new Date() >= new Date(draft.expires_at)) {
                  // Borrador expirado — limpiar silenciosamente
                  sessionStorage.removeItem('valencia_ai_pending_order_draft');
                }
              }
            } catch (e) {
              console.warn('Error procesando pending_order_draft al crear cliente', e);
            }
          } else {
            sileo.error({
              title: 'Error al registrar',
              description: res?.message || 'No se pudo registrar el cliente.',
            });
          }
        } catch (innerErr) {
          console.error(innerErr);
          if (innerErr?.errors) {
            const backendErrors = {};
            for (const [key, msgs] of Object.entries(innerErr.errors)) {
              backendErrors[key] = Array.isArray(msgs) ? msgs[0] : msgs;
            }
            setFormErrors(backendErrors);
          }
          sileo.error({
            title: 'Error al registrar',
            description: innerErr?.data?.message || innerErr?.message || 'No se pudo registrar el cliente.',
          });
        }
      }
    } catch (err) {
      console.error(err);
      if (err?.errors) {
        const backendErrors = {};
        for (const [key, msgs] of Object.entries(err.errors)) {
          backendErrors[key] = Array.isArray(msgs) ? msgs[0] : msgs;
        }
        setFormErrors(backendErrors);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Eliminar lógico
  const handleDelete = async (cliente) => {
    if (!window.confirm(`¿Está seguro de eliminar al cliente "${cliente.ClienteNombre}"? Podrá restaurarlo cuando lo desee.`)) {
      return;
    }

    try {
      await sileo.promise(api.clientes.eliminar(cliente.ClienteId), {
        loading: { title: 'Eliminando cliente...' },
        success: () => {
          cargarClientes();
          cargarResumen();
          return { title: 'Cliente eliminado lógicamente.' };
        },
        error: (err) => ({
          title: 'Error al eliminar',
          description: err.message || 'No se pudo eliminar el cliente.',
        }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Restaurar cliente
  const handleRestore = async (cliente) => {
    try {
      await sileo.promise(api.clientes.restaurar(cliente.ClienteId), {
        loading: { title: 'Restaurando cliente...' },
        success: () => {
          cargarClientes();
          cargarResumen();
          return { title: 'Cliente restaurado exitosamente.' };
        },
        error: (err) => ({
          title: 'Error al restaurar',
          description: err.message || 'No se pudo restaurar el cliente.',
        }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Alternar estado A / I
  const handleToggleEstado = async (cliente) => {
    const nuevoEstado = cliente.ClienteEstado === 'A' ? 'I' : 'A';
    const accion = nuevoEstado === 'A' ? 'activar' : 'desactivar';

    try {
      await sileo.promise(api.clientes.cambiarEstado(cliente.ClienteId, nuevoEstado), {
        loading: { title: `${accion === 'activar' ? 'Activando' : 'Desactivando'} cliente...` },
        success: () => {
          cargarClientes();
          cargarResumen();
          return { title: `Cliente ${nuevoEstado === 'A' ? 'activado' : 'desactivado'} con éxito.` };
        },
        error: (err) => ({
          title: 'Error al cambiar estado',
          description: err.message || 'No se pudo modificar el estado.',
        }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Ver historial de pedidos
  const openOrderHistory = async (cliente) => {
    setHistoryModalClient(cliente);
    setIsLoadingOrders(true);
    try {
      const res = await api.clientes.pedidos(cliente.ClienteId, { per_page: 20 });
      if (res?.success && res?.data) {
        const dataObj = res.data;
        const items = Array.isArray(dataObj) ? dataObj : dataObj.data || [];
        setClientOrders(items);
      }
    } catch (err) {
      console.error('Error al cargar pedidos del cliente:', err);
      sileo.error({
        title: 'Error al obtener pedidos',
        description: err.message || 'No se pudieron consultar los pedidos de este cliente.',
      });
    } finally {
      setIsLoadingOrders(false);
    }
  };

  // Refrescar datos de clientes desde la pantalla (sin recalcular desde pedidos)
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([cargarClientes(), cargarResumen()]);
      sileo.success({ title: 'Lista actualizada exitosamente' });
    } catch (err) {
      console.error(err);
      sileo.error({ title: 'Error al refrescar', description: err.message });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Obtener iniciales para el avatar
  const getInitials = (name) => {
    if (!name) return 'CL';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-4 animate-fadeIn pb-10">
      
      {/* 1. Cabecera Unificada Enterprise */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Directorio de Clientes
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200/80 font-mono">
              {paginationInfo.total || resumen.total_clientes_activos || 0} registrados
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Cartera comercial, acuerdos de crédito y trazabilidad de órdenes
          </p>
        </div>

        {/* Buscador Rápido + Atajo Ctrl+K + Acciones */}
        <div className="flex items-center gap-2.5">
          <div className="relative w-64 sm:w-80">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Buscar por nombre, RUC o teléfono..."
              className="w-full pl-8 pr-14 h-9 bg-white border border-slate-200/90 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/15 transition-all shadow-2xs"
            />
            {searchQuery ? (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[10px] font-mono text-slate-400 bg-slate-100 border border-slate-200/80 px-1.5 py-0.5 rounded">
                {isMac ? '⌘K' : 'Ctrl K'}
              </span>
            )}
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            className="h-9 w-9 bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-600 hover:text-slate-900 rounded-xl shadow-2xs transition flex items-center justify-center cursor-pointer disabled:opacity-50"
            title="Refrescar listado"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing || isLoading ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          <button
            onClick={openCreateModal}
            className="h-9 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Nuevo Cliente</span>
          </button>
        </div>
      </div>

      {/* 2. Barra de Filtros y Métrica Global (Sin duplicidades) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden">
        
        <div className="px-4 py-2.5 bg-slate-50/70 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-y-2 text-xs">
          {/* Selector de Pestañas Segmented */}
          <div className="flex items-center gap-1 p-0.5 bg-slate-200/60 rounded-lg text-xs font-medium">
            <button
              onClick={() => handleTabChange('activos')}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'activos'
                  ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Activos</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeTab === 'activos' ? 'bg-blue-50 text-blue-700 font-bold' : 'bg-slate-200 text-slate-600'
              }`}>
                {resumen.total_clientes_activos}
              </span>
            </button>
            <button
              onClick={() => handleTabChange('recurrentes')}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'recurrentes'
                  ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Recurrentes</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeTab === 'recurrentes' ? 'bg-emerald-50 text-emerald-700 font-bold' : 'bg-slate-200 text-slate-600'
              }`}>
                {resumen.total_recurrentes}
              </span>
            </button>
            <button
              onClick={() => handleTabChange('mas_compras')}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                activeTab === 'mas_compras'
                  ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Más Órdenes</span>
            </button>
            <button
              onClick={() => handleTabChange('inactivos')}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'inactivos'
                  ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Inactivos</span>
              {resumen.total_inactivos > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  activeTab === 'inactivos' ? 'bg-amber-50 text-amber-700 font-bold' : 'bg-slate-200 text-slate-600'
                }`}>
                  {resumen.total_inactivos}
                </span>
              )}
            </button>
            <button
              onClick={() => handleTabChange('eliminados')}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                activeTab === 'eliminados'
                  ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Papelera</span>
            </button>
          </div>

          {/* Contexto Financiero Global No Redundante */}
          <div className="hidden md:flex items-center gap-2 text-slate-500 text-xs font-mono">
            <span className="text-slate-400 font-sans text-xs">Facturación acumulada:</span>
            <span className="font-bold text-slate-900">
              S/ {Number(resumen.total_monto_acumulado || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-slate-300">·</span>
            <span className="text-slate-600 font-medium">
              {resumen.total_compras_acumuladas} {resumen.total_compras_acumuladas === 1 ? 'orden' : 'órdenes'}
            </span>
          </div>
        </div>

        {/* 3. Tabla Denso-Operativa */}
        <div className="overflow-x-auto sidebar-scroll max-h-[600px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-xs border-b border-slate-200/90 text-slate-500 uppercase tracking-wider font-semibold text-[11px] z-10 shadow-2xs">
              <tr>
                <th className="py-3 px-4">Cliente / Razón Social</th>
                <th className="py-3 px-4 w-[240px]">Contacto</th>
                <th className="py-3 px-4 w-[210px]">Historial de Órdenes</th>
                <th className="py-3 px-4 w-[130px]">Estado Comercial</th>
                <th className="py-3 px-4 w-[60px] text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                // Skeletons de carga respetando columnas
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-3 px-4">
                      <div className="h-4 bg-slate-100 rounded w-44 mb-1.5"></div>
                      <div className="h-3 bg-slate-50 rounded w-28"></div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-4 bg-slate-100 rounded w-28 mb-1"></div>
                      <div className="h-3 bg-slate-50 rounded w-36"></div>
                    </td>
                    <td className="py-3 px-4"><div className="h-4 bg-slate-100 rounded w-24"></div></td>
                    <td className="py-3 px-4"><div className="h-5 bg-slate-100 rounded-full w-20"></div></td>
                    <td className="py-3 px-4 text-right"><div className="h-6 bg-slate-100 rounded w-6 ml-auto"></div></td>
                  </tr>
                ))
              ) : clientes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                      <Users className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-semibold text-slate-700">No se encontraron clientes</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {searchQuery
                        ? 'No hay resultados que coincidan con la búsqueda.'
                        : activeTab === 'eliminados'
                        ? 'La papelera de clientes está vacía.'
                        : 'No hay clientes registrados en esta categoría.'}
                    </p>
                  </td>
                </tr>
              ) : (
                clientes.map((c) => {
                  const compras = c.ClienteComprasCount || 0;
                  const totalMonto = Number(c.ClienteTotalMonto || 0);
                  const esRecurrente = c.es_recurrente ?? (compras >= 3);
                  const diasSinComprar = c.dias_sin_comprar;
                  const isDeleted = c.ClienteEliminado === 'S';
                  const doc = c.ClienteRuc || '';
                  const isCopied = copiedDoc === doc;
                  const docDigits = doc.replace(/\D/g, '');
                  const isCompany = docDigits.length === 11 && (docDigits.startsWith('20') || docDigits.startsWith('17') || docDigits.startsWith('15'));
                  const isDni = docDigits.length === 8;
                  const isRucPersonal = docDigits.length === 11 && docDigits.startsWith('10');

                  return (
                    <tr
                      key={c.ClienteId}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Cliente: Nombre, Tipo (Empresa/Persona), Documento con botón copiar, e ID */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 text-sm leading-snug">
                              {c.ClienteNombre}
                            </span>
                            {isCompany ? (
                              <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200/80">
                                Empresa
                              </span>
                            ) : isDni ? (
                              <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200/80">
                                Persona
                              </span>
                            ) : isRucPersonal ? (
                              <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200/80">
                                Con Negocio
                              </span>
                            ) : null}
                            {c.es_inactivo_alerta && (
                              <span
                                title="Alerta: Más de 90 días sin órdenes"
                                className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0"
                              />
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-slate-500">
                            <span className="font-mono text-xs text-slate-600 font-medium">
                              {doc.length === 11 ? `RUC: ${doc}` : doc.length === 8 ? `DNI: ${doc}` : (doc || 'Sin doc.')}
                            </span>
                            {doc && (
                              <button
                                onClick={() => handleCopiarDoc(doc)}
                                className={`p-0.5 rounded transition-colors cursor-pointer ${
                                  isCopied ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-700'
                                }`}
                                title={isCopied ? '¡Copiado!' : 'Copiar documento'}
                              >
                                {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                              </button>
                            )}
                            <span className="text-slate-300">·</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {c.ClienteId}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Contacto: Teléfono y Dirección */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-slate-700 font-medium font-mono text-xs">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{c.ClienteNumero || <span className="text-slate-400 italic font-sans font-normal">Sin teléfono</span>}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[210px]" title={c.ClienteDireccion || ''}>
                              {c.ClienteDireccion || <span className="text-slate-400 italic">Sin dirección</span>}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Historial de Órdenes: Estado explícito si 0, o 'X órdenes · S/ Y' si >0 */}
                      <td className="py-3.5 px-4">
                        {compras === 0 ? (
                          <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
                            <Clock className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                            <span>Sin órdenes registradas</span>
                          </div>
                        ) : (
                          <div>
                            <button
                              onClick={() => openOrderHistory(c)}
                              className="text-xs hover:text-blue-600 transition-colors flex items-center gap-1.5 cursor-pointer group/hist"
                              title="Ver órdenes del cliente"
                            >
                              <span className="font-mono font-bold text-slate-900 group-hover/hist:text-blue-600">
                                {compras} {compras === 1 ? 'orden' : 'órdenes'}
                              </span>
                              <span className="text-slate-300">·</span>
                              <span className="font-mono font-bold text-slate-700">
                                S/ {totalMonto.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                              </span>
                            </button>
                            {c.ClienteUltimaCompra && (
                              <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                                Última:{' '}
                                {diasSinComprar === 0
                                  ? 'Hoy'
                                  : diasSinComprar === 1
                                  ? 'Ayer'
                                  : `hace ${diasSinComprar}d`}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Estado Comercial */}
                      <td className="py-3.5 px-4">
                        {isDeleted ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-900 border border-rose-200/80">
                            Eliminado
                          </span>
                        ) : c.ClienteEstado === 'I' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/80">
                            Inactivo
                          </span>
                        ) : esRecurrente ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-900 border border-emerald-200/80">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Recurrente
                          </span>
                        ) : compras > 0 ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-900 border border-blue-200/80">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                            Ocasional
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100/90 text-slate-700 border border-slate-200/80">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                            Registrado
                          </span>
                        )}
                      </td>

                      {/* Acciones: Menú Dropdown [⋯] */}
                      <td className="py-3 px-4 text-right">
                        <div className="relative inline-block text-left" data-dropdown>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenActionMenuId(openActionMenuId === c.ClienteId ? null : c.ClienteId);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Acciones"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {openActionMenuId === c.ClienteId && (
                            <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-lg border border-slate-200/90 py-1 z-30 animate-in fade-in duration-100 text-left">
                              <button
                                onClick={() => {
                                  openOrderHistory(c);
                                  setOpenActionMenuId(null);
                                }}
                                className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-400" />
                                <span>Ver órdenes</span>
                              </button>

                              {!isDeleted && (
                                <button
                                  onClick={() => {
                                    openEditModal(c);
                                    setOpenActionMenuId(null);
                                  }}
                                  className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                                >
                                  <Pencil className="w-3.5 h-3.5 text-slate-400" />
                                  <span>Editar datos</span>
                                </button>
                              )}

                              {!isDeleted && (
                                <button
                                  onClick={() => {
                                    handleToggleEstado(c);
                                    setOpenActionMenuId(null);
                                  }}
                                  className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{c.ClienteEstado === 'A' ? 'Suspender' : 'Activar'}</span>
                                </button>
                              )}

                              <div className="my-1 border-t border-slate-100" />

                              {doc && (
                                <button
                                  onClick={() => {
                                    handleCopiarDoc(doc);
                                    setOpenActionMenuId(null);
                                  }}
                                  className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                                >
                                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                                  <span>Copiar documento</span>
                                </button>
                              )}

                              <div className="my-1 border-t border-slate-100" />

                              {isDeleted ? (
                                <button
                                  onClick={() => {
                                    handleRestore(c);
                                    setOpenActionMenuId(null);
                                  }}
                                  className="w-full px-3 py-1.5 text-xs text-emerald-700 hover:bg-emerald-50 flex items-center gap-2 cursor-pointer font-medium"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>Restaurar cliente</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    handleDelete(c);
                                    setOpenActionMenuId(null);
                                  }}
                                  className="w-full px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer font-medium"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Enviar a papelera</span>
                                </button>
                              )}
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

        {/* 4. Barra de Paginación Integrada */}
        <div className="px-4 py-3 bg-slate-50/75 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Mostrando <span className="font-semibold text-slate-800">{paginationInfo.total > 0 ? (currentPage - 1) * perPage + 1 : 0}</span> a <span className="font-semibold text-slate-800">{Math.min(currentPage * perPage, paginationInfo.total)}</span> de <span className="font-semibold text-slate-800">{paginationInfo.total}</span> clientes
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Filas por página:</span>
              <StyledSelect
                value={perPage}
                onChange={(v) => {
                  setPerPage(Number(v));
                  setCurrentPage(1);
                }}
                options={[
                  { value: 10, label: '10' },
                  { value: 25, label: '25' },
                  { value: 50, label: '50' },
                ]}
                panelWidth={200}
                ariaLabel="Filas por página"
              />
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage <= 1}
                className="p-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                title="Página anterior"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <span className="px-2 font-mono font-medium text-slate-700">
                {currentPage} / {paginationInfo.lastPage || 1}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, paginationInfo.lastPage || 1))}
                disabled={currentPage >= (paginationInfo.lastPage || 1)}
                className="p-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                title="Página siguiente"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. MODAL DE CREAR / EDITAR CLIENTE                                        */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header del Modal */}
            <div className="px-6 py-5 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {editingClient
                      ? `Modificando los datos de ${editingClient.ClienteNombre}`
                      : 'Registre un nuevo cliente con validación SUNAT oficial'}
                  </p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              
              {/* RUC o DNI */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    RUC / DNI <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-normal">
                    Consulta SUNAT / RENIEC
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      name="ClienteRuc"
                      value={formData.ClienteRuc}
                      onChange={handleInputChange}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleConsultarSunat();
                        }
                      }}
                      maxLength={11}
                      placeholder="Ej: 20601234565 (11 dígitos SUNAT) o 45678901 (8 DNI)"
                      className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs font-medium focus:outline-hidden focus:bg-white transition ${
                        formErrors.ClienteRuc
                          ? 'border-red-400 focus:border-red-500'
                          : 'border-slate-200 focus:border-blue-500'
                      }`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleConsultarSunat}
                    disabled={isSearchingSunat}
                    className="h-10 px-3.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-semibold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0 cursor-pointer"
                    title="Buscar datos oficiales en SUNAT / RENIEC y autocompletar"
                  >
                    {isSearchingSunat ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline">Buscar</span>
                  </button>
                </div>
                {formErrors.ClienteRuc ? (
                  <p className="text-[11px] text-red-500 mt-1.5 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{formErrors.ClienteRuc}</span>
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    Validación algorítmica SUNAT Módulo 11 activa automáticamente.
                  </p>
                )}

                {/* Panel Informativo de Datos Oficiales SUNAT / RENIEC */}
                {sunatInfo && (
                  <div className="mt-2.5 p-3 bg-gradient-to-r from-blue-50/90 to-indigo-50/70 border border-blue-200 rounded-xl text-xs space-y-1.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 font-bold text-blue-950">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Datos Oficiales {sunatInfo.isDni ? 'RENIEC' : 'SUNAT'}</span>
                        {sunatInfo.isFromDb && (
                          <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-md font-semibold">
                            Caché BD (&lt;6ms)
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {sunatInfo.estado && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            sunatInfo.estado === 'ACTIVO'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-red-100 text-red-800 border border-red-200'
                          }`}>
                            {sunatInfo.estado}
                          </span>
                        )}
                        {sunatInfo.condicion && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            sunatInfo.condicion === 'HABIDO'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}>
                            {sunatInfo.condicion}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-600 pt-1.5 border-t border-blue-100/90">
                      {sunatInfo.tipoContribuyente && (
                        <p className="truncate">
                          <span className="font-semibold text-slate-700">Tipo:</span> {sunatInfo.tipoContribuyente}
                        </p>
                      )}
                      {sunatInfo.nombreComercial && (
                        <p className="truncate">
                          <span className="font-semibold text-slate-700">Comercial:</span> {sunatInfo.nombreComercial}
                        </p>
                      )}
                      {(sunatInfo.distrito || sunatInfo.provincia || sunatInfo.departamento) && (
                        <p className="sm:col-span-2 flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="font-semibold text-slate-700">Ubigeo:</span>{' '}
                          {[sunatInfo.distrito, sunatInfo.provincia, sunatInfo.departamento].filter(Boolean).join(' - ')}
                          {sunatInfo.ubigeo ? ` (${sunatInfo.ubigeo})` : ''}
                        </p>
                      )}
                      {sunatInfo.actividadEconomica && (
                        <p className="sm:col-span-2 text-slate-500 truncate" title={sunatInfo.actividadEconomica}>
                          <span className="font-semibold text-slate-700">Actividad:</span> {sunatInfo.actividadEconomica}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Nombre o Razón Social */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nombre o Razón Social <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="ClienteNombre"
                  value={formData.ClienteNombre}
                  onChange={handleInputChange}
                  placeholder="Ej: Bodega Los Amigos S.A.C."
                  className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs font-medium focus:outline-hidden focus:bg-white transition ${
                    formErrors.ClienteNombre
                      ? 'border-red-400 focus:border-red-500'
                      : 'border-slate-200 focus:border-blue-500'
                  }`}
                />
                {formErrors.ClienteNombre && (
                  <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{formErrors.ClienteNombre}</span>
                  </p>
                )}
              </div>

              {/* Teléfono / Celular */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Teléfono / Celular
                </label>
                <input
                  type="text"
                  name="ClienteNumero"
                  value={formData.ClienteNumero}
                  onChange={handleInputChange}
                  placeholder="Ej: +51 987123456"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-blue-500 focus:bg-white transition"
                />
              </div>

              {/* Dirección */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Dirección Fiscal o Comercial
                </label>
                <input
                  type="text"
                  name="ClienteDireccion"
                  value={formData.ClienteDireccion}
                  onChange={handleInputChange}
                  placeholder="Ej: Av. Las Flores 123, Urb. San Felipe"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-blue-500 focus:bg-white transition"
                />
              </div>

              {/* Estado */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Estado Comercial
                </label>
                <StyledSelect
                  value={formData.ClienteEstado}
                  onChange={(v) => handleInputChange({ target: { name: 'ClienteEstado', value: v } })}
                  options={[
                    { value: 'A', label: 'Activo (Habilitado para pedidos y órdenes)' },
                    { value: 'I', label: 'Inactivo (Suspendido comercialmente)' },
                  ]}
                  size="form"
                  panelWidth={240}
                  ariaLabel="Estado comercial del cliente"
                />
              </div>

              {/* Botones de Acción */}
              <div className="pt-4 flex items-center justify-end gap-2.5 border-t border-slate-200/80">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting
                    ? 'Guardando...'
                    : editingClient
                    ? 'Actualizar Cliente'
                    : 'Guardar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. MODAL DE HISTORIAL DE PEDIDOS DEL CLIENTE                              */}
      {/* ========================================================================= */}
      {historyModalClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-6 py-5 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Historial de Órdenes
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pedidos registrados de <strong className="text-slate-800">{historyModalClient.ClienteNombre}</strong> ({historyModalClient.ClienteId})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setHistoryModalClient(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {isLoadingOrders ? (
                <div className="py-12 text-center text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                  <span>Consultando pedidos del cliente...</span>
                </div>
              ) : clientOrders.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <p className="font-semibold text-slate-600">Sin pedidos registrados</p>
                  <p className="text-xs text-slate-400">Este cliente aún no ha generado órdenes de pedido.</p>
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                      <th className="py-2.5 px-3">Código</th>
                      <th className="py-2.5 px-3">Fecha</th>
                      <th className="py-2.5 px-3">Condición</th>
                      <th className="py-2.5 px-3 text-right">Total</th>
                      <th className="py-2.5 px-3 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {clientOrders.map((p) => (
                      <tr key={p.PedidoId} className="hover:bg-slate-50/60">
                        <td className="py-3 px-3 font-mono font-bold text-blue-600">
                          {p.PedidoId}
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          {p.PedidoFecha_pedido ? p.PedidoFecha_pedido.substring(0, 10) : '-'}
                        </td>
                        <td className="py-3 px-3 text-slate-500">
                          {p.PedidoAcuerdo_Comercial || 'CONTADO'}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                          S/ {Number(p.PedidoTotal || 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {p.PedidoEstado_pedido === 'E' ? 'Entregado' : 'Procesado'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
              <span>
                Total órdenes:{' '}
                <strong className="text-slate-800 font-semibold">{historyModalClient.ClienteComprasCount || 0}</strong>
              </span>
              <button
                onClick={() => setHistoryModalClient(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
