"use client";

import { useEffect, useMemo, useState } from "react";
import { CHAINS, chainById, type ChainId } from "@/lib/chains";
import {
  SAMPLE_ADDRESSES, WINDOW_MS, activity, ago, flow, flowEdges, getWallet, inWindow, isAddress, short, usd,
  type Counterparty, type FlowEdge, type Tx, type TxKind, type Wallet, type Window,
} from "@/lib/mock";

const WINDOWS: Window[] = ["24h", "7d", "30d"];
const KIND_LABEL: Record<TxKind, string> = { in: "Received", out: "Sent", swap: "Swap", contract: "Contract" };

/* ---------- primitives ---------- */
function Panel({ title, right, children, className = "" }: { title: string; right?: React.ReactNode; children: React.ReactNode; className?: string }) {
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

function Tabs<T extends string>({ value, options, onChange }: { value: T; options: T[]; onChange: (v: T) => void }) {
  return (
    <div role="tablist" className="inline-flex rounded-md border border-line bg-bg p-0.5">
      {options.map((o) => (
        <button key={o} role="tab" aria-selected={o === value} onClick={() => onChange(o)}
          className={`num rounded px-2.5 py-1 text-xs transition-colors ${o === value ? "bg-raised text-ink" : "text-mute hover:text-ink"}`}>
          {o}
        </button>
      ))}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "in" | "out" }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] uppercase tracking-[0.08em] text-faint">{label}</div>
      <div className={`num mt-1 truncate text-lg ${tone === "in" ? "text-accent" : tone === "out" ? "text-out" : "text-ink"}`}>{value}</div>
    </div>
  );
}

/* ---------- activity ---------- */
function ActivityChart({ txs, win }: { txs: Tx[]; win: Window }) {
  const buckets = win === "24h" ? 24 : win === "7d" ? 7 : 30;
  const size = WINDOW_MS[win] / buckets;
  const start = Date.now() - WINDOW_MS[win];
  const data = Array.from({ length: buckets }, () => 0);
  for (const t of txs) { const i = Math.min(buckets - 1, Math.floor((t.ts - start) / size)); if (i >= 0) data[i]++; }
  const max = Math.max(1, ...data);
  return (
    <svg viewBox={`0 0 ${buckets * 10} 44`} className="h-14 w-full" preserveAspectRatio="none" role="img" aria-label={`Transactions per bucket over ${win}`}>
      {data.map((v, i) => (
        <rect key={i} x={i * 10 + 1.5} width={7} y={44 - (v / max) * 42 - 1} height={Math.max(1, (v / max) * 42)} rx={1}
          fill={i === buckets - 1 ? "var(--color-accent)" : "#2d333a"} />
      ))}
    </svg>
  );
}

