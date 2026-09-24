import { useState } from "react";
import { UserRound } from "lucide-react";
import clsx from "clsx";
import { resolveMediaUrl } from "../../utils/media";
import { initialsOf } from "../../utils/format";

export type AvatarSize = "xs" | "sm" | "md" | "lg";

const SIZE_CLASSES: Record<AvatarSize, string> = {
  xs: "h-7 w-7 text-xs",
  sm: "h-8 w-8 text-xs",
  md: "h-12 w-12 text-sm",
  lg: "h-20 w-20 text-xl",
};

interface AvatarProps {
  // Photo to show, usually a thumbnail.
  src?: string | null;
  // Tried when `src` fails, usually the full-size photo.
  fallbackSrc?: string | null;
  name: string | null | undefined;
  size?: AvatarSize;
  className?: string;
}

// Profile picture for a customer or user, used by every list and header.
// The initials stay visible while the photo loads and take over when there is
// no photo or it fails to load (missing file, expired link, offline).
export function Avatar({ src, fallbackSrc, name, size = "sm", className }: AvatarProps) {
  const [failed, setFailed] = useState<readonly string[]>([]);
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const candidates = [resolveMediaUrl(src), resolveMediaUrl(fallbackSrc)].filter((u): u is string => u !== null);
  const url = candidates.find((u) => !failed.includes(u)) ?? null;
  const loaded = url !== null && loadedUrl === url;
  const initials = initialsOf(name);

  return (
    <span
      className={clsx(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-indigo-100 font-semibold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300",
        SIZE_CLASSES[size],
        className
      )}
      data-state={url === null ? "initials" : loaded ? "image" : "loading"}
      aria-hidden="true"
    >
      <span className={clsx("flex h-full w-full items-center justify-center", loaded && "invisible")}>
        {initials || <UserRound className="h-1/2 w-1/2" />}
      </span>
      {url && (
        <img
          key={url}
          src={url}
          alt=""
          loading="lazy"
          decoding="async"
          onLoad={() => setLoadedUrl(url)}
          onError={() => setFailed((prev) => [...prev, url])}
          className={clsx("absolute inset-0 h-full w-full object-cover transition-opacity duration-200", loaded ? "opacity-100" : "opacity-0")}
        />
      )}
    </span>
  );
}
