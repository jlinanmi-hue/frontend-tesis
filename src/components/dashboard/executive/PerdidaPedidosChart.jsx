import React from 'react';
import { ArrowRight, AlertCircle, CheckCircle2, Filter, Layers } from 'lucide-react';

export default function PerdidaPedidosChart({ perdidaData }) {
  const etapas = perdidaData?.etapas || [
    { nombre: 'Recepción', entrada: 45, salida: 45, perdidos: 0, motivos: [] },
    { nombre: 'Validación', entrada: 45, salida: 43, perdidos: 2, motivos: [{ causa: 'Cancelación del cliente', cantidad: 2 }] },
    { nombre: 'Preparación', entrada: 43, salida: 42, perdidos: 1, motivos: [{ causa: 'Quiebre de stock físico', cantidad: 1 }] },
    { nombre: 'Despacho', entrada: 42, salida: 40, perdidos: 2, motivos: [{ causa: 'Dirección o cliente ausente', cantidad: 2 }] },
  ];

  const resumen = perdidaData?.resumen || {
    total_ingresados: 45,
    total_completados: 40,
    total_perdidos: 5,
    tasa_exito: 88.9,
  };

  // Encontrar la etapa con mayor pérdida
  const mayorPerdida = [...etapas].sort((a, b) => b.perdidos - a.perdidos)[0];
  const motivoPrincipal = mayorPerdida?.motivos?.[0]?.causa || 'solicitudes de cancelación';

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200/90 shadow-2xs space-y-5 min-w-0 overflow-hidden">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200/70">
              <Filter className="w-4 h-4" />
            </span>
            <h3 className="text-base font-bold text-slate-800">
              Pérdida de Pedidos por Etapa
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Etapas del proceso logístico donde se detienen o cancelan pedidos.
          </p>
        </div>

        {/* Resumen Global */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <span className="bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/70">
            Éxito de Flujo: <span className="font-mono text-blue-600 font-bold">{resumen.tasa_exito}%</span>
          </span>
        </div>
      </div>

      {/* Visualización de las 4 Etapas Balanceadas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {etapas.map((etapa, idx) => {
          const pctRetencion = etapa.entrada > 0 ? ((etapa.salida / etapa.entrada) * 100).toFixed(0) : 100;
          const tienePerdidas = etapa.perdidos > 0;

          return (
            <div
              key={etapa.nombre}
              className={`rounded-2xl p-4 border transition flex flex-col justify-between min-w-0 ${
                tienePerdidas
                  ? 'bg-slate-50/70 border-slate-200/90 hover:border-amber-300'
                  : 'bg-emerald-50/30 border-emerald-200/60'
              }`}
            >
              <div>
                {/* Paso y Nombre */}
                <div className="flex items-center justify-between gap-1 mb-2">
                  <span className="text-[11px] font-bold text-slate-400">
                    Paso {idx + 1}
                  </span>
                  {tienePerdidas ? (
                    <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                      -{etapa.perdidos} pedidos
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      100% fluido
                    </span>
                  )}
                </div>

                <h4 className="text-sm font-extrabold text-slate-800">
                  {etapa.nombre}
                </h4>

                {/* Métricas de Flujo Entrada -> Salida */}
                <div className="mt-3 flex items-center justify-between text-xs text-slate-600 font-mono">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">Entrada</span>
                    <span className="font-bold text-slate-800">{etapa.entrada}</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-sans">Avanzan</span>
                    <span className="font-bold text-emerald-700">{etapa.salida}</span>
                  </div>
                </div>

                {/* Barra de Retención */}
                <div className="mt-2.5 h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      tienePerdidas ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${pctRetencion}%` }}
                  />
                </div>
              </div>

              {/* Motivo de Caída (si aplica) */}
              <div className="mt-3 pt-2.5 border-t border-slate-200/60 text-[11px]">
                {tienePerdidas && etapa.motivos && etapa.motivos.length > 0 ? (
                  <div className="text-slate-600">
                    <span className="text-[10px] text-slate-400 block font-semibold">Causa principal:</span>
                    <span className="text-rose-700 font-medium">
                      {etapa.motivos[0].causa} ({etapa.motivos[0].cantidad})
                    </span>
                  </div>
                ) : (
                  <span className="text-emerald-700 font-medium text-[11px] flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 inline" /> Cero pérdidas en etapa
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Frase de Cierre Interpretada */}
      <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
          <span className="font-medium">
            {mayorPerdida && mayorPerdida.perdidos > 0
              ? `Foco de atención en ${mayorPerdida.nombre}: se registraron ${mayorPerdida.perdidos} pedidos no entregados por ${motivoPrincipal.toLowerCase()}.`
              : 'Flujo completamente eficiente: todas las órdenes avanzaron sin retención.'}
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono self-end sm:self-auto">
          <span>Ingresados: <strong className="text-slate-700">{resumen.total_ingresados}</strong></span>
          <span>·</span>
          <span>Completados: <strong className="text-emerald-700">{resumen.total_completados}</strong></span>
          <span>·</span>
          <span>Perdidos: <strong className="text-rose-700">{resumen.total_perdidos}</strong></span>
        </div>
      </div>
    </div>
  );
}
