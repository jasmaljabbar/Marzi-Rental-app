import { http } from "../api/http";

// For endpoints that require the Authorization header (so a plain <a href>
// can't be used directly) — fetches as a blob via the authenticated axios
// instance, then triggers a normal browser download.
export async function downloadAuthenticatedFile(url: string, filename: string, mime = "application/pdf") {
  const res = await http.get(url, { responseType: "blob" });
  const blob = new Blob([res.data], { type: mime });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(objectUrl);
}
