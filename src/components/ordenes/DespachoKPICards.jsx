import React from 'react';
import {
  Clock,
  Boxes,
  CheckCircle2,
  AlertTriangle,
  PackageCheck
} from 'lucide-react';

export default function DespachoKPICards({ kpis = {}, onFiltroRapido }) {
  const cards = [
    {
      id: 'PENDIENTE',
      title: 'Por Despachar',
      sub: 'En espera de picking',
      val: kpis.pendientes ?? 0,
      icon: Clock,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
      ringColor: 'hover:border-amber-500/50'
    },
    {
      id: 'EN_PREPARACION',
      title: 'En Preparación',
      sub: 'En picking / empaque',
      val: kpis.en_preparacion ?? 0,
      icon: Boxes,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
      ringColor: 'hover:border-blue-500/50'
    },
    {
      id: 'ENTREGADO_COMPLETO',
      title: 'Despachados Hoy',
      sub: 'Cerrados conforme',
      val: kpis.despachados_hoy ?? 0,
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
      ringColor: 'hover:border-emerald-500/50'
    },
    {
      id: 'ENTREGADO_CON_FALTANTE',
      title: 'Con Faltante Auditado',
      sub: 'Aceptado por cliente (hoy)',
      val: kpis.con_faltante_hoy ?? 0,
      icon: AlertTriangle,
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/10',
      borderColor: 'border-rose-500/20',
      ringColor: 'hover:border-rose-500/50'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.id}
            onClick={() => onFiltroRapido && onFiltroRapido(c.id)}
            className={`p-4 rounded-xl border ${c.borderColor} ${c.bgColor} ${c.ringColor} transition-all duration-150 cursor-pointer shadow-sm hover:shadow-md flex items-center justify-between group`}
          >
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                {c.title}
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className={`text-2xl font-bold ${c.color}`}>
                  {c.val}
                </span>
                <span className="text-xs text-slate-400 truncate max-w-[120px]">
                  {c.sub}
                </span>
              </div>
            </div>
            <div className={`p-3 rounded-lg ${c.bgColor} border ${c.borderColor} group-hover:scale-105 transition-transform`}>
              <Icon className={`w-5 h-5 ${c.color}`} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