function ActivityPanel({ w, win, setWin }: { w: Wallet; win: Window; setWin: (v: Window) => void }) {
  const a = useMemo(() => activity(w, win), [w, win]);
  const txs = useMemo(() => inWindow(w, win), [w, win]);
  return (
    <Panel title="Activity radar" right={<Tabs value={win} options={WINDOWS} onChange={setWin} />}>
      <div className="flex items-end gap-4">
        <div className="num text-4xl leading-none">{a.score}<span className="ml-1 text-sm text-faint">/100</span></div>
        <div className="pb-0.5 text-sm text-mute">{a.headline}</div>
      </div>
      <div className="mt-4"><ActivityChart txs={txs} win={win} /></div>
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
function AssetsPanel({ w }: { w: Wallet }) {
  const total = w.balance;
  const top = w.holdings.slice(0, 6);
  const rest = w.holdings.slice(6).reduce((s, h) => s + h.value, 0);
  const parts = [...top.map((h) => ({ k: h.symbol, v: h.value })), ...(rest > 0 ? [{ k: "Other", v: rest }] : [])];
  return (
    <Panel title="Assets" right={<span className="num text-xs text-faint">{w.holdings.length} tokens</span>}>
      <div className="flex h-2 overflow-hidden rounded-full bg-bg" role="img" aria-label="Holdings share">
        {parts.map((p, i) => <div key={p.k} style={{ width: `${(p.v / total) * 100}%`, background: SHADES[i] }} title={`${p.k} ${((p.v / total) * 100).toFixed(1)}%`} />)}
      </div>
      <ul className="mt-3 divide-y divide-line">
        {w.holdings.map((h, i) => (
          <li key={h.symbol} className="flex items-center justify-between gap-3 py-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: SHADES[Math.min(i, SHADES.length - 1)] }} />
              <div className="min-w-0"><div className="text-sm">{h.symbol}</div><div className="truncate text-xs text-faint">{h.name}</div></div>
            </div>
            <div className="text-right">
              <div className="num text-sm">{usd(h.value)}</div>
              {h.change24h != null && <div className={`num text-xs ${h.change24h >= 0 ? "text-accent" : "text-out"}`}>{h.change24h >= 0 ? "+" : ""}{h.change24h.toFixed(2)}%</div>}
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/* ---------- flow ---------- */
function FlowPanel({ w, win, selected, onSelect }: { w: Wallet; win: Window; selected: string | null; onSelect: (id: string | null) => void }) {
  const edges = useMemo(() => flowEdges(inWindow(w, win)), [w, win]);
  const left = edges.filter((e) => e.in >= e.out).slice(0, 6);
  const right = edges.filter((e) => e.in < e.out).slice(0, 6);
  const max = Math.max(1, ...[...left, ...right].map((e) => e.in + e.out));
  const H = Math.max(left.length, right.length, 3) * 46 + 20;
  const cy = H / 2;
  const y = (i: number, n: number) => 18 + (i + 0.5) * ((H - 36) / Math.max(n, 1));
  const node = (e: FlowEdge, side: "l" | "r", i: number, n: number) => {
    const ny = y(i, n), x = side === "l" ? 150 : 450, cx = side === "l" ? 300 - 40 : 300 + 40;
    const sw = 1 + ((e.in + e.out) / max) * 5;
    const on = selected === e.cp.id;
    const stroke = on ? "var(--color-ink)" : side === "l" ? "var(--color-accent)" : "var(--color-out)";
    const d = side === "l" ? `M${x} ${ny} C ${x + 70} ${ny}, ${cx - 40} ${cy}, ${cx} ${cy}` : `M${cx} ${cy} C ${cx + 40} ${cy}, ${x - 70} ${ny}, ${x} ${ny}`;
    return (
      <g key={e.cp.id} className="cursor-pointer" onClick={() => onSelect(on ? null : e.cp.id)} role="button" aria-label={`${e.cp.label}, ${usd(e.in + e.out)}`}>
        <path pointerEvents="none" d={d} fill="none" stroke={stroke} strokeWidth={sw} opacity={selected && !on ? 0.15 : on ? 0.9 : 0.4} />
        <rect x={side === "l" ? 0 : 450} y={ny - 17} width={150} height={34} rx={5} fill="var(--color-raised)" stroke={on ? "var(--color-ink)" : "var(--color-line)"} />
        <text x={side === "l" ? 10 : 460} y={ny - 2} fontSize="11" fill="var(--color-ink)">{e.cp.label.length > 18 ? e.cp.label.slice(0, 17) + "…" : e.cp.label}</text>
        <text x={side === "l" ? 10 : 460} y={ny + 11} fontSize="10" fill="var(--color-faint)" fontFamily="var(--font-mono)">{e.in + e.out === 0 ? "no value" : usd(e.in + e.out)} · {e.txs.length} tx</text>
      </g>
    );
  };
  return (
    <Panel title="Wallet flow" right={<span className="text-xs text-faint">{selected ? "Filtering transactions" : "Select a node"}</span>}>
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

/* ---------- transactions ---------- */
function TxPanel({ w, win, selected, onSelect }: { w: Wallet; win: Window; selected: string | null; onSelect: (id: string | null) => void }) {
  const [kind, setKind] = useState<"all" | TxKind>("all");
  const [limit, setLimit] = useState(15);
  const all = useMemo(() => inWindow(w, win), [w, win]);
  const rows = all.filter((t) => (kind === "all" || t.kind === kind) && (!selected || t.counterparty.id === selected));
  const selLabel = selected ? all.find((t) => t.counterparty.id === selected)?.counterparty.label : null;
  return (
    <Panel title="Transactions" right={
      <div className="scroll-x -mx-1 flex max-w-full items-center gap-1 px-1">
        {(["all", "in", "out", "swap", "contract"] as const).map((k) => (
          <button key={k} onClick={() => { setKind(k); setLimit(15); }}
            className={`whitespace-nowrap rounded px-2 py-1 text-xs ${kind === k ? "bg-raised text-ink" : "text-mute hover:text-ink"}`}>
            {k === "all" ? "All" : KIND_LABEL[k]}
          </button>
        ))}
      </div>}>
      {selLabel && (
        <div className="mb-3 flex items-center justify-between rounded-md border border-line bg-bg px-3 py-2 text-xs">
          <span className="text-mute">Showing only <span className="text-ink">{selLabel}</span></span>
          <button onClick={() => onSelect(null)} className="text-accent hover:underline">Clear</button>
        </div>
      )}
      {rows.length === 0 ? <p className="text-sm text-mute">Nothing matches.</p> : (
        <ul className="divide-y divide-line">
          {rows.slice(0, limit).map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm">
                  <span className={`num w-16 shrink-0 text-xs ${t.kind === "in" ? "text-accent" : t.kind === "out" ? "text-out" : "text-mute"}`}>{KIND_LABEL[t.kind]}</span>
                  <span className="truncate">{t.counterparty.label === "Unlabeled wallet" ? short(t.counterparty.address) : t.counterparty.label}</span>
                </div>
                <div className="num mt-0.5 pl-[4.5rem] text-xs text-faint">{short(t.hash)} · {ago(t.ts)}</div>
              </div>
              <div className="text-right">
                <div className="num text-sm">{t.usd === 0 ? "No value" : `${t.kind === "in" ? "+" : t.kind === "out" ? "-" : ""}${usd(t.usd)}`}</div>
                <div className="num text-xs text-faint">{t.amount.toLocaleString("en-US", { maximumFractionDigits: t.amount < 1 ? 4 : 2 })} {t.symbol}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {rows.length > limit && (
        <button onClick={() => setLimit(limit + 20)} className="mt-3 w-full rounded-md border border-line py-2 text-xs text-mute hover:text-ink">
          Show more ({rows.length - limit} left)
        </button>
      )}
    </Panel>
  );
}

/* ---------- watchlist ---------- */
function Watchlist({ list, current, snaps, onOpen, onRemove }: { list: string[]; current: string; snaps: Record<string, { balance: number; ts: number }>; onOpen: (a: string) => void; onRemove: (a: string) => void }) {
  return (
    <Panel title="Watchlist" right={<span className="num text-xs text-faint">{list.length}</span>}>
      {list.length === 0 ? <p className="text-sm text-mute">Nothing saved. Use Save on a wallet to keep it here. Stored on this device only.</p> : (
        <ul className="divide-y divide-line">
          {list.map((a) => {
            const sn = snaps[a];
            return (
              <li key={a} className="flex items-center justify-between gap-2 py-2">
                <button onClick={() => onOpen(a)} className="min-w-0 text-left">
                  <div className={`num text-sm ${a === current ? "text-accent" : ""}`}>{short(a)}</div>
                  <div className="num text-xs text-faint">{sn ? `${usd(sn.balance)} · ${ago(sn.ts)}` : "Open to load"}</div>
                </button>
                <button onClick={() => onRemove(a)} className="px-2 text-xs text-faint hover:text-out" aria-label={`Remove ${short(a)}`}>Remove</button>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

/* ---------- main ---------- */
export default function Radar() {
  const [input, setInput] = useState("");
  const [address, setAddress] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [win, setWin] = useState<Window>("24h");
  const [selected, setSelected] = useState<string | null>(null);
  const [watch, setWatch] = useState<string[]>([]);

  useEffect(() => {
    try { setWatch(JSON.parse(localStorage.getItem("wr.watch") ?? "[]")); } catch { /* ignore */ }
    const q = new URLSearchParams(location.search); const a = q.get("a");
    if (CHAINS.some((c) => c.id === q.get("c"))) setChain(q.get("c") as ChainId);
    if (a && isAddress(a)) { setInput(a); setAddress(a.toLowerCase()); }
  }, []);
  const persist = (l: string[]) => { setWatch(l); localStorage.setItem("wr.watch", JSON.stringify(l)); };

  const open = (a: string) => {
    if (!isAddress(a)) { setError("That doesn't look like an EVM address. It should start with 0x and have 40 hex characters."); return; }
    setError(""); setSelected(null); setInput(a); setAddress(a.trim().toLowerCase());
    history.replaceState(null, "", `?a=${a.trim().toLowerCase()}&c=${chain}`);
  };

  const [mode, setMode] = useState<"live" | "mock">("live");
  const [chain, setChain] = useState<ChainId>("ethereum");
  const [w, setW] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(false);
  const [snaps, setSnaps] = useState<Record<string, { balance: number; ts: number }>>({});
  useEffect(() => {
    if (!address) { setW(null); return; }
    setSelected(null);
    if (mode === "mock") { setW({ ...getWallet(address), network: chainById(chain).name }); setError(""); return; }
    let dead = false; setLoading(true); setError(""); setW(null);
    fetch(`/api/wallet?address=${address}&chain=${chain}`)
      .then(async (r) => { const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || "Could not load this wallet"); return j as Wallet; })
      .then((x) => { if (!dead) setW(x); })
      .catch((e: Error) => { if (!dead) setError(`${e.message}. You can switch to mock data to explore the interface.`); })
      .finally(() => { if (!dead) setLoading(false); });
    return () => { dead = true; };
  }, [address, mode, chain]);
  useEffect(() => {
    try { setSnaps(JSON.parse(localStorage.getItem("wr.snap") ?? "{}")); } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    if (!w || !w.live || !watch.includes(w.address)) return;
    setSnaps((prev) => { const n = { ...prev, [w.address]: { balance: w.balance, ts: Date.now() } }; localStorage.setItem("wr.snap", JSON.stringify(n)); return n; });
  }, [w, watch]);
  const f24 = useMemo(() => (w ? flow(inWindow(w, "24h")) : null), [w]);
  const saved = address ? watch.includes(address) : false;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
      <header className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden><circle cx="10" cy="10" r="8.5" stroke="var(--color-faint)" /><circle cx="10" cy="10" r="4.5" stroke="var(--color-faint)" /><circle cx="10" cy="10" r="1.6" fill="var(--color-accent)" /></svg>
          <span className="text-sm font-medium tracking-tight">Wallet Radar</span>
          <button type="button" onClick={() => setMode(mode === "live" ? "mock" : "live")} title="Switch data source" className="rounded border border-line px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-faint hover:text-ink">{mode === "live" ? "Live" : "Mock data"}</button>
          <select value={chain} onChange={(e) => { setChain(e.target.value as ChainId); if (address) history.replaceState(null, "", `?a=${address}&c=${e.target.value}`); }} aria-label="Network" className="rounded border border-line bg-surface px-1.5 py-0.5 text-xs text-mute focus:outline-none">{CHAINS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); open(input); }} className="flex w-full gap-2 sm:max-w-xl">
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Paste a public wallet address (0x…)" spellCheck={false} autoCapitalize="off" autoCorrect="off"
            aria-label="Wallet address" className="num min-w-0 flex-1 rounded-md border border-line bg-surface px-3 py-2 text-sm placeholder:text-faint focus:border-accent focus:outline-none" />
          <button className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-bg hover:bg-white">Analyze</button>
        </form>
      </header>
      {error && <p role="alert" className="mb-4 rounded-md border border-line bg-surface px-3 py-2 text-sm text-out">{error}</p>}

      {loading ? (
        <p className="mt-24 text-center text-mute">Reading the chain…</p>
      ) : !w || !f24 ? (
        <div className="mx-auto mt-16 max-w-xl text-center sm:mt-24">
          <h1 className="text-2xl font-medium tracking-tight sm:text-3xl">Understand any wallet in seconds.</h1>
          <p className="mt-3 text-mute">Paste a public address to see holdings, recent movement and an explainable activity read.</p>
          <div className="mt-8 text-left">
            <div className="mb-2 text-[11px] uppercase tracking-[0.08em] text-faint">Try a sample</div>
            <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
              {SAMPLE_ADDRESSES.map((a) => (
                <li key={a}><button onClick={() => open(a)} className="num flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-raised"><span className="truncate">{a}</span><span className="ml-3 text-xs text-faint">Open</span></button></li>
              ))}
            </ul>
          </div>
          {watch.length > 0 && <div className="mt-6 text-left"><Watchlist snaps={snaps} list={watch} current="" onOpen={open} onRemove={(a) => persist(watch.filter((x) => x !== a))} /></div>}
        </div>
      ) : (
        <main className="space-y-4">
          {w.truncated && <p className="rounded-md border border-line bg-surface px-3 py-2 text-xs text-mute">This wallet is very busy. Only the latest 300 transfers each way were read, so the oldest activity in this window may be missing.</p>}
          <Panel title="Wallet overview" right={
            <button onClick={() => persist(saved ? watch.filter((x) => x !== address) : [address!, ...watch])}
              className={`rounded-md border px-2.5 py-1 text-xs ${saved ? "border-accent text-accent" : "border-line text-mute hover:text-ink"}`}>{saved ? "Saved" : "Save"}</button>}>
            <div className="num break-all text-sm text-ink">{w.address}</div>
            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4 lg:grid-cols-7">
              <Stat label="Network" value={w.network} />
              <Stat label="Balance" value={usd(w.balance)} />
              <Stat label="Assets" value={String(w.holdings.length)} />
              <Stat label="Txs sent" value={w.txCount.toLocaleString("en-US")} />
              <Stat label="24h in" value={usd(f24.incoming)} tone="in" />
              <Stat label="24h out" value={usd(f24.outgoing)} tone="out" />
              <Stat label="24h net" value={`${f24.net >= 0 ? "+" : ""}${usd(f24.net)}`} tone={f24.net >= 0 ? "in" : "out"} />
            </div>
          </Panel>

          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            <ActivityPanel w={w} win={win} setWin={(v) => { setWin(v); setSelected(null); }} />
            <AssetsPanel w={w} />
          </div>
          <FlowPanel w={w} win={win} selected={selected} onSelect={setSelected} />
          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <TxPanel w={w} win={win} selected={selected} onSelect={setSelected} />
            <Watchlist snaps={snaps} list={watch} current={address!} onOpen={open} onRemove={(a) => persist(watch.filter((x) => x !== a))} />
          </div>
        </main>
      )}
    </div>
  );
}
