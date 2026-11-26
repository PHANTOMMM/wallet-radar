import { ActivityPanel, AssetsPanel, FlowPanel, Panel, TxRow } from "@/components/Panels";
import { inWindow } from "@/lib/mock";
import { one, pickWindow, wantAddr, wantChain } from "@/lib/page";
import { loadWallet } from "@/lib/server";
import { walletHref } from "@/lib/links";
import Link from "next/link";

type P = { chain: string; address: string };

export default async function Overview({ params, searchParams }: { params: Promise<P>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const p = await params, sp = await searchParams;
  const chain = wantChain(p.chain), address = wantAddr(p.address);
  const win = pickWindow(one(sp.w));
  const w = await loadWallet(chain, address);
  const recent = inWindow(w, win).slice(0, 6);
  const base = walletHref(chain.id, address);
  return (
    <div className="space-y-4">
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <ActivityPanel w={w} win={win} hrefFor={(x) => `${base}?w=${x}`} />
        <AssetsPanel w={w} chain={chain} limit={8} />
      </div>
      <FlowPanel w={w} win={win} chain={chain} />
      <Panel title="Latest transactions" right={<Link href={`${base}/transactions?w=${win}`} className="text-xs text-accent hover:underline">See all</Link>}>
        {recent.length === 0 ? <p className="text-sm text-mute">No transactions in the last {win}.</p> : <ul className="divide-y divide-line">{recent.map((t) => <TxRow key={t.id} t={t} chain={chain} asOf={w.asOf} />)}</ul>}
      </Panel>
    </div>
  );
}
