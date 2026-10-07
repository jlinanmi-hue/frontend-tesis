import React from 'react';
import { Clock, Phone, MapPin, Truck, AlertTriangle, CheckCircle2, ChevronRight, ExternalLink } from 'lucide-react';

export default function PedidosPorAtenderList({ pedidosData, onOpenPedido }) {
  const pedidos = pedidosData || [];
  const hayUrgentes = pedidos.some(p => p.urgente || p.horas_restantes <= 3.0);
  const ordenMasCritica = [...pedidos].sort((a, b) => a.horas_restantes - b.horas_restantes)[0];

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4 min-w-0 overflow-hidden">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-200/70">
              <Clock className="w-4 h-4" />
            </span>
            <h3 className="text-base font-bold text-slate-800">
              Pedidos por Atender Prioritarios
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Órdenes en curso que requieren despacho prioritario hoy.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/70">
            Pendientes: <span className="font-mono text-blue-600">{pedidos.length}</span>
          </span>
        </div>
      </div>

      {/* Lista / Tabla de Pedidos */}
      {pedidos.length === 0 ? (
        <div className="py-8 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
          <h4 className="text-sm font-bold text-slate-700">Todos los pedidos están al día</h4>
          <p className="text-xs text-slate-400 mt-0.5">No hay órdenes pendientes que superen el tiempo de alerta.</p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-1 px-1">
          <table className="w-full min-w-[620px] text-left text-xs border-separate border-spacing-0">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="pb-2 pl-1 pr-2 whitespace-nowrap align-middle">Código</th>
                <th className="pb-2 pr-2 whitespace-nowrap align-middle">Cliente / Contacto</th>
                <th className="pb-2 pr-2 whitespace-nowrap align-middle">Modalidad</th>
                <th className="pb-2 pr-2 text-right whitespace-nowrap align-middle">Total</th>
                <th className="pb-2 px-2 text-center whitespace-nowrap align-middle">Espera / SLA</th>
                <th className="pb-2 text-right pr-1 whitespace-nowrap align-middle">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pedidos.map((p) => {
                const esUrgente = p.urgente || p.horas_restantes <= 3.0;

                return (
                  <tr
                    key={p.pedido_id}
                    className="hover:bg-slate-50/70 transition-colors group"
                  >
                    {/* Código Pedido */}
                    <td className="py-3 pl-1 pr-2 font-mono font-bold text-blue-600 whitespace-nowrap align-middle">
                      {p.pedido_id}
                    </td>

                    {/* Cliente & Teléfono */}
                    <td className="py-3 pr-2 align-middle min-w-0">
                      <div className="font-bold text-slate-800 truncate max-w-[200px]" title={p.cliente}>
                        {p.cliente}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-1 font-mono whitespace-nowrap">
                        <Phone className="w-3 h-3 text-slate-400 inline shrink-0" />
                        <span className="truncate">{p.telefono || 'Sin teléfono'}</span>
                      </div>
                    </td>

                    {/* Modalidad y Distrito */}
                    <td className="py-3 pr-2 align-middle">
                      <div className="flex items-center gap-1.5 whitespace-nowrap">
                        {p.es_delivery ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 whitespace-nowrap">
                            <Truck className="w-3 h-3 shrink-0" /> Delivery
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 whitespace-nowrap">
                            Presencial
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[170px] mt-1" title={p.distrito || 'Trujillo Centro'}>
                        <MapPin className="w-3 h-3 inline mr-0.5 text-slate-300 shrink-0" />
                        {p.distrito || 'Trujillo Centro'}
                      </div>
                    </td>

                    {/* Total */}
                    <td className="py-3 pr-2 text-right font-mono font-extrabold text-slate-800 whitespace-nowrap align-middle">
                      S/ {Number(p.total || 0).toFixed(2)}
                    </td>

                    {/* Tiempo de Espera y Countdown */}
                    <td className="py-3 px-2 text-center align-middle">
                      <div className="inline-flex flex-col items-center gap-0.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[10px] font-bold whitespace-nowrap ${
                            esUrgente
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {esUrgente && <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />}
                          Quedan {p.horas_restantes}h
                        </span>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">
                          En espera: {p.horas_espera}h
                        </span>
                      </div>
                    </td>

                    {/* Botón de Acción */}
                    <td className="py-3 text-right pr-1 align-middle">
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof onOpenPedido === 'function') {
                            onOpenPedido(p.pedido_id);
                          } else {
                            window.location.hash = `#/pedidos?buscar=${p.pedido_id}`;
                          }
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-blue-50 text-blue-600 hover:text-blue-700 border border-blue-200 rounded-lg font-semibold text-[11px] shadow-2xs hover:shadow transition active:scale-95 cursor-pointer whitespace-nowrap"
                        title="Ver detalle del pedido"
                      >
                        <span>Atender</span>
                        <ChevronRight className="w-3 h-3 shrink-0" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Frase de Cierre Interpretada */}
      <div className="pt-3 border-t border-slate-100 flex items-start gap-2 text-xs text-slate-600">
        <span className={`w-2 h-2 rounded-full ${hayUrgentes ? 'bg-rose-500' : 'bg-emerald-500'} shrink-0 mt-1`} />
        <span className="font-medium leading-relaxed break-words min-w-0">
          {ordenMasCritica
            ? `Hay órdenes pendientes con tiempo activo. La orden ${ordenMasCritica.pedido_id} tiene ${ordenMasCritica.horas_espera}h de espera y requiere confirmación.`
            : 'Todos los pedidos pendientes se encuentran dentro del rango de tiempo normal.'}
        </span>
      </div>
    </div>
  );
}
