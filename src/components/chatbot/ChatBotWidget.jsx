import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Sparkles,
  X,
  Minus,
  Maximize2,
  Minimize2,
  Send,
  RotateCcw,
  AlertTriangle,
  CheckCheck,
  ArrowRight,
  Zap,
  Database,
  WifiOff,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Info,
  Mic,
  MicOff,
  Trash2,
  Play,
  Pause,
  Loader2,
  GripHorizontal,
  Compass,
  ThumbsUp,
  ThumbsDown,
  Check,
  User,
  Cpu,
} from 'lucide-react';
import api from '../../services/api';
import ChatChart from './ChatChart';
import ChatTable from './ChatTable';

const MOTIVOS_DISLIKE = [
  { id: 'Cantidad incorrecta', label: '🔢 Cantidad incorrecta' },
  { id: 'Producto incorrecto', label: '📦 Producto incorrecto' },
  { id: 'Cliente o Proveedor erróneo', label: '👤 Cliente / Proveedor erróneo' },
  { id: 'Precio o Descuento erróneo', label: '💲 Precio / Descuento erróneo' },
  { id: 'Error de interpretación', label: '🧠 Error de interpretación' },
  { id: 'Otro motivo', label: '⚠️ Otro motivo' },
];

// Mapeo de tools a iconos/colores para la tarjeta de contexto
const TOOL_ICONS = {
  pedidos: { icon: '🛒', color: 'blue', label: 'Pedidos' },
  clientes: { icon: '👥', color: 'green', label: 'Clientes' },
  productos: { icon: '📦', color: 'orange', label: 'Productos' },
  proveedores: { icon: '🏢', color: 'purple', label: 'Proveedores' },
  ordenes: { icon: '📋', color: 'indigo', label: 'Órdenes Compra' },
  canales: { icon: '📡', color: 'cyan', label: 'Canales' },
  kardex: { icon: '📊', color: 'amber', label: 'Kárdex' },
  reportes: { icon: '📈', color: 'teal', label: 'Reportes' },
  alertas: { icon: '🔔', color: 'red', label: 'Alertas' },
  bi: { icon: '📊', color: 'indigo', label: 'BI & Gráficos' },
  predicciones: { icon: '✨', color: 'emerald', label: 'Reabastecimiento' },
  utilidades: { icon: '🛠️', color: 'slate', label: 'Sistema' },
};

// Logotipo e Isotipo Oficial de Valencia AI (Inspirado en el robot minimalista moderno)
export function ValenciaBotAvatar({
  className = 'w-5 h-5',
  headColor = '#ffffff',
  visorColor = '#0f172a',
  eyeColor = '#38bdf8',
}) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Antena superior: Esfera y mástil */}
      <circle cx="50" cy="11.5" r="5.5" fill={headColor} />
      <rect x="47.5" y="16.5" width="5" height="8" rx="2.5" fill={headColor} />
      {/* Cúpula / Cuello curvo en la base de la antena */}
      <path
        d="M37 27.5 C37 21 42.5 19 50 19 C57.5 19 63 21 63 27.5 C59 26.5 54.5 26 50 26 C45.5 26 41 26.5 37 27.5 Z"
        fill={headColor}
      />
      {/* Orejeras laterales redondeadas simétricas */}
      <rect x="9" y="47" width="9" height="17" rx="4.5" fill={headColor} />
      <rect x="82" y="47" width="9" height="17" rx="4.5" fill={headColor} />
      {/* Cabeza ovalada suave */}
      <ellipse cx="50" cy="56" rx="37" ry="30" fill={headColor} />
      {/* Visor frontal horizontal tipo cápsula / stadium */}
      <rect x="26" y="45" width="48" height="22" rx="11" fill={visorColor} />
      {/* Ojos circulares de IA */}
      <circle cx="41" cy="56" r="5.2" fill={eyeColor} />
      <circle cx="59" cy="56" r="5.2" fill={eyeColor} />
    </svg>
  );
}

function getToolMeta(toolName) {
  if (!toolName) return null;
  const lowerName = toolName.toLowerCase();
  if (lowerName.includes('grafico') || lowerName.includes('kpi') || lowerName.includes('tabla') || lowerName.includes('comparar')) return TOOL_ICONS.bi;
  if (lowerName.includes('pedido')) return TOOL_ICONS.pedidos;
  if (lowerName.includes('cliente')) return TOOL_ICONS.clientes;
  if (lowerName.includes('producto') || lowerName.includes('stock')) return TOOL_ICONS.productos;
  if (lowerName.includes('proveedor')) return TOOL_ICONS.proveedores;
  if (lowerName.includes('orden') || lowerName.includes('compra')) return TOOL_ICONS.ordenes;
  if (lowerName.includes('canal')) return TOOL_ICONS.canales;
  if (lowerName.includes('kardex') || lowerName.includes('movimiento')) return TOOL_ICONS.kardex;
  if (lowerName.includes('estadistica') || lowerName.includes('reporte') || lowerName.includes('top') || lowerName.includes('venta')) return TOOL_ICONS.reportes;
  if (lowerName.includes('alerta') || lowerName.includes('notif')) return TOOL_ICONS.alertas;
  if (lowerName.includes('prediccion') || lowerName.includes('reabastec')) return TOOL_ICONS.predicciones;
  return TOOL_ICONS.utilidades;
}

