/** Compress a base64 image to at most maxSizePx on the longest side, JPEG quality 0–1.
 *  @param mediaType - original media type (used to decode the data URL correctly)
 */
export function compressImage(
  base64: string,
  maxSizePx = 1200,
  quality = 0.75,
  mediaType = 'image/jpeg',
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSizePx / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(base64); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      // Always output JPEG for smaller file size
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(dataUrl.split(',')[1]);
    };
    img.onerror = () => resolve(base64);
    img.src = `data:${mediaType};base64,${base64}`;
  });
}

/** Returns the approximate base64-encoded size in bytes. */
export function base64SizeBytes(base64: string): number {
  return Math.ceil(base64.length * 0.75);
}
