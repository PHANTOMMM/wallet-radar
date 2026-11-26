import { AppError, isHash, loadTx, parseChain } from "../../../lib/server";

export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const chain = parseChain(q.get("chain") ?? "");
  if (!chain) return Response.json({ error: "Unknown chain" }, { status: 400 });
  const hash = (q.get("hash") ?? "").trim();
  if (!isHash(hash)) return Response.json({ error: "Invalid transaction hash" }, { status: 400 });
  try { return Response.json(await loadTx(chain, hash)); }
  catch (e) { return Response.json({ error: e instanceof AppError ? e.message : "Could not load this right now" }, { status: e instanceof AppError ? e.status : 502 }); }
}
