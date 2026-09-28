import { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  CreditCard,
  Briefcase,
  Shield,
  Lock,
  Calendar,
  Save,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  RefreshCw,
  Copy,
  Check,
  ShieldCheck,
  BadgeInfo
} from 'lucide-react';
import api from '../../services/api';
import { sileo } from 'sileo';

export default function MiCuenta({ user, onUpdateUserData }) {
  const [activeTab, setActiveTab] = useState('personal'); // 'personal' | 'seguridad'
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Datos completos del empleado y usuario
  const [perfil, setPerfil] = useState({
    EmpleadoId: '',
    EmpleadoNombres: '',
    EmpleadoApellidos: '',
    EmpleadoDni: '',
    EmpleadoTelefono: '',
    EmpleadoCorreo: '',
    EmpleadoSexo: 'M',
    EmpleadoFechaIngreso: '',
    cargoNombre: '',
    rolNombre: '',
    usuarioUsername: '',
  });

  // Estado del formulario de contraseña
  const [passData, setPassData] = useState({
    nuevaPassword: '',
    confirmarPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Cargar datos actuales del usuario autenticado
  const cargarPerfil = async () => {
    setIsLoading(true);
    try {
      let empId = user?.empleadoId;

      // Si no viene en el prop, buscar por usuario o lista
      if (!empId) {
        const resList = await api.personal.listar({ search: user?.usuario || 'admin' });
        const lista = Array.isArray(resList?.data) ? resList.data : resList?.data?.data || [];
        if (lista.length > 0) {
          empId = lista[0].EmpleadoId;
        }
      }

      if (empId) {
        const res = await api.personal.obtener(empId);
        if (res?.success && res?.data) {
          const emp = res.data;
          const usr = emp.usuarios?.[0] || {};
          const cargo = emp.cargo?.cargoDescripcion || user?.cargo || 'Personal Autorizado';
          const rol = usr.rol_user?.Rol_UserRol_Usercol || user?.rol || 'Administrador';

          setPerfil({
            EmpleadoId: emp.EmpleadoId || '',
            EmpleadoNombres: emp.EmpleadoNombres || '',
            EmpleadoApellidos: emp.EmpleadoApellidos || '',
            EmpleadoDni: emp.EmpleadoDni || '',
            EmpleadoTelefono: emp.EmpleadoTelefono || '',
            EmpleadoCorreo: emp.EmpleadoCorreo || '',
            EmpleadoSexo: emp.EmpleadoSexo || 'M',
            EmpleadoFechaIngreso: emp.EmpleadoFechaIngreso || '',
            cargoNombre: cargo,
            rolNombre: rol,
            usuarioUsername: usr.UsuarioUserName || user?.usuario || 'admin',
          });
        }
      }
    } catch (err) {
      console.error('Error al cargar perfil:', err);
      sileo.error({
        title: 'Error al cargar perfil',
        description: err.message || 'No se pudo obtener la información de la cuenta.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    cargarPerfil();
  }, [user]);

  // Modificación de campos personales
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPerfil((prev) => ({ ...prev, [name]: value }));
  };

  // Guardar datos personales
  const handleSubmitPerfil = async (e) => {
    e.preventDefault();

    if (!perfil.EmpleadoNombres.trim() || !perfil.EmpleadoApellidos.trim()) {
      sileo.warning({
        title: 'Campos requeridos',
        description: 'Nombres y apellidos son obligatorios.',
      });
      return;
    }

    if (!perfil.EmpleadoDni || perfil.EmpleadoDni.length !== 8) {
      sileo.warning({
        title: 'DNI inválido',
        description: 'El DNI debe contener exactamente 8 dígitos.',
      });
      return;
    }

    setIsSaving(true);
    const toastId = sileo.show({
      type: 'loading',
      title: 'Guardando cambios...',
      description: 'Actualizando tus datos personales en el servidor',
      duration: null,
    });

    try {
      const payload = {
        EmpleadoNombres: perfil.EmpleadoNombres.trim(),
        EmpleadoApellidos: perfil.EmpleadoApellidos.trim(),
        EmpleadoDni: perfil.EmpleadoDni.trim(),
        EmpleadoTelefono: perfil.EmpleadoTelefono ? perfil.EmpleadoTelefono.trim() : null,
        EmpleadoCorreo: perfil.EmpleadoCorreo.trim(),
        EmpleadoSexo: perfil.EmpleadoSexo,
      };

      const res = await api.personal.actualizar(perfil.EmpleadoId, payload);
      
      if (res?.success) {
        // Actualizar sesión local
        const updatedUser = {
          ...user,
          nombreCompleto: `${payload.EmpleadoNombres} ${payload.EmpleadoApellidos}`,
          correo: payload.EmpleadoCorreo,
        };
        localStorage.setItem('userData', JSON.stringify(updatedUser));
        if (onUpdateUserData) {
          onUpdateUserData(updatedUser);
        }

        sileo.dismiss(toastId);
        sileo.success({
          title: '¡Perfil Actualizado!',
          description: 'Tus datos han sido modificados correctamente.',
        });
      } else {
        throw new Error(res?.message || 'No se pudo actualizar el perfil.');
      }
    } catch (err) {
      console.error('Error al guardar perfil:', err);
      sileo.dismiss(toastId);
      sileo.error({
        title: 'Error al guardar',
        description: err.data?.message || err.message || 'Ocurrió un error al actualizar los datos.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Copiar ID de empleado al portapapeles
  const handleCopyId = () => {
    if (perfil.EmpleadoId) {
      navigator.clipboard.writeText(perfil.EmpleadoId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  // Medidor objetivo de fortaleza de contraseña
  const calcularFortalezaPassword = (pass) => {
    if (!pass) return { score: 0, label: '', color: 'bg-slate-200' };

    const tieneLongitud = pass.length >= 6;
    const tieneNumeros = /\d/.test(pass);
    const tieneMayusculaYMinuscula = /[a-z]/.test(pass) && /[A-Z]/.test(pass);
    const tieneEspecial = /[^A-Za-z0-9]/.test(pass);

    let score = 0;
    if (tieneLongitud) score += 1;
    if (tieneNumeros) score += 1;
    if (tieneMayusculaYMinuscula) score += 1;
    if (tieneEspecial) score += 1;

    if (score <= 1) return { score: 1, label: 'Básica (Mínimo requerido)', color: 'bg-amber-500', barWidth: 'w-1/4' };
    if (score === 2) return { score: 2, label: 'Media', color: 'bg-blue-500', barWidth: 'w-2/4' };
    if (score === 3) return { score: 3, label: 'Buena', color: 'bg-indigo-500', barWidth: 'w-3/4' };
    return { score: 4, label: 'Fuerte', color: 'bg-emerald-500', barWidth: 'w-full' };
  };

  // Cambiar contraseña
  const handleSubmitPassword = async (e) => {
    e.preventDefault();

    if (!passData.nuevaPassword) {
      sileo.warning({ title: 'Campo obligatorio', description: 'Ingresa la nueva contraseña.' });
      return;
    }

    if (passData.nuevaPassword.length < 6) {
      sileo.warning({
        title: 'Contraseña muy corta',
        description: 'La contraseña debe tener un mínimo de 6 caracteres.',
      });
      return;
    }

    if (passData.nuevaPassword !== passData.confirmarPassword) {
      sileo.error({
        title: 'Las contraseñas no coinciden',
        description: 'Verifica que ambas contraseñas escritas sean idénticas.',
      });
      return;
    }

    setIsChangingPass(true);
    const toastId = sileo.show({
      type: 'loading',
      title: 'Actualizando credenciales...',
      description: 'Cifrando y guardando tu nueva clave en el servidor',
      duration: null,
    });

    try {
      const res = await api.personal.cambiarPassword(perfil.EmpleadoId, {
        password: passData.nuevaPassword,
        password_confirmation: passData.confirmarPassword,
      });

      if (res?.success) {
        setPassData({ nuevaPassword: '', confirmarPassword: '' });
        sileo.dismiss(toastId);
        sileo.success({
          title: '¡Contraseña Cambiada!',
          description: 'Tu clave de acceso ha sido actualizada con éxito en la base de datos.',
        });
      } else {
        throw new Error(res?.message || 'No se pudo actualizar la contraseña.');
      }
    } catch (err) {
      console.error('Error al cambiar contraseña:', err);
      sileo.dismiss(toastId);
      sileo.error({
        title: 'Error al cambiar contraseña',
        description: err.data?.message || err.message || 'Verifica los datos ingresados.',
      });
    } finally {
      setIsChangingPass(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <span className="text-sm font-semibold">Cargando la información de tu cuenta...</span>
      </div>
    );
  }

  const iniciales = `${perfil.EmpleadoNombres?.charAt(0) || ''}${perfil.EmpleadoApellidos?.charAt(0) || ''}`.toUpperCase() || 'U';
  const fortaleza = calcularFortalezaPassword(passData.nuevaPassword);
  const passwordsCoinciden = passData.nuevaPassword && passData.confirmarPassword && passData.nuevaPassword === passData.confirmarPassword;
  const passwordsDiscrepan = passData.confirmarPassword && passData.nuevaPassword !== passData.confirmarPassword;

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* ========================================================================= */}
      {/* 1. CABECERA INSTITUCIONAL: GAFETE DIGITAL SOBRIO INTEGRADO */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 sm:p-7 space-y-5">
        
        {/* Fila Principal: Avatar, Identidad y Acciones */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4.5">
            {/* Avatar Squircle con estilo corporativo neutro */}
            <div className="w-16 h-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-xl font-black tracking-tight shrink-0 shadow-xs border border-slate-800">
              {iniciales}
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  {perfil.EmpleadoNombres} {perfil.EmpleadoApellidos}
                </h1>
                
                {/* Badge de Estado Activo */}
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Activo
                </span>
              </div>

              {/* Metadatos Rápidos */}
              <div className="flex items-center gap-3 mt-1.5 flex-wrap text-xs text-slate-500 font-mono">
                <span>@{perfil.usuarioUsername}</span>
                <span className="text-slate-300">•</span>
                
                {/* Código de Empleado con Copiado Rápido */}
                <button
                  onClick={handleCopyId}
                  className="inline-flex items-center gap-1.5 text-slate-600 hover:text-blue-600 font-semibold transition cursor-pointer bg-slate-50 hover:bg-blue-50 px-2 py-0.5 rounded border border-slate-200/80 hover:border-blue-200"
                  title="Copiar Código de Empleado"
                >
                  <span>{perfil.EmpleadoId || 'EMP-00000'}</span>
                  {copiedId ? (
                    <Check className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <Copy className="w-3 h-3 text-slate-400" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Botón de Recargar Datos */}
          <div className="self-start sm:self-center">
            <button
              onClick={cargarPerfil}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition cursor-pointer shadow-2xs"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
              <span>Sincronizar</span>
            </button>
          </div>
        </div>

        {/* Fila de Datos Institucionales (Campos Tipo Display - Sólo Lectura) */}
        <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
          
          {/* Cargo Institucional */}
          <div className="bg-slate-50/70 border border-slate-200/70 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Briefcase className="w-4 h-4 text-slate-500" />
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Cargo Institucional
                </span>
                <span className="text-xs font-bold text-slate-800">
                  {perfil.cargoNombre || 'Colaborador'}
                </span>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 bg-white border border-slate-200/80 px-1.5 py-0.5 rounded" title="Asignado por Administración">
              <Lock className="w-2.5 h-2.5 text-slate-400" />
              Institucional
            </span>
          </div>

          {/* Rol de Permisos */}
          <div className="bg-slate-50/70 border border-slate-200/70 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-4 h-4 text-slate-500" />
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Rol de Acceso
                </span>
                <span className="text-xs font-bold text-slate-800">
                  {perfil.rolNombre || 'Usuario'}
                </span>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 bg-white border border-slate-200/80 px-1.5 py-0.5 rounded" title="Asignado por Administración">
              <Lock className="w-2.5 h-2.5 text-slate-400" />
              Institucional
            </span>
          </div>

          {/* Fecha de Ingreso */}
          <div className="bg-slate-50/70 border border-slate-200/70 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-slate-500" />
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Fecha de Vinculación
                </span>
                <span className="text-xs font-bold text-slate-800">
                  {perfil.EmpleadoFechaIngreso || 'Registro oficial'}
                </span>
              </div>
            </div>
            <span className="text-[10px] font-mono text-slate-400">RRHH</span>
          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* 2. CONTROL SEGMENTADO: EXACTAMENTE 2 PESTAÑAS (PERSONAL / SEGURIDAD) */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-start border-b border-slate-200">
        <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/80 gap-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('personal')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-all cursor-pointer ${
              activeTab === 'personal'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Información Personal</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('seguridad')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-all cursor-pointer ${
              activeTab === 'seguridad'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Seguridad y Contraseña</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. CONTENIDO: PESTAÑA 1 - INFORMACIÓN PERSONAL EDITABLE */}
      {/* ========================================================================= */}
      {activeTab === 'personal' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 sm:p-7 space-y-6 animate-in fade-in duration-200">
          <div>
            <h2 className="text-base font-bold text-slate-900">Datos de Identidad y Contacto</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Actualiza tus datos personales registrados en el sistema de almacén.
            </p>
          </div>

          <form onSubmit={handleSubmitPerfil} className="space-y-5">
            
            {/* Fila 1: Nombres y Apellidos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nombres *
                </label>
                <input
                  type="text"
                  name="EmpleadoNombres"
                  value={perfil.EmpleadoNombres}
                  onChange={handleInputChange}
                  required
                  placeholder="Ej. Jhonatan"
                  className="w-full h-11 px-3.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-600 transition shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Apellidos *
                </label>
                <input
                  type="text"
                  name="EmpleadoApellidos"
                  value={perfil.EmpleadoApellidos}
                  onChange={handleInputChange}
                  required
                  placeholder="Ej. Liñan Miguel"
                  className="w-full h-11 px-3.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-600 transition shadow-2xs"
                />
              </div>
            </div>

            {/* Fila 2: DNI y Teléfono */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  DNI / Documento Nacional *
                </label>
                <div className="relative group">
                  <CreditCard className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                  <input
                    type="text"
                    name="EmpleadoDni"
                    maxLength={8}
                    value={perfil.EmpleadoDni}
                    onChange={handleInputChange}
                    required
                    placeholder="8 dígitos numéricos"
                    className="w-full h-11 pl-10 pr-3.5 text-sm font-mono bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-600 transition shadow-2xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Teléfono / Celular
                </label>
                <div className="relative group">
                  <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                  <input
                    type="text"
                    name="EmpleadoTelefono"
                    value={perfil.EmpleadoTelefono}
                    onChange={handleInputChange}
                    placeholder="Ej. 987654321"
                    className="w-full h-11 pl-10 pr-3.5 text-sm font-mono bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-600 transition shadow-2xs"
                  />
                </div>
              </div>
            </div>

            {/* Fila 3: Correo y Sexo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Correo Electrónico *
                </label>
                <div className="relative group">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                  <input
                    type="email"
                    name="EmpleadoCorreo"
                    value={perfil.EmpleadoCorreo}
                    onChange={handleInputChange}
                    required
                    placeholder="correo@empresa.com"
                    className="w-full h-11 pl-10 pr-3.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-600 transition shadow-2xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Género / Sexo
                </label>
                <select
                  name="EmpleadoSexo"
                  value={perfil.EmpleadoSexo}
                  onChange={handleInputChange}
                  className="w-full h-11 px-3.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-600 transition shadow-2xs cursor-pointer"
                >
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                </select>
              </div>
            </div>

            {/* Botón de Guardado Primario */}
            <div className="pt-3 flex items-center justify-end border-t border-slate-100">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full sm:w-auto px-6 h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer disabled:opacity-60"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Guardando Cambios...' : 'Guardar Información Personal'}</span>
              </button>
            </div>

          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. CONTENIDO: PESTAÑA 2 - SEGURIDAD Y ACCESO */}
      {/* ========================================================================= */}
      {activeTab === 'seguridad' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 sm:p-7 space-y-6 animate-in fade-in duration-200">
          <div>
            <h2 className="text-base font-bold text-slate-900">Credenciales de Acceso</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Actualiza tu clave de acceso al sistema con verificación de seguridad.
            </p>
          </div>

          <form onSubmit={handleSubmitPassword} className="space-y-5 max-w-xl">
            
            {/* Campo: Nueva Contraseña */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nueva Contraseña *
              </label>
              <div className="relative group">
                <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passData.nuevaPassword}
                  onChange={(e) => setPassData((prev) => ({ ...prev, nuevaPassword: e.target.value }))}
                  placeholder="Mínimo 6 caracteres"
                  required
                  className="w-full h-11 pl-10 pr-10 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-600 transition shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                  title={showPassword ? 'Ocultar' : 'Mostrar'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Medidor Objetivo de Fortaleza de Clave */}
              {passData.nuevaPassword && (
                <div className="mt-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium text-[11px]">Nivel de Seguridad:</span>
                    <span className="font-semibold text-slate-800 text-[11px]">{fortaleza.label}</span>
                  </div>
                  
                  {/* Barra de progreso */}
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className={`h-full ${fortaleza.color} ${fortaleza.barWidth} transition-all duration-300`}></div>
                  </div>

                  {/* Checklist verificable */}
                  <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px]">
                    <div className={`flex items-center gap-1.5 ${passData.nuevaPassword.length >= 6 ? 'text-emerald-700' : 'text-slate-400'}`}>
                      <CheckCircle2 className="w-3 h-3 shrink-0" />
                      <span>Mínimo 6 caracteres</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${/\d/.test(passData.nuevaPassword) ? 'text-emerald-700' : 'text-slate-400'}`}>
                      <CheckCircle2 className="w-3 h-3 shrink-0" />
                      <span>Incluye números</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Campo: Confirmar Contraseña */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Confirmar Nueva Contraseña *
              </label>
              <div className="relative group">
                <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={passData.confirmarPassword}
                  onChange={(e) => setPassData((prev) => ({ ...prev, confirmarPassword: e.target.value }))}
                  placeholder="Repite la contraseña"
                  required
                  className="w-full h-11 pl-10 pr-10 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-600 transition shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                  title={showConfirmPassword ? 'Ocultar' : 'Mostrar'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Indicador de coincidencia */}
              {passwordsCoinciden && (
                <p className="mt-1.5 text-xs text-emerald-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Las contraseñas coinciden</span>
                </p>
              )}
              {passwordsDiscrepan && (
                <p className="mt-1.5 text-xs text-amber-600 font-medium flex items-center gap-1">
                  <BadgeInfo className="w-3 h-3" />
                  <span>Las contraseñas no coinciden aún</span>
                </p>
              )}
            </div>

            {/* Nota de Política de Seguridad Sobria */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 flex items-start gap-2.5 leading-relaxed">
              <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <span>
                Por directiva de seguridad, la contraseña se cifra con algoritmo BCrypt en el servidor. Tras actualizarla, mantendrás tu sesión activa en este dispositivo.
              </span>
            </div>

            {/* Botón de Actualizar Contraseña */}
            <div className="pt-2 flex items-center justify-end">
              <button
                type="submit"
                disabled={isChangingPass || !passData.nuevaPassword || passData.nuevaPassword !== passData.confirmarPassword}
                className="w-full sm:w-auto px-6 h-11 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>{isChangingPass ? 'Actualizando clave...' : 'Actualizar Contraseña'}</span>
              </button>
            </div>

          </form>
        </div>
      )}

    </div>
  );
}
