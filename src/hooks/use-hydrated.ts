import { useEffect, useState } from "react";

// Returns false during SSR and the first client render, true after hydration.
// Use to gate time-sensitive content that would otherwise cause hydration mismatch.
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
