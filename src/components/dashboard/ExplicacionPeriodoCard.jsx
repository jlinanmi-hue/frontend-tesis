import React, { useState } from 'react';
import {
  Sparkles,
  Clock,
  Zap,
  Copy,
  Check,
  X,
  MessageSquare,
  Info,
  RotateCcw,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

export default function ExplicacionPeriodoCard({
  insight,
  periodo = 'Últimos 7 días',
  onClose,
  onReintentar,
  onOpenChat,
}) {
  const [copied, setCopied] = useState(false);

  if (!insight) return null;

  const handleCopy = () => {
    if (!insight.analisis) return;
    navigator.clipboard.writeText(insight.analisis);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeepenChat = () => {
    const query = `Explícame en detalle la causa raíz del PODE y las roturas de stock PRS para el periodo: ${periodo}.`;
    if (onOpenChat) {
      onOpenChat(query);
    } else {
      window.dispatchEvent(
        new CustomEvent('valencia-ai:open-query', {
          detail: { query },
        })
      );
    }
  };

  // Formatear párrafos o markdown simple
  const formatText = (text) => {
    if (!text) return null;
    return text.split('\n\n').map((paragraph, idx) => {
      // Reemplazo básico de negritas **texto**
      const parts = paragraph.split(/(\*\*.*?\*\*)/g);
      return (
        <p key={idx} className="leading-relaxed text-slate-700 text-xs sm:text-sm">
          {parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <strong key={pIdx} className="font-bold text-slate-900">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            return part;
          })}
        </p>
      );
    });
  };

  const tiempoSeg = insight.tiempo_segundos ?? (insight.tiempo_ms ? (insight.tiempo_ms / 1000).toFixed(2) : 1.2);
  const esCache = insight.es_cache === true;
  const enMantenimiento = insight.en_mantenimiento === true || !insight.success;

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-white via-blue-50/25 to-indigo-50/30 rounded-2xl p-5 sm:p-6 border border-blue-200/90 shadow-sm animate-in fade-in slide-in-from-top-3 duration-300">
      {/* Halo decorativo de fondo */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-blue-400/10 via-indigo-400/5 to-transparent rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />

      {/* Cabecera de la Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-100/80 pb-3.5 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-extrabold text-slate-800 tracking-tight">
                INSIGHT OPERATIVO VALENCIA AI
              </h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100/80 text-blue-700 border border-blue-200/80">
                {periodo}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-normal mt-0.5">
              Diagnóstico ejecutivo de variaciones en PODE, PEOR, PRS y TBPP
            </p>
          </div>
        </div>

        {/* Acciones de la cabecera: Relojito Real, Copiar y Cerrar */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Badge de Tiempo de Ejecución Real */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border shadow-2xs ${
              esCache
                ? 'bg-amber-50 text-amber-700 border-amber-200/80'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
            }`}
            title={esCache ? 'Respuesta instantánea optimizada en caché' : 'Tiempo exacto de procesamiento del modelo IA'}
          >
            {esCache ? <Zap className="w-3 h-3 text-amber-600" /> : <Clock className="w-3 h-3 text-emerald-600" />}
            <span>{esCache ? `⚡ Caché (${tiempoSeg}s)` : `⏱️ ${tiempoSeg}s`}</span>
          </div>

          {!enMantenimiento && (
            <button
              type="button"
              onClick={handleCopy}
              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50/80 transition cursor-pointer"
              title="Copiar análisis al portapapeles"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              title="Cerrar panel de análisis"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Contenido Principal */}
      {enMantenimiento ? (
        /* Estado de Contingencia Suave (Zero Crash) */
        <div className="bg-white/80 rounded-xl p-4 border border-slate-200 text-slate-700 space-y-2">
          <div className="flex items-start gap-2.5">
            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-800">
                Interpretación temporalmente en pausa técnica
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                {insight.mensaje_amigable ||
                  'El servicio de análisis automático no está disponible en este momento. Las métricas operativas de PODE, PEOR, PRS y TBPP continúan actualizándose con normalidad.'}
              </p>
            </div>
          </div>
          {onReintentar && (
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={onReintentar}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reintentar análisis</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Estado Exitoso: Análisis en 3 bloques ejecutivos */
        <div className="space-y-3 bg-white/70 backdrop-blur-xs rounded-xl p-4 sm:p-5 border border-blue-100/60 shadow-2xs">
          <div className="space-y-3 font-normal text-slate-700 text-xs sm:text-sm">
            {formatText(insight.analisis)}
          </div>

          {/* Barra Inferior de Acción y Profundización */}
          <div className="pt-3 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleDeepenChat}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs hover:shadow-sm transition cursor-pointer group"
            >
              <MessageSquare className="w-3.5 h-3.5 text-blue-200" />
              <span>Profundizar en el Chatbot Valencia AI</span>
              <ChevronRight className="w-3.5 h-3.5 text-blue-200 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Datos sincronizados con Kardex y Fichas Oficiales de Tesis</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
