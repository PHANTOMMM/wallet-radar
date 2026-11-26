"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Panel } from "@/components/Panels";
import { chainById } from "@/lib/chains";
import { short } from "@/lib/format";
import { walletHref } from "@/lib/links";
import { WATCH_KEY, useStored, type Saved } from "@/lib/useStored";

type Live = { balance: number; holdings: number; last: number | null; asOf: number; err?: string };
const usd = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: n >= 100 ? 0 : 2 })}`;
const rel = (ts: number | null) => { if (!ts) return "No activity in 30d"; const m = Math.round((Date.now() - ts) / 60000); return m < 60 ? `${Math.max(1, m)}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`; };

export default function WatchlistPage() {
  const [list, setList, ready] = useStored<Saved>(WATCH_KEY, 100);
  const [live, setLive] = useState<Record<string, Live>>({});

  useEffect(() => {
    if (!ready) return;
    let dead = false;
    list.forEach((s, i) => {
      const k = s.chain + s.address;
      setTimeout(() => { // stagger so a long list does not hit the API all at once
        fetch(`/api/wallet?address=${s.address}&chain=${s.chain}`)
          .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
          .then(({ ok, j }) => { if (dead) return; setLive((p) => ({ ...p, [k]: ok ? { balance: j.balance, holdings: j.holdings.length, last: j.txs[0]?.ts ?? null, asOf: j.asOf } : { balance: 0, holdings: 0, last: null, asOf: 0, err: j.error ?? "Could not load" } })); if (ok) setList((p) => p.map((x) => (x.chain === s.chain && x.address === s.address ? { ...x, balance: j.balance, ts: j.asOf } : x))); })
          .catch(() => { if (!dead) setLive((p) => ({ ...p, [k]: { balance: 0, holdings: 0, last: null, asOf: 0, err: "Could not load" } })); });
      }, i * 250);
    });
    return () => { dead = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, list.length]);

  return (
    <main className="mt-2">
      <Panel title="Watchlist" right={<span className="num text-xs text-faint">{ready ? list.length : "·"}</span>}>
        {!ready ? <p className="text-sm text-mute">Loading…</p> : list.length === 0 ? (
          <div className="py-6 text-center"><p className="text-sm text-mute">Nothing saved yet.</p><p className="mt-1 text-xs text-faint">Open any wallet and tap Save. Your list stays on this device only.</p><Link href="/" className="mt-4 inline-block rounded-md border border-line px-3 py-1.5 text-sm text-mute hover:text-ink">Find a wallet</Link></div>
        ) : (
          <ul className="divide-y divide-line">
            {list.map((s) => {
              const l = live[s.chain + s.address];
              return (
                <li key={s.chain + s.address} className="flex items-center justify-between gap-3 py-3">
                  <Link href={walletHref(s.chain, s.address)} className="min-w-0 flex-1">
                    <div className="flex items-center gap-2"><span className="num text-sm">{short(s.address)}</span><span className="rounded border border-line px-1 text-[10px] uppercase text-faint">{chainById(s.chain).name}</span></div>
                    <div className="num mt-0.5 text-xs text-faint">{l?.err ? l.err : l ? `${l.holdings} assets · ${rel(l.last)}` : s.balance != null ? "Refreshing…" : "Loading…"}</div>
                  </Link>
                  <div className="text-right"><div className="num text-sm">{l && !l.err ? usd(l.balance) : s.balance != null ? usd(s.balance) : "·"}</div></div>
                  <button onClick={() => setList((p) => p.filter((x) => !(x.chain === s.chain && x.address === s.address)))} className="px-1 text-xs text-faint hover:text-out" aria-label={`Remove ${short(s.address)}`}>Remove</button>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </main>
  );
}
