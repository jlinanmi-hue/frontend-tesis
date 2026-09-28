import React, { useState, useEffect } from 'react';
import {
  Building2,
  Save,
  Search,
  RefreshCw,
  MapPin,
  Phone,
  Mail,
  Receipt,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  FileText,
  Printer,
  ShieldCheck,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { sileo } from 'sileo';
import api from '../../services/api';

export default function GestionEmpresa() {
  const [formData, setFormData] = useState({
    Id_Empresa: 1,
    EmpresaRuc: '10181935451',
    EmpresaRazonSocial: '',
    EmpresaNombreComercial: '',
    EmpresaDireccion: '',
    EmpresaDepartamento: '',
    EmpresaProvincia: '',
    EmpresaDistrito: '',
    EmpresaUbigeo: '',
    EmpresaTelefono: '',
    EmpresaWhatsapp: '',
    EmpresaEmail: '',
    EmpresaLogo: '',
    EmpresaMensajeTicket: '',
    EmpresaEstado: 'A',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isConsultingSunat, setIsConsultingSunat] = useState(false);
  const [sunatStatus, setSunatStatus] = useState(null); // { estado, condicion }
  const [ultimaModificacion, setUltimaModificacion] = useState(null);

  // Cargar datos actuales de la empresa
  const cargarEmpresa = async () => {
    setIsLoading(true);
    try {
      const res = await api.empresa.obtener();
      if (res?.success && res?.data) {
        const data = res.data;
        setFormData({
          Id_Empresa: data.Id_Empresa || 1,
          EmpresaRuc: data.EmpresaRuc || '10181935451',
          EmpresaRazonSocial: data.EmpresaRazonSocial || '',
          EmpresaNombreComercial: data.EmpresaNombreComercial || '',
          EmpresaDireccion: data.EmpresaDireccion || '',
          EmpresaDepartamento: data.EmpresaDepartamento || '',
          EmpresaProvincia: data.EmpresaProvincia || '',
          EmpresaDistrito: data.EmpresaDistrito || '',
          EmpresaUbigeo: data.EmpresaUbigeo || '',
          EmpresaTelefono: data.EmpresaTelefono || '',
          EmpresaWhatsapp: data.EmpresaWhatsapp || '',
          EmpresaEmail: data.EmpresaEmail || '',
          EmpresaLogo: data.EmpresaLogo || '',
          EmpresaMensajeTicket: data.EmpresaMensajeTicket || '',
          EmpresaEstado: data.EmpresaEstado || 'A',
        });
        if (data.EmpresaFechaModificacion || data.EmpresaFechaCreacion) {
          setUltimaModificacion(data.EmpresaFechaModificacion || data.EmpresaFechaCreacion);
        }
      }
    } catch (err) {
      console.error('Error al cargar datos de empresa:', err);
      sileo.error('No se pudieron cargar los datos de la empresa');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    cargarEmpresa();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Consultar SUNAT para autocompletar
  const handleConsultarSunat = async () => {
    const ruc = formData.EmpresaRuc.trim();
    if (!ruc || ruc.length !== 11) {
      sileo.warning('Ingrese un RUC válido de 11 dígitos.');
      return;
    }

    setIsConsultingSunat(true);
    try {
      const res = await api.empresa.sincronizarSunat(ruc, false);
      if (res?.success && res?.data?.sunat) {
        const s = res.data.sunat;
        setFormData((prev) => ({
          ...prev,
          EmpresaRazonSocial: s.EmpresaRazonSocial || prev.EmpresaRazonSocial,
          EmpresaDireccion: s.EmpresaDireccion || prev.EmpresaDireccion,
          EmpresaDepartamento: s.EmpresaDepartamento || prev.EmpresaDepartamento,
          EmpresaProvincia: s.EmpresaProvincia || prev.EmpresaProvincia,
          EmpresaDistrito: s.EmpresaDistrito || prev.EmpresaDistrito,
          EmpresaUbigeo: s.EmpresaUbigeo || prev.EmpresaUbigeo,
        }));

        setSunatStatus({
          estado: s.EmpresaEstadoContribuyente || 'ACTIVO',
          condicion: s.EmpresaCondicionContribuyente || 'HABIDO',
        });

        sileo.success('Datos actualizados desde SUNAT. Recuerda guardar los cambios.');
      } else {
        sileo.error(res?.message || 'No se encontró información para el RUC ingresado.');
      }
    } catch (err) {
      console.error('Error al consultar SUNAT:', err);
      sileo.error(err.message || 'Error de conexión con el servicio SUNAT.');
    } finally {
      setIsConsultingSunat(false);
    }
  };

  // Guardar cambios en el backend
  const handleGuardar = async (e) => {
    if (e) e.preventDefault();
    if (!formData.EmpresaRuc || formData.EmpresaRuc.trim().length !== 11) {
      sileo.error('El RUC es obligatorio y debe tener 11 dígitos.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await api.empresa.actualizar(formData);
      if (res?.success) {
        sileo.success('Datos de la empresa actualizados exitosamente');
        setUltimaModificacion(new Date().toISOString());
      } else {
        sileo.error(res?.message || 'Error al guardar los cambios');
      }
    } catch (err) {
      console.error('Error al guardar datos de empresa:', err);
      sileo.error(err.message || 'Error al conectar con el servidor.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mb-3" />
        <p className="text-sm font-medium">Cargando datos de la empresa...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Encabezado Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-600">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <span>Datos de la Empresa</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 border border-emerald-200">
                {formData.EmpresaEstado === 'A' ? 'Activo' : 'Inactivo'}
              </span>
            </h1>
            <p className="text-xs text-slate-500">
              Información oficial utilizada en órdenes oficiales, órdenes de compra y documentos del sistema
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={cargarEmpresa}
            disabled={isLoading || isSaving}
            className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition border border-slate-200 flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Recargar</span>
          </button>

          <button
            type="button"
            onClick={handleGuardar}
            disabled={isSaving}
            className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Guardar Cambios</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Grid de 2 Columnas: Formulario & Previsualización de Ticket Térmico */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Columna Izquierda: Formulario Administrativo (7 columnas) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Tarjeta 1: Identificación y Datos Fiscales */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                  Identificación Fiscal
                </h2>
              </div>
              {sunatStatus && (
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>SUNAT: {sunatStatus.estado} - {sunatStatus.condicion}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* RUC */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  RUC de la Empresa <span className="text-rose-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="EmpresaRuc"
                    maxLength={11}
                    value={formData.EmpresaRuc}
                    onChange={handleChange}
                    placeholder="10181935451"
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:outline-none transition font-mono font-bold"
                  />
                  <button
                    type="button"
                    onClick={handleConsultarSunat}
                    disabled={isConsultingSunat}
                    title="Consultar en SUNAT para autocompletar"
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition cursor-pointer whitespace-nowrap"
                  >
                    {isConsultingSunat ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Search className="w-3.5 h-3.5" />
                    )}
                    <span>SUNAT</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">11 dígitos numéricos sin guiones</p>
              </div>

              {/* Nombre Comercial */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre Comercial <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="EmpresaNombreComercial"
                  value={formData.EmpresaNombreComercial}
                  onChange={handleChange}
                  placeholder="COMERCIAL VALENCIA"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:outline-none transition font-semibold"
                />
                <p className="text-[10px] text-slate-400 mt-1">Nombre que aparece en el encabezado del ticket</p>
              </div>

              {/* Razón Social */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Razón Social Oficial (SUNAT) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="EmpresaRazonSocial"
                  value={formData.EmpresaRazonSocial}
                  onChange={handleChange}
                  placeholder="VALENCIA VILLANUEVA BERNABE"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:outline-none transition uppercase"
                />
              </div>
            </div>
          </div>

          {/* Tarjeta 2: Ubicación y Contacto */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <MapPin className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                Ubicación y Contacto
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Dirección */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Dirección Fiscal / Establecimiento
                </label>
                <input
                  type="text"
                  name="EmpresaDireccion"
                  value={formData.EmpresaDireccion}
                  onChange={handleChange}
                  placeholder="Av. Principal 123, Urb. San Antonio"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:outline-none transition"
                />
              </div>

              {/* Departamento */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Departamento</label>
                <input
                  type="text"
                  name="EmpresaDepartamento"
                  value={formData.EmpresaDepartamento}
                  onChange={handleChange}
                  placeholder="Lima"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:outline-none transition"
                />
              </div>

              {/* Provincia */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Provincia</label>
                <input
                  type="text"
                  name="EmpresaProvincia"
                  value={formData.EmpresaProvincia}
                  onChange={handleChange}
                  placeholder="Lima"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:outline-none transition"
                />
              </div>

              {/* Distrito */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Distrito</label>
                <input
                  type="text"
                  name="EmpresaDistrito"
                  value={formData.EmpresaDistrito}
                  onChange={handleChange}
                  placeholder="Lima"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:outline-none transition"
                />
              </div>

              {/* Ubigeo */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ubigeo (Código)</label>
                <input
                  type="text"
                  name="EmpresaUbigeo"
                  value={formData.EmpresaUbigeo}
                  onChange={handleChange}
                  placeholder="150101"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:outline-none transition font-mono"
                />
              </div>

              {/* Teléfono Fijo */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-400" />
                  <span>Teléfono de Atención</span>
                </label>
                <input
                  type="text"
                  name="EmpresaTelefono"
                  value={formData.EmpresaTelefono}
                  onChange={handleChange}
                  placeholder="01 456-7890"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:outline-none transition"
                />
              </div>

              {/* WhatsApp */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-emerald-600" />
                  <span>WhatsApp de Pedidos / Compras</span>
                </label>
                <input
                  type="text"
                  name="EmpresaWhatsapp"
                  value={formData.EmpresaWhatsapp}
                  onChange={handleChange}
                  placeholder="51900292514"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:outline-none transition font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-1">Con código de país (ej. 51900292514)</p>
              </div>

              {/* Correo Electrónico */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Mail className="w-3 h-3 text-slate-400" />
                  <span>Correo Electrónico Institucional</span>
                </label>
                <input
                  type="email"
                  name="EmpresaEmail"
                  value={formData.EmpresaEmail}
                  onChange={handleChange}
                  placeholder="ventas@comercialvalencia.pe"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:outline-none transition"
                />
              </div>
            </div>
          </div>

          {/* Tarjeta 3: Configuración de Comprobantes & Ticket Térmico */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Receipt className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                Personalización de Comprobantes Térmicos
              </h2>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mensaje de Pie de Ticket (Agradecimiento / Política de Cambio)
              </label>
              <textarea
                name="EmpresaMensajeTicket"
                rows={3}
                value={formData.EmpresaMensajeTicket}
                onChange={handleChange}
                placeholder="¡Gracias por su compra en Comercial Valencia! Conserve su comprobante para cualquier cambio o reclamo."
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:outline-none transition leading-relaxed resize-none"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Este texto se imprime al final de cada ticket térmico para los clientes.
              </p>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Vista Previa Interactiva en Vivo del Ticket Térmico (5 columnas) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-slate-600" />
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Vista Previa en Vivo (Ticket 80mm)
                </span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-blue-50 text-blue-700 border border-blue-100 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>Tiempo Real</span>
              </span>
            </div>

            <p className="text-[11px] text-slate-500 mb-3">
              Así es como se visualizan los datos en el ticket impreso en mostrador:
            </p>

            {/* Simulación del Ticket Térmico */}
            <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-4 font-mono text-[11px] text-slate-800 shadow-inner space-y-3">
              {/* Header */}
              <div className="text-center space-y-0.5 border-b border-dashed border-slate-300 pb-3">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">
                  {formData.EmpresaNombreComercial || 'COMERCIAL VALENCIA'}
                </h3>
                <p className="text-[10px] text-slate-600">
                  RUC: {formData.EmpresaRuc || '10181935451'}
                </p>
                <p className="text-[10px] text-slate-500 leading-tight">
                  {formData.EmpresaDireccion || 'Av. Principal 123, Urb. San Antonio'}
                  {formData.EmpresaDistrito ? ` - ${formData.EmpresaDistrito}` : ''}
                </p>
                {formData.EmpresaTelefono && (
                  <p className="text-[9px] text-slate-500">
                    Tel: {formData.EmpresaTelefono}
                  </p>
                )}
                <div className="pt-2">
                  <span className="inline-block px-2 py-0.5 bg-blue-100/70 text-blue-800 font-bold rounded text-[10px]">
                    ORDEN DE PEDIDO: PED-00001
                  </span>
                </div>
                <p className="text-[9px] text-slate-400 pt-0.5">
                  {new Date().toLocaleString('es-PE')}
                </p>
              </div>

              {/* Datos de Prueba de la Venta */}
              <div className="border-b border-dashed border-slate-300 pb-2 text-[10px] space-y-0.5">
                <p><strong>Cliente:</strong> CLIENTE MOSTRADOR</p>
                <p><strong>Doc:</strong> 00000000</p>
                <p><strong>Canal:</strong> Tienda Presencial</p>
                <p><strong>Condición:</strong> Contado</p>
              </div>

              {/* Detalle simulado */}
              <div className="border-b border-dashed border-slate-300 pb-2">
                <div className="grid grid-cols-12 font-bold text-[9px] text-slate-500 uppercase pb-1">
                  <span className="col-span-2 text-center">Cant</span>
                  <span className="col-span-6">Descripción</span>
                  <span className="col-span-4 text-right">Total</span>
                </div>
                <div className="space-y-1 text-[10px]">
                  <div className="grid grid-cols-12">
                    <span className="col-span-2 text-center font-bold">2</span>
                    <span className="col-span-6 truncate">ARROZ EXTRA COSTAL 50KG</span>
                    <span className="col-span-4 text-right">S/ 360.00</span>
                  </div>
                  <div className="grid grid-cols-12">
                    <span className="col-span-2 text-center font-bold">5</span>
                    <span className="col-span-6 truncate">ACEITE PRIMOR 1L</span>
                    <span className="col-span-4 text-right">S/ 47.50</span>
                  </div>
                </div>
              </div>

              {/* Totales */}
              <div className="space-y-1 text-[10px] pt-1">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span>S/ 345.34</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>IGV (18%):</span>
                  <span>S/ 62.16</span>
                </div>
                <div className="flex justify-between text-xs font-bold border-t border-slate-800 pt-1 text-slate-900">
                  <span>TOTAL A PAGAR:</span>
                  <span>S/ 407.50</span>
                </div>
              </div>

              {/* Mensaje de Pie de Ticket Dinámico */}
              <div className="text-center pt-3 text-[9px] text-slate-500 border-t border-dashed border-slate-300 whitespace-pre-line leading-normal">
                {formData.EmpresaMensajeTicket ||
                  '¡Gracias por su compra en Comercial Valencia!\nConserve este comprobante para cualquier cambio o reclamo.'}
              </div>
            </div>

            {/* Footer de Auditoría */}
            {ultimaModificacion && (
              <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100 pt-2">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>Última modificación:</span>
                </span>
                <span className="font-mono">
                  {new Date(ultimaModificacion).toLocaleString('es-PE')}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
