import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ErrorBox } from "@/components/Errors";
import { Addr, Panel, Stat } from "@/components/Panels";
import { explorerUrl } from "@/lib/chains";
import { short } from "@/lib/format";
import { usd } from "@/lib/mock";
import { wantAddr, wantChain } from "@/lib/page";
import { AppError, loadToken } from "@/lib/server";

type P = { chain: string; address: string };

export async function generateMetadata({ params }: { params: Promise<P> }): Promise<Metadata> {
  const p = await params; const chain = wantChain(p.chain), address = wantAddr(p.address);
  try { const t = await loadToken(chain, address); return { title: `${t.symbol} on ${chain.name}`, description: `${t.name} (${t.symbol}) token on ${chain.name}${t.price ? `, priced at ${usd(t.price)}` : ""}.` }; }
  catch { return { title: `Token ${short(address)} on ${chain.name}` }; }
}

export default async function TokenPage({ params }: { params: Promise<P> }) {
  const p = await params; const chain = wantChain(p.chain), address = wantAddr(p.address);
  let t;
  try { t = await loadToken(chain, address); }
  catch (e) { if (e instanceof AppError && e.status === 404) notFound(); return <ErrorBox title="Not a token here" message={e instanceof AppError ? e.message : "Could not load this token"} hint={`This address is not a standard token on ${chain.name}. It may be a normal wallet, or a token on another network.`} />; }
  return (
    <main className="space-y-4">
      <Panel title={`${chain.name} token`} right={<a href={explorerUrl(chain, "token", address)} target="_blank" rel="noopener noreferrer" className="text-xs text-mute hover:text-ink">Open in explorer ↗</a>}>
        <div className="flex items-center gap-3">
          {t.logo ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={t.logo} alt="" width={36} height={36} className="h-9 w-9 rounded-full bg-raised" /> : <div className="grid h-9 w-9 place-items-center rounded-full bg-raised text-xs text-mute">{t.symbol.slice(0, 3)}</div>}
          <div className="min-w-0"><div className="truncate text-lg">{t.name}</div><div className="num text-sm text-mute">{t.symbol}</div></div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
          <Stat label="Price" value={t.price ? usd(t.price) : "No market price"} />
          <Stat label="Decimals" value={t.decimals != null ? String(t.decimals) : "·"} />
          <Stat label="Network" value={chain.name} />
          <div className="min-w-0"><div className="text-[11px] uppercase tracking-[0.08em] text-faint">Contract</div><div className="mt-1 text-sm"><Addr chain={chain} address={address} type="token" /></div></div>
        </div>
        {!t.price && <p className="mt-4 rounded-md border border-line bg-bg px-3 py-2 text-xs text-mute">This token has no market price on record. Tokens like this are often airdrops or spam. Wallet Radar hides them from holdings totals.</p>}
      </Panel>
    </main>
  );
}
