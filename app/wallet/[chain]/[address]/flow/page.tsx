import { FlowPanel, PillTabs, Panel, WINDOWS } from "@/components/Panels";
import { flowEdges, inWindow, usd } from "@/lib/mock";
import { one, pickWindow, wantAddr, wantChain } from "@/lib/page";
import { loadWallet } from "@/lib/server";
import { walletHref } from "@/lib/links";
import { Addr } from "@/components/Panels";
import Link from "next/link";

type P = { chain: string; address: string };

export default async function FlowTab({ params, searchParams }: { params: Promise<P>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const p = await params, sp = await searchParams;
  const chain = wantChain(p.chain), address = wantAddr(p.address);
  const win = pickWindow(one(sp.w));
  const w = await loadWallet(chain, address);
  const base = walletHref(chain.id, address, "flow");
  const edges = flowEdges(inWindow(w, win));
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><PillTabs active={win} items={WINDOWS.map((x) => ({ key: x, label: x, href: `${base}?w=${x}` }))} /></div>
      <FlowPanel w={w} win={win} chain={chain} big hrefFor={(id) => id ? `${walletHref(chain.id, address, "transactions")}?w=${win}&cp=${id}` : base} />
      <Panel title={`Counterparties · ${edges.length}`}>
        {edges.length === 0 ? <p className="text-sm text-mute">No counterparties in this window.</p> : (
          <div className="scroll-x">
            <table className="w-full min-w-[480px] text-sm">
              <thead><tr className="text-left text-[11px] uppercase tracking-[0.08em] text-faint"><th className="pb-2 font-normal">Counterparty</th><th className="pb-2 text-right font-normal">In</th><th className="pb-2 text-right font-normal">Out</th><th className="pb-2 text-right font-normal">Txs</th></tr></thead>
              <tbody className="divide-y divide-line">
                {edges.slice(0, 30).map((e) => (
                  <tr key={e.cp.id}>
                    <td className="py-2 pr-3"><div className="flex items-center gap-2"><Addr chain={chain} address={e.cp.address} label={e.cp.label} />{e.cp.type !== "wallet" && <span className="rounded border border-line px-1 text-[10px] uppercase text-faint">{e.cp.type}</span>}</div></td>
                    <td className="num py-2 text-right text-accent">{e.in ? usd(e.in) : "·"}</td>
                    <td className="num py-2 text-right text-out">{e.out ? usd(e.out) : "·"}</td>
                    <td className="num py-2 text-right"><Link href={`${walletHref(chain.id, address, "transactions")}?w=${win}&cp=${e.cp.id}`} className="hover:text-accent hover:underline">{e.txs.length}</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
