// Downscales a shelf photo client-side before upload. Keeping the longest side
// at ~1500px bounds the vision LLM's input tokens (ADR-010: cost ≈ $0.001/scan)
// and the request payload, without losing the legibility of book spines.

const MAX_EDGE = 1500;
const JPEG_QUALITY = 0.82;

export interface EncodedImage {
  image_base64: string;
  media_type: "image/jpeg";
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not decode image"));
    };
    img.src = url;
  });
}

// Strips the `data:<mime>;base64,` prefix — the backend schema expects the raw
// base64 payload, not a full data URL.
function stripDataUrlPrefix(dataUrl: string): string {
  const comma = dataUrl.indexOf(",");
  return comma === -1 ? dataUrl : dataUrl.slice(comma + 1);
}

export async function downscaleToBase64(file: File): Promise<EncodedImage> {
  const img = await loadImage(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
  const width = Math.round(img.width * scale);
  const height = Math.round(img.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.drawImage(img, 0, 0, width, height);

  const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  return { image_base64: stripDataUrlPrefix(dataUrl), media_type: "image/jpeg" };
}
