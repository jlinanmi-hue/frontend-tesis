import React from 'react';
import {
  ShoppingBag,
  Users,
  Clock,
  Sparkles,
  AlertTriangle,
  Truck,
  CheckCircle2,
} from 'lucide-react';

export default function ResumenHoyStrip({ resumen }) {
  const data = resumen || {
    pedidos_conteo: 14,
    monto_facturado: 3420.50,
    clientes_atendidos: 11,
    tiempo_medio_seg: 42,
    porcentaje_ia: 68.4,
    alertas_activas: 2,
    sla_cumplimiento: 100.0,
  };

  const metrics = [
    {
      id: 'pedidos',
      label: 'Pedidos Hoy',
      valor: `${data.pedidos_conteo ?? 0} pedidos`,
      sub: `S/ ${Number(data.monto_facturado ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: <ShoppingBag className="w-4 h-4 text-blue-600" />,
      bgIcon: 'bg-blue-50 border-blue-200/80',
    },
    {
      id: 'clientes',
      label: 'Clientes Atendidos',
      valor: `${data.clientes_atendidos ?? 0}`,
      sub: 'Clientes únicos',
      icon: <Users className="w-4 h-4 text-purple-600" />,
      bgIcon: 'bg-purple-50 border-purple-200/80',
    },
    {
      id: 'tiempo',
      label: 'Tiempo Medio',
      valor: `${data.tiempo_medio_seg ?? 40}s`,
      sub: 'Por cada pedido',
      icon: <Clock className="w-4 h-4 text-emerald-600" />,
      bgIcon: 'bg-emerald-50 border-emerald-200/80',
    },
    {
      id: 'ia',
      label: 'Asistidos por IA',
      valor: `${data.porcentaje_ia ?? 0}%`,
      sub: 'Vía Valencia AI',
      icon: <Sparkles className="w-4 h-4 text-indigo-600" />,
      bgIcon: 'bg-indigo-50 border-indigo-200/80',
    },
    {
      id: 'alertas',
      label: 'Alertas Activas',
      valor: `${data.alertas_activas ?? 0}`,
      sub: Number(data.alertas_activas ?? 0) === 0 ? 'Sin incidencias' : 'Bajo stock mínimo',
      icon: <AlertTriangle className={`w-4 h-4 ${Number(data.alertas_activas ?? 0) > 0 ? 'text-amber-600' : 'text-emerald-600'}`} />,
      bgIcon: Number(data.alertas_activas ?? 0) > 0 ? 'bg-amber-50 border-amber-200/80' : 'bg-emerald-50 border-emerald-200/80',
    },
    {
      id: 'sla',
      label: 'Despachos a Tiempo',
      valor: `${data.sla_cumplimiento ?? 100}%`,
      sub: 'Cumplimiento SLA',
      icon: <Truck className="w-4 h-4 text-teal-600" />,
      bgIcon: 'bg-teal-50 border-teal-200/80',
    },
  ];

  return (
    <div className="space-y-2 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Resumen de la Jornada
        </h3>
        <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">
          Métricas operativas del día
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2.5 sm:gap-3">
        {metrics.map((m) => (
          <div
            key={m.id}
            className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs hover:shadow-xs transition flex flex-col justify-between min-w-0 overflow-hidden"
          >
            <div className="flex items-center justify-between gap-1.5 mb-2 min-w-0">
              <span className="text-[11px] font-semibold text-slate-500 truncate min-w-0">
                {m.label}
              </span>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center border shrink-0 ${m.bgIcon}`}>
                {m.icon}
              </div>
            </div>

            <div className="min-w-0">
              <div className="text-base sm:text-lg font-mono font-extrabold text-slate-800 tracking-tight leading-none truncate">
                {m.valor}
              </div>
              <div className="text-[10px] text-slate-400 font-medium mt-1 truncate">
                {m.sub}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
