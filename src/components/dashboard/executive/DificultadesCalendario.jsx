import React from 'react';
import { CalendarDays, AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function DificultadesCalendario({ calendarioData }) {
  const dias = calendarioData && calendarioData.length > 0 ? calendarioData : [
    { fecha: '2026-10-01', dia_nombre: 'Jue 01/10', pedidos: 8, fallos: 0, estado: 'OPTIMO' },
    { fecha: '2026-10-02', dia_nombre: 'Vie 02/10', pedidos: 10, fallos: 0, estado: 'OPTIMO' },
    { fecha: '2026-10-03', dia_nombre: 'Sáb 03/10', pedidos: 6, fallos: 0, estado: 'OPTIMO' },
    { fecha: '2026-10-04', dia_nombre: 'Dom 04/10', pedidos: 4, fallos: 0, estado: 'OPTIMO' },
    { fecha: '2026-10-05', dia_nombre: 'Lun 05/10', pedidos: 7, fallos: 1, estado: 'ALERTA' },
    { fecha: '2026-10-06', dia_nombre: 'Mar 06/10', pedidos: 9, fallos: 2, estado: 'CRITICO' },
    { fecha: '2026-10-07', dia_nombre: 'Mié 07/10', pedidos: 5, fallos: 0, estado: 'OPTIMO' },
  ];

  // Calcular días con fallos para la frase interpretada
  const diasCriticos = dias.filter(d => d.fallos > 0);
  const totalFallos = dias.reduce((acc, curr) => acc + (curr.fallos || 0), 0);

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4 min-w-0 overflow-hidden">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200/70">
              <CalendarDays className="w-4 h-4" />
            </span>
            <h3 className="text-base font-bold text-slate-800">
              Dificultades en la Operación Diaria
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Días con mayor carga de incidencias operativas y fallos de entrega.
          </p>
        </div>

        {/* Leyenda Semántica Accesible */}
        <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>0 fallos</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>1 fallo</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span>≥2 fallos</span>
          </div>
        </div>
      </div>

      {/* Grid del Calendario Semáforo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {dias.map((dia) => {
          const fallos = Number(dia.fallos || 0);
          const esOptimo = fallos === 0;
          const esAlerta = fallos === 1;
          const esCritico = fallos >= 2;

          const cardStyle = esOptimo
            ? 'bg-emerald-50/40 border-emerald-200/70 hover:border-emerald-300'
            : esAlerta
            ? 'bg-amber-50/50 border-amber-200 hover:border-amber-400'
            : 'bg-rose-50/60 border-rose-200 hover:border-rose-400';

          return (
            <div
              key={dia.fecha}
              className={`rounded-2xl p-3 border transition-all flex flex-col justify-between min-w-0 ${cardStyle}`}
            >
              <div className="min-w-0">
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-[11px] font-bold text-slate-600 truncate leading-tight">
                    {dia.dia_nombre || dia.fecha}
                  </span>
                  {esOptimo && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                  {esAlerta && <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                  {esCritico && <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
                </div>

                <div className="mt-2">
                  <span className="text-lg font-mono font-extrabold text-slate-800 tabular-nums">
                    {dia.pedidos}
                  </span>
                  <span className="text-[10px] text-slate-400 block leading-tight">pedidos</span>
                </div>
              </div>

              <div className="mt-2.5 pt-2 border-t border-slate-200/50 flex flex-col items-start gap-0.5 text-[10px] min-w-0">
                <span className="text-slate-400 font-medium leading-tight">Incidencias:</span>
                <span
                  className={`font-mono font-bold leading-tight ${
                    esOptimo ? 'text-emerald-700' : esAlerta ? 'text-amber-700' : 'text-rose-700'
                  }`}
                >
                  {fallos === 0 ? 'Ninguna' : `${fallos} ${fallos === 1 ? 'fallo' : 'fallos'}`}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Frase de Cierre Interpretada */}
      <div className="pt-3 border-t border-slate-100 flex items-start gap-2 text-xs text-slate-600">
        <span className={`w-2 h-2 rounded-full ${totalFallos === 0 ? 'bg-emerald-500' : 'bg-amber-500'} shrink-0 mt-1`} />
        <span className="font-medium leading-relaxed break-words min-w-0">
          {totalFallos === 0
            ? 'Jornada impecable: no se registraron fallos operativos en los días analizados.'
            : diasCriticos.length > 0
            ? `Se registraron ${totalFallos} incidencias en el período. El día ${diasCriticos[0].dia_nombre} concentró la mayor atención.`
            : 'Estabilidad operativa mantenida a lo largo de la semana.'}
        </span>
      </div>
    </div>
  );
}
