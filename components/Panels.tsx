import Link from "next/link";
import { activity, flow, flowEdges, inWindow, usd, ago, fmtTime, WINDOW_MS, type Tx, type TxKind, type Wallet, type Window } from "@/lib/mock";
import { explorerUrl, type Chain } from "@/lib/chains";
import { short, num } from "@/lib/format";
import { tokenHref, txHref, walletHref } from "@/lib/links";

export const WINDOWS: Window[] = ["24h", "7d", "30d"];
export const KIND_LABEL: Record<TxKind, string> = { in: "Received", out: "Sent", swap: "Swap", contract: "Contract" };

export function Panel({ title, right, children, className = "" }: { title: string; right?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`min-w-0 rounded-lg border border-line bg-surface ${className}`}>
      <header className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-line px-4 py-2.5">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-mute">{title}</h2>
        {right}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Stat({ label, value, tone, wrap }: { label: string; value: string; tone?: "in" | "out"; wrap?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] uppercase tracking-[0.08em] text-faint">{label}</div>
      <div className={`num mt-1 ${wrap ? "break-words text-base leading-snug" : "truncate text-lg"} ${tone === "in" ? "text-accent" : tone === "out" ? "text-out" : "text-ink"}`}>{value}</div>
    </div>
  );
}

/** Link-based pill tabs: server-rendered, shareable, back-button friendly. */
export function PillTabs({ items, active }: { items: { label: string; href: string; key: string }[]; active: string }) {
  return (
    <nav className="scroll-x -mx-1 inline-flex max-w-full rounded-md border border-line bg-bg p-0.5" aria-label="Sections">
      {items.map((i) => (
        <Link key={i.key} href={i.href} scroll={false} aria-current={i.key === active ? "page" : undefined}
          className={`num whitespace-nowrap rounded px-2.5 py-1 text-xs transition-colors ${i.key === active ? "bg-raised text-ink" : "text-mute hover:text-ink"}`}>{i.label}</Link>
      ))}
    </nav>
  );
}

export function Addr({ chain, address, label, type = "address" }: { chain: Chain; address: string; label?: string; type?: "address" | "token" }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5">
      <Link href={type === "token" ? tokenHref(chain.id, address) : walletHref(chain.id, address)} className="num truncate hover:text-accent hover:underline">{label ?? short(address)}</Link>
      <a href={explorerUrl(chain, type === "token" ? "token" : "address", address)} target="_blank" rel="noopener noreferrer" className="shrink-0 text-faint hover:text-ink" aria-label="Open in block explorer" title="Open in block explorer">↗</a>
    </span>
  );
}

/* ---------- activity ---------- */
function ActivityChart({ txs, win, asOf }: { txs: Tx[]; win: Window; asOf: number }) {
  const buckets = win === "24h" ? 24 : win === "7d" ? 7 : 30;
  const size = WINDOW_MS[win] / buckets;
  const start = asOf - WINDOW_MS[win];
  const data = Array.from({ length: buckets }, () => 0);
  for (const t of txs) { const i = Math.min(buckets - 1, Math.floor((t.ts - start) / size)); if (i >= 0) data[i]++; }
  const max = Math.max(1, ...data);
  return (
    <svg viewBox={`0 0 ${buckets * 10} 44`} className="h-14 w-full" preserveAspectRatio="none" role="img" aria-label={`Transactions per bucket over ${win}`}>
      {data.map((v, i) => <rect key={i} x={i * 10 + 1.5} width={7} y={44 - (v / max) * 42 - 1} height={Math.max(1, (v / max) * 42)} rx={1} fill={i === buckets - 1 ? "var(--color-accent)" : "#2d333a"} />)}
    </svg>
  );
}

