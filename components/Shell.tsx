"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { CHAINS, type ChainId } from "@/lib/chains";
import { walletHref } from "@/lib/links";

const isAddr = (s: string) => /^0x[0-9a-fA-F]{40}$/.test(s);
const isHash = (s: string) => /^0x[0-9a-fA-F]{64}$/.test(s);

export function SearchBox({ initialChain = "ethereum", compact = false }: { initialChain?: ChainId; compact?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [chain, setChain] = useState<ChainId>(initialChain);
  const [err, setErr] = useState("");

  const go = (e: React.FormEvent) => {
    e.preventDefault();
    const v = q.trim();
    if (isAddr(v)) { setErr(""); router.push(walletHref(chain, v.toLowerCase())); }
    else if (isHash(v)) { setErr(""); router.push(`/tx/${chain}/${v.toLowerCase()}`); }
    else setErr("Paste a wallet address or transaction hash. It starts with 0x (42 characters for a wallet, 66 for a transaction).");
  };

  return (
    <form onSubmit={go} className="w-full">
      <div className="flex gap-2">
        <select value={chain} onChange={(e) => setChain(e.target.value as ChainId)} aria-label="Network"
          className="shrink-0 rounded-md border border-line bg-surface px-2 py-2 text-sm text-mute focus:border-accent focus:outline-none">
          {CHAINS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={compact ? "Address or transaction (0x…)" : "Paste a wallet address or transaction hash (0x…)"}
          spellCheck={false} autoCapitalize="off" autoCorrect="off" aria-label="Wallet address or transaction hash"
          className="num min-w-0 flex-1 rounded-md border border-line bg-surface px-3 py-2 text-sm placeholder:text-faint focus:border-accent focus:outline-none" />
        <button className="shrink-0 rounded-md bg-ink px-4 py-2 text-sm font-medium text-bg hover:bg-white">Analyze</button>
      </div>
      {err && <p role="alert" className="mt-2 text-xs text-out">{err}</p>}
    </form>
  );
}

export function SiteHeader() {
  const path = usePathname();
  const landing = path === "/";
  const scanning = path === "/scan";
  return (
    <header className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-6 sm:px-6">
      <div className="flex items-center justify-between sm:justify-start sm:gap-8">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Wallet Radar home">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden><circle cx="10" cy="10" r="8.5" stroke="var(--color-faint)" /><circle cx="10" cy="10" r="4.5" stroke="var(--color-faint)" /><circle cx="10" cy="10" r="1.6" fill="var(--color-accent)" /></svg>
          <span className="text-sm font-medium tracking-tight">Wallet Radar</span>
        </Link>
        <nav className="flex items-center gap-5 text-sm" aria-label="Main">
          {!scanning && <Link href="/scan" className="text-mute hover:text-ink">Scan</Link>}
          <Link href="/watchlist" className="text-mute hover:text-ink">Watchlist</Link>
        </nav>
      </div>
      {!landing && !scanning && <div className="sm:ml-auto sm:max-w-xl sm:flex-1"><SearchBox compact /></div>}
      {landing && <Link href="/scan" className="hidden rounded-md bg-ink px-4 py-1.5 text-sm font-medium text-bg hover:bg-white sm:ml-auto sm:block">Scan a wallet</Link>}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mx-auto max-w-6xl border-t border-line px-4 py-6 text-xs text-faint sm:px-6">
      Reads public blockchain data. Activity scores describe behaviour; they are not a verdict on any wallet. Not financial advice.
    </footer>
  );
}
