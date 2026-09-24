// Client-side image checks and preparation before upload: rejects non-images
// early and downsizes large phone photos so uploads are fast on mobile data.
// These mirror nodejs-backend/src/storage/uploadRules.js for quick feedback;
// the API re-validates and re-encodes everything anyway.
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const ACCEPTED_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif"];
export const IMAGE_INPUT_ACCEPT = ACCEPTED_IMAGE_TYPES.join(",");
// The API's default UPLOAD_MAX_BYTES. Larger photos are shrunk before upload.
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_EQUIPMENT_IMAGES = 4;
const MAX_DIMENSION = 2000;

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
}

export function imageProblem(file: File): string | null {
  const ext = extensionOf(file.name);
  if (/heic|heif/i.test(file.type) || ext === "heic" || ext === "heif") {
    return "HEIC photos aren't supported. Export as JPEG (iPhone: Settings > Camera > Formats > Most Compatible).";
  }
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type) || (ext && !ACCEPTED_IMAGE_EXTENSIONS.includes(ext))) {
    return `"${file.name}" isn't a JPEG, PNG, WebP or GIF image.`;
  }
  // GIFs are uploaded as they are; other formats are shrunk first, so they
  // may start larger.
  const limit = file.type === "image/gif" ? MAX_UPLOAD_BYTES : MAX_UPLOAD_BYTES * 3;
  if (file.size > limit) return `"${file.name}" is too large (max ${limit / (1024 * 1024)} MB).`;
  return null;
}

// Checks how many photos a selection may add. `room` is how many more fit.
export function selectionProblem(selected: number, room: number, max: number): string | null {
  if (selected <= room) return null;
  const limit = `You can add up to ${max} photo${max === 1 ? "" : "s"}`;
  if (room <= 0) return `${limit}. Remove one before adding another.`;
  return `${limit}. You selected ${selected}, but only ${room} more can be added.`;
}

// Name sent with an upload, with the extension matching what is actually sent
// (a shrunk photo is always JPEG).
export function uploadFileName(original: string, blob: Blob): string {
  const ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" }[blob.type] ?? "jpg";
  const base = original.replace(/\.[^.]*$/, "").replace(/[^\w-]+/g, "-").slice(0, 60) || "image";
  return `${base}.${ext}`;
}

export async function downscaleImage(file: File): Promise<Blob> {
  if (file.type === "image/gif" || typeof createImageBitmap !== "function") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= MAX_UPLOAD_BYTES) {
      bitmap.close();
      return file;
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    return blob ?? file;
  } catch {
    return file;
  }
}
