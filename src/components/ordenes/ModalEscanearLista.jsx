import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  UploadCloud,
  Sparkles,
  X,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Trash2,
  RefreshCw,
  Zap,
  ArrowRight,
  FileImage,
  ChevronDown,
} from 'lucide-react';
import api from '../../services/api';
import { optimizeImageForTile } from '../../utils/imageTileOptimizer';

export default function ModalEscanearLista({
  isOpen,
  onClose,
  onItemsAceptados,
}) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Resultados de la IA
  const [detectedItems, setDetectedItems] = useState([]);
  const [tokenAuditoria, setTokenAuditoria] = useState(null);
  const [tokensConsumidos, setTokensConsumidos] = useState(258);
  const [tiempoMs, setTiempoMs] = useState(0);

  const fileInputRef = useRef(null);

  // Escuchar pegado desde portapapeles (Ctrl + V)
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            procesarArchivo(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  const procesarArchivo = async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      setErrorMsg('Por favor selecciona un archivo de imagen válido (JPEG, PNG, WebP).');
      return;
    }

    setErrorMsg(null);
    setSelectedFile(file);
    setIsOptimizing(true);
    setIsAnalyzing(false);
    setDetectedItems([]);

    try {
      // 1. Normalización a 1-Tile (Máx 768px)
      const optimized = await optimizeImageForTile(file);
      setPreviewUrl(optimized.dataUrl);
      setIsOptimizing(false);
      setIsAnalyzing(true);

      // 2. Enviar a Gemini Vision en Laravel
      const res = await api.vision.procesarPedido({
        imagen_base64: optimized.base64,
        mime_type: optimized.mimeType,
      });

      if (res && res.success && res.data) {
        setTokenAuditoria(res.data.token_auditoria || null);
        setDetectedItems(res.data.items || []);
        setTokensConsumidos(res.data.tokens_consumidos || 258);
        setTiempoMs(res.data.tiempo_ms || 0);
      } else {
        throw new Error(res?.message || 'No se pudieron extraer datos de la imagen.');
      }
    } catch (err) {
      console.error('Error al procesar foto con IA:', err);
      setErrorMsg(err.message || 'Ocurrió un error al analizar la imagen con IA.');
    } finally {
      setIsOptimizing(false);
      setIsAnalyzing(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) procesarArchivo(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) procesarArchivo(file);
  };

  const handleCambiarCantidad = (index, nuevaCant) => {
    const cantNum = Math.max(1, parseFloat(nuevaCant) || 1);
    setDetectedItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, cantidad_detectada: cantNum } : item))
    );
  };

  const handleCambiarPresentacion = (index, unidadId) => {
    setDetectedItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const encontrada = (item.presentaciones_posibles || []).find((p) => p.unidad_id === unidadId);
        if (!encontrada) return item;
        return {
          ...item,
          presentacion_id: encontrada.unidad_id,
          presentacion_nombre: encontrada.descripcion,
          presentacion_factor: encontrada.factor,
          precio_unitario: encontrada.precio_venta,
          presentacion_es_sugerida: false,
        };
      })
    );
  };

  const handleEliminarItem = (index) => {
    setDetectedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConfirmar = () => {
    if (detectedItems.length === 0) return;
    onItemsAceptados(detectedItems, tokenAuditoria);
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setDetectedItems([]);
    setTokenAuditoria(null);
    setIsOptimizing(false);
    setIsAnalyzing(false);
    setErrorMsg(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* CABECERA */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-linear-to-r from-blue-50/70 via-indigo-50/30 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-800 text-base leading-tight">
                  Escanear Lista de Pedido con IA
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 flex items-center gap-1 border border-blue-200">
                  <Zap className="w-3 h-3" />
                  Gemini 1.5 Flash (1-Tile)
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Fotografía o captura de lista manuscrita • Normalizada a 768px • Consumo optimizado: 258 tokens
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENIDO PRINCIPAL */}
        <div className="p-6 overflow-y-auto grow space-y-5">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ÁREA DE CARGA DE IMAGEN (Si aún no hay ítems detectados) */}
          {detectedItems.length === 0 && !isAnalyzing && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-blue-300 hover:border-blue-500 rounded-2xl p-8 text-center bg-blue-50/30 hover:bg-blue-50/60 transition cursor-pointer group"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                capture="environment"
                className="hidden"
              />
              <div className="w-16 h-16 rounded-2xl bg-blue-100/80 group-hover:bg-blue-600 text-blue-600 group-hover:text-white flex items-center justify-center mx-auto mb-3 transition-colors duration-200 shadow-xs">
                <UploadCloud className="w-8 h-8" />
              </div>
              <p className="text-sm font-bold text-slate-800">
                Haz clic para subir o arrastra la foto de la lista de compras
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Puedes tomar una foto con la cámara o presionar <kbd className="px-1.5 py-0.5 bg-white border rounded text-[11px] font-mono text-slate-600">Ctrl + V</kbd> para pegar captura
              </p>
              <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-slate-500 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Optimización automática a 1-Tile (768px WebP/JPEG)</span>
              </div>
            </div>
          )}

          {/* ESTADO DE PROCESAMIENTO / ANALIZANDO */}
          {(isOptimizing || isAnalyzing) && (
            <div className="py-12 px-6 text-center bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center justify-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30 animate-bounce">
                  <Sparkles className="w-8 h-8" />
                </div>
                <div className="absolute -inset-2 rounded-3xl border-2 border-blue-400 border-dashed animate-spin"></div>
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-800">
                  {isOptimizing ? 'Normalizando imagen a 768px...' : 'Interpretando lista con Valencia Vision...'}
                </h4>
                <p className="text-xs text-slate-500 max-w-sm">
                  {isOptimizing
                    ? 'Comprimiendo tamaño de imagen para consumir exactamente 258 tokens.'
                    : 'Extrayendo productos, cantidades y emparejando con el catálogo de inventario.'}
                </p>
              </div>
            </div>
          )}

          {/* TABLA DE RESULTADOS INTERPRETADOS */}
          {detectedItems.length > 0 && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-bold text-slate-700">
                    {detectedItems.length} producto(s) detectado(s)
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-[11px] font-mono text-slate-500">
                    {tokensConsumidos} tokens consumidos
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-[11px] font-mono text-slate-500">
                    {tiempoMs} ms
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Subir otra foto</span>
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Estado Match</th>
                      <th className="py-2.5 px-3">Texto Detectado</th>
                      <th className="py-2.5 px-3">Producto en Catálogo</th>
                      <th className="py-2.5 px-3 text-center">Cant.</th>
                      <th className="py-2.5 px-3">Presentación</th>
                      <th className="py-2.5 px-3 text-right">P. Unit.</th>
                      <th className="py-2.5 px-3 text-right">Subtotal</th>
                      <th className="py-2.5 px-2 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {detectedItems.map((item, idx) => {
                      const subtotal = (item.cantidad_detectada || 1) * (item.precio_unitario || 0);

                      let badgeEl = (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 w-fit">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          {item.match_score}%
                        </span>
                      );

                      if (item.match_badge === 'ambar') {
                        badgeEl = (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1 w-fit">
                            <AlertTriangle className="w-3 h-3 text-amber-500" />
                            {item.match_score}%
                          </span>
                        );
                      } else if (item.match_badge === 'gris') {
                        badgeEl = (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200 flex items-center gap-1 w-fit">
                            <HelpCircle className="w-3 h-3 text-slate-400" />
                            Sin Match
                          </span>
                        );
                      }

                      return (
                        <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-3 whitespace-nowrap">{badgeEl}</td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                            "{item.texto_detectado}"
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-slate-800 block">
                              {item.producto_nombre}
                            </span>
                            {item.producto_id && (
                              <span className="text-[10px] font-mono text-slate-400">
                                {item.producto_id} • Stock: {item.stock_actual}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={item.cantidad_detectada}
                              onChange={(e) => handleCambiarCantidad(idx, e.target.value)}
                              className="w-16 px-2 py-1 text-center font-bold text-slate-800 border border-slate-200 rounded-lg focus:outline-blue-500"
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            {item.presentaciones_posibles?.length > 1 ? (
                              <select
                                value={item.presentacion_id}
                                onChange={(e) => handleCambiarPresentacion(idx, e.target.value)}
                                className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-blue-500"
                              >
                                {item.presentaciones_posibles.map((p) => (
                                  <option key={p.unidad_id} value={p.unidad_id}>
                                    {p.descripcion} (x{p.factor}) - S/ {p.precio_venta}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                                {item.presentacion_nombre || 'Unidad'}
                              </span>
                            )}
                            {item.presentacion_es_sugerida && (
                              <span className="block text-[9.5px] text-blue-600 font-semibold mt-0.5">
                                Sugerido por IA
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                            S/ {Number(item.precio_unitario || 0).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                            S/ {Number(subtotal).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleEliminarItem(idx)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition cursor-pointer"
                              title="Descartar este producto"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* PIE DEL MODAL */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {detectedItems.length > 0 && (
              <span>
                Al dar clic en precargar, los productos se añadirán a tu borrador de pedido conservando la trazabilidad.
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs border border-slate-200 transition cursor-pointer"
            >
              Cancelar
            </button>
            {detectedItems.length > 0 && (
              <button
                type="button"
                onClick={handleConfirmar}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-500/25 flex items-center gap-1.5 transition cursor-pointer"
              >
                <span>Precargar en el Pedido</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