export function ActivityPanel({ w, win, hrefFor }: { w: Wallet; win: Window; hrefFor: (win: Window) => string }) {
  const a = activity(w, win);
  const txs = inWindow(w, win);
  return (
    <Panel title="Activity radar" right={<PillTabs active={win} items={WINDOWS.map((x) => ({ key: x, label: x, href: hrefFor(x) }))} />}>
      <div className="flex items-end gap-4">
        <div className="num text-4xl leading-none">{a.score}<span className="ml-1 text-sm text-faint">/100</span></div>
        <div className="pb-0.5 text-sm text-mute">{a.headline}</div>
      </div>
      <div className="mt-4"><ActivityChart txs={txs} win={win} asOf={w.asOf} /></div>
      <dl className="mt-4 divide-y divide-line border-t border-line">
        {a.signals.map((s) => (
          <div key={s.label} className="flex items-baseline justify-between gap-3 py-2">
            <div><dt className="text-sm">{s.label}</dt><dd className="text-xs text-faint">{s.detail}</dd></div>
            <div className="num text-sm text-ink">{s.value}</div>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-faint">A description of activity, not a judgement of the wallet. Each point of the score comes from a signal above.</p>
    </Panel>
  );
}

/* ---------- assets ---------- */
const SHADES = ["#7fc4a4", "#5f9e86", "#4a7d6a", "#3b6354", "#2f4f43", "#26403a", "#1f332f", "#1a2a27"];
export function AssetsPanel({ w, chain, limit }: { w: Wallet; chain: Chain; limit?: number }) {
  const total = w.balance || 1;
  const top = w.holdings.slice(0, 6);
  const rest = w.holdings.slice(6).reduce((s, h) => s + h.value, 0);
  const parts = [...top.map((h) => ({ k: h.symbol, v: h.value })), ...(rest > 0 ? [{ k: "Other", v: rest }] : [])];
  const rows = limit ? w.holdings.slice(0, limit) : w.holdings;
  return (
    <Panel title="Assets" right={<span className="num text-xs text-faint">{w.holdings.length} tokens</span>}>
      {w.holdings.length === 0 ? <p className="text-sm text-mute">No priced holdings found.</p> : (<>
        <div className="flex h-2 overflow-hidden rounded-full bg-bg" role="img" aria-label="Holdings share">
          {parts.map((p, i) => <div key={p.k} style={{ width: `${(p.v / total) * 100}%`, background: SHADES[i] }} title={`${p.k} ${((p.v / total) * 100).toFixed(1)}%`} />)}
        </div>
        <ul className="mt-3 divide-y divide-line">
          {rows.map((h, i) => (
            <li key={`${h.symbol}${h.contract ?? ""}`} className="flex items-center justify-between gap-3 py-2">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: SHADES[Math.min(i, SHADES.length - 1)] }} />
                <div className="min-w-0">
                  <div className="text-sm">{h.contract ? <Link href={tokenHref(chain.id, h.contract)} className="hover:text-accent hover:underline">{h.symbol}</Link> : h.symbol}</div>
                  <div className="num truncate text-xs text-faint">{num(h.amount)} · {usd(h.price)}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="num text-sm">{usd(h.value)}</div>
                <div className="num text-xs text-faint">{((h.value / total) * 100).toFixed(1)}%</div>
              </div>
            </li>
          ))}
        </ul>
      </>)}
      {!!w.hiddenTokens && <p className="mt-3 text-xs text-faint">{w.hiddenTokens} more token{w.hiddenTokens === 1 ? "" : "s"} with no market price are hidden, which usually means spam or airdrops.</p>}
    </Panel>
  );
}

/* ---------- flow ---------- */
export function FlowPanel({ w, win, chain, big = false, selected, hrefFor }: { w: Wallet; win: Window; chain: Chain; big?: boolean; selected?: string | null; hrefFor?: (id: string | null) => string }) {
  const edges = flowEdges(inWindow(w, win));
  const n = big ? 8 : 5;
  const left = edges.filter((e) => e.in >= e.out).slice(0, n);
  const right = edges.filter((e) => e.in < e.out).slice(0, n);
  const max = Math.max(1, ...[...left, ...right].map((e) => e.in + e.out));
  const H = Math.max(left.length, right.length, 3) * 46 + 20;
  const cy = H / 2;
  const y = (i: number, len: number) => 18 + (i + 0.5) * ((H - 36) / Math.max(len, 1));
  const node = (e: (typeof edges)[number], side: "l" | "r", i: number, len: number) => {
    const ny = y(i, len), x = side === "l" ? 150 : 450, cx = side === "l" ? 260 : 340;
    const sw = 1 + ((e.in + e.out) / max) * 5;
    const on = selected === e.cp.id;
    const stroke = on ? "var(--color-ink)" : side === "l" ? "var(--color-accent)" : "var(--color-out)";
    const d = side === "l" ? `M${x} ${ny} C ${x + 70} ${ny}, ${cx - 40} ${cy}, ${cx} ${cy}` : `M${cx} ${cy} C ${cx + 40} ${cy}, ${x - 70} ${ny}, ${x} ${ny}`;
    const label = e.cp.label.length > 18 ? e.cp.label.slice(0, 17) + "…" : e.cp.label;
    const body = (<>
      <path pointerEvents="none" d={d} fill="none" stroke={stroke} strokeWidth={sw} opacity={selected && !on ? 0.15 : on ? 0.9 : 0.4} />
      <rect x={side === "l" ? 0 : 450} y={ny - 17} width={150} height={34} rx={5} fill="var(--color-raised)" stroke={on ? "var(--color-ink)" : "var(--color-line)"} />
      <text x={side === "l" ? 10 : 460} y={ny - 2} fontSize="11" fill="var(--color-ink)">{label}</text>
      <text x={side === "l" ? 10 : 460} y={ny + 11} fontSize="10" fill="var(--color-faint)" fontFamily="var(--font-mono)">{e.in + e.out === 0 ? "no value" : usd(e.in + e.out)} · {e.txs.length} tx</text>
    </>);
    return hrefFor
      ? <a key={e.cp.id} href={hrefFor(on ? null : e.cp.id)} aria-label={`${e.cp.label}, ${usd(e.in + e.out)}`}>{body}</a>
      : <g key={e.cp.id}>{body}</g>;
  };
  return (
    <Panel title="Wallet flow" right={<span className="text-xs text-faint">{hrefFor ? (selected ? "Showing one counterparty" : "Select a node to filter") : `Top counterparties, ${win}`}</span>}>
      {edges.length === 0 ? <p className="text-sm text-mute">No movement in this window.</p> : (
        <div className="scroll-x">
          <svg viewBox={`0 0 600 ${H}`} className="mx-auto w-full min-w-[520px] max-w-[760px]" role="group" aria-label="Wallet flow diagram">
            <text x={0} y={10} fontSize="9" fill="var(--color-faint)" letterSpacing="1">MOSTLY IN FROM</text>
            <text x={600} y={10} fontSize="9" fill="var(--color-faint)" textAnchor="end" letterSpacing="1">MOSTLY OUT TO</text>
            {left.map((e, i) => node(e, "l", i, left.length))}
            {right.map((e, i) => node(e, "r", i, right.length))}
            {left.length === 0 && <text x={0} y={cy} fontSize="10" fill="var(--color-faint)">No net inflow sources</text>}
            {right.length === 0 && <text x={600} y={cy} fontSize="10" textAnchor="end" fill="var(--color-faint)">No net outflow targets</text>}
            <rect x={250} y={cy - 22} width={100} height={44} rx={6} fill="var(--color-bg)" stroke="var(--color-accent)" />
            <text x={300} y={cy - 3} fontSize="10" textAnchor="middle" fill="var(--color-faint)">THIS WALLET</text>
            <text x={300} y={cy + 12} fontSize="11" textAnchor="middle" fill="var(--color-ink)" fontFamily="var(--font-mono)">{short(w.address)}</text>
          </svg>
        </div>
      )}
    </Panel>
  );
}

/* ---------- transaction rows ---------- */
export function TxRow({ t, chain, asOf }: { t: Tx; chain: Chain; asOf: number }) {
  return (
    <li className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-sm">
          <span className={`num w-16 shrink-0 text-xs ${t.kind === "in" ? "text-accent" : t.kind === "out" ? "text-out" : "text-mute"}`}>{KIND_LABEL[t.kind]}</span>
          <span className="truncate">{t.counterparty.label}</span>
        </div>
        <div className="num mt-0.5 pl-[4.5rem] text-xs text-faint"><Link href={txHref(chain.id, t.hash)} className="hover:text-accent hover:underline">{short(t.hash)}</Link> · {ago(t.ts, asOf)}</div>
      </div>
      <div className="text-right">
        <div className="num text-sm">{t.usd === 0 ? "No value" : `${t.kind === "in" ? "+" : t.kind === "out" ? "-" : ""}${usd(t.usd)}`}</div>
        <div className="num text-xs text-faint">{num(t.amount)} {t.symbol}</div>
      </div>
    </li>
  );
}

export { flow, fmtTime };
