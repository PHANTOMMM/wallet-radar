import { notFound } from "next/navigation";
import { isAddr, isHash, parseChain } from "./server";
import type { Window } from "./mock";

export function wantChain(id: string) { const c = parseChain(id); if (!c) notFound(); return c; }
export function wantAddr(a: string) { if (!isAddr(a)) notFound(); return a.toLowerCase(); }
export function wantHash(h: string) { if (!isHash(h)) notFound(); return h.toLowerCase(); }
export const pickWindow = (v: string | string[] | undefined): Window => (v === "7d" || v === "30d" ? v : "24h");
export const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
