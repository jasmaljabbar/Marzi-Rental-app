import { http } from "../http";

// Who may see the file afterwards is decided by its kind (see
// nodejs-backend/src/storage/keys.js): customer photos/documents, receipts
// and damage photos are private; equipment photos, logos and QR codes public.
export type UploadKind = "equipment" | "logo" | "qr_code" | "customer_photo" | "customer_doc" | "receipt" | "damage";

export interface UploadResult {
  key: string;
  url: string;
  thumb_url: string | null;
  kind: UploadKind;
}

export interface UploadOptions {
  // Fraction sent so far, 0 to 1.
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}

// One image per request. A multi-image selection is sent as parallel calls so
// each file has its own progress and error.
export const uploadApi = {
  upload: (file: Blob, kind: UploadKind, filename = "image.jpg", { onProgress, signal }: UploadOptions = {}) => {
    const form = new FormData();
    form.append("file", file, filename);
    return http
      .post<UploadResult>("/upload", form, {
        params: { kind },
        timeout: 120_000,
        signal,
        onUploadProgress: onProgress ? (e) => onProgress(e.total ? Math.min(e.loaded / e.total, 1) : 0) : undefined,
      })
      .then((r) => r.data);
  },
};
