import { useEffect, useRef, useState } from "react";
import { AlertCircle, ImagePlus, Loader2, X } from "lucide-react";
import clsx from "clsx";
import { uploadApi } from "../../api/services";
import type { UploadKind } from "../../api/services";
import { apiErrorMessage } from "../../api/http";
import { downscaleImage, imageProblem, IMAGE_INPUT_ACCEPT, selectionProblem, uploadFileName } from "../../utils/image";
import { Img } from "./Img";

interface ImageUploadProps {
  label?: string;
  // What the image is for; decides whether it's public or private server-side.
  kind: UploadKind;
  // URLs of the photos already attached (as returned by the API).
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
  // True while photos are uploading or failed, so the form can hold off
  // saving instead of silently dropping them.
  onBusyChange?: (busy: boolean) => void;
}

interface PendingImage {
  id: string;
  file: File;
  previewUrl: string | null;
  progress: number;
  // Set when the upload failed; null while it is running.
  error: string | null;
}

let nextPendingId = 0;

function createPreview(file: File): string | null {
  try {
    return typeof URL.createObjectURL === "function" ? URL.createObjectURL(file) : null;
  } catch {
    return null;
  }
}

function revokePreview(url: string | null) {
  if (url && typeof URL.revokeObjectURL === "function") URL.revokeObjectURL(url);
}

function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute right-1 top-1 rounded-full bg-slate-900/70 p-1 text-white opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
      aria-label={label}
    >
      <X className="h-3 w-3" aria-hidden="true" />
    </button>
  );
}

