import type { Metadata } from "next";
import { ErrorBox } from "@/components/Errors";
import { VisitTracker } from "@/components/HomeClient";
import { WatchButton } from "@/components/WatchButton";
import { Addr, Panel, Stat } from "@/components/Panels";
import { TabLink } from "@/components/TabLink";
import { wantAddr, wantChain } from "@/lib/page";
import { AppError, loadWallet } from "@/lib/server";
import { flow, inWindow, usd } from "@/lib/mock";
import { walletHref } from "@/lib/links";
import { short } from "@/lib/format";

type P = { chain: string; address: string };

export const maxDuration = 30;
export async function generateMetadata({ params }: { params: Promise<P> }): Promise<Metadata> {
  const p = await params;
  const chain = wantChain(p.chain), address = wantAddr(p.address);
  try {
    const w = await loadWallet(chain, address);
    const d = `${chain.name} wallet ${short(address)}: ${usd(w.balance)} across ${w.holdings.length} assets, ${inWindow(w, "24h").length} transactions in the last 24h.`;
    return { title: `${short(address)} on ${chain.name}`, description: d, openGraph: { title: `${short(address)} on ${chain.name} · Wallet Radar`, description: d }, twitter: { card: "summary", title: `${short(address)} on ${chain.name}`, description: d } };
  } catch { return { title: `${short(address)} on ${chain.name}` }; }
}

export default async function WalletLayout({ children, params }: { children: React.ReactNode; params: Promise<P> }) {
  const p = await params;
  const chain = wantChain(p.chain), address = wantAddr(p.address);
  let w;
  try { w = await loadWallet(chain, address); }
  catch (e) {
    const m = e instanceof AppError ? e.message : "Could not load this wallet right now";
    return <ErrorBox title="Could not read this wallet" message={m} hint="Try again in a moment. If it keeps happening, the network may be busy or switched off for this key." />;
  }
  const f = flow(inWindow(w, "24h"));
  const base = (t: string) => walletHref(chain.id, address, t);
  return (
    <main className="space-y-4">
      <Panel title={`${chain.name} wallet`} right={<WatchButton chain={chain.id} address={address} balance={w.balance} asOf={w.asOf} />}>
        <div className="num flex flex-wrap items-center gap-x-2 break-all text-sm"><span className="break-all">{address}</span><Addr chain={chain} address={address} label="explorer" /></div>
        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4 lg:grid-cols-7">
          <Stat label="Network" value={chain.name} />
          <Stat label="Balance" value={usd(w.balance)} />
          <Stat label="Assets" value={String(w.holdings.length)} />
          <Stat label="Txs sent" value={w.txCount.toLocaleString("en-US")} />
          <Stat label="24h in" value={usd(f.incoming)} tone="in" />
          <Stat label="24h out" value={usd(f.outgoing)} tone="out" />
          <Stat label="24h net" value={`${f.net >= 0 ? "+" : ""}${usd(f.net)}`} tone={f.net >= 0 ? "in" : "out"} />
        </div>
      </Panel>
      <nav className="scroll-x -mx-1 flex gap-1 px-1" aria-label="Wallet sections">
        {[["Overview", ""], ["Transactions", "transactions"], ["Flow", "flow"], ["Assets", "assets"]].map(([l, t]) => (
          <TabLink key={l} href={base(t)} label={l} />
        ))}
      </nav>
      {w.truncated && <p className="rounded-md border border-line bg-surface px-3 py-2 text-xs text-mute">This wallet is very busy. Part of the older activity in this window may be missing. Open Transactions and use “Load more” to read further back.</p>}
      <VisitTracker chain={chain.id} address={address} balance={w.balance} asOf={w.asOf} />
      {children}
    </main>
  );
}

