import { getLiveWallet } from "../../../lib/chain";
import { chainById, CHAINS } from "../../../lib/chains";
import type { Wallet } from "../../../lib/mock";

export const dynamic = "force-dynamic";
const cache = new Map<string, { t: number; w: Wallet }>();
const TTL = 60_000;

export async function GET(req: Request) {
  const address = (new URL(req.url).searchParams.get("address") ?? "").trim().toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(address)) return Response.json({ error: "Invalid address" }, { status: 400 });
  const cid = new URL(req.url).searchParams.get("chain") ?? "ethereum";
  if (!CHAINS.some((c) => c.id === cid)) return Response.json({ error: "Unknown chain" }, { status: 400 });
  const chain = chainById(cid);
  const key = process.env.ALCHEMY_API_KEY;
  if (!key) return Response.json({ error: "Live data is not configured" }, { status: 503 });
  const ck = `${chain.id}:${address}`;
  const hit = cache.get(ck);
  if (hit && Date.now() - hit.t < TTL) return Response.json(hit.w);
  try {
    const w = await getLiveWallet(key, chain, address);
    cache.set(ck, { t: Date.now(), w });
    if (cache.size > 200) cache.delete(cache.keys().next().value!);
    return Response.json(w);
  } catch (e) {
    if ((e as Error).message === "NOT_ENABLED") return Response.json({ error: `${chain.name} is not switched on for this API key yet` }, { status: 503 });
    // never echo upstream errors: they can contain the key in URLs
    return Response.json({ error: "Could not load this wallet right now" }, { status: 502 });
  }
}
