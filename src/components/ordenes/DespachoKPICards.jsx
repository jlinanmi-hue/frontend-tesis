import React from 'react';
import {
  Clock,
  Boxes,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export default function DespachoKPICards({ kpis = {}, onFiltroRapido }) {
  const cards = [
    {
      id: 'PENDIENTE',
      title: 'Por Despachar',
      sub: 'En espera de picking',
      val: kpis.pendientes ?? 0,
      unit: 'órdenes',
      icon: Clock,
      iconBox: 'bg-blue-50 text-blue-600',
      numColor: 'text-slate-800',
      hoverBorder: 'hover:border-blue-300',
    },
    {
      id: 'EN_PREPARACION',
      title: 'En Preparación',
      sub: 'En picking / empaque',
      val: kpis.en_preparacion ?? 0,
      unit: 'en proceso',
      icon: Boxes,
      iconBox: 'bg-amber-50 text-amber-600',
      numColor: 'text-amber-700',
      hoverBorder: 'hover:border-amber-300',
    },
    {
      id: 'ENTREGADO_COMPLETO',
      title: 'Despachados Hoy',
      sub: 'Cerrados conforme',
      val: kpis.despachados_hoy ?? 0,
      unit: '100% completos',
      icon: CheckCircle2,
      iconBox: 'bg-emerald-50 text-emerald-600',
      numColor: 'text-emerald-700',
      hoverBorder: 'hover:border-emerald-300',
    },
    {
      id: 'ENTREGADO_CON_FALTANTE',
      title: 'Con Faltante Auditado',
      sub: 'Aceptado por cliente (hoy)',
      val: kpis.con_faltante_hoy ?? 0,
      unit: 'incompletos',
      icon: AlertTriangle,
      iconBox: 'bg-orange-50 text-orange-600',
      numColor: 'text-orange-700',
      hoverBorder: 'hover:border-orange-300',
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.id}
            onClick={() => onFiltroRapido && onFiltroRapido(c.id)}
            className={`bg-white border border-slate-200 rounded-2xl p-4 shadow-xs ${c.hoverBorder} transition cursor-pointer`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">{c.title}</span>
              <div className={`p-2 rounded-xl ${c.iconBox}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className={`text-2xl font-black ${c.numColor}`}>{c.val}</span>
              <span className="text-[11px] text-slate-400">{c.unit}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
