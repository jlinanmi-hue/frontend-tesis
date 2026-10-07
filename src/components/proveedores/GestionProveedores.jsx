import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Truck,
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
  Building2,
  Eye,
  FileText,
  Clock,
  User,
  ShieldCheck,
  Check,
  Package,
  MapPin,
  ExternalLink,
  Copy,
  Briefcase,
  MoreVertical
} from 'lucide-react';
import api from '../../services/api';
import { sileo } from 'sileo';
import StyledSelect from '../dashboard/filters/StyledSelect';

export default function GestionProveedores() {
  // 1. Estados de datos
  const [proveedores, setProveedores] = useState([]);
  const [resumen, setResumen] = useState({
    total_proveedores: 0,
    total_activos: 0,
    total_inactivos: 0,
    total_eliminados: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 2. Filtros, Pestañas y Paginación
  const [activeTab, setActiveTab] = useState('activos'); // 'activos' | 'inactivos' | 'eliminados'
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [paginationInfo, setPaginationInfo] = useState({
    total: 0,
    perPage: 10,
    lastPage: 1,
  });

  // Atajos, copiado y menú contextual
  const searchInputRef = useRef(null);
  const [copiedRuc, setCopiedRuc] = useState(null);
  const [openActionMenuId, setOpenActionMenuId] = useState(null);
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);

  // 3. Modal de Crear / Editar
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProveedor, setEditingProveedor] = useState(null);
  const initialFormState = {
    ProveedorRuc: '',
    ProveedorRazonSocial: '',
    ProveedorTipoContribuyente: '',
    ProveedorActividadEconomica: '',
    ProveedorTelefono: '',
    ProveedorEstado: 'A',
  };
  const [formData, setFormData] = useState(initialFormState);
  const [formErrors, setFormErrors] = useState({});
  const [isSearchingSunat, setIsSearchingSunat] = useState(false);
  const [sunatInfo, setSunatInfo] = useState(null);

  // 4. Modal de Detalle / Ver Proveedor
  const [detailModalProveedor, setDetailModalProveedor] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Cargar resumen de contadores KPI
  const cargarResumen = async () => {
    try {
      const res = await api.proveedores.resumen();
      if (res?.success && res?.data) {
        setResumen(res.data);
      }
    } catch (err) {
      console.error('Error al cargar resumen de proveedores:', err);
    }
  };

  // Cargar listado de proveedores
  const cargarProveedores = async () => {
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

      const res = await api.proveedores.listar(params);
      if (res?.success && res?.data) {
        const dataObj = res.data;
        const items = Array.isArray(dataObj) ? dataObj : dataObj.data || [];
        setProveedores(items);
        setPaginationInfo({
          total: dataObj.total ?? items.length,
          perPage: dataObj.per_page ?? perPage,
          lastPage: dataObj.last_page ?? 1,
        });
      }
    } catch (err) {
      console.error('Error al cargar proveedores:', err);
      sileo.error({
        title: 'Error de conexión',
        description: err.message || 'No se pudo cargar la lista de proveedores.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    cargarResumen();
    try {
      const storedPrefill = sessionStorage.getItem('valencia_ai_proveedor_prefill');
      if (storedPrefill) {
        const prefill = JSON.parse(storedPrefill);
        sessionStorage.removeItem('valencia_ai_proveedor_prefill');
        setEditingProveedor(null);
        setFormData({
          ProveedorRuc: prefill.ProveedorRuc || prefill.ruc || '',
          ProveedorRazonSocial: prefill.ProveedorRazonSocial || prefill.razon_social || '',
          ProveedorTelefono: prefill.ProveedorTelefono || prefill.telefono || '',
          ProveedorTipoContribuyente: 'GENERAL',
          ProveedorActividadEconomica: 'ACTIVIDAD COMERCIAL GENERAL',
          ProveedorEstado: 'A',
        });
        setFormErrors({});
        setIsModalOpen(true);
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    const handleAiOpenForm = (e) => {
      const detail = e.detail;
      if (detail?.form === 'proveedor') {
        const prefill = detail.prefill || {};
        try {
          sessionStorage.removeItem('valencia_ai_proveedor_prefill');
        } catch (err) {}
        setEditingProveedor(null);
        setFormData({
          ProveedorRuc: prefill.ProveedorRuc || prefill.ruc || '',
          ProveedorRazonSocial: prefill.ProveedorRazonSocial || prefill.razon_social || '',
          ProveedorTelefono: prefill.ProveedorTelefono || prefill.telefono || '',
          ProveedorTipoContribuyente: 'GENERAL',
          ProveedorActividadEconomica: 'ACTIVIDAD COMERCIAL GENERAL',
          ProveedorEstado: 'A',
        });
        setFormErrors({});
        setIsModalOpen(true);
      }
    };

    window.addEventListener('valencia-ai:open-form', handleAiOpenForm);
    return () => window.removeEventListener('valencia-ai:open-form', handleAiOpenForm);
  }, []);

  useEffect(() => {
    cargarProveedores();
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

  // Matriz de estados SUNAT
  const sunatStates = {
    HABIDO:     { bg: 'bg-emerald-50', text: 'text-emerald-900', border: 'border-emerald-200/80', dot: 'bg-emerald-500', label: 'Habido' },
    NO_HABIDO:  { bg: 'bg-amber-50',   text: 'text-amber-900',   border: 'border-amber-200/80', dot: 'bg-amber-500',   label: 'No habido' },
    NO_EXISTE:  { bg: 'bg-rose-50',    text: 'text-rose-900',    border: 'border-rose-200/80', dot: 'bg-rose-500',    label: 'No existe' },
    SUSPENSION: { bg: 'bg-slate-100',  text: 'text-slate-700',   border: 'border-slate-200/80', dot: 'bg-slate-400',   label: 'Suspensión' },
  };

  const getSunatState = (prv) => {
    if (prv.ProveedorEliminado === 'S') {
      return { bg: 'bg-rose-50', text: 'text-rose-900', border: 'border-rose-200/80', dot: 'bg-rose-500', label: 'Eliminado' };
    }
    if (prv.ProveedorEstado === 'I') {
      return sunatStates.SUSPENSION;
    }
    const cond = String(prv.ProveedorCondicionSunat || prv.condicion || '').toUpperCase();
    if (cond.includes('NO HABIDO')) return sunatStates.NO_HABIDO;
    if (cond.includes('NO EXISTE')) return sunatStates.NO_EXISTE;
    return sunatStates.HABIDO;
  };

  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    setCurrentPage(1);
    cargarResumen();
  };

  // Validaciones del formulario RUC
  const validarRuc = (val) => {
    const clean = val.trim();
    if (!clean) return 'El RUC es obligatorio.';
    if (!/^\d+$/.test(clean)) return 'El RUC debe contener solo dígitos.';
    if (clean !== '10000000000' && clean !== '00000000000') {
      if (clean.length !== 11) {
        return 'El RUC debe tener exactamente 11 dígitos numéricos.';
      }
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

    if (formErrors[name]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  // Consulta automática de RUC ante SUNAT y autocompletado
  const handleConsultarSunat = async () => {
    const ruc = (formData.ProveedorRuc || '').trim();

    if (!ruc) {
      setFormErrors((prev) => ({
        ...prev,
        ProveedorRuc: 'Ingrese un número de RUC para consultar ante SUNAT.',
      }));
      sileo.warning({
        title: 'RUC requerido',
        description: 'Ingrese los 11 dígitos del RUC antes de presionar la lupa.',
      });
      return;
    }

    if (ruc !== '10000000000' && ruc.length !== 11) {
      setFormErrors((prev) => ({
        ...prev,
        ProveedorRuc: 'El RUC debe tener exactamente 11 dígitos numéricos.',
      }));
      sileo.warning({
        title: 'Formato incorrecto',
        description: 'El RUC tributario debe contener exactamente 11 dígitos.',
      });
      return;
    }

    setIsSearchingSunat(true);
    const toastId = sileo.show({
      type: 'loading',
      title: 'Consultando SUNAT...',
      description: `Buscando información tributaria oficial para el RUC ${ruc}`,
      duration: null,
    });

    try {
      const res = await api.proveedores.consultarSunat(ruc);
      if (res?.success && res?.data) {
        const payload = res.data;
        const prvObj = payload.proveedor || payload.data || {};
        const rawObj = payload.raw_data || {};

        // Extraer y truncar de forma segura a 45 caracteres (límite BD SQL Server)
        const razonSocial = (
          prvObj.ProveedorRazonSocial ||
          payload.razon_social ||
          rawObj.razon_social ||
          rawObj.nombre ||
          ''
        ).trim().slice(0, 45);

        const tipoContribuyente = (
          prvObj.ProveedorTipoContribuyente ||
          payload.tipo_contribuyente ||
          rawObj.tipo_contribuyente ||
          'GENERAL'
        ).trim().slice(0, 45);

        const rawActividad = (
          prvObj.ProveedorActividadEconomica ||
          payload.actividad_economica ||
          rawObj.actividad_economica ||
          ''
        ).trim();

        // Inferencia inteligente de actividad económica (CIIU) si SUNAT no la provee explícitamente
        const inferirActividad = (rs) => {
          const str = (rs || '').toUpperCase();
          if (/(RESTAURANT|POLLERIA|CHIFA|CEVICHERIA|PIZZERIA|CAFE|BAR|COMIDAS|GASTRONOM|FAST FOOD|CATERING|SNACK)/.test(str)) {
            return 'RESTAURANTES Y SERVICIOS DE COMIDAS';
          }
          if (/(ALIMENTO|BEBIDA|LICOR|CARNICERIA|PANADERIA|PASTELERIA|AVICOLA|AGRO|FRUTA)/.test(str)) {
            return 'VENTA AL POR MAYOR DE ALIMENTOS Y BEBIDAS';
          }
          if (/(DISTRIBUID|MAYORIST|COMERCIALIZAD|IMPORT|EXPORT|ABARROTES|MERCADERIA)/.test(str)) {
            return 'VENTA AL POR MAYOR NO ESPECIALIZADA';
          }
          if (/(TRANSPORT|CARGA|LOGISTIC|MUDANZA|COURIER|ENCOMIENDA|ENVIO)/.test(str)) {
            return 'TRANSPORTE DE CARGA POR CARRETERA';
          }
          if (/(FARMACIA|BOTICA|MEDIC|SALUD|CLINICA|DENTAL|OPTICA|LABORATORI)/.test(str)) {
            return 'VENTA DE PRODUCTOS FARMACEUTICOS';
          }
          if (/(CONSTRUCC|CONSTRUCTOR|EDIFICAC|INGENIER|FERRETER|OBRAS|MATERIAL)/.test(str)) {
            return 'CONSTRUCCION DE EDIFICIOS Y OBRAS';
          }
          if (/(SISTEMA|TECNOLOG|SOFTWARE|INFORMATIC|COMPUTO|DIGITAL|CONSULT)/.test(str)) {
            return 'CONSULTORIA DE EQUIPOS Y SISTEMAS';
          }
          if (/(TEXTIL|CONFECC|MODA|CALZADO|CUERO|ROPA|VESTIR)/.test(str)) {
            return 'FABRICACION DE PRENDAS DE VESTIR';
          }
          if (/(SERVICIOS|LIMPIEZA|MANTENIMIENTO|SEGURIDAD|VIGILANCIA)/.test(str)) {
            return 'SERVICIOS DE APOYO A EMPRESAS';
          }
          return 'ACTIVIDAD COMERCIAL GENERAL';
        };

        const actividadEconomica = (
          rawActividad && rawActividad !== '-' && rawActividad !== 'SIN ACTIVIDAD'
            ? rawActividad
            : inferirActividad(razonSocial)
        ).slice(0, 45);

        const telefono = (
          prvObj.ProveedorTelefono ||
          payload.telefono ||
          rawObj.telefono ||
          '-'
        ).trim().slice(0, 45);

        const rawEstado = (
          prvObj.ProveedorEstado ||
          payload.estado ||
          rawObj.estado ||
          'ACTIVO'
        ).toString().toUpperCase();
        const estado = (rawEstado === 'A' || rawEstado === 'ACTIVO') ? 'A' : 'I';

        if (!razonSocial) {
          throw new Error('No se encontraron datos tributarios para el RUC ingresado.');
        }

        // Datos extendidos para tarjeta oficial
        const estadoTexto = payload.estado || rawObj.estado || (estado === 'A' ? 'ACTIVO' : 'INACTIVO');
        const condicion = payload.condicion || rawObj.condicion || 'HABIDO';
        const direccion = payload.direccion || payload.direccion_completa || rawObj.direccion_fiscal || '';
        const departamento = payload.departamento || rawObj.departamento || '';
        const provincia = payload.provincia || rawObj.provincia || '';
        const distrito = payload.distrito || rawObj.distrito || '';
        const ubigeo = payload.ubigeo || rawObj.ubigeo || '';
        const nombreComercial = (payload.nombre_comercial && payload.nombre_comercial !== '-')
          ? payload.nombre_comercial
          : '';
        const isFromDb = Boolean(payload.from_db);

        setFormData((prev) => ({
          ...prev,
          ProveedorRazonSocial: razonSocial,
          ProveedorTipoContribuyente: tipoContribuyente || prev.ProveedorTipoContribuyente,
          ProveedorActividadEconomica: actividadEconomica,
          ProveedorTelefono: telefono !== '-' ? telefono : prev.ProveedorTelefono,
          ProveedorEstado: estado,
        }));

        setSunatInfo({
          ruc,
          razonSocial,
          tipoContribuyente,
          actividadEconomica,
          estado: estadoTexto,
          condicion,
          direccion,
          departamento,
          provincia,
          distrito,
          ubigeo,
          nombreComercial,
          isFromDb,
        });

        setFormErrors((prev) => {
          const next = { ...prev };
          delete next.ProveedorRuc;
          delete next.ProveedorRazonSocial;
          return next;
        });

        sileo.dismiss(toastId);
        sileo.success({
          title: '¡RUC Encontrado en SUNAT!',
          description: `Datos autocompletados: ${razonSocial}`,
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
        description: err.data?.message || err.message || 'No se encontró información para el RUC ingresado.',
      });
    } finally {
      setIsSearchingSunat(false);
    }
  };

  // Abrir Modal de Creación
  const openCreateModal = () => {
    setEditingProveedor(null);
    setFormData(initialFormState);
    setFormErrors({});
    setSunatInfo(null);
    setIsModalOpen(true);
  };

  // Abrir Modal de Edición
  const openEditModal = (prv) => {
    setEditingProveedor(prv);
    setFormData({
      ProveedorRuc: prv.ProveedorRuc || '',
      ProveedorRazonSocial: prv.ProveedorRazonSocial || '',
      ProveedorTipoContribuyente: prv.ProveedorTipoContribuyente || '',
      ProveedorActividadEconomica: prv.ProveedorActividadEconomica || '',
      ProveedorTelefono: prv.ProveedorTelefono === '-' ? '' : prv.ProveedorTelefono || '',
      ProveedorEstado: prv.ProveedorEstado || 'A',
    });
    setFormErrors({});
    setSunatInfo(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProveedor(null);
    setFormData(initialFormState);
    setFormErrors({});
    setSunatInfo(null);
    try {
      sessionStorage.removeItem('valencia_ai_proveedor_prefill');
    } catch (e) {}
  };

  // Abrir Modal de Detalle
  const openDetailModal = async (prv) => {
    setDetailModalProveedor(prv);
    setIsLoadingDetail(true);
    try {
      const res = await api.proveedores.obtener(prv.ProveedorId);
      if (res?.success && res?.data) {
        setDetailModalProveedor(res.data);
      }
    } catch (err) {
      console.error('Error al obtener detalle del proveedor:', err);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const closeDetailModal = () => {
    setDetailModalProveedor(null);
  };

  // Guardar (Crear o Actualizar)
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = {};

    const rucError = validarRuc(formData.ProveedorRuc);
    if (rucError) {
      errors.ProveedorRuc = rucError;
    }

    if (!formData.ProveedorRazonSocial.trim()) {
      errors.ProveedorRazonSocial = 'La razón social es obligatoria.';
    } else if (formData.ProveedorRazonSocial.trim().length > 45) {
      errors.ProveedorRazonSocial = 'La razón social no puede superar los 45 caracteres.';
    }

    if (formData.ProveedorTipoContribuyente && formData.ProveedorTipoContribuyente.length > 45) {
      errors.ProveedorTipoContribuyente = 'El tipo de contribuyente no puede superar los 45 caracteres.';
    }

    if (formData.ProveedorActividadEconomica && formData.ProveedorActividadEconomica.length > 45) {
      errors.ProveedorActividadEconomica = 'La actividad económica no puede superar los 45 caracteres.';
    }

    if (formData.ProveedorTelefono && formData.ProveedorTelefono.length > 45) {
      errors.ProveedorTelefono = 'El teléfono no puede superar los 45 caracteres.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      sileo.warning({
        title: 'Revise el formulario',
        description: 'Corrija los campos señalados antes de continuar.',
      });
      return;
    }

    setIsSubmitting(true);
    const toastId = sileo.show({
      type: 'loading',
      title: editingProveedor ? 'Actualizando proveedor...' : 'Registrando proveedor...',
      description: 'Guardando información en la base de datos SQL Server',
      duration: null,
    });

    try {
      const payload = {
        ProveedorRuc: formData.ProveedorRuc.trim(),
        ProveedorRazonSocial: formData.ProveedorRazonSocial.trim(),
        ProveedorTipoContribuyente: formData.ProveedorTipoContribuyente.trim() || 'GENERAL',
        ProveedorActividadEconomica: formData.ProveedorActividadEconomica.trim() || 'ACTIVIDAD COMERCIAL GENERAL',
        ProveedorTelefono: formData.ProveedorTelefono.trim() || '-',
        ProveedorEstado: formData.ProveedorEstado,
      };

      if (editingProveedor) {
        await api.proveedores.actualizar(editingProveedor.ProveedorId, payload);
        sileo.dismiss(toastId);
        sileo.success({
          title: 'Proveedor actualizado',
          description: `Se actualizaron los datos de ${payload.ProveedorRazonSocial}.`,
        });
      } else {
        const resCrear = await api.proveedores.crear(payload);
        const nuevoProveedor = resCrear?.data || resCrear || {};
        sileo.dismiss(toastId);
        sileo.success({
          title: 'Proveedor registrado',
          description: `Se registró exitosamente a ${payload.ProveedorRazonSocial}.`,
        });

        // Detectar si hay un borrador de compra pendiente de Valencia AI
        try {
          const pendingDraftStr = sessionStorage.getItem('valencia_ai_pending_purchase_order_draft');
          if (pendingDraftStr) {
            const draft = JSON.parse(pendingDraftStr);
            const createdAt = draft.created_at ? new Date(draft.created_at).getTime() : 0;
            const ttlMs = (draft.expira_en_minutos || 30) * 60 * 1000;
            const now = Date.now();
            const isNotExpired = !createdAt || (now - createdAt < ttlMs);

            if (isNotExpired) {
              const prvId = nuevoProveedor.ProveedorId;
              const prvNombre = nuevoProveedor.ProveedorRazonSocial || payload.ProveedorRazonSocial;

              if (prvId) {
                const prefill = {
                  proveedor: {
                    ProveedorId: prvId,
                    ProveedorRazonSocial: prvNombre,
                    ProveedorRuc: nuevoProveedor.ProveedorRuc || payload.ProveedorRuc || '',
                    ProveedorTelefono: nuevoProveedor.ProveedorTelefono || payload.ProveedorTelefono || '',
                    ProveedorDireccion: nuevoProveedor.ProveedorDireccion || '',
                  },
                  productos: draft.productos || [],
                  observacion: draft.observacion || 'Orden generada vía Valencia AI tras registrar proveedor',
                  totales: draft.totales || {},
                };

                sessionStorage.setItem('valencia_ai_purchase_order_prefill', JSON.stringify(prefill));
                sessionStorage.removeItem('valencia_ai_pending_purchase_order_draft');

                window.dispatchEvent(
                  new CustomEvent('valencia-ai:open-purchase-order-form', {
                    detail: { type: 'open_purchase_order_form', form: 'orden_compra', prefill },
                  })
                );
              }
            } else {
              sessionStorage.removeItem('valencia_ai_pending_purchase_order_draft');
            }
          }
        } catch (e) {
          console.warn('Error procesando pending_purchase_order_draft al crear proveedor', e);
        }
      }

      closeModal();
      cargarProveedores();
      cargarResumen();
    } catch (err) {
      console.error('Error al guardar proveedor:', err);
      sileo.dismiss(toastId);

      if (err.errors) {
        setFormErrors(err.errors);
      }

      sileo.error({
        title: editingProveedor ? 'Error al actualizar' : 'Error al registrar',
        description: err.message || 'Ocurrió un inconveniente al procesar la solicitud.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cambiar Estado (Activo / Inactivo Switch)
  const handleToggleEstado = async (prv) => {
    const nuevoEstado = prv.ProveedorEstado === 'A' ? 'I' : 'A';

    try {
      await api.proveedores.cambiarEstado(prv.ProveedorId, nuevoEstado);
      sileo.success({
        title: nuevoEstado === 'A' ? 'Proveedor Activado' : 'Proveedor Suspendido',
        description: `${prv.ProveedorRazonSocial} ha sido ${nuevoEstado === 'A' ? 'habilitado' : 'inactivado'} comercialmente.`,
      });
      cargarProveedores();
      cargarResumen();
    } catch (err) {
      console.error('Error al cambiar estado:', err);
      sileo.error({
        title: 'No se pudo cambiar el estado',
        description: err.message || 'Error al actualizar estado en el servidor.',
      });
    }
  };

  // Dar de Baja Lógica (Eliminar)
  const handleEliminar = async (prv) => {
    const confirmed = window.confirm(
      `¿Está seguro de enviar a Baja Lógica al proveedor "${prv.ProveedorRazonSocial}"?\n\nPodrá restaurarlo en cualquier momento desde la pestaña "Bajas Lógicas".`
    );

    if (!confirmed) return;

    const toastId = sileo.show({
      type: 'loading',
      title: 'Dando de baja...',
      description: `Inactivando registro de ${prv.ProveedorRazonSocial}`,
      duration: null,
    });

    try {
      await api.proveedores.eliminar(prv.ProveedorId);
      sileo.dismiss(toastId);
      sileo.success({
        title: 'Baja Lógica completada',
        description: `El proveedor ${prv.ProveedorRazonSocial} fue retirado de la lista activa.`,
      });
      cargarProveedores();
      cargarResumen();
    } catch (err) {
      console.error('Error al eliminar proveedor:', err);
      sileo.dismiss(toastId);
      sileo.error({
        title: 'Error al dar de baja',
        description: err.message || 'No se pudo completar la eliminación lógica.',
      });
    }
  };

  // Restaurar Proveedor Eliminado
  const handleRestaurar = async (prv) => {
    const toastId = sileo.show({
      type: 'loading',
      title: 'Restaurando proveedor...',
      description: `Reactivando a ${prv.ProveedorRazonSocial}`,
      duration: null,
    });

    try {
      await api.proveedores.restaurar(prv.ProveedorId);
      sileo.dismiss(toastId);
      sileo.success({
        title: 'Proveedor Restaurado',
        description: `${prv.ProveedorRazonSocial} ha regresado al catálogo activo.`,
      });
      cargarProveedores();
      cargarResumen();
    } catch (err) {
      console.error('Error al restaurar proveedor:', err);
      sileo.dismiss(toastId);
      sileo.error({
        title: 'Error al restaurar',
        description: err.message || 'No se pudo restaurar el registro.',
      });
    }
  };

  // Helper para copiar al portapapeles con feedback
  const handleCopiarRuc = (ruc) => {
    if (!ruc) return;
    navigator.clipboard.writeText(ruc);
    setCopiedRuc(ruc);
    setTimeout(() => setCopiedRuc(null), 1800);
    sileo.success({
      title: 'RUC Copiado',
      description: `Se copió ${ruc} al portapapeles.`,
    });
  };

  return (
    <div className="space-y-4 animate-fadeIn pb-10">
      
      {/* 1. Cabecera Unificada Enterprise */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Directorio de Proveedores
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200/80 font-mono">
              {resumen.total_proveedores} {resumen.total_proveedores === 1 ? 'registrado' : 'registrados'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Padrón de abastecimiento, condición tributaria y validación oficial SUNAT
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
              placeholder="Buscar por razón social o RUC..."
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
            onClick={() => {
              cargarProveedores();
              cargarResumen();
            }}
            disabled={isLoading}
            className="h-9 w-9 bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-600 hover:text-slate-900 rounded-xl shadow-2xs transition flex items-center justify-center cursor-pointer disabled:opacity-50"
            title="Refrescar datos"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          <button
            onClick={openCreateModal}
            className="h-9 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Nuevo Proveedor</span>
          </button>
        </div>
      </div>

      {/* 2. Barra de Filtros y Estado SUNAT (Sin duplicidades) */}
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
                {resumen.total_activos}
              </span>
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
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'eliminados'
                  ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Papelera</span>
              {resumen.total_eliminados > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  activeTab === 'eliminados' ? 'bg-rose-50 text-rose-700 font-bold' : 'bg-slate-200 text-slate-600'
                }`}>
                  {resumen.total_eliminados}
                </span>
              )}
            </button>
          </div>

          {/* Estado de Integración SUNAT */}
          <div className="hidden sm:flex items-center gap-2 text-slate-600 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="text-slate-500">Conexión SUNAT:</span>
            <span className="font-semibold text-slate-800">API En Línea</span>
            <span className="text-slate-300">·</span>
            <span className="text-slate-500 font-mono text-[11px]">Padrón RUC Verificado</span>
          </div>
        </div>

        {/* 3. Tabla Denso-Operativa */}
        <div className="overflow-x-auto sidebar-scroll max-h-[600px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-xs border-b border-slate-200/90 text-slate-500 uppercase tracking-wider font-semibold text-[11px] z-10 shadow-2xs">
              <tr>
                <th className="py-3 px-4 w-[140px]">RUC / Doc</th>
                <th className="py-3 px-4">Razón Social</th>
                <th className="py-3 px-4 w-[240px]">Actividad Económica</th>
                <th className="py-3 px-4 w-[130px]">Teléfono</th>
                <th className="py-3 px-4 w-[120px]">Estado SUNAT</th>
                <th className="py-3 px-4 w-[60px] text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                // Skeletons de carga respetando ancho de columnas
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-3 px-4"><div className="h-4 bg-slate-100 rounded w-24"></div></td>
                    <td className="py-3 px-4">
                      <div className="h-4 bg-slate-100 rounded w-48 mb-1.5"></div>
                      <div className="h-3 bg-slate-50 rounded w-28"></div>
                    </td>
                    <td className="py-3 px-4"><div className="h-4 bg-slate-100 rounded w-40"></div></td>
                    <td className="py-3 px-4"><div className="h-4 bg-slate-100 rounded w-24"></div></td>
                    <td className="py-3 px-4"><div className="h-5 bg-slate-100 rounded-full w-20"></div></td>
                    <td className="py-3 px-4 text-right"><div className="h-6 bg-slate-100 rounded w-6 ml-auto"></div></td>
                  </tr>
                ))
              ) : proveedores.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                      <Truck className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-semibold text-slate-700">No se encontraron proveedores</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {searchQuery
                        ? 'Intente con otro término de búsqueda.'
                        : activeTab === 'eliminados'
                        ? 'No hay proveedores registrados en bajas lógicas.'
                        : 'Comience registrando un nuevo proveedor con el botón superior.'}
                    </p>
                  </td>
                </tr>
              ) : (
                proveedores.map((prv) => {
                  const state = getSunatState(prv);
                  const isCopied = copiedRuc === prv.ProveedorRuc;
                  const isEliminado = prv.ProveedorEliminado === 'S';

                  return (
                    <tr
                      key={prv.ProveedorId}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* RUC / Documento con botón de copia interactivo */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-medium text-slate-800 tracking-tight">
                            {prv.ProveedorRuc}
                          </span>
                          <button
                            onClick={() => handleCopiarRuc(prv.ProveedorRuc)}
                            className={`p-1 rounded transition-colors cursor-pointer ${
                              isCopied ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                            }`}
                            title={isCopied ? '¡Copiado!' : 'Copiar RUC'}
                          >
                            {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </td>

                      {/* Razón Social (Formato en 2 líneas) */}
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-semibold text-slate-900 text-sm leading-snug flex items-center gap-1.5">
                            <span className="truncate max-w-sm" title={prv.ProveedorRazonSocial}>
                              {prv.ProveedorRazonSocial}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1 py-0.2 rounded shrink-0">
                              {prv.ProveedorId}
                            </span>
                            {prv.productos?.length > 0 && (
                              <span className="text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded font-medium flex items-center gap-0.5 shrink-0">
                                <Package className="w-2.5 h-2.5" />
                                {prv.productos.length}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {prv.ProveedorTipoContribuyente || 'General'}
                          </div>
                        </div>
                      </td>

                      {/* Actividad Económica */}
                      <td className="py-3 px-4">
                        <span className="text-slate-600 truncate block max-w-[220px]" title={prv.ProveedorActividadEconomica || 'No especificada'}>
                          {prv.ProveedorActividadEconomica && prv.ProveedorActividadEconomica !== '-'
                            ? prv.ProveedorActividadEconomica
                            : <span className="text-slate-400 italic">No especificada</span>}
                        </span>
                      </td>

                      {/* Teléfono */}
                      <td className="py-3 px-4">
                        {prv.ProveedorTelefono && prv.ProveedorTelefono !== '-' ? (
                          <div className="font-mono text-slate-700 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{prv.ProveedorTelefono}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Sin teléfono</span>
                        )}
                      </td>

                      {/* Estado SUNAT (Badge semántico) */}
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${state.bg} ${state.text} ${state.border}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${state.dot}`} />
                          {state.label}
                        </span>
                      </td>

                      {/* Acciones: Menú Dropdown [⋯] */}
                      <td className="py-3 px-4 text-right">
                        <div className="relative inline-block text-left" data-dropdown>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenActionMenuId(openActionMenuId === prv.ProveedorId ? null : prv.ProveedorId);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Acciones"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {openActionMenuId === prv.ProveedorId && (
                            <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-lg border border-slate-200/90 py-1 z-30 animate-in fade-in duration-100 text-left">
                              <button
                                onClick={() => {
                                  openDetailModal(prv);
                                  setOpenActionMenuId(null);
                                }}
                                className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-400" />
                                <span>Ver detalle</span>
                              </button>
                              
                              {!isEliminado && (
                                <button
                                  onClick={() => {
                                    openEditModal(prv);
                                    setOpenActionMenuId(null);
                                  }}
                                  className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                                >
                                  <Pencil className="w-3.5 h-3.5 text-slate-400" />
                                  <span>Editar</span>
                                </button>
                              )}

                              {!isEliminado && (
                                <button
                                  onClick={() => {
                                    handleToggleEstado(prv);
                                    setOpenActionMenuId(null);
                                  }}
                                  className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{prv.ProveedorEstado === 'A' ? 'Suspender' : 'Activar'}</span>
                                </button>
                              )}

                              <div className="my-1 border-t border-slate-100" />

                              <button
                                onClick={() => {
                                  handleCopiarRuc(prv.ProveedorRuc);
                                  setOpenActionMenuId(null);
                                }}
                                className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                              >
                                <Copy className="w-3.5 h-3.5 text-slate-400" />
                                <span>Copiar RUC</span>
                              </button>

                              <div className="my-1 border-t border-slate-100" />

                              {isEliminado ? (
                                <button
                                  onClick={() => {
                                    handleRestaurar(prv);
                                    setOpenActionMenuId(null);
                                  }}
                                  className="w-full px-3 py-1.5 text-xs text-emerald-700 hover:bg-emerald-50 flex items-center gap-2 cursor-pointer font-medium"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>Restaurar proveedor</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    handleEliminar(prv);
                                    setOpenActionMenuId(null);
                                  }}
                                  className="w-full px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer font-medium"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Dar de baja</span>
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
            Mostrando <span className="font-semibold text-slate-800">{paginationInfo.total > 0 ? (currentPage - 1) * perPage + 1 : 0}</span> a <span className="font-semibold text-slate-800">{Math.min(currentPage * perPage, paginationInfo.total)}</span> de <span className="font-semibold text-slate-800">{paginationInfo.total}</span> registros
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

      {/* 6. MODAL CREAR / EDITAR PROVEEDOR */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh]">
            
            {/* Cabecera del Modal */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingProveedor ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {editingProveedor
                      ? `Actualizando código ${editingProveedor.ProveedorId}`
                      : 'Registre un nuevo proveedor con validación SUNAT oficial'}
                  </p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
              
              {/* Campo RUC con Botón Lupita SUNAT */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Número de RUC <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-normal">
                    Consulta SUNAT Oficial
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      name="ProveedorRuc"
                      value={formData.ProveedorRuc}
                      onChange={handleInputChange}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleConsultarSunat();
                        }
                      }}
                      maxLength={11}
                      placeholder="Ej: 20100017491 (11 dígitos RUC)"
                      className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs font-medium focus:outline-hidden focus:bg-white transition ${
                        formErrors.ProveedorRuc
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
                    title="Consultar datos oficiales en SUNAT y autocompletar"
                  >
                    {isSearchingSunat ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline">Buscar</span>
                  </button>
                </div>
                {formErrors.ProveedorRuc ? (
                  <p className="text-[11px] text-red-500 mt-1.5 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{formErrors.ProveedorRuc}</span>
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    Validación algorítmica SUNAT Módulo 11 activa automáticamente.
                  </p>
                )}

                {/* Panel Informativo de Verificación SUNAT */}
                {sunatInfo && (
                  <div className="mt-2.5 p-3 bg-gradient-to-r from-blue-50/90 to-indigo-50/70 border border-blue-200 rounded-xl text-xs space-y-1.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 font-bold text-blue-950">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Datos Oficiales SUNAT</span>
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
                      {sunatInfo.direccion && (
                        <p className="sm:col-span-2 text-slate-500 truncate" title={sunatInfo.direccion}>
                          <span className="font-semibold text-slate-700">Domicilio Fiscal:</span> {sunatInfo.direccion}
                        </p>
                      )}
                      {sunatInfo.actividadEconomica && (
                        <p className="sm:col-span-2 text-slate-600 truncate" title={sunatInfo.actividadEconomica}>
                          <span className="font-semibold text-slate-700">Actividad:</span> {sunatInfo.actividadEconomica}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Razón Social */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Razón Social <span className="text-red-500">*</span>
                  </label>
                  <span className={`text-[10px] ${formData.ProveedorRazonSocial.length > 45 ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
                    {formData.ProveedorRazonSocial.length} / 45
                  </span>
                </div>
                <input
                  type="text"
                  name="ProveedorRazonSocial"
                  value={formData.ProveedorRazonSocial}
                  onChange={handleInputChange}
                  maxLength={45}
                  placeholder="Ej: Distribuidora Alimentaria S.A.C."
                  className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs font-medium focus:outline-hidden focus:bg-white transition ${
                    formErrors.ProveedorRazonSocial
                      ? 'border-red-400 focus:border-red-500'
                      : 'border-slate-200 focus:border-blue-500'
                  }`}
                />
                {formErrors.ProveedorRazonSocial && (
                  <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{formErrors.ProveedorRazonSocial}</span>
                  </p>
                )}
              </div>

              {/* Tipo Contribuyente */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Tipo de Contribuyente
                  </label>
                  <span className={`text-[10px] ${formData.ProveedorTipoContribuyente.length > 45 ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
                    {formData.ProveedorTipoContribuyente.length} / 45
                  </span>
                </div>
                <input
                  type="text"
                  name="ProveedorTipoContribuyente"
                  value={formData.ProveedorTipoContribuyente}
                  onChange={handleInputChange}
                  maxLength={45}
                  placeholder="Ej: SOCIEDAD ANONIMA CERRADA"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-blue-500 focus:bg-white transition"
                />
              </div>

              {/* Actividad Económica */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Actividad Económica
                  </label>
                  <span className={`text-[10px] ${formData.ProveedorActividadEconomica.length > 45 ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
                    {formData.ProveedorActividadEconomica.length} / 45
                  </span>
                </div>
                <input
                  type="text"
                  name="ProveedorActividadEconomica"
                  value={formData.ProveedorActividadEconomica}
                  onChange={handleInputChange}
                  maxLength={45}
                  placeholder="Ej: RESTAURANTES Y SERVICIOS DE COMIDAS"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-blue-500 focus:bg-white transition"
                />
                
                {/* Sugerencias Rápidas de Actividad Económica */}
                <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1 scrollbar-none">
                  <span className="text-[10px] text-slate-400 font-semibold shrink-0">Sugerencias:</span>
                  {[
                    { label: 'Restaurantes y Comidas', value: 'RESTAURANTES Y SERVICIOS DE COMIDAS' },
                    { label: 'Venta de Alimentos', value: 'VENTA AL POR MAYOR DE ALIMENTOS Y BEBIDAS' },
                    { label: 'Distribución Mayorista', value: 'VENTA AL POR MAYOR NO ESPECIALIZADA' },
                    { label: 'Transporte y Carga', value: 'TRANSPORTE DE CARGA POR CARRETERA' },
                    { label: 'Servicios Generales', value: 'SERVICIOS DE APOYO A EMPRESAS' },
                  ].map((sug) => (
                    <button
                      key={sug.value}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, ProveedorActividadEconomica: sug.value.slice(0, 45) }))}
                      className="px-2 py-0.5 text-[10px] font-medium bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 text-slate-600 rounded-md border border-slate-200 transition shrink-0 cursor-pointer"
                      title={`Establecer: ${sug.value}`}
                    >
                      {sug.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Teléfono */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Teléfono de Contacto
                  </label>
                  <span className={`text-[10px] ${formData.ProveedorTelefono.length > 45 ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
                    {formData.ProveedorTelefono.length} / 45
                  </span>
                </div>
                <input
                  type="text"
                  name="ProveedorTelefono"
                  value={formData.ProveedorTelefono}
                  onChange={handleInputChange}
                  maxLength={45}
                  placeholder="Ej: 013150800 o 987654321"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-blue-500 focus:bg-white transition"
                />
              </div>

              {/* Estado Comercial */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Estado Comercial
                </label>
                <StyledSelect
                  value={formData.ProveedorEstado}
                  onChange={(v) => handleInputChange({ target: { name: 'ProveedorEstado', value: v } })}
                  options={[
                    { value: 'A', label: 'Activo (Habilitado para compras y recepciones)' },
                    { value: 'I', label: 'Inactivo (Suspendido comercialmente)' },
                  ]}
                  size="form"
                  panelWidth={240}
                  ariaLabel="Estado comercial del proveedor"
                />
              </div>

              {/* Botones de Acción */}
              <div className="pt-4 flex items-center justify-end gap-2.5 border-t border-slate-200/80">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingProveedor ? 'Actualizar Proveedor' : 'Registrar Proveedor'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. MODAL DETALLE DE PROVEEDOR */}
      {detailModalProveedor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header del Modal */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Ficha Técnica del Proveedor
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    {detailModalProveedor.ProveedorId}
                  </p>
                </div>
              </div>
              <button
                onClick={closeDetailModal}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Contenido del Detalle */}
            <div className="p-6 space-y-4 overflow-y-auto">
              
              {/* Tarjeta de Identidad */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-black text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-md">
                    RUC: {detailModalProveedor.ProveedorRuc}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      detailModalProveedor.ProveedorEstado === 'A'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {detailModalProveedor.ProveedorEstado === 'A' ? 'ACTIVO' : 'INACTIVO'}
                  </span>
                </div>
                <h4 className="text-sm font-black text-slate-900">
                  {detailModalProveedor.ProveedorRazonSocial}
                </h4>
                <p className="text-xs text-slate-500">
                  {detailModalProveedor.ProveedorTipoContribuyente || 'Contribuyente General'}
                </p>
              </div>

              {/* Grid de Información Comercial */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-white border border-slate-200 rounded-xl">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Briefcase className="w-3 h-3 text-slate-400" />
                    <span>Actividad</span>
                  </div>
                  <p className="font-semibold text-slate-800">
                    {detailModalProveedor.ProveedorActividadEconomica || '-'}
                  </p>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-xl">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span>Teléfono</span>
                  </div>
                  <p className="font-semibold text-slate-800">
                    {detailModalProveedor.ProveedorTelefono || '-'}
                  </p>
                </div>
              </div>

              {/* Productos Suministrados */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-blue-600" />
                    <span>Productos Vinculados en Almacén</span>
                  </span>
                  <span className="text-[11px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                    {detailModalProveedor.productos?.length || 0}
                  </span>
                </div>
                {detailModalProveedor.productos?.length > 0 ? (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {detailModalProveedor.productos.map((prod) => (
                      <div
                        key={prod.ProductoId}
                        className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200 text-xs"
                      >
                        <div className="truncate mr-2">
                          <p className="font-bold text-slate-800 truncate">{prod.ProductoNombre}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{prod.ProductoId}</p>
                        </div>
                        <span className="font-bold text-emerald-600 shrink-0">
                          Stock: {prod.ProductoStockActual}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    Este proveedor no tiene productos asignados actualmente.
                  </p>
                )}
              </div>

              {/* Datos de Auditoría */}
              <div className="p-3 bg-slate-50/60 rounded-xl border border-slate-200/60 text-[11px] text-slate-500 space-y-1">
                <div className="flex items-center justify-between">
                  <span>Registrado por:</span>
                  <span className="font-mono font-semibold text-slate-700">
                    {detailModalProveedor.ProveedorUsuarioCreacion || 'SYSTEM'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Fecha de creación:</span>
                  <span className="font-mono text-slate-700">
                    {detailModalProveedor.ProveedorFechaCreacion || '-'}
                  </span>
                </div>
                {detailModalProveedor.ProveedorFechaModificacion && (
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                    <span>Última modificación:</span>
                    <span className="font-mono text-slate-700">
                      {detailModalProveedor.ProveedorFechaModificacion}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Modal */}
            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/60 flex justify-end">
              <button
                onClick={closeDetailModal}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
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
