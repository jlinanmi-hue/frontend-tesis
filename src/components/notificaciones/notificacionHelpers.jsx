import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  TrendingDown,
  RotateCcw,
  PackageCheck,
  ShoppingBag,
  Bell,
} from 'lucide-react';

/**
 * Retorna estilos, íconos y clases de color según el tipo de notificación
 */
export function getNotificacionStyle(tipo) {
  const t = String(tipo || 'info').toLowerCase();

  switch (t) {
    case 'success':
      return {
        badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dotColor: 'bg-emerald-500',
        iconBg: 'bg-emerald-50 border-emerald-200 text-emerald-600',
        borderLeft: 'border-l-emerald-500',
        label: 'Éxito',
        icon: <CheckCircle2 className="w-4 h-4" />,
      };
    case 'warning':
      return {
        badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
        dotColor: 'bg-amber-500',
        iconBg: 'bg-amber-50 border-amber-200 text-amber-600',
        borderLeft: 'border-l-amber-500',
        label: 'Advertencia',
        icon: <AlertTriangle className="w-4 h-4" />,
      };
    case 'danger':
    case 'error':
      return {
        badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
        dotColor: 'bg-rose-500',
        iconBg: 'bg-rose-50 border-rose-200 text-rose-600',
        borderLeft: 'border-l-rose-500',
        label: 'Crítico',
        icon: <AlertCircle className="w-4 h-4" />,
      };
    case 'merma':
      return {
        badgeBg: 'bg-red-50 text-red-700 border-red-200',
        dotColor: 'bg-red-500',
        iconBg: 'bg-red-50 border-red-200 text-red-600',
        borderLeft: 'border-l-red-500',
        label: 'Merma',
        icon: <TrendingDown className="w-4 h-4" />,
      };
    case 'reversion':
      return {
        badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        dotColor: 'bg-indigo-500',
        iconBg: 'bg-indigo-50 border-indigo-200 text-indigo-600',
        borderLeft: 'border-l-indigo-500',
        label: 'Reversión',
        icon: <RotateCcw className="w-4 h-4" />,
      };
    default:
      return {
        badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
        dotColor: 'bg-blue-500',
        iconBg: 'bg-blue-50 border-blue-200 text-blue-600',
        borderLeft: 'border-l-blue-500',
        label: 'Informativo',
        icon: <Info className="w-4 h-4" />,
      };
  }
}

/**
 * Formatea una fecha ISO a tiempo relativo legible en español
 */
export function formatearTiempoRelativo(fechaIso) {
  if (!fechaIso) return 'Reciente';

  try {
    const fecha = new Date(fechaIso);
    const ahora = new Date();
    const difMs = ahora.getTime() - fecha.getTime();
    const difMin = Math.floor(difMs / (1000 * 60));
    const difHoras = Math.floor(difMin / 60);
    const difDias = Math.floor(difHoras / 24);

    if (difMin < 1) return 'Hace un momento';
    if (difMin < 60) return `Hace ${difMin} min`;
    if (difHoras === 1) return 'Hace 1 hora';
    if (difHoras < 24) return `Hace ${difHoras} horas`;
    if (difDias === 1) return 'Ayer';
    if (difDias < 7) return `Hace ${difDias} días`;

    return fecha.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Reciente';
  }
}
