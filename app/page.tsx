import type { Metadata } from "next";
import Link from "next/link";
import { RecentList, SampleList } from "@/components/HomeClient";

export const metadata: Metadata = { title: "Understand any wallet in seconds" };

export default function Home() {
  return (
    <main className="mx-auto mt-8 max-w-2xl sm:mt-16">
      <h1 className="text-center text-2xl font-medium tracking-tight sm:text-3xl">Understand any wallet in seconds.</h1>
      <p className="mx-auto mt-3 max-w-md text-center text-mute">Paste a public address to see what it holds, how it moves and what it has been doing, on six networks.</p>

      <section className="mt-10 grid gap-3 sm:grid-cols-3">
        {[
          ["Overview", "Balance, assets and 24-hour flow at a glance."],
          ["Activity score", "A 0 to 100 read of recent behaviour, with every point explained."],
          ["Investigate", "Follow any counterparty, transaction or token one tap deeper."],
        ].map(([t, d]) => (
          <div key={t} className="rounded-lg border border-line bg-surface p-4">
            <div className="text-sm">{t}</div>
            <p className="mt-1 text-xs text-faint">{d}</p>
          </div>
        ))}
      </section>

      <SampleList />
      <RecentList />

      <p className="mt-10 text-center text-xs text-faint">
        Ethereum, Base, Arbitrum, Optimism, Polygon and BNB Chain. <Link href="/watchlist" className="text-mute hover:text-ink">Your watchlist</Link> is stored on this device only.
      </p>
    </main>
  );
}
