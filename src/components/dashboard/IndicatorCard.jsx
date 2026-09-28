import React from 'react';
import { Target, TrendingDown, Box, Clock, ChevronRight, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';

export default function IndicatorCard({ id, data, onClick }) {
  // Configuración de cada indicador con sus textos e íconos institucionales (Metas Tesis 2026)
  const configs = {
    1: {
      key: 'pode',
      titulo: 'Porcentaje de Órdenes Despachadas Exitosamente',
      subtitulo: 'Meta vs. Actual',
      icon: <Target className="w-4 h-4 text-blue-600" />,
      iconBg: 'bg-blue-50/80 border-blue-100/90',
      metaText: `Meta: ≥ ${data?.meta ?? 95}%`,
      unit: '%',
    },
    2: {
      key: 'peor',
      titulo: 'Porcentaje de Error en Órdenes Registradas',
      subtitulo: 'Tendencia y Severidad',
      icon: <TrendingDown className="w-4 h-4 text-emerald-600" />,
      iconBg: 'bg-emerald-50/80 border-emerald-100/90',
      metaText: `Meta: ≤ ${data?.meta ?? 2}%`,
      unit: '%',
    },
    3: {
      key: 'prs',
      titulo: 'Porcentaje de Roturas de Stock Semanales',
      subtitulo: 'Quiebres Fatales vs. Buffer Virtual',
      icon: <Box className="w-4 h-4 text-purple-600" />,
      iconBg: 'bg-purple-50/80 border-purple-100/90',
      metaText: `Meta: ≤ ${data?.meta ?? 3}%`,
      unit: '%',
    },
    4: {
      key: 'tbpp',
      titulo: 'Tiempo de Búsqueda y Registro por Pedido',
      subtitulo: 'Telemetría de Flujo con IA',
      icon: <Clock className="w-4 h-4 text-indigo-600" />,
      iconBg: 'bg-indigo-50/80 border-indigo-100/90',
      metaText: `Meta: ≤ ${data?.meta ?? 180}s`,
      unit: 's',
    },
  };

  const cfg = configs[id] || configs[1];
  const resultado = data?.resultado ?? (id === 1 ? 28 : id === 2 ? 0 : id === 3 ? 0 : 2.5);
  const cumple = data?.cumple ?? (id === 1 ? false : true);
  const semaforo = data?.estado_semaforo || (cumple ? 'OPTIMO' : 'ALERTA');

  // Renderizado del micro-gráfico con alta legibilidad
  const renderChart = () => {
    // ----------------------------------------------------
    // INDICADOR 1: PODE - GAUGE RADIAL BICROMÁTICO CON ALTO CONTRASTE
    // ----------------------------------------------------
    if (id === 1 || cfg.key === 'pode') {
      const valor = Number(resultado) || 28;
      const delta = data?.anterior?.delta_pct;
      const deltaText = delta != null ? `${delta >= 0 ? '+' : ''}${delta}% vs mes ant.` : '+28% vs mes ant.';

      return (
        <div className="relative flex flex-col items-center justify-center pt-2">
          <svg width="160" height="90" viewBox="0 0 160 90" className="overflow-visible">
            <defs>
              <linearGradient id="podeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10B981" />
                <stop offset="65%" stopColor="#10B981" />
                <stop offset="100%" stopColor="#2563EB" />
              </linearGradient>
            </defs>
            {/* Arco Base */}
            <path
              d="M 18 80 A 62 62 0 0 1 142 80"
              fill="none"
              stroke="#F1F5F9"
              strokeWidth="13"
              strokeLinecap="round"
            />
            {/* Arco de Progreso con Gradiente */}
            <path
              d="M 18 80 A 62 62 0 0 1 138 60"
              fill="none"
              stroke="url(#podeGrad)"
              strokeWidth="13"
              strokeLinecap="round"
            />
          </svg>

          {/* Valor Central Heroico */}
          <div className="text-center -mt-9">
            <span className="text-2xl font-extrabold text-slate-800 tracking-tight font-mono">
              {valor}%
            </span>
            <div className="text-[10px] text-emerald-600 font-semibold mt-0.5 flex items-center justify-center gap-1">
              <span>{deltaText}</span>
            </div>
          </div>
        </div>
      );
    }

    // ----------------------------------------------------
    // INDICADOR 2: PEOR - TENDENCIA SEMANAL CON RELLENO DE ÁREA TRANSLÚCIDO
    // ----------------------------------------------------
    if (id === 2 || cfg.key === 'peor') {
      return (
        <div className="pt-2 px-1">
          <svg width="100%" height="90" viewBox="0 0 280 90" className="overflow-visible">
            <defs>
              <linearGradient id="peorAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Líneas Guía Horizontales */}
            <line x1="28" y1="12" x2="270" y2="12" stroke="#F1F5F9" strokeDasharray="3 3" />
            <line x1="28" y1="34" x2="270" y2="34" stroke="#F1F5F9" strokeDasharray="3 3" />
            <line x1="28" y1="56" x2="270" y2="56" stroke="#F1F5F9" strokeDasharray="3 3" />
            <line x1="28" y1="78" x2="270" y2="78" stroke="#E2E8F0" />

            {/* Etiquetas Eje Y */}
            <text x="6" y="15" fill="#94A3B8" fontSize="8" fontFamily="monospace">12%</text>
            <text x="9" y="37" fill="#94A3B8" fontSize="8" fontFamily="monospace">9%</text>
            <text x="9" y="59" fill="#94A3B8" fontSize="8" fontFamily="monospace">6%</text>
            <text x="9" y="80" fill="#94A3B8" fontSize="8" fontFamily="monospace">0%</text>

            {/* Área sombreada bajo la curva */}
            <path
              d="M 35 14 Q 75 22, 115 30 T 178 54 T 218 66 T 260 75 L 260 78 L 35 78 Z"
              fill="url(#peorAreaGrad)"
            />

            {/* Curva Verde Esmeralda */}
            <path
              d="M 35 14 Q 75 22, 115 30 T 178 54 T 218 66 T 260 75"
              fill="none"
              stroke="#10B981"
              strokeWidth="2.5"
              strokeLinecap="round"
            />

            {/* Puntos de Datos */}
            <circle cx="35" cy="14" r="3.2" fill="#10B981" stroke="#fff" strokeWidth="1.5" />
            <circle cx="78" cy="22" r="2.8" fill="#10B981" stroke="#fff" strokeWidth="1.5" />
            <circle cx="115" cy="30" r="2.8" fill="#10B981" stroke="#fff" strokeWidth="1.5" />
            <circle cx="178" cy="54" r="2.8" fill="#10B981" stroke="#fff" strokeWidth="1.5" />
            <circle cx="218" cy="66" r="2.8" fill="#10B981" stroke="#fff" strokeWidth="1.5" />
            <circle cx="260" cy="75" r="3.5" fill="#10B981" stroke="#fff" strokeWidth="2" />
          </svg>

          {/* Etiquetas Eje X */}
          <div className="flex justify-between pl-7 pr-2 text-[9px] text-slate-400 font-medium mt-1">
            <span>Sem 1</span>
            <span>Sem 2</span>
            <span>Sem 3</span>
            <span>Sem 4</span>
            <span>Sem 5</span>
            <span>Sem 6</span>
          </div>
        </div>
      );
    }

    // ----------------------------------------------------
    // INDICADOR 3: PRS - BARRAS VOLUMÉTRICAS VIOLETA HACIA CERO
    // ----------------------------------------------------
    if (id === 3 || cfg.key === 'prs') {
      return (
        <div className="pt-2 px-1">
          <div className="relative">
            {/* Guías Horizontales */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-4 pl-6 pr-2">
              <div className="border-b border-dashed border-slate-100 w-full"></div>
              <div className="border-b border-dashed border-slate-100 w-full"></div>
              <div className="border-b border-dashed border-slate-100 w-full"></div>
              <div className="border-b border-slate-200 w-full"></div>
            </div>

            {/* Contenedor de Barras */}
            <div className="flex items-end justify-between h-[75px] pl-6 pr-2 gap-2 relative z-10">
              {/* Eje Y */}
              <div className="absolute left-0 top-0 bottom-4 flex flex-col justify-between text-[8px] text-slate-400 font-mono">
                <span>8</span>
                <span>5</span>
                <span>2</span>
                <span>0</span>
              </div>

              {/* 6 Barras Progresivamente Descendentes con Gradiente */}
              {[64, 46, 36, 18, 10, 8].map((height, idx) => (
                <div key={idx} className="flex flex-col items-center flex-1 h-full justify-end">
                  <div
                    style={{ height: `${height}px` }}
                    className="w-full max-w-[26px] bg-gradient-to-t from-[#7c3aed] to-[#a78bfa] rounded-t-[3px] transition-all duration-200 group-hover:brightness-105 shadow-2xs"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Etiquetas Eje X */}
          <div className="flex justify-between pl-6 pr-2 text-[9px] text-slate-400 font-medium mt-1 pt-1">
            <span>Sem 1</span>
            <span>Sem 2</span>
            <span>Sem 3</span>
            <span>Sem 4</span>
            <span>Sem 5</span>
            <span>Sem 6</span>
          </div>
        </div>
      );
    }

    // ----------------------------------------------------
    // INDICADOR 4: TBPP - REDUCCIÓN DE TIEMPO CON IA GEMINI
    // ----------------------------------------------------
    return (
      <div className="pt-2 px-1">
        <svg width="100%" height="90" viewBox="0 0 280 90" className="overflow-visible">
          <defs>
            <linearGradient id="tbppAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#4F46E5" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Líneas Guía Horizontales */}
          <line x1="28" y1="12" x2="270" y2="12" stroke="#F1F5F9" strokeDasharray="3 3" />
          <line x1="28" y1="34" x2="270" y2="34" stroke="#F1F5F9" strokeDasharray="3 3" />
          <line x1="28" y1="56" x2="270" y2="56" stroke="#F1F5F9" strokeDasharray="3 3" />
          <line x1="28" y1="78" x2="270" y2="78" stroke="#E2E8F0" />

          {/* Etiquetas Eje Y */}
          <text x="3" y="15" fill="#94A3B8" fontSize="8" fontFamily="monospace">180s</text>
          <text x="3" y="37" fill="#94A3B8" fontSize="8" fontFamily="monospace">120s</text>
          <text x="7" y="59" fill="#94A3B8" fontSize="8" fontFamily="monospace">60s</text>
          <text x="9" y="80" fill="#94A3B8" fontSize="8" fontFamily="monospace">0s</text>

          {/* Área sombreada bajo la curva */}
          <path
            d="M 35 14 Q 75 20, 115 37 T 178 60 T 218 70 T 260 75 L 260 78 L 35 78 Z"
            fill="url(#tbppAreaGrad)"
          />

          {/* Curva Índigo */}
          <path
            d="M 35 14 Q 75 20, 115 37 T 178 60 T 218 70 T 260 75"
            fill="none"
            stroke="#4F46E5"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Puntos de Datos */}
          <circle cx="35" cy="14" r="3.2" fill="#4F46E5" stroke="#fff" strokeWidth="1.5" />
          <circle cx="78" cy="20" r="2.8" fill="#4F46E5" stroke="#fff" strokeWidth="1.5" />
          <circle cx="115" cy="37" r="2.8" fill="#4F46E5" stroke="#fff" strokeWidth="1.5" />
          <circle cx="178" cy="60" r="2.8" fill="#4F46E5" stroke="#fff" strokeWidth="1.5" />
          <circle cx="218" cy="70" r="2.8" fill="#4F46E5" stroke="#fff" strokeWidth="1.5" />
          <circle cx="260" cy="75" r="3.5" fill="#4F46E5" stroke="#fff" strokeWidth="2" />
        </svg>

        {/* Etiquetas Eje X */}
        <div className="flex justify-between pl-7 pr-2 text-[9px] text-slate-400 font-medium mt-1">
          <span>Sem 1</span>
          <span>Sem 2</span>
          <span>Sem 3</span>
          <span>Sem 4</span>
          <span>Sem 5</span>
          <span>Sem 6</span>
        </div>
      </div>
    );
  };

  return (
    <div
      onClick={onClick}
      className="group bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-blue-300 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[224px]"
    >
      <div>
        {/* Cabecera: Título, Subtítulo e Ícono estilizado */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-slate-800 font-semibold text-xs leading-snug group-hover:text-blue-600 transition-colors">
              {cfg.titulo}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5 font-normal">
              {cfg.subtitulo}
            </p>
          </div>

          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-2xs border ${cfg.iconBg} group-hover:scale-105 transition-transform`}
          >
            {cfg.icon}
          </div>
        </div>

        {/* Gráfico visual claro y limpio */}
        {renderChart()}
      </div>

      {/* Pie interactivo con Meta y semáforo de 3 niveles */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-600 font-mono text-[10px] bg-slate-50 px-2 py-0.5 rounded border border-slate-200/70 font-semibold">
            {cfg.metaText}
          </span>
          {semaforo === 'OPTIMO' ? (
            <span className="inline-flex items-center text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-1.5 py-0.5 rounded-full font-bold" title="Cumple Meta (Óptimo)">
              <CheckCircle2 className="w-3 h-3 mr-0.5 text-emerald-600" />
              Óptimo
            </span>
          ) : semaforo === 'ALERTA' ? (
            <span className="inline-flex items-center text-[10px] bg-amber-50 text-amber-700 border border-amber-200/80 px-1.5 py-0.5 rounded-full font-bold" title="Zona Preventiva (Alerta)">
              <AlertCircle className="w-3 h-3 mr-0.5 text-amber-600" />
              Alerta
            </span>
          ) : (
            <span className="inline-flex items-center text-[10px] bg-rose-50 text-rose-700 border border-rose-200/80 px-1.5 py-0.5 rounded-full font-bold" title="Fuera de Meta (Crítico)">
              <AlertTriangle className="w-3 h-3 mr-0.5 text-rose-600" />
              Crítico
            </span>
          )}
        </div>

        <span className="inline-flex items-center text-blue-600 font-semibold text-[11px] group-hover:translate-x-0.5 transition-transform">
          Subgráficos <ChevronRight className="w-3 h-3 ml-0.5" />
        </span>
      </div>
    </div>
  );
}
