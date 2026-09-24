import { useState } from "react";
import type { ImgHTMLAttributes } from "react";
import { ImageOff } from "lucide-react";
import clsx from "clsx";
import { resolveMediaUrl } from "../../utils/media";

interface ImgProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> {
  src?: string | null;
  fallbackClassName?: string;
}

// Lazy-loaded image with a neutral placeholder when the URL is missing or the
// file fails to load (e.g. an expired signed link before the list refreshes).
// Profile pictures use <Avatar> instead, which falls back to initials.
export function Img({ src, alt = "", className, fallbackClassName, ...rest }: ImgProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const url = resolveMediaUrl(src);
  if (!url || failedSrc === url) {
    return (
      <span className={clsx("flex items-center justify-center bg-slate-100 text-slate-400 dark:bg-slate-800", className, fallbackClassName)} role="img" aria-label={alt || "No image"}>
        <ImageOff className="h-1/2 max-h-6 w-1/2 max-w-6" aria-hidden="true" />
      </span>
    );
  }
  return <img src={url} alt={alt} loading="lazy" decoding="async" onError={() => setFailedSrc(url)} className={className} {...rest} />;
}
