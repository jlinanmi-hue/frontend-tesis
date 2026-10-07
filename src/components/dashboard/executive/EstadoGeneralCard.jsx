import React from 'react';
import { ShieldCheck, AlertCircle, AlertTriangle, TrendingUp, Sparkles } from 'lucide-react';
import { fraseResumen } from '../helpers/dashboardFormatters';

export default function EstadoGeneralCard({ estado, indicators }) {
  const score = Number(estado?.score ?? 85);
  const semaforo = estado?.semaforo || (score >= 85 ? 'OPTIMO' : score >= 70 ? 'ALERTA' : 'CRITICO');

  // Si el backend ya mandó frase o usamos la utilidad con datos enriquecidos
  const frase = estado?.frase || fraseResumen(score, indicators);
  const resumenSemanal = estado?.resumen_semanal || 'Rendimiento general calculado con base en despachos a tiempo e inventario.';

  // Configuración de estilo según semáforo
  const config = {
    OPTIMO: {
      label: 'Operación Óptima',
      sub: 'Bajo Control',
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200/90',
      dotColor: 'bg-emerald-500',
      ringColor: 'ring-emerald-400/30',
      icon: <ShieldCheck className="w-6 h-6 text-emerald-600" />,
      barColor: 'bg-emerald-500',
      bgGradient: 'from-emerald-500/10 via-emerald-500/5 to-transparent',
    },
    ALERTA: {
      label: 'Atención Requerida',
      sub: 'Desvíos Moderados',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200/90',
      dotColor: 'bg-amber-500',
      ringColor: 'ring-amber-400/30',
      icon: <AlertCircle className="w-6 h-6 text-amber-600" />,
      barColor: 'bg-amber-500',
      bgGradient: 'from-amber-500/10 via-amber-500/5 to-transparent',
    },
    CRITICO: {
      label: 'Acción Inmediata',
      sub: 'Focos Críticos',
      badgeClass: 'bg-rose-50 text-rose-800 border-rose-200/90',
      dotColor: 'bg-rose-500',
      ringColor: 'ring-rose-400/30',
      icon: <AlertTriangle className="w-6 h-6 text-rose-600" />,
      barColor: 'bg-rose-500',
      bgGradient: 'from-rose-500/10 via-rose-500/5 to-transparent',
    },
  }[semaforo] || {
    label: 'En Evaluación',
    sub: 'Calculando',
    badgeClass: 'bg-slate-50 text-slate-800 border-slate-200',
    dotColor: 'bg-slate-500',
    ringColor: 'ring-slate-400/30',
    icon: <Sparkles className="w-6 h-6 text-slate-600" />,
    barColor: 'bg-blue-600',
    bgGradient: 'from-blue-500/10 via-blue-500/5 to-transparent',
  };

  return (
    <div className={`relative overflow-hidden bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/90 shadow-2xs transition-all`}>
      {/* Halo de color semántico sutil de fondo */}
      <div className={`absolute top-0 right-0 w-96 h-96 bg-gradient-to-br ${config.bgGradient} rounded-full blur-3xl pointer-events-none -mr-20 -mt-20`} />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        
        {/* Lado Izquierdo: Semáforo y Frase Ejecutiva */}
        <div className="space-y-3 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Diagnóstico Operativo General
            </span>
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${config.badgeClass} shadow-2xs`}>
              <span className={`w-2 h-2 rounded-full ${config.dotColor} animate-pulse`} />
              <span>{config.label}</span>
            </div>
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight leading-snug">
              {frase}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
              {resumenSemanal}
            </p>
          </div>
        </div>

        {/* Lado Derecho: Puntuación de Salud (Score 0-100) */}
        <div className="shrink-0 flex items-center gap-4 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/70 shadow-2xs">
          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Score de Salud
            </span>
            <div className="flex items-baseline justify-end gap-1">
              <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-mono tracking-tight">
                {score}
              </span>
              <span className="text-xs font-semibold text-slate-400">/100</span>
            </div>
            <span className="text-[11px] font-medium text-slate-500 block mt-0.5">
              {config.sub}
            </span>
          </div>

          <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-center shrink-0">
            {config.icon}
          </div>
        </div>

      </div>

      {/* Barra de Progreso Semántica Inferior */}
      <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-3">
        <div className="grow h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full ${config.barColor} transition-all duration-700 rounded-full`}
            style={{ width: `${Math.max(5, Math.min(100, score))}%` }}
          />
        </div>
        <span className="text-[11px] font-mono font-bold text-slate-600 shrink-0">
          Nivel de Eficiencia {score}%
        </span>
      </div>
    </div>
  );
}
