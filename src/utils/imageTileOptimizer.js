/**
 * Normalizador de imágenes para Gemini 1.5 Flash (Estrategia 1-Tile).
 * Escala la imagen para que su dimensión mayor no supere los 768px,
 * consumiendo exactamente 258 tokens de visión.
 * Soporta WebP nativo con fallback a JPEG.
 */
export async function optimizeImageForTile(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error('No se proporcionó ningún archivo de imagen.'));
    }

    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Error al leer el archivo de imagen.'));

    reader.onload = () => {
      const img = new Image();

      img.onerror = () => reject(new Error('Error al procesar la imagen en el navegador.'));

      img.onload = () => {
        try {
          const maxDim = 768; // Límite estricto de 1 tile de Gemini (258 tokens)
          let width = img.width;
          let height = img.height;

          if (width > height && width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            throw new Error('No se pudo inicializar el contexto 2D de Canvas.');
          }

          // Dibujar con fondo blanco por si la imagen tiene transparencias (PNG/WebP)
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          // 1. Intentar compresión a WebP (80%)
          let dataUrl = canvas.toDataURL('image/webp', 0.8);
          let mimeType = 'image/webp';

          // 2. Fallback resiliente a JPEG si WebP no es soportado por el navegador
          if (!dataUrl.startsWith('data:image/webp')) {
            dataUrl = canvas.toDataURL('image/jpeg', 0.82);
            mimeType = 'image/jpeg';
          }

          const base64Data = dataUrl.split(',')[1] || '';

          resolve({
            base64: base64Data,
            mimeType,
            width,
            height,
            dataUrl,
            originalSize: file.size,
            compressedSize: Math.round((base64Data.length * 3) / 4),
          });
        } catch (err) {
          reject(err);
        }
      };

      img.src = reader.result;
    };

    reader.readAsDataURL(file);
  });
}
