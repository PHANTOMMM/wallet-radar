import type { Metadata } from "next";
import Link from "next/link";
import { CHAINS } from "@/lib/chains";

export const metadata: Metadata = {
  title: { absolute: "Wallet Radar: understand any wallet in seconds" },
  description: "Paste a public wallet address and see what it holds, how it moves and what it has been doing. Six networks, no sign-in.",
  openGraph: { title: "Wallet Radar", description: "Understand any public wallet in seconds." },
};

const STEPS = [
  ["1", "Paste", "Drop in a public wallet address or a transaction hash and pick the network."],
  ["2", "Read", "See balance, assets, flow and a plain-language activity read, in about a second."],
  ["3", "Investigate", "Tap any counterparty, transaction or token to go one level deeper."],
];
const FEATURES = [
  ["Overview", "Balance, assets, transaction count and 24-hour inflow and outflow in one glance."],
  ["Activity score", "A 0 to 100 read of recent behaviour. Every point comes from a signal you can see."],
  ["Wallet flow", "Who sent value in and who received it out, drawn as a simple diagram."],
  ["Full history", "Search and filter transactions, then load further back for busy wallets."],
  ["Transaction pages", "Status, fee, parties and token transfers for any transaction."],
  ["Watchlist", "Save wallets and see their balances and last activity. Stays on your device."],
];

export default function Landing() {
  return (
    <main>
      <section className="mx-auto max-w-3xl pb-10 pt-10 text-center sm:pt-20">
        <p className="text-[11px] uppercase tracking-[0.12em] text-faint">Public blockchain data, made readable</p>
        <h1 className="mt-4 text-3xl font-medium leading-tight tracking-tight sm:text-5xl">Understand any wallet in seconds.</h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-mute sm:text-lg">Paste an address. See what it holds, how it moves and what it has been doing, without reading raw explorer data.</p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/scan" className="w-full rounded-md bg-ink px-6 py-3 text-sm font-medium text-bg hover:bg-white sm:w-auto">Scan a wallet</Link>
          <Link href="/wallet/ethereum/0xd8da6bf26964af9d7eed9e03e53415d37aa96045" className="w-full rounded-md border border-line px-6 py-3 text-sm text-mute hover:text-ink sm:w-auto">See an example</Link>
        </div>
        <p className="mt-4 text-xs text-faint">No sign-in. Nothing to install.</p>
      </section>

      <section className="mx-auto max-w-5xl" aria-label="Product preview">
        <div className="overflow-hidden rounded-lg border border-line bg-surface">
          <div className="flex items-center gap-1.5 border-b border-line px-4 py-2.5"><span className="h-2 w-2 rounded-full bg-line" /><span className="h-2 w-2 rounded-full bg-line" /><span className="h-2 w-2 rounded-full bg-line" /></div>
          {/* eslint-disable @next/next/no-img-element */}
          <picture>
            <source media="(max-width: 639px)" srcSet="/preview-mobile.png" />
            <img src="/preview.png" alt="Wallet Radar overview of a wallet: balance, activity score, assets and wallet flow" width={1280} height={860} className="block h-auto w-full" />
          </picture>
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-5xl" aria-labelledby="how">
        <h2 id="how" className="text-center text-[11px] uppercase tracking-[0.12em] text-faint">How it works</h2>
        <ol className="mt-5 grid gap-3 sm:grid-cols-3">
          {STEPS.map(([n, t, d]) => (
            <li key={n} className="rounded-lg border border-line bg-surface p-5">
              <div className="num text-xs text-faint">{n}</div>
              <div className="mt-2 text-base">{t}</div>
              <p className="mt-1 text-sm text-mute">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto mt-16 max-w-5xl" aria-labelledby="what">
        <h2 id="what" className="text-center text-[11px] uppercase tracking-[0.12em] text-faint">What you get</h2>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(([t, d]) => (
            <li key={t} className="rounded-lg border border-line bg-surface p-5">
              <div className="text-sm">{t}</div>
              <p className="mt-1 text-sm text-mute">{d}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto mt-16 max-w-3xl text-center" aria-labelledby="chains">
        <h2 id="chains" className="text-[11px] uppercase tracking-[0.12em] text-faint">Networks</h2>
        <ul className="mt-4 flex flex-wrap justify-center gap-2">
          {CHAINS.map((c) => <li key={c.id} className="rounded-full border border-line px-3 py-1 text-sm text-mute">{c.name}</li>)}
        </ul>
      </section>

      <section className="mx-auto mt-16 max-w-3xl rounded-lg border border-line bg-surface p-6 text-center">
        <h2 className="text-base">Describes activity. Does not judge it.</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-mute">Wallet Radar will not tell you a wallet is safe or malicious. It shows what the public record says, and why each number is what it is, so you can decide.</p>
      </section>

      <section className="mx-auto mt-16 max-w-3xl pb-6 text-center">
        <h2 className="text-xl font-medium tracking-tight sm:text-2xl">Try it on a real wallet.</h2>
        <Link href="/scan" className="mt-5 inline-block rounded-md bg-ink px-6 py-3 text-sm font-medium text-bg hover:bg-white">Scan a wallet</Link>
      </section>
    </main>
  );
}
