import Link from "next/link";
import { Addr, KIND_LABEL, PillTabs, Panel, TxRow, WINDOWS } from "@/components/Panels";
import { inWindow, type TxKind } from "@/lib/mock";
import { one, pickWindow, wantAddr, wantChain } from "@/lib/page";
import { AppError, loadWallet } from "@/lib/server";
import { walletHref } from "@/lib/links";

type P = { chain: string; address: string };
const KINDS = ["all", "in", "out", "swap", "contract"] as const;
const PAGE = 25;

export const maxDuration = 30;
export default async function Transactions({ params, searchParams }: { params: Promise<P>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const p = await params, sp = await searchParams;
  const chain = wantChain(p.chain), address = wantAddr(p.address);
  const win = pickWindow(one(sp.w));
  const kind = (KINDS as readonly string[]).includes(one(sp.k) ?? "") ? (one(sp.k) as "all" | TxKind) : "all";
  const cp = (one(sp.cp) ?? "").toLowerCase();
  const q = (one(sp.q) ?? "").trim().toLowerCase().slice(0, 80);
  const n = Math.min(500, Math.max(PAGE, Number(one(sp.n)) || PAGE));
  const depth = Math.min(4, Math.max(1, Number(one(sp.d)) || 1));

  let w;
  try { w = await loadWallet(chain, address, depth); } catch (e) { return <Panel title="Transactions"><p className="text-sm text-mute">{e instanceof AppError ? e.message : "Could not load transactions."}</p></Panel>; }

  const all = inWindow(w, win);
  const rows = all.filter((t) =>
    (kind === "all" || t.kind === kind) && (!cp || t.counterparty.id === cp) &&
    (!q || t.hash.includes(q) || t.counterparty.address.includes(q) || t.counterparty.label.toLowerCase().includes(q) || t.symbol.toLowerCase().includes(q)));
  const selLabel = cp ? all.find((t) => t.counterparty.id === cp)?.counterparty : undefined;
  const base = walletHref(chain.id, address, "transactions");
  const href = (o: Record<string, string | number | null>) => {
    const m: Record<string, string> = { w: win, ...(kind !== "all" ? { k: kind } : {}), ...(cp ? { cp } : {}), ...(q ? { q } : {}), ...(depth > 1 ? { d: String(depth) } : {}) };
    for (const [k, v] of Object.entries(o)) { if (v === null || v === "") delete m[k]; else m[k] = String(v); }
    const s = new URLSearchParams(m).toString();
    return s ? `${base}?${s}` : base;
  };
  const oldest = all.length ? all[all.length - 1].ts : null;

  return (
    <Panel title={`Transactions · ${rows.length}`} right={<PillTabs active={win} items={WINDOWS.map((x) => ({ key: x, label: x, href: href({ w: x, n: null }) }))} />}>
      <form action={base} className="mb-3 flex gap-2">
        <input type="hidden" name="w" value={win} />
        {kind !== "all" && <input type="hidden" name="k" value={kind} />}
        {depth > 1 && <input type="hidden" name="d" value={depth} />}
        <input name="q" defaultValue={q} placeholder="Search hash, address, name or token" aria-label="Search transactions" spellCheck={false}
          className="num min-w-0 flex-1 rounded-md border border-line bg-bg px-3 py-1.5 text-sm placeholder:text-faint focus:border-accent focus:outline-none" />
        <button className="rounded-md border border-line px-3 text-sm text-mute hover:text-ink">Search</button>
      </form>
      <div className="scroll-x -mx-1 mb-3 flex gap-1 px-1">
        {KINDS.map((k) => (
          <Link key={k} href={href({ k: k === "all" ? null : k, n: null })} scroll={false}
            className={`whitespace-nowrap rounded px-2 py-1 text-xs ${kind === k ? "bg-raised text-ink" : "text-mute hover:text-ink"}`}>{k === "all" ? "All" : KIND_LABEL[k]}</Link>
        ))}
      </div>
      {(selLabel || q) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-line bg-bg px-3 py-2 text-xs">
          <span className="text-mute">Filtered{selLabel ? <> to <span className="text-ink">{selLabel.label}</span></> : null}{q ? <> matching “<span className="text-ink">{q}</span>”</> : null}</span>
          <Link href={href({ cp: null, q: null, n: null })} className="text-accent hover:underline">Clear</Link>
        </div>
      )}
      {rows.length === 0 ? <p className="text-sm text-mute">Nothing matches.</p> : <ul className="divide-y divide-line">{rows.slice(0, n).map((t) => <TxRow key={t.id} t={t} chain={chain} asOf={w.asOf} />)}</ul>}
      {rows.length > n && <Link href={href({ n: n + 50 })} scroll={false} className="mt-3 block rounded-md border border-line py-2 text-center text-xs text-mute hover:text-ink">Show more ({rows.length - n} left)</Link>}
      {w.truncated && depth < 4 && (
        <Link href={href({ d: depth + 1 })} scroll={false} className="mt-3 block rounded-md border border-accent/40 py-2 text-center text-xs text-accent hover:bg-raised">
          Load older activity{oldest ? ` (read back to ${new Date(oldest).toISOString().slice(0, 10)} so far)` : ""}
        </Link>
      )}
      {w.truncated && depth >= 4 && <p className="mt-3 text-xs text-faint">Reached the read limit for this wallet. Use the block explorer for full history: <Addr chain={chain} address={address} label="open explorer" /></p>}
    </Panel>
  );
}
