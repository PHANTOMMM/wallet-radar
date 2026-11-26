"use client";

import { WATCH_KEY, useStored, type Saved } from "@/lib/useStored";

export function WatchButton({ chain, address, balance, asOf }: { chain: string; address: string; balance: number; asOf: number }) {
  const [list, setList, ready] = useStored<Saved>(WATCH_KEY, 100);
  const saved = ready && list.some((x) => x.chain === chain && x.address === address);
  const toggle = () => setList((p) => (saved ? p.filter((x) => !(x.chain === chain && x.address === address)) : [{ chain, address, balance, ts: asOf }, ...p]));
  return (
    <button onClick={toggle} aria-pressed={saved} disabled={!ready}
      className={`rounded-md border px-2.5 py-1 text-xs ${saved ? "border-accent text-accent" : "border-line text-mute hover:text-ink"}`}>{saved ? "Saved" : "Save"}</button>
  );
}
