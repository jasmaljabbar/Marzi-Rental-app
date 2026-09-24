import { http } from "../http";
import type { Setting } from "../../types/models";

export const settingsApi = {
  list: () => http.get<Setting[]>("/settings").then((r) => r.data),
  get: (key: string) => http.get<Setting>(`/settings/${encodeURIComponent(key)}`).then((r) => r.data),
  update: (key: string, value: string | null) =>
    http.put<Setting>(`/settings/${encodeURIComponent(key)}`, { value }).then((r) => r.data),
};
