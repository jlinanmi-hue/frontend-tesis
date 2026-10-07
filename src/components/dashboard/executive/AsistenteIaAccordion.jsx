import React, { useState } from 'react';
import { Bot, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import AiTokenMetricsCard from '../AiTokenMetricsCard';

export default function AsistenteIaAccordion() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden transition-all duration-300">
      {/* Botón de Acordeón */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-50/80 transition cursor-pointer"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200/80 flex items-center justify-center text-indigo-600 shadow-2xs">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-800">
                Uso del Asistente IA y Consultas al Sistema
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-500" />
                Opcional
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Consumo de tokens, velocidad de respuesta y adopción operativa de Valencia AI.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <span>{isOpen ? 'Ocultar detalles' : 'Ver métricas de IA'}</span>
          <div className="p-1 rounded-lg bg-slate-100 text-slate-600">
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </button>

      {/* Contenido Desplegable */}
      {isOpen && (
        <div className="border-t border-slate-100 p-6 bg-slate-50/40 animate-in fade-in duration-200">
          <AiTokenMetricsCard />
        </div>
      )}
    </div>
  );
}
