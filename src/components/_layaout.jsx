import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Inbox,
  ClipboardList,
  Boxes,
  Truck,
  Users,
  UserCheck,
  Briefcase,
  ShieldCheck,
  LogOut,
  ChevronDown,
  FolderTree,
  Share2,
  KeyRound,
  Layers,
  LockKeyhole,
  UserCircle,
  MapPin,
  Scale,
  Building2
} from 'lucide-react';
import api from '../services/api';
import Dashboard from './Dashboard';
import GestionUsuarios from './usuarios/GestionUsuarios';
import {
  GestionCategorias,
  GestionCanalesPedido,
  GestionUbicaciones,
  GestionUnidadesMedida
} from './catalogos';
import { GestionRoles, GestionCargos } from './seguridad';
import { GestionProductos, GestionMovimientos, GestionAjustesInventario } from './inventario';
import { GestionClientes } from './clientes';
import { GestionProveedores } from './proveedores';
import { GestionOrdenesCompra, GestionOrdenesCliente, GestionRecepcionMercaderia } from './ordenes';
import PrediccionesCompra from './ordenes/PrediccionesCompra';
import GestionEmpresa from './empresa/GestionEmpresa';
import MiCuenta from './cuenta/MiCuenta';
import ChatBotWidget from './chatbot/ChatBotWidget';

