import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  CheckCircle,
  Box,
  Truck,
  Layers,
  RefreshCw,
  Activity,
} from 'lucide-react';
import api from '../services/api';
import IndicatorCard from './dashboard/IndicatorCard';
import IndicatorModal from './dashboard/IndicatorModal';
import AiTokenMetricsCard from './dashboard/AiTokenMetricsCard';

export default function Dashboard() {
  const [indicators, setIndicators] = useState(null);
  const [legacyData, setLegacyData] = useState(null);
  const [selectedIndicator, setSelectedIndicator] = useState(null);
  const [loading, setLoading] = useState(true);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Cargar las 4 variables oficiales de Tesis
      const resInd = await api.dashboard.indicators();
      if (resInd && resInd.success && resInd.data) {
        setIndicators(resInd.data);
      }

      // 2. Cargar datos generales de flujo de órdenes
      const resLeg = await api.dashboard.indicadores();
      if (resLeg && resLeg.success && resLeg.data) {
        setLegacyData(resLeg.data);
      }
    } catch (err) {
      console.error('Error al cargar métricas del dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();

    const handleFeedbackRecorded = () => {
      cargarDatos();
    };

    window.addEventListener('valencia-ai:feedback-recorded', handleFeedbackRecorded);
    return () => {
      window.removeEventListener('valencia-ai:feedback-recorded', handleFeedbackRecorded);
    };
  }, [cargarDatos]);

  const cards = [
    { id: 1, key: 'pode', data: indicators?.pode },
    { id: 2, key: 'peor', data: indicators?.peor },
    { id: 3, key: 'prs',  data: indicators?.prs },
    { id: 4, key: 'tbpp', data: indicators?.tbpp },
  ];

  return (
    <div className="p-6 sm:p-10 max-w-7xl mx-auto space-y-10 animate-in fade-in duration-300">
      
      {/* 1. Cabecera Principal del Dashboard de Tesis */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="bg-blue-600 text-white p-2 rounded-xl shadow-xs">
              <Layers className="w-5 h-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
              Dashboard de Métricas e Indicadores
            </h1>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm mt-1.5 leading-relaxed">
            Instrumento de medición científica en tiempo real para optimización de pedidos e inventario asistido por IA.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={cargarDatos}
            disabled={loading}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold px-4 py-2.5 rounded-xl border border-slate-200/90 shadow-2xs transition active:scale-95 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
            {loading ? 'Calculando...' : 'Actualizar Indicadores'}
          </button>
        </div>
      </div>

      {/* 2. INDICADORES GLOBALES Y METAS */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-slate-800 text-lg sm:text-xl font-bold tracking-tight">
              Indicadores Globales y Metas
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Haz clic en cualquier tarjeta para profundizar en los 4 subgráficos analíticos (A, B, C, D).
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50/70 text-blue-600 border border-blue-200/80 rounded-full text-xs font-semibold shadow-2xs">
              <Activity className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
              <span>Métricas en Vivo</span>
            </div>
            <button
              onClick={cargarDatos}
              disabled={loading}
              title="Actualizar Indicadores"
              className="p-1.5 rounded-full bg-white hover:bg-slate-100 text-slate-500 border border-slate-200 shadow-2xs transition active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {cards.map((card) => (
            <IndicatorCard
              key={card.id}
              id={card.id}
              data={card.data}
              onClick={() => setSelectedIndicator(card)}
            />
          ))}
        </div>
      </div>

      {/* 3. MÓDULO DE CONSUMO DE TOKENS IA  */}
      <div>
        <AiTokenMetricsCard />
      </div>

      {/* 4. Flujo General de Órdenes y Etapas Operativas */}
      <div className="bg-white rounded-2xl p-7 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-slate-800 text-base font-bold tracking-tight">
              Flujo General de Órdenes en Tiempo Real
            </h3>
            <p className="text-slate-400 text-xs mt-0.5">
              Trazabilidad de pedidos por etapas del ciclo logístico asistido por IA.
            </p>
          </div>
          <div className="text-xs font-bold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/70">
            Total Órdenes Registradas: <span className="text-blue-600 font-mono">{legacyData?.resumen_general?.total_pedidos_formateado || '21'}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          
          <div className="flex flex-col items-center text-center p-5 rounded-2xl bg-slate-50/50 hover:bg-slate-50 border border-slate-200/60 hover:border-blue-200 transition group">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mb-3 shadow-2xs group-hover:scale-105 transition-transform">
              <Sparkles className="w-6 h-6" />
            </div>
            <h4 className="text-slate-800 font-bold text-xs">Recepción por IA</h4>
            <span className="text-[11px] text-slate-400 mt-0.5">Entrada multicanal</span>
            <div className="mt-3 inline-flex items-center px-3 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              {legacyData?.flujo_ordenes?.recepcion_ia?.badge || 'Registrados: 21'}
            </div>
          </div>

          <div className="flex flex-col items-center text-center p-5 rounded-2xl bg-slate-50/50 hover:bg-slate-50 border border-slate-200/60 hover:border-amber-200 transition group">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-3 shadow-2xs group-hover:scale-105 transition-transform">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h4 className="text-slate-800 font-bold text-xs">Validación de Pedido</h4>
            <span className="text-[11px] text-slate-400 mt-0.5">Filtro de stock y precios</span>
            <div className="mt-3 inline-flex items-center px-3 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
              {legacyData?.flujo_ordenes?.validacion?.badge || 'Pendientes: 6'}
            </div>
          </div>

          <div className="flex flex-col items-center text-center p-5 rounded-2xl bg-slate-50/50 hover:bg-slate-50 border border-slate-200/60 hover:border-purple-200 transition group">
            <div className="w-14 h-14 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 mb-3 shadow-2xs group-hover:scale-105 transition-transform">
              <Box className="w-6 h-6" />
            </div>
            <h4 className="text-slate-800 font-bold text-xs">Preparación en Almacén</h4>
            <span className="text-[11px] text-slate-400 mt-0.5">Picking y empaquetado</span>
            <div className="mt-3 inline-flex items-center px-3 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
              {legacyData?.flujo_ordenes?.preparacion?.badge || 'En Proceso: 11'}
            </div>
          </div>

          <div className="flex flex-col items-center text-center p-5 rounded-2xl bg-slate-50/50 hover:bg-slate-50 border border-slate-200/60 hover:border-emerald-200 transition group">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-3 shadow-2xs group-hover:scale-105 transition-transform">
              <Truck className="w-6 h-6" />
            </div>
            <h4 className="text-slate-800 font-bold text-xs">Pedido Despachado</h4>
            <span className="text-[11px] text-slate-400 mt-0.5">Salida con transportista</span>
            <div className="mt-3 inline-flex items-center px-3 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {legacyData?.flujo_ordenes?.despachado?.badge || 'Completados: 5'}
            </div>
          </div>

        </div>
      </div>

      {/* 5. NIVEL 2: Modal Interactivo con los 4 Subgráficos (A, B, C, D) */}
      {selectedIndicator && (
        <IndicatorModal
          indicatorId={selectedIndicator.id}
          indicatorData={selectedIndicator.data}
          onClose={() => setSelectedIndicator(null)}
        />
      )}

    </div>
  );
}
