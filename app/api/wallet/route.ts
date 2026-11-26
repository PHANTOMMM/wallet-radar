import { AppError, isAddr, loadWallet, parseChain } from "../../../lib/server";

export const maxDuration = 30;
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const chain = parseChain(q.get("chain") ?? "ethereum");
  if (!chain) return Response.json({ error: "Unknown chain" }, { status: 400 });
  const address = (q.get("address") ?? "").trim();
  if (!isAddr(address)) return Response.json({ error: "Invalid address" }, { status: 400 });
  const depth = Math.min(4, Math.max(1, Number(q.get("depth")) || 1));
  try { return Response.json(await loadWallet(chain, address, depth)); }
  catch (e) { const s = e instanceof AppError ? e.status : 502; return Response.json({ error: e instanceof AppError ? e.message : "Could not load this right now" }, { status: s }); }
}