// Photo picker used by every form. Several photos can be picked at once (up to
// `max` in total); each is shown straight away with its own progress, uploaded
// through POST /upload in parallel, and added in the order picked. A photo
// that fails stays on screen with Retry and Remove. The returned URLs are
// sent back on save, and the API turns them into storage keys.
export function ImageUpload({ label, kind, value, onChange, max = 4, onBusyChange }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PendingImage[]>([]);
  const [problem, setProblem] = useState<string | null>(null);

  // Latest attached list, so uploads that finish together don't overwrite
  // each other's result.
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const controllers = useRef(new Map<string, AbortController>());
  const pendingRef = useRef(pending);
  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  const busy = pending.length > 0;
  const onBusyRef = useRef(onBusyChange);
  useEffect(() => {
    onBusyRef.current = onBusyChange;
  });
  useEffect(() => {
    onBusyRef.current?.(busy);
  }, [busy]);
  useEffect(() => {
    const active = controllers.current;
    return () => {
      active.forEach((controller) => controller.abort());
      pendingRef.current.forEach((p) => revokePreview(p.previewUrl));
      onBusyRef.current?.(false);
    };
  }, []);

  function patch(id: string, changes: Partial<PendingImage>) {
    setPending((list) => list.map((p) => (p.id === id ? { ...p, ...changes } : p)));
  }

  function commit(next: string[]) {
    valueRef.current = next;
    onChange(next);
  }

  async function uploadOne(item: PendingImage): Promise<string | null> {
    const controller = new AbortController();
    controllers.current.set(item.id, controller);
    patch(item.id, { error: null, progress: 0 });
    try {
      const blob = await downscaleImage(item.file);
      const result = await uploadApi.upload(blob, kind, uploadFileName(item.file.name, blob), {
        signal: controller.signal,
        onProgress: (fraction) => patch(item.id, { progress: fraction }),
      });
      return result.url;
    } catch (err) {
      if (!controller.signal.aborted) patch(item.id, { error: apiErrorMessage(err).detail, progress: 0 });
      return null;
    } finally {
      controllers.current.delete(item.id);
    }
  }

  async function upload(items: PendingImage[]) {
    const urls = await Promise.all(items.map(uploadOne));
    const done = items.filter((_, i) => urls[i]);
    if (done.length === 0) return;
    commit([...valueRef.current, ...urls.filter((url): url is string => Boolean(url))]);
    const doneIds = new Set(done.map((d) => d.id));
    done.forEach((d) => revokePreview(d.previewUrl));
    setPending((list) => list.filter((p) => !doneIds.has(p.id)));
  }

  function handleFiles(list: FileList | null) {
    const files = Array.from(list ?? []);
    if (inputRef.current) inputRef.current.value = "";
    if (files.length === 0) return;

    const countProblem = selectionProblem(files.length, max - value.length - pending.length, max);
    if (countProblem) {
      setProblem(countProblem);
      return;
    }
    const problems = files.map(imageProblem);
    const valid = files.filter((_, i) => problems[i] === null);
    setProblem(problems.filter(Boolean).join(" ") || null);
    if (valid.length === 0) return;

    const items = valid.map((file) => ({ id: `pending-${++nextPendingId}`, file, previewUrl: createPreview(file), progress: 0, error: null }));
    setPending((current) => [...current, ...items]);
    void upload(items);
  }

  function retry(id: string) {
    const item = pending.find((p) => p.id === id);
    if (item) void upload([item]);
  }

  function removePending(id: string) {
    controllers.current.get(id)?.abort();
    const item = pending.find((p) => p.id === id);
    revokePreview(item?.previewUrl ?? null);
    setPending((list) => list.filter((p) => p.id !== id));
  }

  function removeAttached(index: number) {
    setProblem(null);
    commit(value.filter((_, i) => i !== index));
  }

  const total = value.length + pending.length;
  const room = max - total;
  const uploading = pending.filter((p) => p.error === null).length;
  const failed = pending.filter((p) => p.error !== null);

  return (
    <div>
      {label && (
        <p className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
          {max > 1 && <span className="ml-1 font-normal text-slate-400">({total}/{max})</span>}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        {value.map((url, i) => (
          <div key={url + i} className="group relative h-20 w-20 overflow-hidden rounded-md border border-slate-200 dark:border-slate-700">
            <Img src={url} alt={`${label ?? "Image"} ${i + 1}`} className="h-full w-full object-cover" />
            <RemoveButton label={`Remove image ${i + 1}`} onClick={() => removeAttached(i)} />
          </div>
        ))}
        {pending.map((p) => (
          <div
            key={p.id}
            className={clsx("group relative h-20 w-20 overflow-hidden rounded-md border", p.error ? "border-red-400 dark:border-red-500" : "border-slate-200 dark:border-slate-700")}
            data-testid="pending-image"
            title={p.error ?? p.file.name}
          >
            {p.previewUrl ? <img src={p.previewUrl} alt="" className="h-full w-full object-cover" /> : <span className="block h-full w-full bg-slate-100 dark:bg-slate-800" />}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-slate-900/50 text-white">
              {p.error ? (
                <>
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  <button type="button" onClick={() => retry(p.id)} className="rounded bg-white/90 px-1.5 py-0.5 text-[11px] font-medium text-slate-800 hover:bg-white" aria-label={`Retry ${p.file.name}`}>
                    Retry
                  </button>
                </>
              ) : (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span className="text-[11px] font-medium" role="progressbar" aria-label={`Uploading ${p.file.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p.progress * 100)}>
                    {Math.round(p.progress * 100)}%
                  </span>
                </>
              )}
            </div>
            <RemoveButton label={p.error ? `Remove ${p.file.name}` : `Cancel ${p.file.name}`} onClick={() => removePending(p.id)} />
          </div>
        ))}
        {room > 0 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-slate-300 text-slate-400 hover:border-indigo-400 hover:text-indigo-500 dark:border-slate-700"
          >
            <ImagePlus className="h-5 w-5" aria-hidden="true" />
            <span className="text-[11px]">{max > 1 ? "Add photos" : "Add photo"}</span>
          </button>
        )}
      </div>
      {max > 1 && room > 1 && <p className="mt-1 text-xs text-slate-400">You can select up to {room} photos at once.</p>}
      {uploading > 0 && (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400" aria-live="polite">
          Uploading {uploading} photo{uploading === 1 ? "" : "s"}…
        </p>
      )}
      {failed.length > 0 && (
        <div className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
          {failed.map((p) => (
            <p key={p.id}>
              {p.file.name}: {p.error}
            </p>
          ))}
          <p>Retry or remove {failed.length === 1 ? "it" : "them"} before saving.</p>
        </div>
      )}
      {problem && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
          {problem}
        </p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_INPUT_ACCEPT}
        multiple={max > 1}
        className="hidden"
        aria-label={`Choose ${label ?? "image"} files`}
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
