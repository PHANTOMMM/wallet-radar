import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ErrorBox } from "@/components/Errors";
import { Addr, Panel, Stat } from "@/components/Panels";
import { explorerUrl } from "@/lib/chains";
import { short, num } from "@/lib/format";
import { fmtTime, usd } from "@/lib/mock";
import { wantChain, wantHash } from "@/lib/page";
import { AppError, loadTx } from "@/lib/server";
import { tokenHref, walletHref } from "@/lib/links";

type P = { chain: string; hash: string };

export async function generateMetadata({ params }: { params: Promise<P> }): Promise<Metadata> {
  const p = await params; const chain = wantChain(p.chain), hash = wantHash(p.hash);
  return { title: `Transaction ${short(hash)} on ${chain.name}`, description: `Details of a ${chain.name} transaction: status, value, fee and token transfers.` };
}

export default async function TxPage({ params }: { params: Promise<P> }) {
  const p = await params; const chain = wantChain(p.chain), hash = wantHash(p.hash);
  let t;
  try { t = await loadTx(chain, hash); }
  catch (e) { if (e instanceof AppError && e.status === 404) notFound(); return <ErrorBox title="Transaction not found" message={e instanceof AppError ? e.message : "Could not load this transaction"} hint={`Check the network: this hash must exist on ${chain.name}.`} />; }
  const tone = t.status === "success" ? "text-accent" : t.status === "failed" ? "text-out" : "text-mute";
  return (
    <main className="space-y-4">
      <Panel title={`${chain.name} transaction`} right={<a href={explorerUrl(chain, "tx", hash)} target="_blank" rel="noopener noreferrer" className="text-xs text-mute hover:text-ink">Open in explorer ↗</a>}>
        <div className="num break-all text-sm">{t.hash}</div>
        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
          <div><div className="text-[11px] uppercase tracking-[0.08em] text-faint">Status</div><div className={`mt-1 text-lg capitalize ${tone}`}>{t.status}</div></div>
          <Stat wrap label="Time" value={t.ts ? fmtTime(t.ts) : "Pending"} />
          <Stat label="Block" value={t.block ? t.block.toLocaleString("en-US") : "·"} />
          <Stat label="Method" value={t.method ?? "Transfer"} />
          <Stat label={`Value (${t.native})`} value={num(t.valueNative, 6)} />
          <Stat label="Value (USD)" value={usd(t.valueUsd)} />
          <Stat label={`Fee (${t.native})`} value={t.feeNative != null ? num(t.feeNative, 6) : "·"} />
          <Stat label="Fee (USD)" value={t.feeUsd != null ? usd(t.feeUsd) : "·"} />
        </div>
      </Panel>
      <Panel title="Parties">
        <dl className="divide-y divide-line text-sm">
          <div className="flex items-center justify-between gap-3 py-2"><dt className="text-mute">From</dt><dd className="min-w-0"><Addr chain={chain} address={t.from} /></dd></div>
          <div className="flex items-center justify-between gap-3 py-2"><dt className="text-mute">To</dt><dd className="min-w-0">{t.to ? <Addr chain={chain} address={t.to} /> : <span className="text-faint">Contract creation</span>}</dd></div>
        </dl>
      </Panel>
      <Panel title={`Token transfers · ${t.transfers.length}`}>
        {t.transfers.length === 0 ? <p className="text-sm text-mute">No token transfers in this transaction.</p> : (
          <ul className="divide-y divide-line">
            {t.transfers.map((x, i) => (
              <li key={i} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2.5 text-sm">
                <div className="flex min-w-0 items-center gap-1.5 text-xs text-faint"><Link href={walletHref(chain.id, x.from)} className="num hover:text-ink">{short(x.from)}</Link><span>to</span>{x.to ? <Link href={walletHref(chain.id, x.to)} className="num hover:text-ink">{short(x.to)}</Link> : "·"}</div>
                <div className="num">{num(x.amount)} {x.token ? <Link href={tokenHref(chain.id, x.token)} className="hover:text-accent hover:underline">{x.symbol}</Link> : x.symbol}</div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </main>
  );
}
