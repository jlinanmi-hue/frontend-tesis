import React from 'react';
import { Award, AlertOctagon, TrendingDown } from 'lucide-react';

export default function TopCausasProblemas({ causasData }) {
  const causas = causasData && causasData.length > 0 ? causasData : [
    { puesto: 1, motivo: 'Rechazo Voluntario del Cliente', cantidad: 3, monto_riesgo: 642.50 },
    { puesto: 2, motivo: 'Quiebre de Stock Físico en Almacén', cantidad: 1, monto_riesgo: 180.00 },
    { puesto: 3, motivo: 'Error en Dirección de Entrega', cantidad: 1, monto_riesgo: 120.00 },
  ];

  const medallas = {
    1: { medal: '🥇', label: '1er Lugar', border: 'border-amber-300', bg: 'bg-amber-50/50', text: 'text-amber-800' },
    2: { medal: '🥈', label: '2do Lugar', border: 'border-slate-300', bg: 'bg-slate-50/80', text: 'text-slate-700' },
    3: { medal: '🥉', label: '3er Lugar', border: 'border-amber-200/80', bg: 'bg-orange-50/40', text: 'text-orange-800' },
  };

  const primeraCausa = causas[0];

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4 min-w-0 overflow-hidden">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-200/70">
              <AlertOctagon className="w-4 h-4" />
            </span>
            <h3 className="text-base font-bold text-slate-800">
              Principales Causas de Problema
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Las 3 razones que más problemas causaron en el período.
          </p>
        </div>

        <span className="text-xs font-semibold text-slate-400 self-start sm:self-auto">
          Podio de Incidencias
        </span>
      </div>

      {/* Podio Top 3 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {causas.slice(0, 3).map((item, index) => {
          const m = medallas[item.puesto || index + 1] || medallas[1];

          return (
            <div
              key={item.motivo}
              className={`rounded-2xl p-4 border ${m.border} ${m.bg} shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between min-w-0 overflow-hidden`}
            >
              <div className="min-w-0">
                {/* Medalla y Posición */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xl shrink-0">{m.medal}</span>
                    <span className={`text-[11px] font-bold ${m.text} whitespace-nowrap`}>
                      {m.label}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-white/80 px-2 py-0.5 rounded-full border border-slate-200/80 text-slate-600 shrink-0">
                    Top {item.puesto || index + 1}
                  </span>
                </div>

                {/* Motivo */}
                <h4 className="text-sm font-extrabold text-slate-800 leading-snug break-words line-clamp-3 min-h-[3.25rem]">
                  {item.motivo}
                </h4>
              </div>

              {/* Métricas: Pedidos Afectados y Monto en S/ (segundo plano) */}
              <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-end justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-400 block font-medium">Pedidos afectados</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-mono font-extrabold text-slate-900">
                      {item.cantidad}
                    </span>
                    <span className="text-[11px] text-slate-500 font-semibold">órdenes</span>
                  </div>
                </div>

                {/* Monto en riesgo (segundo plano discreto) */}
                <div className="text-right shrink-0">
                  <span className="text-[9px] text-slate-400 block uppercase font-bold">Monto en riesgo</span>
                  <span className="text-xs font-mono font-bold text-slate-500 bg-white/70 px-2 py-0.5 rounded border border-slate-200/60 inline-block whitespace-nowrap">
                    S/ {Number(item.monto_riesgo || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Frase de Cierre Interpretada */}
      <div className="pt-3 border-t border-slate-100 flex items-start gap-2 text-xs text-slate-600">
        <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 mt-1" />
        <span className="font-medium leading-relaxed break-words min-w-0">
          {primeraCausa
            ? `El motivo "${primeraCausa.motivo}" es el foco principal con ${primeraCausa.cantidad} pedidos y S/ ${Number(primeraCausa.monto_riesgo || 0).toFixed(2)} en valor retenido.`
            : 'No se registran causas críticas de fallo en el período seleccionado.'}
        </span>
      </div>
    </div>
  );
}