export default function Layout({ user, onLogout, onUpdateUserData, children }) {
  // Estado de navegación activa (Pantalla de inicio: Indicadores Globales / Dashboard)
  const [activeMenu, setActiveMenu] = useState('indicadores'); // 'indicadores' | 'usuarios' | 'catalogos' | 'seguridad' | 'ordenes' | 'inventario' | 'proveedores' | 'clientes'
  const [activeSubMenu, setActiveSubMenu] = useState('indicadores_general');

  // Estado de submenús desplegables (Acordeón)
  const [openDropdowns, setOpenDropdowns] = useState({
    catalogos: false,
    seguridad: false,
    usuarios: false,
    ordenes: false,
    inventario: false,
  });

  // Alternar apertura/cierre de desplegables
  const toggleDropdown = (key) => {
    setOpenDropdowns((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Estado para transferir datos precargados de Valencia AI a componentes hijos
  const [aiOrderPrefill, setAiOrderPrefill] = useState(null);
  const [aiPurchaseOrderPrefill, setAiPurchaseOrderPrefill] = useState(null);

  // Navegar a Clientes o Proveedores al recibir evento de Valencia AI (para registro)
  useEffect(() => {
    const handleOpenForm = (e) => {
      const detail = e.detail;
      if (detail?.form === 'cliente') {
        setActiveMenu('clientes');
        setActiveSubMenu('clientes');
      } else if (detail?.form === 'proveedor') {
        setActiveMenu('proveedores');
        setActiveSubMenu('proveedores_lista');
      }
    };
    window.addEventListener('valencia-ai:open-form', handleOpenForm);
    return () => window.removeEventListener('valencia-ai:open-form', handleOpenForm);
  }, []);

  // Navegar a Órdenes de Clientes al recibir evento de Valencia AI
  useEffect(() => {
    const handleOpenOrderForm = (e) => {
      const prefill = e.detail?.prefill || null;
      if (prefill) {
        setAiOrderPrefill(prefill);
      }
      setActiveMenu('ordenes');
      setActiveSubMenu('ordenes_clientes');
      setOpenDropdowns(prev => ({ ...prev, ordenes: true }));
    };

    window.addEventListener('valencia-ai:open-order-form', handleOpenOrderForm);
    return () => window.removeEventListener('valencia-ai:open-order-form', handleOpenOrderForm);
  }, []);

  // Navegar a Órdenes de Compra al recibir evento de Valencia AI
  useEffect(() => {
    const handleOpenPurchaseOrderForm = (e) => {
      const prefill = e.detail?.prefill || null;
      if (prefill) {
        setAiPurchaseOrderPrefill(prefill);
      }
      setActiveMenu('ordenes');
      setActiveSubMenu('ordenes_compra');
      setOpenDropdowns(prev => ({ ...prev, ordenes: true }));
    };

    window.addEventListener('valencia-ai:open-purchase-order-form', handleOpenPurchaseOrderForm);
    return () => window.removeEventListener('valencia-ai:open-purchase-order-form', handleOpenPurchaseOrderForm);
  }, []);

  // Limpiar prefill al recibir orden guardada o limpiada
  useEffect(() => {
    const handleClearPrefill = () => {
      setAiOrderPrefill(null);
    };
    const handleClearPurchasePrefill = () => {
      setAiPurchaseOrderPrefill(null);
    };
    window.addEventListener('valencia-ai:order-saved', handleClearPrefill);
    window.addEventListener('valencia-ai:clear-order-form', handleClearPrefill);
    window.addEventListener('valencia-ai:purchase-order-saved', handleClearPurchasePrefill);
    window.addEventListener('valencia-ai:clear-purchase-order-form', handleClearPurchasePrefill);
    return () => {
      window.removeEventListener('valencia-ai:order-saved', handleClearPrefill);
      window.removeEventListener('valencia-ai:clear-order-form', handleClearPrefill);
      window.removeEventListener('valencia-ai:purchase-order-saved', handleClearPurchasePrefill);
      window.removeEventListener('valencia-ai:clear-purchase-order-form', handleClearPurchasePrefill);
    };
  }, []);

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] overflow-hidden font-sans text-slate-800 notranslate" translate="no">
      
      {/* ============================================================ */}
      {/* SIDEBAR LATERAL (Diseño Enterprise SaaS Limpio)              */}
      {/* ============================================================ */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 text-slate-200 flex flex-col justify-between flex-shrink-0 select-none z-20 transition-all">
        {/* Logo y Encabezado de Marca Enterprise */}
        <div className="p-4 flex items-center gap-3 border-b border-slate-800/80">
          <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
            <span className="text-slate-200 font-semibold text-sm tracking-tight">CV</span>
          </div>
          <div className="min-w-0">
            <h2 className="text-slate-100 font-semibold text-sm tracking-tight truncate leading-tight">
              Comercial Valencia
            </h2>
            <p className="text-slate-500 text-xs font-normal mt-0.5">
              IA generativa
            </p>
          </div>
        </div>

        {/* Menú de Navegación Lateral con Desplegables */}
        <div className="overflow-y-auto sidebar-scroll flex-1 p-3 space-y-4">
          
          {/* SECCIÓN 1: PANEL */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 px-3 pb-1.5">
              Panel
            </p>
            <nav className="space-y-1">
              <button
                onClick={() => {
                  setActiveMenu('indicadores');
                  setActiveSubMenu('indicadores_general');
                }}
                className={`w-full relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150 cursor-pointer ${
                  activeMenu === 'indicadores'
                    ? 'bg-slate-800 text-slate-100 font-medium'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                {activeMenu === 'indicadores' && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-500 rounded-r-full" />
                )}
                <LayoutDashboard className={`w-4 h-4 shrink-0 ${activeMenu === 'indicadores' ? 'text-blue-400' : 'text-slate-400'}`} />
                <span className="truncate">Indicadores Globales</span>
              </button>
            </nav>
          </div>

          {/* SECCIÓN 2: ADMINISTRACIÓN */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 px-3 pb-1.5">
              Administración
            </p>
            <div className="space-y-1">
              {/* 2. MENÚ DESPLEGABLE: Gestión de Personal */}
              <div>
                <button
                  onClick={() => {
                    toggleDropdown('usuarios');
                    setActiveMenu('usuarios');
                    setActiveSubMenu('usuarios_directorio');
                  }}
                  className={`w-full relative flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors duration-150 cursor-pointer ${
                    activeMenu === 'usuarios'
                      ? 'bg-slate-800 text-slate-100 font-medium'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  {activeMenu === 'usuarios' && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-500 rounded-r-full" />
                  )}
                  <div className="flex items-center gap-3 min-w-0">
                    <UserCheck className={`w-4 h-4 shrink-0 ${activeMenu === 'usuarios' ? 'text-blue-400' : 'text-slate-400'}`} />
                    <span className="truncate">Gestión de Personal</span>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-slate-500 transition-transform duration-200 ${openDropdowns.usuarios ? 'rotate-180 text-slate-300' : ''}`} />
                </button>

                {openDropdowns.usuarios && (
                  <div className="mt-1 space-y-0.5 pl-2 animate-in fade-in duration-150">
                    <button
                      onClick={() => {
                        setActiveMenu('usuarios');
                        setActiveSubMenu('usuarios_directorio');
                      }}
                      className={`w-full flex items-center gap-2.5 pl-8 pr-3 py-1.5 rounded-md text-xs transition-colors duration-150 cursor-pointer ${
                        activeMenu === 'usuarios' && activeSubMenu === 'usuarios_directorio'
                          ? 'bg-slate-800/90 text-blue-400 font-medium'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        activeMenu === 'usuarios' && activeSubMenu === 'usuarios_directorio' ? 'bg-blue-400' : 'bg-slate-600'
                      }`} />
                      <span className="truncate">Directorio y Registro</span>
                    </button>
                  </div>
                )}
              </div>

              {/* 3. MENÚ DESPLEGABLE: Gestión de Catálogos */}
              <div>
                <button
                  onClick={() => {
                    toggleDropdown('catalogos');
                    setActiveMenu('catalogos');
                    if (!activeSubMenu.startsWith('catalogos_')) {
                      setActiveSubMenu('catalogos_categorias');
                    }
                  }}
                  className={`w-full relative flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors duration-150 cursor-pointer ${
                    activeMenu === 'catalogos'
                      ? 'bg-slate-800 text-slate-100 font-medium'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  {activeMenu === 'catalogos' && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-500 rounded-r-full" />
                  )}
                  <div className="flex items-center gap-3 min-w-0">
                    <Layers className={`w-4 h-4 shrink-0 ${activeMenu === 'catalogos' ? 'text-blue-400' : 'text-slate-400'}`} />
                    <span className="truncate">Gestión de Catálogos</span>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-slate-500 transition-transform duration-200 ${openDropdowns.catalogos ? 'rotate-180 text-slate-300' : ''}`} />
                </button>

                {openDropdowns.catalogos && (
                  <div className="mt-1 space-y-0.5 pl-2 animate-in fade-in duration-150">
                    <button
                      onClick={() => {
                        setActiveMenu('catalogos');
                        setActiveSubMenu('catalogos_categorias');
                      }}
                      className={`w-full flex items-center gap-2.5 pl-8 pr-3 py-1.5 rounded-md text-xs transition-colors duration-150 cursor-pointer ${
                        activeMenu === 'catalogos' && activeSubMenu === 'catalogos_categorias'
                          ? 'bg-slate-800/90 text-blue-400 font-medium'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                      }`}
                    >
                      <FolderTree className={`w-3.5 h-3.5 shrink-0 ${activeMenu === 'catalogos' && activeSubMenu === 'catalogos_categorias' ? 'text-blue-400' : 'text-slate-500'}`} />
                      <span className="truncate">Categorías de Productos</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveMenu('catalogos');
                        setActiveSubMenu('catalogos_canales');
                      }}
                      className={`w-full flex items-center gap-2.5 pl-8 pr-3 py-1.5 rounded-md text-xs transition-colors duration-150 cursor-pointer ${
                        activeMenu === 'catalogos' && activeSubMenu === 'catalogos_canales'
                          ? 'bg-slate-800/90 text-blue-400 font-medium'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                      }`}
                    >
                      <Share2 className={`w-3.5 h-3.5 shrink-0 ${activeMenu === 'catalogos' && activeSubMenu === 'catalogos_canales' ? 'text-blue-400' : 'text-slate-500'}`} />
                      <span className="truncate">Canales de Pedido</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveMenu('catalogos');
                        setActiveSubMenu('catalogos_ubicaciones');
                      }}
                      className={`w-full flex items-center gap-2.5 pl-8 pr-3 py-1.5 rounded-md text-xs transition-colors duration-150 cursor-pointer ${
                        activeMenu === 'catalogos' && activeSubMenu === 'catalogos_ubicaciones'
                          ? 'bg-slate-800/90 text-blue-400 font-medium'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                      }`}
                    >
                      <MapPin className={`w-3.5 h-3.5 shrink-0 ${activeMenu === 'catalogos' && activeSubMenu === 'catalogos_ubicaciones' ? 'text-blue-400' : 'text-slate-500'}`} />
                      <span className="truncate">Ubicaciones</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveMenu('catalogos');
                        setActiveSubMenu('catalogos_unidades');
                      }}
                      className={`w-full flex items-center gap-2.5 pl-8 pr-3 py-1.5 rounded-md text-xs transition-colors duration-150 cursor-pointer ${
                        activeMenu === 'catalogos' && activeSubMenu === 'catalogos_unidades'
                          ? 'bg-slate-800/90 text-blue-400 font-medium'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                      }`}
                    >
                      <Scale className={`w-3.5 h-3.5 shrink-0 ${activeMenu === 'catalogos' && activeSubMenu === 'catalogos_unidades' ? 'text-blue-400' : 'text-slate-500'}`} />
                      <span className="truncate">Unidades de Medida</span>
                    </button>
                  </div>
                )}
              </div>

              {/* 4. MENÚ DESPLEGABLE: Gestión de Roles y Seguridad */}
              <div>
                <button
                  onClick={() => {
                    toggleDropdown('seguridad');
                    setActiveMenu('seguridad');
                    if (!activeSubMenu.startsWith('seguridad_')) {
                      setActiveSubMenu('seguridad_roles');
                    }
                  }}
                  className={`w-full relative flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors duration-150 cursor-pointer ${
                    activeMenu === 'seguridad'
                      ? 'bg-slate-800 text-slate-100 font-medium'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  {activeMenu === 'seguridad' && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-500 rounded-r-full" />
                  )}
                  <div className="flex items-center gap-3 min-w-0">
                    <LockKeyhole className={`w-4 h-4 shrink-0 ${activeMenu === 'seguridad' ? 'text-blue-400' : 'text-slate-400'}`} />
                    <span className="truncate">Roles y Seguridad</span>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-slate-500 transition-transform duration-200 ${openDropdowns.seguridad ? 'rotate-180 text-slate-300' : ''}`} />
                </button>

                {openDropdowns.seguridad && (
                  <div className="mt-1 space-y-0.5 pl-2 animate-in fade-in duration-150">
                    <button
                      onClick={() => {
                        setActiveMenu('seguridad');
                        setActiveSubMenu('seguridad_roles');
                      }}
                      className={`w-full flex items-center gap-2.5 pl-8 pr-3 py-1.5 rounded-md text-xs transition-colors duration-150 cursor-pointer ${
                        activeMenu === 'seguridad' && activeSubMenu === 'seguridad_roles'
                          ? 'bg-slate-800/90 text-blue-400 font-medium'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                      }`}
                    >
                      <KeyRound className={`w-3.5 h-3.5 shrink-0 ${activeMenu === 'seguridad' && activeSubMenu === 'seguridad_roles' ? 'text-blue-400' : 'text-slate-500'}`} />
                      <span className="truncate">Roles de Usuario</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveMenu('seguridad');
                        setActiveSubMenu('seguridad_cargos');
                      }}
                      className={`w-full flex items-center gap-2.5 pl-8 pr-3 py-1.5 rounded-md text-xs transition-colors duration-150 cursor-pointer ${
                        activeMenu === 'seguridad' && activeSubMenu === 'seguridad_cargos'
                          ? 'bg-slate-800/90 text-blue-400 font-medium'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                      }`}
                    >
                      <Briefcase className={`w-3.5 h-3.5 shrink-0 ${activeMenu === 'seguridad' && activeSubMenu === 'seguridad_cargos' ? 'text-blue-400' : 'text-slate-500'}`} />
                      <span className="truncate">Cargos de Personal</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECCIÓN 3: OPERACIONES */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 px-3 pb-1.5">
              Operaciones
            </p>
            <div className="space-y-1">
              {/* 5. MENÚ DESPLEGABLE: Control de Órdenes */}
              <div>
                <button
                  onClick={() => {
                    toggleDropdown('ordenes');
                    setActiveMenu('ordenes');
                    if (!activeSubMenu.startsWith('ordenes_')) {
                      setActiveSubMenu('ordenes_compra');
                    }
                  }}
                  className={`w-full relative flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors duration-150 cursor-pointer ${
                    activeMenu === 'ordenes'
                      ? 'bg-slate-800 text-slate-100 font-medium'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  {activeMenu === 'ordenes' && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-500 rounded-r-full" />
                  )}
                  <div className="flex items-center gap-3 min-w-0">
                    <ClipboardList className={`w-4 h-4 shrink-0 ${activeMenu === 'ordenes' ? 'text-blue-400' : 'text-slate-400'}`} />
                    <span className="truncate">Control de Órdenes</span>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-slate-500 transition-transform duration-200 ${openDropdowns.ordenes ? 'rotate-180 text-slate-300' : ''}`} />
                </button>

                {openDropdowns.ordenes && (
                  <div className="mt-1 space-y-0.5 pl-2 animate-in fade-in duration-150">
                    <button
                      onClick={() => {
                        setActiveMenu('ordenes');
                        setActiveSubMenu('ordenes_clientes');
                      }}
                      className={`w-full flex items-center gap-2.5 pl-8 pr-3 py-1.5 rounded-md text-xs transition-colors duration-150 cursor-pointer ${
                        activeMenu === 'ordenes' && activeSubMenu === 'ordenes_clientes'
                          ? 'bg-slate-800/90 text-blue-400 font-medium'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        activeMenu === 'ordenes' && activeSubMenu === 'ordenes_clientes' ? 'bg-blue-400' : 'bg-slate-600'
                      }`} />
                      <span className="truncate">Órdenes de Clientes</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveMenu('ordenes');
                        setActiveSubMenu('ordenes_compra');
                      }}
                      className={`w-full flex items-center gap-2.5 pl-8 pr-3 py-1.5 rounded-md text-xs transition-colors duration-150 cursor-pointer ${
                        activeMenu === 'ordenes' && (activeSubMenu === 'ordenes_compra' || !activeSubMenu)
                          ? 'bg-slate-800/90 text-blue-400 font-medium'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        activeMenu === 'ordenes' && (activeSubMenu === 'ordenes_compra' || !activeSubMenu) ? 'bg-blue-400' : 'bg-slate-600'
                      }`} />
                      <span className="truncate">Órdenes de Compra</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveMenu('ordenes');
                        setActiveSubMenu('ordenes_recepcion');
                      }}
                      className={`w-full flex items-center gap-2.5 pl-8 pr-3 py-1.5 rounded-md text-xs transition-colors duration-150 cursor-pointer ${
                        activeMenu === 'ordenes' && activeSubMenu === 'ordenes_recepcion'
                          ? 'bg-slate-800/90 text-blue-400 font-medium'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        activeMenu === 'ordenes' && activeSubMenu === 'ordenes_recepcion' ? 'bg-blue-400' : 'bg-slate-600'
                      }`} />
                      <span className="truncate">Recepción de Mercadería</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveMenu('ordenes');
                        setActiveSubMenu('ordenes_predicciones');
                      }}
                      className={`w-full flex items-center gap-2.5 pl-8 pr-3 py-1.5 rounded-md text-xs transition-colors duration-150 cursor-pointer ${
                        activeMenu === 'ordenes' && activeSubMenu === 'ordenes_predicciones'
                          ? 'bg-slate-800/90 text-emerald-400 font-medium'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        activeMenu === 'ordenes' && activeSubMenu === 'ordenes_predicciones' ? 'bg-emerald-400' : 'bg-slate-600'
                      }`} />
                      <span className="truncate">✨ Sugerencias de Reabastecimiento</span>
                    </button>
                  </div>
                )}
              </div>

              {/* 6. MENÚ DESPLEGABLE: Gestión de Inventario */}
              <div>
                <button
                  onClick={() => {
                    toggleDropdown('inventario');
                    setActiveMenu('inventario');
                    if (!activeSubMenu.startsWith('inventario_')) {
                      setActiveSubMenu('inventario_movimientos');
                    }
                  }}
                  className={`w-full relative flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors duration-150 cursor-pointer ${
                    activeMenu === 'inventario'
                      ? 'bg-slate-800 text-slate-100 font-medium'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  {activeMenu === 'inventario' && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-500 rounded-r-full" />
                  )}
                  <div className="flex items-center gap-3 min-w-0">
                    <Boxes className={`w-4 h-4 shrink-0 ${activeMenu === 'inventario' ? 'text-blue-400' : 'text-slate-400'}`} />
                    <span className="truncate">Gestión de Inventario</span>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-slate-500 transition-transform duration-200 ${openDropdowns.inventario ? 'rotate-180 text-slate-300' : ''}`} />
                </button>

                {openDropdowns.inventario && (
                  <div className="mt-1 space-y-0.5 pl-2 animate-in fade-in duration-150">
                    <button
                      onClick={() => {
                        setActiveMenu('inventario');
                        setActiveSubMenu('inventario_stock');
                      }}
                      className={`w-full flex items-center gap-2.5 pl-8 pr-3 py-1.5 rounded-md text-xs transition-colors duration-150 cursor-pointer ${
                        activeMenu === 'inventario' && activeSubMenu === 'inventario_stock'
                          ? 'bg-slate-800/90 text-blue-400 font-medium'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        activeMenu === 'inventario' && activeSubMenu === 'inventario_stock' ? 'bg-blue-400' : 'bg-slate-600'
                      }`} />
                      <span className="truncate">Stock y Productos</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveMenu('inventario');
                        setActiveSubMenu('inventario_movimientos');
                      }}
                      className={`w-full flex items-center gap-2.5 pl-8 pr-3 py-1.5 rounded-md text-xs transition-colors duration-150 cursor-pointer ${
                        activeMenu === 'inventario' && activeSubMenu === 'inventario_movimientos'
                          ? 'bg-slate-800/90 text-blue-400 font-medium'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        activeMenu === 'inventario' && activeSubMenu === 'inventario_movimientos' ? 'bg-blue-400' : 'bg-slate-600'
                      }`} />
                      <span className="truncate">Kardex y Movimientos</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveMenu('inventario');
                        setActiveSubMenu('inventario_ajustes');
                      }}
                      className={`w-full flex items-center gap-2.5 pl-8 pr-3 py-1.5 rounded-md text-xs transition-colors duration-150 cursor-pointer ${
                        activeMenu === 'inventario' && activeSubMenu === 'inventario_ajustes'
                          ? 'bg-slate-800/90 text-blue-400 font-medium'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        activeMenu === 'inventario' && activeSubMenu === 'inventario_ajustes' ? 'bg-blue-400' : 'bg-slate-600'
                      }`} />
                      <span className="truncate">Ajustes de Inventario</span>
                    </button>
                  </div>
                )}
              </div>

              {/* 7. Gestión de Proveedores */}
              <button
                onClick={() => {
                  setActiveMenu('proveedores');
                  setActiveSubMenu('proveedores_lista');
                }}
                className={`w-full relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150 cursor-pointer ${
                  activeMenu === 'proveedores'
                    ? 'bg-slate-800 text-slate-100 font-medium'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                {activeMenu === 'proveedores' && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-500 rounded-r-full" />
                )}
                <Truck className={`w-4 h-4 shrink-0 ${activeMenu === 'proveedores' ? 'text-blue-400' : 'text-slate-400'}`} />
                <span className="truncate">Gestión de Proveedores</span>
              </button>

              {/* 8. Gestión de Clientes */}
              <button
                onClick={() => {
                  setActiveMenu('clientes');
                  setActiveSubMenu('clientes_lista');
                }}
                className={`w-full relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150 cursor-pointer ${
                  activeMenu === 'clientes'
                    ? 'bg-slate-800 text-slate-100 font-medium'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                {activeMenu === 'clientes' && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-500 rounded-r-full" />
                )}
                <Users className={`w-4 h-4 shrink-0 ${activeMenu === 'clientes' ? 'text-blue-400' : 'text-slate-400'}`} />
                <span className="truncate">Gestión de Clientes</span>
              </button>
            </div>
          </div>

        </div>

        {/* Zona Inferior del Sidebar: Datos de la Empresa, Mi Cuenta, Sesión Activa y Botón Salir */}
        <div className="p-3 border-t border-slate-800/80 space-y-1">
          
          {/* Opción Datos de la Empresa */}
          <button
            onClick={() => {
              setActiveMenu('empresa');
              setActiveSubMenu('empresa_datos');
            }}
            className={`w-full relative flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors duration-150 cursor-pointer ${
              activeMenu === 'empresa'
                ? 'bg-slate-800 text-slate-100 font-medium'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            {activeMenu === 'empresa' && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-500 rounded-r-full" />
            )}
            <div className="flex items-center gap-3 min-w-0">
              <Building2 className={`w-4 h-4 shrink-0 ${activeMenu === 'empresa' ? 'text-blue-400' : 'text-slate-400'}`} />
              <span className="truncate">Datos de la Empresa</span>
            </div>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border transition-colors ${
              activeMenu === 'empresa'
                ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700/50'
            }`}>
              RUC
            </span>
          </button>

          {/* Opción Mi Cuenta */}
          <button
            onClick={() => {
              setActiveMenu('micuenta');
              setActiveSubMenu('micuenta_perfil');
            }}
            className={`w-full relative flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors duration-150 cursor-pointer ${
              activeMenu === 'micuenta'
                ? 'bg-slate-800 text-slate-100 font-medium'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            {activeMenu === 'micuenta' && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-500 rounded-r-full" />
            )}
            <div className="flex items-center gap-3 min-w-0">
              <UserCircle className={`w-4 h-4 shrink-0 ${activeMenu === 'micuenta' ? 'text-blue-400' : 'text-slate-400'}`} />
              <span className="truncate">Mi Cuenta</span>
            </div>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border transition-colors ${
              activeMenu === 'micuenta'
                ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700/50'
            }`}>
              Perfil
            </span>
          </button>

          {/* Estado de Sesión Activa */}
          <div className="flex items-center gap-2 px-3 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-xs text-slate-400">Sesión activa</span>
          </div>

          {/* Botón Salir */}
          <button
            onClick={async () => {
              try {
                await api.auth.logout();
              } catch (err) {
                // ignorar
              }
              onLogout();
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors duration-150 cursor-pointer text-sm font-medium"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* ============================================================ */}
      {/* ÁREA DE CONTENIDO PRINCIPAL Y HEADER SUPERIOR                */}
      {/* ============================================================ */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto bg-[#f8fafc]">
        
        {/* Barra Superior / Header */}
        <header className="h-16 bg-white border-b border-slate-200/90 px-8 flex items-center justify-between shrink-0 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <h1 className="text-slate-800 text-base font-bold tracking-tight">
              {activeMenu === 'empresa'
                ? 'Configuración Oficial: Datos de la Empresa (Comercial Valencia)'
                : activeMenu === 'micuenta'
                ? 'Mi Cuenta: Configuración del Perfil'
                : activeMenu === 'usuarios'
                ? 'Gestión de Personal y Usuarios'
                : activeMenu === 'ordenes' && activeSubMenu === 'ordenes_clientes'
                ? 'Control de Órdenes: Órdenes de Clientes y Pedidos'
                : activeMenu === 'ordenes' && activeSubMenu === 'ordenes_compra'
                ? 'Control de Órdenes: Órdenes de Compra y Pedidos a Proveedores'
                : activeMenu === 'ordenes' && activeSubMenu === 'ordenes_recepcion'
                ? 'Control de Órdenes: Recepción de Pedidos'
                : activeMenu === 'ordenes' && activeSubMenu === 'ordenes_despachos'
                ? 'Control de Órdenes: Historial de Despachos'
                : activeMenu === 'ordenes'
                ? 'Control de Órdenes: Órdenes de Compra'
                : activeMenu === 'inventario' && activeSubMenu === 'inventario_stock'
                ? 'Gestión de Inventario: Catálogo Maestro de Productos'
                : activeMenu === 'inventario' && activeSubMenu === 'inventario_ajustes'
                ? 'Gestión de Inventario: Ajustes y Mermas'
                : activeMenu === 'inventario'
                ? 'Gestión de Inventario: Control de Stock y Kardex'
                : activeMenu === 'catalogos' && activeSubMenu === 'catalogos_canales'
                ? 'Gestión de Catálogos: Canales de Pedido'
                : activeMenu === 'catalogos'
                ? 'Gestión de Catálogos: Categorías de Productos'
                : activeMenu === 'seguridad' && activeSubMenu === 'seguridad_cargos'
                ? 'Roles y Seguridad: Cargos de Personal'
                : activeMenu === 'seguridad'
                ? 'Roles y Seguridad: Roles de Usuario'
                : activeMenu === 'indicadores'
                ? 'Panel de Control: Indicadores Globales y Métricas'
                : activeMenu === 'clientes'
                ? 'Gestión Comercial: Directorio de Clientes'
                : activeMenu === 'proveedores'
                ? 'Gestión de Abastecimiento: Directorio de Proveedores'
                : 'Módulo del Sistema'}
            </h1>
          </div>
          <button
            onClick={() => {
              setActiveMenu('micuenta');
              setActiveSubMenu('micuenta_perfil');
            }}
            className="flex items-center gap-3.5 text-sm text-slate-600 hover:bg-slate-100/90 px-3.5 py-1.5 rounded-xl transition cursor-pointer border border-transparent hover:border-slate-200"
            title="Ver y editar Mi Cuenta"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-semibold text-slate-800">{user?.nombreCompleto || user?.usuario || 'admin'}</span>
            <span className="text-slate-300">|</span>
            <span className="text-blue-600 font-semibold bg-blue-50 px-3 py-1 rounded-lg border border-blue-100 text-xs">
              {user?.cargo || 'Personal Autorizado'}
            </span>
          </button>
        </header>

        {/* Contenido Renderizado Dinámico */}
        <div className="p-8 max-w-[1440px] w-full mx-auto">
          {children ? (
            children
          ) : activeMenu === 'empresa' ? (
            <GestionEmpresa />
          ) : activeMenu === 'micuenta' ? (
            <MiCuenta user={user} onUpdateUserData={onUpdateUserData} />
          ) : activeMenu === 'usuarios' ? (
            <GestionUsuarios />
          ) : activeMenu === 'clientes' ? (
            <GestionClientes />
          ) : activeMenu === 'proveedores' ? (
            <GestionProveedores />
          ) : activeMenu === 'ordenes' && activeSubMenu === 'ordenes_clientes' ? (
            <GestionOrdenesCliente 
              aiPrefill={aiOrderPrefill}
              onClearAiPrefill={() => setAiOrderPrefill(null)}
            />
          ) : activeMenu === 'ordenes' && (activeSubMenu === 'ordenes_compra' || !activeSubMenu) ? (
            <GestionOrdenesCompra 
              aiPrefill={aiPurchaseOrderPrefill}
              onClearAiPrefill={() => setAiPurchaseOrderPrefill(null)}
              onNavigateToPredicciones={() => {
                setActiveSubMenu('ordenes_predicciones');
                setOpenDropdowns(prev => ({ ...prev, ordenes: true }));
              }}
              onNavigateToRecepcion={() => {
                setActiveSubMenu('ordenes_recepcion');
                setOpenDropdowns(prev => ({ ...prev, ordenes: true }));
              }}
            />
          ) : activeMenu === 'ordenes' && activeSubMenu === 'ordenes_recepcion' ? (
            <GestionRecepcionMercaderia />
          ) : activeMenu === 'ordenes' && activeSubMenu === 'ordenes_predicciones' ? (
            <PrediccionesCompra
              onNavigateToOrdenCompra={(prefill) => {
                setAiPurchaseOrderPrefill(prefill);
                setActiveSubMenu('ordenes_compra');
                setOpenDropdowns(prev => ({ ...prev, ordenes: true }));
              }}
            />
          ) : activeMenu === 'inventario' && activeSubMenu === 'inventario_stock' ? (
            <GestionProductos />
          ) : activeMenu === 'inventario' && activeSubMenu === 'inventario_ajustes' ? (
            <GestionAjustesInventario />
          ) : activeMenu === 'inventario' ? (
            <GestionMovimientos />
          ) : activeMenu === 'catalogos' && activeSubMenu === 'catalogos_canales' ? (
            <GestionCanalesPedido />
          ) : activeMenu === 'catalogos' && activeSubMenu === 'catalogos_ubicaciones' ? (
            <GestionUbicaciones />
          ) : activeMenu === 'catalogos' && activeSubMenu === 'catalogos_unidades' ? (
            <GestionUnidadesMedida />
          ) : activeMenu === 'catalogos' ? (
            <GestionCategorias />
          ) : activeMenu === 'seguridad' && activeSubMenu === 'seguridad_cargos' ? (
            <GestionCargos />
          ) : activeMenu === 'seguridad' ? (
            <GestionRoles />
          ) : activeMenu === 'indicadores' ? (
            <Dashboard />
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-14 text-center shadow-xs">
              <Boxes className="w-14 h-14 text-slate-300 mx-auto mb-3.5" />
              <h3 className="text-base font-bold text-slate-800">Módulo en Construcción</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                Este módulo se habilitará en las siguientes etapas del proyecto.
              </p>
              <button
                onClick={() => {
                  setActiveMenu('catalogos');
                  setActiveSubMenu('catalogos_categorias');
                }}
                className="mt-5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Ir a Catálogos
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Asistente Virtual Valencia Bot */}
      <ChatBotWidget />

    </div>
  );
}
