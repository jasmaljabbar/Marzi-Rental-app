import { API_URL } from "../api/http";

// The one place the web app turns a file reference into something an <img>
// can load. The API already returns absolute URLs for stored files (built per
// request from storage keys, signed when the file is private), so those pass
// through unchanged, as do blob: previews. A relative path such as
// "/files/..." is joined to the API's base URL. Anything else, including
// javascript: or file: URLs, counts as "no image".
export function resolveMediaUrl(value: string | null | undefined, base: string = API_URL): string | null {
  const url = value?.trim();
  if (!url) return null;
  if (/^(https?:\/\/|blob:|data:image\/)/i.test(url)) return url;
  if (url.startsWith("//") || /^[a-z][a-z\d+.-]*:/i.test(url)) return null;
  return `${base.replace(/\/+$/, "")}/${url.replace(/^\/+/, "")}`;
}
