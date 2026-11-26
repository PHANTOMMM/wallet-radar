import { AppError, isAddr, loadToken, parseChain } from "../../../lib/server";

export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const chain = parseChain(q.get("chain") ?? "");
  if (!chain) return Response.json({ error: "Unknown chain" }, { status: 400 });
  const address = (q.get("address") ?? "").trim();
  if (!isAddr(address)) return Response.json({ error: "Invalid token address" }, { status: 400 });
  try { return Response.json(await loadToken(chain, address)); }
  catch (e) { return Response.json({ error: e instanceof AppError ? e.status === 404 ? "Not a token on this network" : e.message : "Could not load this right now" }, { status: e instanceof AppError ? e.status : 502 }); }
}
