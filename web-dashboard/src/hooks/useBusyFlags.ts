import { useCallback, useState } from "react";

// Tracks several "still working" flags by name, e.g. one per photo uploader in
// a form, so the form can hold off saving until all of them are done.
export function useBusyFlags() {
  const [flags, setFlags] = useState<Readonly<Record<string, boolean>>>({});
  const setBusy = useCallback((name: string, busy: boolean) => {
    setFlags((prev) => (Boolean(prev[name]) === busy ? prev : { ...prev, [name]: busy }));
  }, []);
  return { anyBusy: Object.values(flags).some(Boolean), setBusy };
}
