// ══════════════════════════════════════════════════════════════════════════════
// Compression d'image côté client — un reçu photo brut (photo de téléphone,
// souvent 3-5 Mo) serait absurde à stocker tel quel dans le JSON de l'app :
// ça exploserait le quota localStorage (~5-10 Mo total, pas juste pour ça)
// et alourdirait chaque sync. On redimensionne + recompresse en JPEG avant
// de le convertir en data URL.
// ══════════════════════════════════════════════════════════════════════════════

const MAX_DIMENSION = 1000; // px — largeur/hauteur max, suffisant pour relire un ticket
const JPEG_QUALITY = 0.65;
export const MAX_RECEIPT_SIZE_BYTES = 400 * 1024; // 400 Ko après compression — au-delà, on refuse

export interface CompressResult {
  dataUrl: string;
  sizeBytes: number;
  tooLarge: boolean;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image illisible"));
    };
    img.src = url;
  });
}

// Taille approximative en octets d'une data URL base64 (sans compter le
// préfixe "data:image/jpeg;base64,")
function estimateBase64Bytes(dataUrl: string): number {
  const b64 = dataUrl.split(",")[1] ?? "";
  return Math.floor((b64.length * 3) / 4);
}

export async function compressReceiptImage(
  file: File,
): Promise<CompressResult> {
  const img = await loadImage(file);

  let { width, height } = img;
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const scale = MAX_DIMENSION / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx)
    throw new Error("Impossible de préparer l'image (canvas non supporté)");
  ctx.drawImage(img, 0, 0, width, height);

  const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  const sizeBytes = estimateBase64Bytes(dataUrl);

  return {
    dataUrl,
    sizeBytes,
    tooLarge: sizeBytes > MAX_RECEIPT_SIZE_BYTES,
  };
}
