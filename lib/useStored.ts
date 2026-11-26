"use client";

export const WATCH_KEY = "wr.watch.v2";
export const RECENT_KEY = "wr.recent.v2";

import { useCallback, useEffect, useState } from "react";

/** Small localStorage-backed list. Returns [] on the server and first paint to avoid hydration drift. */
export function useStored<T>(key: string, max = 50): [T[], (fn: (prev: T[]) => T[]) => void, boolean] {
  const [v, setV] = useState<T[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null && key === WATCH_KEY) {
        // one-time import of the single-page version, which stored ethereum addresses as {address} objects or strings
        const old = JSON.parse(localStorage.getItem("wr.watch") ?? "[]") as (string | { address: string })[];
        const moved = old.map((o) => (typeof o === "string" ? o : o.address)).filter((a) => /^0x[0-9a-fA-F]{40}$/.test(a)).map((a) => ({ chain: "ethereum", address: a.toLowerCase() })) as unknown as T[];
        setV(moved); if (moved.length) localStorage.setItem(key, JSON.stringify(moved));
      } else setV(JSON.parse(raw ?? "[]"));
    } catch { /* ignore */ }
    setReady(true);
    const on = (e: StorageEvent) => { if (e.key === key) { try { setV(JSON.parse(e.newValue ?? "[]")); } catch { /* ignore */ } } };
    window.addEventListener("storage", on);
    return () => window.removeEventListener("storage", on);
  }, [key]);
  const update = useCallback((fn: (prev: T[]) => T[]) => {
    setV((prev) => { const n = fn(prev).slice(0, max); try { localStorage.setItem(key, JSON.stringify(n)); } catch { /* full or blocked */ } return n; });
  }, [key, max]);
  return [v, update, ready];
}

export type Saved = { chain: string; address: string; balance?: number; ts?: number };
export type Recent = { chain: string; address: string };