// Formatea markdown básico para el texto devuelto por Gemini
function formatBotText(text) {
  if (!text) return '';
  return text
    // Encabezados
    .replace(/^### (.*$)/gim, '<h4 class="font-bold text-slate-900 text-xs mt-2.5 mb-1 tracking-tight">$1</h4>')
    .replace(/^## (.*$)/gim, '<h3 class="font-bold text-slate-900 text-sm mt-3 mb-1.5 tracking-tight">$1</h3>')
    // Negritas
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-slate-900">$1</strong>')
    // Código inline
    .replace(/`([^`]+)`/g, '<code class="bg-blue-50/80 text-blue-700 border border-blue-200/60 px-1.5 py-0.5 rounded-md text-[11px] font-mono font-medium">$1</code>')
    // Viñetas / listas
    .replace(/^\* (.*$)/gim, '<li class="ml-3.5 list-disc marker:text-blue-500 py-0.5">$1</li>')
    .replace(/^- (.*$)/gim, '<li class="ml-3.5 list-disc marker:text-blue-500 py-0.5">$1</li>');
}

// Detección de formato MIME compatible para grabación en el navegador
function getSupportedMimeType() {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/aac',
    'audio/ogg',
  ];
  for (const type of types) {
    if (typeof window !== 'undefined' && window.MediaRecorder && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return 'audio/webm';
}

function formatTimer(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// Mini reproductor de notas de voz en el chat
function VoiceNotePlayer({ voiceNote }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(voiceNote?.duration || 0);
  const audioRef = useRef(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch((e) => console.warn('Audio play error:', e));
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current && Number.isFinite(audioRef.current.duration) && audioRef.current.duration > 0) {
      setDuration(audioRef.current.duration);
    } else if (voiceNote?.duration && Number.isFinite(voiceNote.duration) && voiceNote.duration > 0) {
      setDuration(voiceNote.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-2.5 mb-1.5 text-white shadow-2xs select-none">
      <audio
        ref={audioRef}
        src={voiceNote?.audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={togglePlay}
          className="w-7 h-7 bg-white/10 hover:bg-white/20 text-blue-400 hover:text-white rounded-full flex items-center justify-center shrink-0 shadow-xs cursor-pointer transition active:scale-95 border border-white/10"
          title={isPlaying ? 'Pausar' : 'Reproducir nota de voz'}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
        </button>

        <div className="flex-1 flex flex-col gap-1">
          <div className="h-1.5 bg-slate-700/80 rounded-full overflow-hidden relative">
            <div
              className="h-full bg-blue-400 transition-all duration-100 rounded-full shadow-xs"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] text-slate-300 font-mono">
            <span>{formatTimer(currentTime)}</span>
            <span className="flex items-center gap-1 text-slate-400">
              <Mic className="w-2.5 h-2.5 text-blue-400" />
              <span>{formatTimer(duration)}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChatBotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingStatus, setStreamingStatus] = useState(null);
  const [apiError, setApiError] = useState(null);

  // Estados para notas de voz y grabación
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [voiceMode, setVoiceMode] = useState(() => {
    try {
      return localStorage.getItem('valencia_ai_voice_mode') || 'direct';
    } catch (e) {
      return 'direct';
    }
  });
  const [audioError, setAudioError] = useState(null);

  // ESTADO DE DISPONIBILIDAD / SATURACIÓN DE LA API DE VOZ
  const [voiceStatus, setVoiceStatus] = useState({
    available: true,
    status: 'ready',
    message: '',
    reason: '',
    retryAfter: 0,
  });
  const [voiceAlertBanner, setVoiceAlertBanner] = useState(null);
  const [isCheckingVoice, setIsCheckingVoice] = useState(false);

  // ESTADOS DE VENTANA FLOTANTE Y ARRASTRE
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [hasCustomPosition, setHasCustomPosition] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // ARRASTRE DEL BOTÓN FLOTANTE LANZADOR (píldora Valencia AI cerrada)
  const [launcherPos, setLauncherPos] = useState(null);
  const [isDraggingLauncher, setIsDraggingLauncher] = useState(false);
  const launcherDragStartRef = useRef({ x: 0, y: 0 });
  const launcherInitialPosRef = useRef({ x: 0, y: 0 });
  const launcherRef = useRef(null);
  const launcherMovedRef = useRef(false);

  const dragStartRef = useRef({ x: 0, y: 0 });
  const initialPosRef = useRef({ x: 0, y: 0 });
  const windowRef = useRef(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const recordingStartTimeRef = useRef(null);

  // Visualizador de niveles de voz en tiempo real (barras con vida)
  const BAR_COUNT = 28;
  const [audioLevels, setAudioLevels] = useState(() => Array(BAR_COUNT).fill(0));
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const rafVisualRef = useRef(null);
  const micStreamRef = useRef(null);
  const smoothLevelsRef = useRef(Array(BAR_COUNT).fill(0));

  const stopVisualizer = useCallback(() => {
    if (rafVisualRef.current) {
      cancelAnimationFrame(rafVisualRef.current);
      rafVisualRef.current = null;
    }
    try {
      analyserRef.current?.disconnect();
    } catch (e) {}
    analyserRef.current = null;
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {}
      audioContextRef.current = null;
    }
    smoothLevelsRef.current = Array(BAR_COUNT).fill(0);
    setAudioLevels(Array(BAR_COUNT).fill(0));
  }, []);

  const startVisualizer = useCallback((stream) => {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      // Limpia instancia previa
      if (rafVisualRef.current) cancelAnimationFrame(rafVisualRef.current);
      try { audioContextRef.current?.close(); } catch (e) {}
      const ctx = new Ctx();
      audioContextRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.75;
      src.connect(analyser);
      analyserRef.current = analyser;
      const data = new Uint8Array(analyser.frequencyBinCount);
      let lastUpdate = 0;
      const tick = (t) => {
        rafVisualRef.current = requestAnimationFrame(tick);
        analyser.getByteFrequencyData(data);
        // Solo bins de voz humana (~60% bajos) y submuestreo a BAR_COUNT
        const usable = Math.floor(data.length * 0.6);
        const step = usable / BAR_COUNT;
        const next = [];
        for (let i = 0; i < BAR_COUNT; i++) {
          const idx = Math.min(data.length - 1, Math.floor(i * step));
          const v = data[idx] / 255; // 0..1
          const prev = smoothLevelsRef.current[i] || 0;
          const smoothed = prev * 0.55 + Math.pow(v, 1.2) * 0.45;
          // Puerta de ruido: silencio => 0 (se renderiza como punto)
          const gated = smoothed < 0.04 ? 0 : smoothed;
          next.push(gated);
          smoothLevelsRef.current[i] = gated;
        }
        // ~20fps para no saturar React
        if (t - lastUpdate > 50) {
          lastUpdate = t;
          setAudioLevels([...next]);
        }
      };
      rafVisualRef.current = requestAnimationFrame(tick);
    } catch (e) {
      console.warn('Visualizador de audio no disponible:', e);
    }
  }, []);

  // Derivados para la tarjeta de grabación estilo WhatsApp
  const isRecUrgent = recordingDuration >= 100;

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const INITIAL_MESSAGES = [
    {
      id: 1,
      sender: 'bot',
      text: '¡Hola! 👋 Soy **Valencia AI**, el asistente inteligente de Comercial Valencia.\n\nConectado a la base de datos en tiempo real. Puedo consultar stock, pedidos, clientes, proveedores, reportes y mucho más. ¿Qué deseas hacer?',
      timestamp: 'Ahora',
      chips: [
        { label: '📦 Stock de productos bajo mínimo', query: '¿Qué productos tienen stock bajo o agotado?' },
        { label: '✨ Sugerencias de reabastecimiento', query: '¿Qué productos debo reponer esta semana?' },
        { label: '🛒 Pedidos de hoy', query: '¿Cuántos pedidos hay hoy?' },
        { label: '📈 Estadísticas generales', query: '¿Qué estadísticas y gráficos puedes mostrarme?' },
        { label: '🔔 Alertas del sistema', query: '¿Hay alertas o notificaciones pendientes?' },
      ],
    },
  ];

  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [chatHistory, setChatHistory] = useState([]);
  const [sessionId, setSessionId] = useState(() => 'sess_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now());

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  // Calcular posición inicial flotante por defecto (esquina inferior derecha con margen)
  const calculateDefaultPosition = useCallback(() => {
    if (typeof window === 'undefined') return { x: 0, y: 0 };
    const winW = window.innerWidth < 640 ? Math.max(300, window.innerWidth - 24) : 420;
    const winH = window.innerHeight < 720 ? Math.max(450, window.innerHeight - 48) : 600;
    const x = Math.max(12, window.innerWidth - winW - 20);
    const y = Math.max(12, window.innerHeight - winH - 20);
    return { x, y };
  }, []);

  // Inicializar posición al abrir
  useEffect(() => {
    if (isOpen && !hasCustomPosition) {
      setPosition(calculateDefaultPosition());
    }
  }, [isOpen, hasCustomPosition, calculateDefaultPosition]);

  // Recalcular posición cuando cambia el tamaño de la ventana
  useEffect(() => {
    const handleResize = () => {
      if (isExpanded) return;
      setPosition((prev) => {
        const winW = windowRef.current ? windowRef.current.offsetWidth : 440;
        const winH = windowRef.current ? windowRef.current.offsetHeight : 620;
        const maxX = Math.max(12, window.innerWidth - winW - 12);
        const maxY = Math.max(12, window.innerHeight - winH - 12);
        return {
          x: Math.min(Math.max(12, prev.x), maxX),
          y: Math.min(Math.max(12, prev.y), maxY),
        };
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isExpanded]);

  // Manejadores de arrastre fluido con Pointer Events
  const handlePointerDown = (e) => {
    if (e.button !== 0 || isExpanded) return;
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('a')) return;

    setIsDragging(true);
    setHasCustomPosition(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    initialPosRef.current = { ...position };

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {}
  };

  const handlePointerMove = (e) => {
    if (!isDragging || isExpanded) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    const winW = windowRef.current ? windowRef.current.offsetWidth : 440;
    const winH = windowRef.current ? windowRef.current.offsetHeight : 620;

    const maxX = Math.max(8, window.innerWidth - winW - 8);
    const maxY = Math.max(8, window.innerHeight - winH - 8);

    const newX = Math.max(8, Math.min(maxX, initialPosRef.current.x + dx));
    const newY = Math.max(8, Math.min(maxY, initialPosRef.current.y + dy));

    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (err) {}
    }
  };

  const handleResetPosition = () => {
    setPosition(calculateDefaultPosition());
    setHasCustomPosition(false);
  };

  // Arrastre del lanzador: mover la píldora por la pantalla, clic abre solo si no se arrastró
  const handleLauncherPointerDown = (e) => {
    if (e.button !== 0) return;
    launcherMovedRef.current = false;
    setIsDraggingLauncher(true);
    launcherDragStartRef.current = { x: e.clientX, y: e.clientY };
    const rect = launcherRef.current?.getBoundingClientRect();
    if (rect) {
      launcherInitialPosRef.current = launcherPos ? { ...launcherPos } : { x: rect.left, y: rect.top };
    }
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {}
  };

  const handleLauncherPointerMove = (e) => {
    if (!isDraggingLauncher) return;
    const dx = e.clientX - launcherDragStartRef.current.x;
    const dy = e.clientY - launcherDragStartRef.current.y;
    if (Math.abs(dx) + Math.abs(dy) > 5) launcherMovedRef.current = true;
    const pillW = launcherRef.current?.offsetWidth || 220;
    const pillH = launcherRef.current?.offsetHeight || 56;
    const maxX = Math.max(8, window.innerWidth - pillW - 8);
    const maxY = Math.max(8, window.innerHeight - pillH - 8);
    const newX = Math.max(8, Math.min(maxX, launcherInitialPosRef.current.x + dx));
    const newY = Math.max(8, Math.min(maxY, launcherInitialPosRef.current.y + dy));
    setLauncherPos({ x: newX, y: newY });
  };

  const handleLauncherPointerUp = (e) => {
    if (isDraggingLauncher) {
      setIsDraggingLauncher(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (err) {}
    }
  };

  const handleLauncherClick = () => {
    if (launcherMovedRef.current) {
      launcherMovedRef.current = false;
      return;
    }
    setIsOpen(true);
  };

  // CONSULTAR AL BACKEND EL ESTADO DEL SERVICIO DE AUDIO
  const checkVoiceStatus = useCallback(async (showNotification = false) => {
    setIsCheckingVoice(true);
    try {
      const res = await api.ai.voiceStatus();
      if (res && res.success) {
        const isAvail = res.available !== false && res.status !== 'saturated';
        setVoiceStatus({
          available: isAvail,
          status: res.status || (isAvail ? 'ready' : 'saturated'),
          message: res.message || '',
          reason: res.reason || '',
          retryAfter: res.retry_after || 0,
        });

        if (!isAvail) {
          if (showNotification) {
            setVoiceAlertBanner(
              res.message ||
                'Por ahora el micrófono está desactivado debido a que la API de audio ha alcanzado su límite o está saturada.'
            );
          }
        } else {
          // Si volvió a estar disponible, limpiar banner
          setVoiceAlertBanner(null);
        }
      }
    } catch (err) {
      console.warn('Error verificando estado de voz:', err);
    } finally {
      setIsCheckingVoice(false);
    }
  }, []);

  // Verificar estado de voz al abrir el chatbot y periódicamente cada 45 segundos
  useEffect(() => {
    if (!isOpen) return;
    checkVoiceStatus(false);
    const interval = setInterval(() => checkVoiceStatus(false), 45000);
    return () => clearInterval(interval);
  }, [isOpen, checkVoiceStatus]);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      inputRef.current?.focus();
    }
  }, [isOpen, messages, isLoading]);

  const handleSendMessage = useCallback(async (textToSend = null, voiceMeta = null) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;

    const dispatchAiSideEffects = (aiData) => {
      if (!aiData) return;

      // Manejar clear_loading: destraba la UI ante fallos o crashes del backend
      if (aiData.ui_action?.type === 'clear_loading') {
        setIsLoading(false);
        setStreamingStatus(null);
        return;
      }

      if (aiData.ui_action?.type === 'open_form') {
        if (aiData.ui_action?.form === 'cliente' && aiData.ui_action?.prefill) {
          try {
            sessionStorage.setItem('valencia_ai_cliente_prefill', JSON.stringify(aiData.ui_action.prefill));
          } catch (e) {}
        }
        if (aiData.ui_action?.form === 'proveedor' && aiData.ui_action?.prefill) {
          try {
            sessionStorage.setItem('valencia_ai_proveedor_prefill', JSON.stringify(aiData.ui_action.prefill));
          } catch (e) {}
        }
        window.dispatchEvent(new CustomEvent('valencia-ai:open-form', { detail: aiData.ui_action }));
      }
      if (aiData.ui_action?.type === 'open_order_form') {
        try {
          if (aiData.ui_action?.prefill) {
            sessionStorage.setItem('valencia_ai_order_prefill', JSON.stringify(aiData.ui_action.prefill));
          }
        } catch (e) {
          console.warn('Error guardando prefill en sessionStorage', e);
        }
        window.dispatchEvent(new CustomEvent('valencia-ai:open-order-form', { detail: aiData.ui_action }));
      }
      // Guardar borrador de pedido pendiente si el cliente no fue encontrado
      if (aiData.ui_action?.type === 'client_not_found' && aiData.ui_action?.pending_order) {
        try {
          sessionStorage.setItem(
            'valencia_ai_pending_order_draft',
            JSON.stringify(aiData.ui_action.pending_order)
          );
        } catch (e) {
          console.warn('Error guardando pending_order_draft en sessionStorage', e);
        }
      }
      // Guardar borrador de orden de compra pendiente si el proveedor no fue encontrado o se restauró borrador
      if (
        (aiData.ui_action?.type === 'supplier_not_found' || aiData.ui_action?.type === 'purchase_draft_restored') &&
        aiData.ui_action?.pending_purchase_order
      ) {
        try {
          sessionStorage.setItem(
            'valencia_ai_pending_purchase_order_draft',
            JSON.stringify(aiData.ui_action.pending_purchase_order)
          );
        } catch (e) {
          console.warn('Error guardando pending_purchase_order_draft en sessionStorage', e);
        }
      }
      // Limpiar borrador pendiente cuando el pedido es cargado o descartado
      if (
        aiData.ui_action?.type === 'open_order_form' ||
        aiData.ui_action?.type === 'clear_order_form' ||
        aiData.tool_used === 'crear_pedido_cliente' ||
        aiData.tool_used === 'limpiar_formulario_pedido'
      ) {
        try {
          sessionStorage.removeItem('valencia_ai_pending_order_draft');
        } catch (e) {}
      }
      // Limpiar borrador de compra pendiente cuando la orden es cargada, creada o descartada
      if (
        aiData.ui_action?.type === 'open_purchase_order_form' ||
        aiData.ui_action?.type === 'clear_purchase_order_form' ||
        aiData.ui_action?.type === 'purchase_order_created' ||
        aiData.tool_used === 'crear_orden_compra' ||
        aiData.tool_used === 'limpiar_formulario_orden_compra'
      ) {
        try {
          sessionStorage.removeItem('valencia_ai_pending_purchase_order_draft');
        } catch (e) {}
      }
      if (aiData.ui_action?.type === 'order_created' || aiData.tool_used === 'crear_pedido_cliente') {
        window._valenciaAiLiveDraft = null;
        try {
          sessionStorage.removeItem('valencia_ai_live_draft');
          sessionStorage.removeItem('valencia_ai_order_prefill');
        } catch (e) {}
        window.dispatchEvent(new CustomEvent('valencia-ai:order-saved', {
          detail: {
            pedido_id: aiData.ui_action?.pedido_id || aiData.tool_data?.pedido_id,
            total: aiData.ui_action?.total || aiData.tool_data?.total,
          }
        }));
      }
      if (aiData.ui_action?.type === 'clear_order_form' || aiData.tool_used === 'limpiar_formulario_pedido') {
        window._valenciaAiLiveDraft = null;
        try {
          sessionStorage.removeItem('valencia_ai_live_draft');
          sessionStorage.removeItem('valencia_ai_order_prefill');
        } catch (e) {}
        window.dispatchEvent(new CustomEvent('valencia-ai:clear-order-form', { detail: aiData.ui_action }));
      }
      if (aiData.ui_action?.type === 'open_purchase_order_form' || aiData.tool_used === 'abrir_formulario_orden_compra') {
        try {
          if (aiData.ui_action?.prefill) {
            sessionStorage.setItem('valencia_ai_purchase_order_prefill', JSON.stringify(aiData.ui_action.prefill));
          }
        } catch (e) {
          console.warn('Error guardando prefill de orden de compra en sessionStorage', e);
        }
        window.dispatchEvent(new CustomEvent('valencia-ai:open-purchase-order-form', { detail: aiData.ui_action }));
      }
      if (aiData.ui_action?.type === 'clear_purchase_order_form' || aiData.tool_used === 'limpiar_formulario_orden_compra') {
        window._valenciaAiLiveDraft = null;
        try {
          sessionStorage.removeItem('valencia_ai_live_draft');
          sessionStorage.removeItem('valencia_ai_purchase_order_prefill');
          sessionStorage.removeItem('valencia_ai_pending_purchase_order_draft');
        } catch (e) {}
        window.dispatchEvent(new CustomEvent('valencia-ai:clear-purchase-order-form', { detail: aiData.ui_action }));
      }
      if (aiData.ui_action?.type === 'purchase_order_created' || aiData.tool_used === 'crear_orden_compra') {
        window._valenciaAiLiveDraft = null;
        try {
          sessionStorage.removeItem('valencia_ai_live_draft');
          sessionStorage.removeItem('valencia_ai_purchase_order_prefill');
        } catch (e) {}
        window.dispatchEvent(new CustomEvent('valencia-ai:purchase-order-saved', {
          detail: {
            orden_id: aiData.ui_action?.orden_id || aiData.tool_data?.orden_id,
            total: aiData.ui_action?.total || aiData.tool_data?.total,
          }
        }));
      }
    };

    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      voiceNote: voiceMeta || null,
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInputText('');
    setIsLoading(true);
    setStreamingStatus('Consultando base de datos...');
    setApiError(null);

    const botMsgId = Date.now() + 1;
    setMessages((prev) => [
      ...prev,
      {
        id: botMsgId,
        sender: 'bot',
        text: '',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        streaming: true,
      },
    ]);

    let accumulatedText = '';
    let usedSse = false;
    let streamTimeoutId = null;
    const STREAM_TIMEOUT_MS = 30_000;

    streamTimeoutId = setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
        setStreamingStatus(null);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === botMsgId && msg.streaming
              ? {
                  ...msg,
                  text: '⚠️ La conexión tardó demasiado. Por favor, intenta de nuevo.',
                  streaming: false,
                  isError: true,
                }
              : msg
          )
        );
      }
    }, STREAM_TIMEOUT_MS);

    try {
      await api.ai.chatStream({
        prompt: text,
        session_id: sessionId,
        history: chatHistory.slice(-20),
        onChunk: (chunk) => {
          usedSse = true;
          accumulatedText += chunk;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === botMsgId
                ? { ...msg, text: accumulatedText, streaming: true }
                : msg
            )
          );
        },
        onStatus: (statusText) => {
          setStreamingStatus(statusText);
        },
        onDone: (data) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === botMsgId
                ? {
                    ...msg,
                    text: data.reply || data.response || accumulatedText,
                    streaming: false,
                    toolUsed: data.tool_used || null,
                    toolData: data.tool_data || null,
                    toolMeta: getToolMeta(data.tool_used),
                    toolSuccess: data.tool_success,
                    toolStatus: data.tool_status,
                    logId: data.log_id || data.tool_log_id || null,
                    tipoOperacion: data.tool_used || data.tool_data?.operacion || null,
                    pedidoId: data.tool_data?.pedido_id || data.tool_data?.PedidoId || null,
                    chips: data.chips || null,
                    uiAction: data.ui_action || null,
                  }
                : msg
            )
          );

          dispatchAiSideEffects(data);

          setChatHistory((prev) => [
            ...prev,
            { role: 'user', text },
            { role: 'model', text: data.response || accumulatedText },
          ]);

          if (streamTimeoutId) clearTimeout(streamTimeoutId);
          setIsLoading(false);
          setStreamingStatus(null);
        },
        onError: async () => {
          if (usedSse && accumulatedText) {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === botMsgId ? { ...msg, streaming: false } : msg
              )
            );
            setIsLoading(false);
            setStreamingStatus(null);
            if (streamTimeoutId) clearTimeout(streamTimeoutId);
            return;
          }

          // Fallback a chat estándar si falla el stream
          try {
            const fallbackRes = await api.ai.chat({
              prompt: text,
              session_id: sessionId,
              history: chatHistory.slice(-20),
            });

            if (fallbackRes && fallbackRes.success && fallbackRes.data) {
              const data = fallbackRes.data;
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === botMsgId
                    ? {
                        ...msg,
                        text: data.reply || data.response || 'Sin respuesta.',
                        streaming: false,
                        toolUsed: data.tool_used || null,
                        toolData: data.tool_data || null,
                        toolMeta: getToolMeta(data.tool_used),
                        toolSuccess: data.tool_success,
                        toolStatus: data.tool_status,
                        logId: data.log_id || data.tool_log_id || null,
                        tipoOperacion: data.tool_used || data.tool_data?.operacion || null,
                        pedidoId: data.tool_data?.pedido_id || data.tool_data?.PedidoId || null,
                        chips: data.chips || null,
                        uiAction: data.ui_action || null,
                      }
                    : msg
                )
              );

              dispatchAiSideEffects(data);

              setChatHistory((prev) => [
                ...prev,
                { role: 'user', text },
                { role: 'model', text: data.response },
              ]);
            }
          } catch (fbErr) {
            const errorText = fbErr?.message || 'Error al procesar consulta.';
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === botMsgId
                  ? {
                      ...msg,
                      text: `⚠️ No pude completar la operación: ${errorText}`,
                      streaming: false,
                      isError: true,
                    }
                  : msg
              )
            );
          } finally {
            if (streamTimeoutId) clearTimeout(streamTimeoutId);
            setIsLoading(false);
            setStreamingStatus(null);
          }
        },
      });
    } catch (err) {
      if (!usedSse) {
        const errorText = err?.message || 'Error de conexión con Valencia AI.';
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === botMsgId
              ? {
                  ...msg,
                  text: `⚠️ Error de comunicación: ${errorText}`,
                  streaming: false,
                  isError: true,
                }
              : msg
          )
        );
        setIsLoading(false);
        setStreamingStatus(null);
        if (streamTimeoutId) clearTimeout(streamTimeoutId);
      }
    }
  }, [inputText, isLoading, chatHistory, sessionId]);

  const toggleVoiceMode = () => {
    const next = voiceMode === 'direct' ? 'dictation' : 'direct';
    setVoiceMode(next);
    try {
      localStorage.setItem('valencia_ai_voice_mode', next);
    } catch (e) {}
  };

  // CLIC EN EL MICRÓFONO CON VALIDACIÓN DE SATURACIÓN
  const handleMicClick = async () => {
    if (isLoading || isRecording || isTranscribing) return;

    // 1. Si ya se detectó saturación en el estado local, advertir inmediatamente
    if (voiceStatus.available === false || voiceStatus.status === 'saturated') {
      setVoiceAlertBanner(
        voiceStatus.message ||
          'Por ahora el micrófono está desactivado debido a que la API de audio está saturada o ha alcanzado su límite de cuota. Puedes escribir tu consulta directamente en el chat.'
      );
      inputRef.current?.focus();
      return;
    }

    // 2. Consulta rápida al backend antes de encender el hardware de audio
    try {
      const check = await api.ai.voiceStatus();
      if (check && check.success && (!check.available || check.status === 'saturated')) {
        setVoiceStatus({
          available: false,
          status: check.status,
          message: check.message || '',
          reason: check.reason || '',
          retryAfter: check.retry_after || 60,
        });
        setVoiceAlertBanner(
          check.message ||
            'Por ahora el micrófono está desactivado debido a que la API de audio está saturada o ha alcanzado su límite de cuota. Puedes escribir tu consulta directamente en el chat.'
        );
        inputRef.current?.focus();
        return;
      }
    } catch (e) {
      console.warn('Check previo de voz falló, intentando grabación local:', e);
    }

    // Si está disponible, iniciar grabación
    startRecording();
  };

  const startRecording = async () => {
    if (isRecording || isTranscribing || isLoading) return;
    setAudioError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setAudioError('Tu navegador no soporta grabación de micrófono.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      startVisualizer(stream);
      const mimeType = getSupportedMimeType();
      const recorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 16000,
      });

      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current = recorder;
      recordingStartTimeRef.current = Date.now();
      recorder.start(100);

      setIsRecording(true);
      setRecordingDuration(0);

      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => {
          const next = prev + 1;
          if (next >= 120) {
            stopRecording(true);
          }
          return next;
        });
      }, 1000);

    } catch (err) {
      console.error('Error al iniciar grabación:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setAudioError('Permiso de micrófono denegado. Permite el acceso para enviar notas de voz.');
      } else {
        setAudioError('No se pudo acceder al micrófono (' + (err.message || 'error') + ').');
      }
    }
  };

  const stopRecording = (shouldSend = true) => {
    if (!mediaRecorderRef.current || !isRecording) return;

    stopVisualizer();
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    const recorder = mediaRecorderRef.current;
    const durationSec = recordingDuration;
    setIsRecording(false);
    setRecordingDuration(0);

    recorder.onstop = async () => {
      try {
        recorder.stream?.getTracks().forEach((t) => t.stop());
      } catch (e) {}
      try {
        micStreamRef.current?.getTracks().forEach((t) => t.stop());
      } catch (e) {}
      micStreamRef.current = null;

      if (!shouldSend) {
        audioChunksRef.current = [];
        return;
      }

      const mimeType = recorder.mimeType || 'audio/webm';
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
      audioChunksRef.current = [];

      if (audioBlob.size < 2048 || durationSec < 0.3) {
        setAudioError('Audio muy corto. Mantén presionado o habla con claridad.');
        setTimeout(() => setAudioError(null), 4000);
        return;
      }

      await processAudioTranscription(audioBlob, mimeType, durationSec);
    };

    if (recorder.state !== 'inactive') {
      try {
        recorder.stop();
      } catch (e) {}
    }
  };

  const cancelRecording = () => {
    stopRecording(false);
  };

  const processAudioTranscription = async (audioBlob, mimeType, durationSec) => {
    setIsTranscribing(true);
    setAudioError(null);

    const localAudioUrl = URL.createObjectURL(audioBlob);

    try {
      const ext = mimeType.includes('mp4') ? 'mp4' : (mimeType.includes('wav') ? 'wav' : 'webm');
      const res = await api.ai.transcribeAudio(audioBlob, mimeType, `voice_${Date.now()}.${ext}`);
      const text = res?.data?.text?.trim() || '';
      const voiceNoteId = res?.data?.voice_note_id || null;

      if (!text) {
        setAudioError('⚠️ No se detectó ninguna palabra en la grabación. Intenta de nuevo.');
        setTimeout(() => setAudioError(null), 5000);
        return;
      }

      if (voiceMode === 'dictation') {
        setInputText((prev) => (prev ? `${prev} ${text}` : text));
        inputRef.current?.focus();
      } else {
        handleSendMessage(text, {
          audioUrl: localAudioUrl,
          duration: durationSec,
          voiceNoteId,
        });
      }
    } catch (err) {
      console.error('Error al transcribir audio:', err);
      const errMsg = err?.message || 'Error al transcribir el audio.';
      setAudioError(`⚠️ ${errMsg}`);

      // Detectar saturación reportada por backend
      const isSaturated =
        err?.status === 429 ||
        err?.status === 503 ||
        err?.data?.voice_service_saturated ||
        errMsg.toLowerCase().includes('saturad') ||
        errMsg.toLowerCase().includes('cuota') ||
        errMsg.toLowerCase().includes('límite') ||
        errMsg.toLowerCase().includes('demand');

      if (isSaturated) {
        setVoiceStatus({
          available: false,
          status: 'saturated',
          message: 'Por ahora el micrófono está desactivado debido a que la API de audio ha alcanzado su límite de cuota o está saturada.',
          reason: 'high_demand_or_quota',
          retryAfter: 60,
        });
        setVoiceAlertBanner(
          'Por ahora el micrófono está desactivado debido a que la API de audio ha alcanzado su límite de cuota o está saturada. Puedes escribir tu consulta directamente en el chat.'
        );
      }

      if (voiceMode === 'direct') {
        const failedVoiceMsg = {
          id: Date.now(),
          sender: 'user',
          text: '⚠️ [Nota de voz no transcrita]',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          voiceNote: {
            audioUrl: localAudioUrl,
            duration: durationSec,
            error: errMsg,
          },
        };
        setMessages((prev) => [...prev, failedVoiceMsg]);
      }
      setTimeout(() => setAudioError(null), 6000);
    } finally {
      setIsTranscribing(false);
    }
  };

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (rafVisualRef.current) cancelAnimationFrame(rafVisualRef.current);
      try { audioContextRef.current?.close(); } catch (e) {}
      try { micStreamRef.current?.getTracks().forEach((t) => t.stop()); } catch (e) {}
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stream?.getTracks().forEach((t) => t.stop());
          mediaRecorderRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  const handleResetChat = () => {
    setMessages(INITIAL_MESSAGES);
    setChatHistory([]);
    setSessionId('sess_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now());
    setIsLoading(false);
    setApiError(null);
  };

  const renderToolCard = (msg) => {
    if (!msg.toolUsed) return null;
    const meta = msg.toolMeta || TOOL_ICONS.utilidades;
    const isSuccess = msg.toolSuccess !== false;
    const status = msg.toolStatus;

    let statusIcon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
    let statusText = 'Completado';
    let cardBg = 'bg-slate-50 border-slate-200/90';
    let statusBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200/80';

    if (status === 'missing_fields') {
      statusIcon = <Info className="w-3.5 h-3.5 text-amber-500" />;
      statusText = 'Campos requeridos';
      cardBg = 'bg-amber-50/40 border-amber-200/80';
      statusBadge = 'bg-amber-50 text-amber-800 border-amber-200';
    } else if (status === 'pending_confirmation') {
      statusIcon = <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />;
      statusText = 'Confirmación requerida';
      cardBg = 'bg-amber-50/50 border-amber-300/80';
      statusBadge = 'bg-amber-100 text-amber-800 border-amber-300';
    } else if (!isSuccess) {
      statusIcon = <XCircle className="w-3.5 h-3.5 text-rose-500" />;
      statusText = 'Error en ejecución';
      cardBg = 'bg-rose-50/40 border-rose-200/80';
      statusBadge = 'bg-rose-50 text-rose-700 border-rose-200';
    }

    return (
      <div className={`mt-2 px-3 py-2 rounded-xl border ${cardBg} flex items-center justify-between gap-2.5 text-[11px] shadow-2xs`}>
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm leading-none shrink-0">{meta.icon}</span>
          <span className="font-semibold text-slate-800">{meta.label}</span>
          <span className="text-slate-300">/</span>
          <span className="font-mono text-slate-600 text-[10px] truncate">{msg.toolUsed}</span>
        </div>
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-medium shrink-0 ${statusBadge}`}>
          {statusIcon}
          <span>{statusText}</span>
        </div>
      </div>
    );
  };

  const handleFeedback = async (messageId, rating, motivo = null) => {
    const targetMsg = messages.find((m) => m.id === messageId);
    if (!targetMsg) return;

    // Actualización reactiva de estado en la interfaz
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? {
              ...m,
              feedback: rating,
              feedbackMotivo: motivo,
              showDislikeMenu: rating === 'dislike' && !motivo ? true : false,
            }
          : m
      )
    );

    // Si pulsó 'dislike' pero aún no selecciona el motivo, mantener el menú de opciones abierto
    if (rating === 'dislike' && !motivo) {
      return;
    }

    try {
      await api.ai.sendFeedback({
        session_id: sessionId,
        message_id: String(messageId),
        tool_log_id: targetMsg.logId || null,
        tool_name: targetMsg.toolUsed || null,
        pedido_id: targetMsg.pedidoId ? String(targetMsg.pedidoId) : null,
        tipo_operacion: targetMsg.tipoOperacion || targetMsg.toolUsed || 'consulta_operativa',
        rating,
        motivo_dislike: motivo,
      });

      // Disparar evento para que el Dashboard actualice el PEOR en tiempo real
      window.dispatchEvent(
        new CustomEvent('valencia-ai:feedback-recorded', {
          detail: {
            session_id: sessionId,
            message_id: String(messageId),
            rating,
            motivo,
          },
        })
      );
    } catch (err) {
      console.error('Error registrando feedback en Valencia AI:', err);
    }
  };

  const toggleDislikeMenu = (messageId) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, showDislikeMenu: !m.showDislikeMenu }
          : m
      )
    );
  };

  const renderFeedbackBar = (msg) => {
    // Solo en respuestas generadas por el bot terminadas y que no sean la bienvenida inicial ni error fatal de red
    if (msg.sender !== 'bot' || msg.streaming || msg.isError || msg.id === 1) return null;

    const currentFeedback = msg.feedback;
    const isLike = currentFeedback === 'like';
    const isDislike = currentFeedback === 'dislike';

    return (
      <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-col gap-1.5 text-[11px] select-none">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-slate-400 min-w-0">
            {isLike ? (
              <span className="text-emerald-700 font-semibold flex items-center gap-1.5 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/80 text-[10.5px]">
                <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>Operación validada con precisión</span>
              </span>
            ) : isDislike ? (
              <span className="text-rose-700 font-semibold flex items-center gap-1.5 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200/80 text-[10.5px]">
                <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />
                <span>Inconsistencia: {msg.feedbackMotivo || 'Reportada'}</span>
              </span>
            ) : (
              <span className="text-slate-400 font-normal flex items-center gap-1 text-[10px]">
                <span>¿Respuesta precisa y correcta?</span>
              </span>
            )}
          </div>

          {/* Botones Like / Dislike interactivos */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => handleFeedback(msg.id, 'like')}
              className={`p-1.5 rounded-lg border flex items-center gap-1 transition-all cursor-pointer text-xs active:scale-95 ${
                isLike
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs font-bold'
                  : 'bg-white hover:bg-emerald-50 text-slate-400 hover:text-emerald-700 border-slate-200 hover:border-emerald-300'
              }`}
              title="Confirmar: La orden u operación se procesó correctamente (Optimiza la Tasa de Error PEOR)"
            >
              <ThumbsUp className={`w-3.5 h-3.5 transition-transform ${isLike ? 'fill-current' : ''}`} />
            </button>

            <button
              type="button"
              onClick={() => {
                if (isDislike && !msg.showDislikeMenu) {
                  toggleDislikeMenu(msg.id);
                } else {
                  handleFeedback(msg.id, 'dislike');
                }
              }}
              className={`p-1.5 rounded-lg border flex items-center gap-1 transition-all duration-200 cursor-pointer text-xs active:scale-90 ${
                isDislike
                  ? 'bg-rose-600 text-white border-rose-600 shadow-2xs font-bold'
                  : 'bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-700 border-slate-200 hover:border-rose-300'
              }`}
              title="Reportar inconsistencia o error (Computa en Tasa de Error PEOR)"
            >
              <ThumbsDown className={`w-3.5 h-3.5 transition-transform ${isDislike ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>

        {/* Menú de Tipología de Error al presionar Dislike */}
        {msg.showDislikeMenu && (
          <div className="bg-rose-50/80 border border-rose-200 rounded-xl p-2.5 mt-1 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="flex items-center justify-between text-[11px] font-bold text-rose-900">
              <span>Indica la causa de la inconsistencia:</span>
              <button
                type="button"
                onClick={() => toggleDislikeMenu(msg.id)}
                className="text-rose-400 hover:text-rose-700 cursor-pointer text-xs px-1"
                title="Cerrar"
              >
                ✕
              </button>
            </div>
            <p className="text-[10px] text-rose-600/90 leading-tight">
              Esta retroalimentación nutre el indicador PEOR y la tipología de errores en el Dashboard.
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {MOTIVOS_DISLIKE.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleFeedback(msg.id, 'dislike', m.id)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-medium transition cursor-pointer border ${
                    msg.feedbackMotivo === m.id
                      ? 'bg-rose-700 text-white border-rose-700 font-bold shadow-2xs'
                      : 'bg-white hover:bg-rose-100 text-rose-800 border-rose-200 hover:border-rose-300'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* BOTÓN FLOTANTE LANZADOR MOVIBLE (cuando está cerrado) */}
      {!isOpen && (
        <div
          ref={launcherRef}
          style={
            launcherPos
              ? {
                  position: 'fixed',
                  left: `${launcherPos.x}px`,
                  top: `${launcherPos.y}px`,
                  zIndex: 40,
                }
              : undefined
          }
          className={`z-40 select-none ${launcherPos ? '' : 'fixed bottom-6 right-6'}`}
        >
          <button
            type="button"
            onClick={handleLauncherClick}
            onPointerDown={handleLauncherPointerDown}
            onPointerMove={handleLauncherPointerMove}
            onPointerUp={handleLauncherPointerUp}
            className={`group relative flex items-center gap-3 pl-2.5 pr-4 py-2 bg-slate-900/95 hover:bg-slate-950 text-white rounded-full shadow-2xl shadow-slate-950/30 border border-slate-700/80 hover:border-blue-500/60 backdrop-blur-md transition-all duration-300 transform active:scale-95 select-none ${
              isDraggingLauncher ? 'cursor-grabbing scale-105 shadow-blue-500/20' : 'cursor-grab hover:-translate-y-0.5'
            }`}
            title="Arrastra para mover • Clic para abrir Asistente Valencia AI"
          >
            {/* Avatar AI con robot minimalista y baliza pulsante */}
            <div className="relative shrink-0">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 p-0.5 shadow-md shadow-blue-500/25 flex items-center justify-center">
                <div className="w-full h-full bg-slate-900 rounded-[13px] flex items-center justify-center p-1">
                  <ValenciaBotAvatar className="w-5.5 h-5.5 text-white" headColor="#ffffff" visorColor="#0f172a" eyeColor="#38bdf8" />
                </div>
              </div>
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border-2 border-slate-900"></span>
              </span>
            </div>

            <div className="text-left pr-0.5">
              <div className="flex items-center gap-1.5">
                <span className="block text-xs font-bold leading-tight tracking-tight text-white">Valencia AI</span>
                <span className="px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-300 text-[9px] font-semibold uppercase tracking-wider border border-blue-400/30">IA</span>
              </div>
              <span className="block text-[10.5px] text-slate-400 font-medium">Asistente Virtual</span>
            </div>

            <Sparkles className="w-4 h-4 text-blue-400 group-hover:rotate-12 transition-transform shrink-0 ml-0.5" />
          </button>
        </div>
      )}

      {/* VENTANA FLOTANTE Y ARRASTRABLE DEL CHATBOT */}
      {isOpen && (
        <div
          ref={windowRef}
          style={
            !isExpanded
              ? {
                  position: 'fixed',
                  left: `${position.x}px`,
                  top: `${position.y}px`,
                  width: typeof window !== 'undefined' && window.innerWidth < 640 ? 'calc(100vw - 24px)' : '420px',
                  height: typeof window !== 'undefined' && window.innerHeight < 720 ? 'calc(100vh - 48px)' : '600px',
                  minWidth: '320px',
                  maxWidth: 'calc(100vw - 20px)',
                  maxHeight: 'calc(100vh - 20px)',
                  zIndex: 45,
                  willChange: 'transform, left, top',
                }
              : undefined
          }
          className={`flex flex-col bg-white rounded-2xl border border-slate-300/80 shadow-2xl shadow-slate-950/25 overflow-hidden transition-all duration-200 ring-1 ring-black/5 ${
            isExpanded
              ? 'fixed inset-3 sm:left-[304px] sm:top-[92px] sm:right-6 sm:bottom-6 z-40'
              : ''
          } ${isDragging ? 'shadow-blue-500/20 ring-2 ring-blue-500/50 select-none' : ''}`}
        >
          {/* CABECERA (ZONA DE ARRASTRE - TOTALMENTE RESPONSIVA) */}
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className={`p-3 bg-slate-900 text-white flex items-center justify-between gap-2 border-b border-slate-800 shrink-0 select-none ${
              !isExpanded ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
            }`}
            title={!isExpanded ? 'Arrastra desde aquí para mover la ventana' : ''}
          >
            {/* Lado izquierdo: Avatar moderno minimalista e info limpia */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative shrink-0">
                <div className="w-8.5 h-8.5 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 p-0.5 shadow-md shadow-blue-500/25 flex items-center justify-center">
                  <div className="w-full h-full bg-slate-900 rounded-[13px] flex items-center justify-center p-0.5">
                    <ValenciaBotAvatar className="w-5.5 h-5.5 text-white" headColor="#ffffff" visorColor="#0f172a" eyeColor="#38bdf8" />
                  </div>
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-900 rounded-full"></span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm tracking-tight text-white leading-tight truncate">Valencia AI</h3>
                  <span className="px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-300 text-[9px] font-semibold uppercase tracking-wider border border-blue-400/30">IA</span>
                </div>
                <p className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium leading-none mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
                  <span>En línea</span>
                </p>
              </div>
            </div>

            {/* Acciones de la Cabecera (Botón X y controles siempre visibles y accesibles) */}
            <div className="flex items-center gap-1 shrink-0 text-slate-300">
              {/* Botón Restaurar Posición (si se ha movido) */}
              {!isExpanded && hasCustomPosition && (
                <button
                  type="button"
                  onClick={handleResetPosition}
                  className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
                  title="Restablecer posición"
                >
                  <Compass className="w-4 h-4" />
                </button>
              )}

              {/* Selector de modo de voz */}
              <button
                type="button"
                onClick={toggleVoiceMode}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/80 rounded-lg text-[10px] font-medium transition cursor-pointer flex items-center gap-1 shrink-0"
                title={`Modo de voz: ${voiceMode === 'direct' ? 'Envío directo automático' : 'Dictado en texto'}`}
              >
                {voiceMode === 'direct' ? (
                  <>
                    <Zap className="w-3 h-3 text-amber-400 shrink-0" />
                    <span className="hidden sm:inline">Directo</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-3 h-3 text-blue-400 shrink-0" />
                    <span className="hidden sm:inline">Dictado</span>
                  </>
                )}
              </button>

              {/* Reiniciar chat */}
              <button
                type="button"
                onClick={handleResetChat}
                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
                title="Reiniciar conversación"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Botón Maximizar / Restaurar */}
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
                title={isExpanded ? 'Restaurar a ventana flotante' : 'Maximizar'}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              {/* Botón Cerrar (X) - SIEMPRE VISIBLE con badge distintivo */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 bg-rose-500/20 hover:bg-rose-500/35 text-rose-300 hover:text-white border border-rose-500/30 rounded-lg transition cursor-pointer ml-1 shrink-0"
                title="Cerrar asistente"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* BANNER DE ADVERTENCIA: SATURACIÓN O PAUSA DE API DE VOZ */}
          {voiceAlertBanner && (
            <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-200 text-amber-800 text-xs flex items-start justify-between gap-2.5 animate-in fade-in">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-[11px]">Micrófono temporalmente en pausa</p>
                  <p className="text-[11px] text-amber-700 mt-0.5 leading-snug">{voiceAlertBanner}</p>
                  <button
                    type="button"
                    onClick={() => checkVoiceStatus(true)}
                    disabled={isCheckingVoice}
                    className="mt-1 text-[10px] font-bold text-amber-900 underline hover:text-amber-950 cursor-pointer flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${isCheckingVoice ? 'animate-spin' : ''}`} />
                    <span>Reintentar verificación de conexión</span>
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setVoiceAlertBanner(null)}
                className="text-amber-500 hover:text-amber-700 font-bold text-xs cursor-pointer p-0.5 shrink-0"
                title="Cerrar advertencia"
              >
                ✕
              </button>
            </div>
          )}

          {/* ÁREA DE MENSAJES */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/60 text-xs">
            <div className="text-center my-1">
              <span className="text-[10px] text-slate-500 bg-white px-3 py-1 rounded-full font-mono border border-slate-200/80 shadow-2xs">
                Sesión Activa • Comercial Valencia
              </span>
            </div>

            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.sender === 'bot' && (
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs border border-blue-400/30 p-0.5">
                    <ValenciaBotAvatar className="w-4.5 h-4.5 text-white" headColor="#ffffff" visorColor="#0f172a" eyeColor="#38bdf8" />
                  </div>
                )}

                <div className={`max-w-[87%] space-y-1.5 ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                  {msg.voiceNote && (
                    <VoiceNotePlayer voiceNote={msg.voiceNote} />
                  )}

                  <div
                    className={`p-3.5 rounded-2xl leading-relaxed whitespace-pre-line shadow-2xs ${
                      msg.sender === 'user'
                        ? 'bg-slate-900 text-slate-100 rounded-br-xs font-normal selection:bg-blue-600'
                        : msg.isError
                        ? 'bg-rose-50 text-rose-800 border border-rose-200/90 rounded-tl-xs'
                        : 'bg-white text-slate-800 border border-slate-200/90 rounded-tl-xs'
                    }`}
                    dangerouslySetInnerHTML={msg.sender === 'bot' && !msg.isError ? { __html: formatBotText(msg.text) } : undefined}
                  >
                    {msg.sender !== 'bot' || msg.isError ? msg.text : undefined}
                  </div>

                  {/* Tarjeta de tool usada */}
                  {msg.sender === 'bot' && renderToolCard(msg)}

                  {/* Barra interactiva de Feedback (Like / Dislike) */}
                  {msg.sender === 'bot' && renderFeedbackBar(msg)}

                  {/* Chips de sugerencia */}
                  {msg.chips && msg.chips.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {msg.chips.map((chip, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            // Si el chip tiene metadata con draft_id, guardarlo en sessionStorage antes de enviar
                            if (chip.metadata?.draft_id) {
                              try {
                                const existing = JSON.parse(sessionStorage.getItem('valencia_ai_pending_order_draft') || 'null');
                                if (existing) {
                                  sessionStorage.setItem(
                                    'valencia_ai_pending_order_draft',
                                    JSON.stringify({ ...existing, draft_id: chip.metadata.draft_id })
                                  );
                                }
                              } catch (e) {}
                            }
                            if (chip.metadata?.purchase_draft_id || chip.params?.purchase_draft_id) {
                              const pDraftId = chip.metadata?.purchase_draft_id || chip.params?.purchase_draft_id;
                              try {
                                const existing = JSON.parse(sessionStorage.getItem('valencia_ai_pending_purchase_order_draft') || 'null');
                                if (existing) {
                                  sessionStorage.setItem(
                                    'valencia_ai_pending_purchase_order_draft',
                                    JSON.stringify({ ...existing, purchase_draft_id: pDraftId })
                                  );
                                }
                              } catch (e) {}
                            }

                            if (chip.action === 'open_supplier_form') {
                              const prefill = { ProveedorRazonSocial: chip.params?.razon_social || '' };
                              try {
                                sessionStorage.setItem('valencia_ai_proveedor_prefill', JSON.stringify(prefill));
                              } catch (e) {}
                              window.dispatchEvent(new CustomEvent('valencia-ai:open-form', { detail: { type: 'open_form', form: 'proveedor', prefill } }));
                            }

                            const queryToSend = chip.query || (
                              chip.action === 'register_supplier' ? `Registra al proveedor ${chip.params?.razon_social || ''}` :
                              chip.action === 'open_supplier_form' ? `Abre el formulario para registrar a ${chip.params?.razon_social || ''}` :
                              chip.action === 'reassign_purchase_draft' ? `Asigna la orden a ${chip.params?.proveedor_nombre || ''}` :
                              chip.action === 'select_supplier' ? `Comprar a ${chip.params?.proveedor_nombre || chip.label}` :
                              chip.action === 'confirm_reassign_purchase_draft' ? `Sí, comprar a ${chip.params?.proveedor_nombre || ''}` :
                              chip.action === 'cancel_reassign' ? 'No, mantener la orden' :
                              chip.action === 'discard_purchase_draft' ? 'Descarta la orden de compra pendiente' :
                              chip.label
                            );
                            handleSendMessage(queryToSend);
                          }}
                          disabled={isLoading}
                          className="px-3 py-1.5 bg-white hover:bg-blue-50/70 text-slate-700 hover:text-blue-700 border border-slate-200/90 hover:border-blue-300 rounded-full text-[11px] font-medium transition-all duration-150 flex items-center gap-1.5 shadow-2xs cursor-pointer text-left hover:shadow-xs active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed group"
                        >
                          <span>{chip.label}</span>
                          <ArrowRight className="w-3 h-3 text-blue-500 shrink-0 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* === BI: Gráfico dinámico inline === */}
                  {msg.sender === 'bot' && msg.uiAction?.type === 'render_chart' && (
                    <ChatChart chartData={msg.uiAction.chart} />
                  )}

                  {/* === BI: Tabla dinámica inline === */}
                  {msg.sender === 'bot' && msg.uiAction?.type === 'render_table' && (
                    <ChatTable tableData={msg.uiAction.table} />
                  )}

                  {/* === BI: Estado vacío (sin datos) === */}
                  {msg.sender === 'bot' && msg.uiAction?.type === 'render_empty_state' && (
                    <div className="bg-slate-50 border border-slate-200/90 rounded-xl px-3 py-2.5 text-[11px] text-slate-500 flex items-center gap-2 mt-1 shadow-2xs">
                      <span className="text-base">{msg.uiAction.icon || '📊'}</span>
                      <span>{msg.uiAction.message}</span>
                    </div>
                  )}

                  <div className={`flex items-center gap-1.5 text-[10px] text-slate-400 px-1 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <span className="font-mono">{msg.timestamp}</span>
                    {msg.sender === 'user' && <CheckCheck className="w-3 h-3 text-blue-400" />}
                    {msg.sender === 'bot' && msg.toolUsed && (
                      <span className="flex items-center gap-1 text-blue-600 bg-blue-50 border border-blue-200/60 px-1.5 py-0.2 rounded font-mono text-[9.5px]">
                        <Zap className="w-2.5 h-2.5 text-blue-500" />
                        <span>Valencia AI</span>
                      </span>
                    )}
                  </div>
                </div>

                {msg.sender === 'user' && (
                  <div className="w-7 h-7 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs" title="Tú">
                    <User className="w-3.5 h-3.5 text-slate-600" />
                  </div>
                )}
              </div>
            ))}

            {/* INDICADOR DE CARGA / PENSAMIENTO */}
            {isLoading && (
              <div className="flex gap-2.5 items-center">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs border border-blue-400/30 p-0.5">
                  <ValenciaBotAvatar className="w-4.5 h-4.5 text-white" headColor="#ffffff" visorColor="#0f172a" eyeColor="#38bdf8" />
                </div>
                <div className="px-3.5 py-2.5 bg-white border border-slate-200/90 rounded-2xl rounded-tl-xs shadow-2xs flex items-center gap-2.5">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></span>
                  </div>
                  <span className="text-[11px] text-slate-600 font-mono ml-1 font-medium animate-pulse">
                    {streamingStatus || 'Valencia AI procesando consulta en tiempo real...'}
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ÁREA DE ENTRADA */}
          <div className="p-3 bg-white border-t border-slate-200/80 space-y-2.5">
            {audioError && (
              <div className="px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 text-[11px] rounded-lg flex items-center justify-between animate-in fade-in">
                <span className="truncate">{audioError}</span>
                <button
                  type="button"
                  onClick={() => setAudioError(null)}
                  className="text-rose-500 hover:text-rose-700 font-bold ml-2 text-xs cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {isRecording ? (
              <div className="flex items-center gap-2 px-2 py-2 bg-slate-50 border border-slate-200 rounded-full animate-in fade-in">
                {/* Descartar */}
                <button
                  type="button"
                  onClick={cancelRecording}
                  className="w-9 h-9 rounded-full hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center shrink-0 transition cursor-pointer active:scale-95"
                  title="Descartar grabación"
                >
                  <Trash2 className="w-[18px] h-[18px]" />
                </button>

                {/* Timer estilo WhatsApp */}
                <div className="flex items-center gap-1.5 shrink-0 pl-1">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className={`text-[13px] tabular-nums font-medium ${isRecUrgent ? 'text-red-600' : 'text-slate-700'}`}>
                    {formatTimer(recordingDuration)}
                  </span>
                </div>

                {/* Waveform simple */}
                <div
                  className="flex-1 flex items-center gap-[2.5px] h-8 px-1 overflow-hidden"
                  title="Nivel de micrófono"
                >
                  {audioLevels.map((lv, i) => {
                    const active = lv > 0.02;
                    const h = active ? 5 + lv * 22 : 4;
                    return (
                      <span
                        key={i}
                        style={{ height: `${Math.min(30, h)}px` }}
                        className={`w-[3px] rounded-full transition-[height] duration-75 ${
                          active ? 'bg-slate-700' : 'bg-slate-300'
                        }`}
                      />
                    );
                  })}
                </div>

                <span className="text-[11px] tabular-nums text-slate-400 shrink-0 hidden sm:inline">/ 2:00</span>

                {/* Enviar circular */}
                <button
                  type="button"
                  onClick={() => stopRecording(true)}
                  className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shrink-0 transition cursor-pointer shadow-md shadow-emerald-500/25 active:scale-95"
                  title="Enviar nota de voz"
                >
                  <Send className="w-[18px] h-[18px] ml-0.5" />
                </button>
              </div>
            ) : isTranscribing ? (
              <div className="flex items-center justify-center gap-2 p-2.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-2xl text-xs font-medium animate-in fade-in">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span>Transcribiendo nota de voz con IA...</span>
              </div>
            ) : (
              <form
                onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                className="flex items-center gap-2"
              >
                <div className="relative flex-1 flex items-center bg-slate-50 focus-within:bg-white border border-slate-200/90 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/15 rounded-2xl transition duration-200 px-3 py-1 shadow-2xs">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    disabled={isLoading}
                    placeholder={
                      voiceStatus.available === false
                        ? 'Micrófono en pausa: escribe tu consulta aquí...'
                        : isLoading
                        ? 'Valencia AI está procesando consulta...'
                        : 'Consulta órdenes, stock, clientes o usa el micrófono...'
                    }
                    className="w-full pr-8 py-1.5 bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden disabled:opacity-60 disabled:cursor-not-allowed"
                  />

                  {/* BOTÓN DE MICRÓFONO CON VALIDACIÓN DE ESTADO / SATURACIÓN */}
                  <button
                    type="button"
                    onClick={handleMicClick}
                    disabled={isLoading}
                    className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-xl transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                      voiceStatus.available === false
                        ? 'text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-300/80 shadow-2xs'
                        : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
                    }`}
                    title={
                      voiceStatus.available === false
                        ? '⚠️ Micrófono desactivado: la API de audio ha llegado a su límite de cuota o está saturada. Clic para ver opciones.'
                        : `Grabar nota de voz (${voiceMode === 'direct' ? 'Envío directo' : 'Dictado'})`
                    }
                  >
                    {voiceStatus.available === false ? (
                      <div className="relative flex items-center justify-center">
                        <MicOff className="w-4 h-4 text-amber-600" />
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full animate-ping"></span>
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full"></span>
                      </div>
                    ) : (
                      <Mic className="w-4 h-4" />
                    )}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={!inputText.trim() || isLoading}
                  className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 text-white disabled:text-slate-300 rounded-xl transition shadow-xs hover:shadow-blue-500/20 active:scale-95 cursor-pointer disabled:cursor-not-allowed shrink-0 flex items-center justify-center"
                  title="Enviar consulta"
                >
                  {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </form>
            )}

            <div className="flex items-center justify-between px-1 text-[10px] text-slate-400">
              <span className="flex items-center gap-1.5 text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>Comercial Valencia</span>
              </span>
              <span>Asistente Virtual</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}