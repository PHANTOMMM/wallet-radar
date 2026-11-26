"use client";

import Link from "next/link";
import { useEffect } from "react";
import { CHAINS, chainById } from "@/lib/chains";
import { short } from "@/lib/format";
import { walletHref } from "@/lib/links";
import { RECENT_KEY, WATCH_KEY, useStored, type Recent, type Saved } from "@/lib/useStored";

const SAMPLES: { chain: string; address: string; note: string }[] = [
  { chain: "ethereum", address: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045", note: "vitalik.eth, a busy personal wallet" },
  { chain: "ethereum", address: "0x28c6c06298d514db089934071355e5743bf21d60", note: "Binance hot wallet, very high volume" },
  { chain: "bnb", address: "0xf977814e90da44bfa03b6295a0616a897441acec", note: "Binance cold wallet on BNB Chain" },
];

export function SampleList() {
  return (
    <section className="mt-10">
      <div className="mb-2 text-[11px] uppercase tracking-[0.08em] text-faint">Try a sample</div>
      <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
        {SAMPLES.map((s) => (
          <li key={s.address}>
            <Link href={walletHref(s.chain, s.address)} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-raised">
              <div className="min-w-0"><div className="num truncate text-sm">{short(s.address)}</div><div className="truncate text-xs text-faint">{s.note}</div></div>
              <span className="shrink-0 text-xs text-faint">{chainById(s.chain).name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function RecentList() {
  const [recent, , ready] = useStored<Recent>(RECENT_KEY, 8);
  if (!ready || recent.length === 0) return null;
  return (
    <section className="mt-8">
      <div className="mb-2 text-[11px] uppercase tracking-[0.08em] text-faint">Recent</div>
      <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
        {recent.map((r) => (
          <li key={r.chain + r.address}>
            <Link href={walletHref(r.chain, r.address)} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-raised">
              <span className="num text-sm">{short(r.address)}</span><span className="text-xs text-faint">{chainById(r.chain).name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Records a visit and keeps the saved balance snapshot fresh for watched wallets. */
export function VisitTracker({ chain, address, balance, asOf }: { chain: string; address: string; balance: number; asOf: number }) {
  const [, setRecent] = useStored<Recent>(RECENT_KEY, 8);
  const [, setWatch] = useStored<Saved>(WATCH_KEY, 100);
  useEffect(() => {
    setRecent((p) => [{ chain, address }, ...p.filter((x) => !(x.chain === chain && x.address === address))]);
    setWatch((p) => p.map((x) => (x.chain === chain && x.address === address ? { ...x, balance, ts: asOf } : x)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chain, address]);
  return null;
}

export { CHAINS };
