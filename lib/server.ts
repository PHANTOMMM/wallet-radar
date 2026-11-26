// Server-only helpers shared by pages and API routes. Never import from a client component.
import { cache } from "react";
import { getLiveWallet, getTxDetail, getTokenInfo, type TxDetail, type TokenInfo } from "./chain";
import { CHAINS, chainById, type Chain } from "./chains";
import type { Wallet } from "./mock";

export const isAddr = (s: string) => /^0x[0-9a-fA-F]{40}$/.test(s);
export const isHash = (s: string) => /^0x[0-9a-fA-F]{64}$/.test(s);
export const parseChain = (id: string): Chain | null => (CHAINS.some((c) => c.id === id) ? chainById(id) : null);

export class AppError extends Error { constructor(public status: number, message: string) { super(message); } }

const store = new Map<string, { t: number; v: unknown }>();
async function memo<T>(k: string, ttl: number, fn: () => Promise<T>): Promise<T> {
  const hit = store.get(k);
  if (hit && Date.now() - hit.t < ttl) return hit.v as T;
  const v = await fn();
  store.set(k, { t: Date.now(), v });
  if (store.size > 400) store.delete(store.keys().next().value!);
  return v;
}
function keyOrThrow() {
  const k = process.env.ALCHEMY_API_KEY;
  if (!k) throw new AppError(503, "Live data is not configured");
  return k;
}
function wrap(chain: Chain, e: unknown): never {
  const m = (e as Error).message;
  if (m === "NOT_ENABLED") throw new AppError(503, `${chain.name} is not switched on for this API key yet`);
  if (m === "NOT_FOUND") throw new AppError(404, "Not found on this network");
  if (e instanceof Error && e.name === "PriceError" || e instanceof Error && /price/i.test(e.message)) throw new AppError(503, "Price data is temporarily unavailable, so values cannot be shown. Try again in a minute.");
  throw new AppError(502, "Could not load this right now"); // never echo upstream errors: they can contain the key
}

// react `cache` dedupes the same lookup inside one render (page + metadata); memo spans requests.
export const loadWallet = cache(async (chain: Chain, address: string, depth = 1): Promise<Wallet> => {
  const a = address.toLowerCase(); const key = keyOrThrow();
  try { return await memo(`w:${chain.id}:${a}:${depth}`, 60_000, () => getLiveWallet(key, chain, a, depth)); } catch (e) { wrap(chain, e); }
});
export const loadTx = cache(async (chain: Chain, hash: string): Promise<TxDetail> => {
  const h = hash.toLowerCase(); const key = keyOrThrow();
  try { return await memo(`t:${chain.id}:${h}`, 300_000, () => getTxDetail(key, chain, h)); } catch (e) { wrap(chain, e); }
});
export const loadToken = cache(async (chain: Chain, address: string): Promise<TokenInfo> => {
  const a = address.toLowerCase(); const key = keyOrThrow();
  try { return await memo(`k:${chain.id}:${a}`, 120_000, () => getTokenInfo(key, chain, a)); } catch (e) { wrap(chain, e); }
});
