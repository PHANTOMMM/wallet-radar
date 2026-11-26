import type { Metadata } from "next";
import { RecentList, SampleList } from "@/components/HomeClient";
import { SearchBox } from "@/components/Shell";

export const metadata: Metadata = { title: "Scan a wallet", description: "Paste a public wallet address or transaction hash to see what it holds and how it moves." };

export default function Scan() {
  return (
    <main className="mx-auto mt-6 max-w-2xl sm:mt-14">
      <h1 className="text-center text-2xl font-medium tracking-tight sm:text-3xl">Scan a wallet</h1>
      <p className="mx-auto mt-3 max-w-md text-center text-mute">Paste a public address or a transaction hash. Pick the network it lives on.</p>
      <div className="mt-8"><SearchBox /></div>
      <SampleList />
      <RecentList />
      <p className="mt-8 text-center text-xs text-faint">Not sure which network? The same 0x address can exist on several. Try each one.</p>
    </main>
  );
}
