import { AssetsPanel } from "@/components/Panels";
import { wantAddr, wantChain } from "@/lib/page";
import { loadWallet } from "@/lib/server";

type P = { chain: string; address: string };
export default async function AssetsTab({ params }: { params: Promise<P> }) {
  const p = await params;
  const chain = wantChain(p.chain), address = wantAddr(p.address);
  const w = await loadWallet(chain, address);
  return <AssetsPanel w={w} chain={chain} />;
}
