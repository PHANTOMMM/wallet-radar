// Mock wallet data. Deterministic per address so the same input always renders the same wallet.
// Swap `getWallet` for a real indexed-API call later; the shapes below are the contract.

export type TxKind = "in" | "out" | "swap" | "contract";

export type Holding = { contract?: string; symbol: string; name: string; amount: number; price: number; value: number; change24h: number | null };
export type Counterparty = { id: string; address: string; label: string; type: "exchange" | "contract" | "wallet"; };
export type Tx = {
  id: string; hash: string; token?: string; kind: TxKind; ts: number; symbol: string; amount: number; usd: number;
  counterparty: Counterparty; note?: string;
};
export type Wallet = {
  address: string; network: string; balance: number; holdings: Holding[];
  txs: Tx[]; txCount: number; firstSeen: number;
  live?: boolean; truncated?: boolean; asOf: number; hiddenTokens?: number;
};

export const NOW = () => Date.now();
const H = 3600_000, D = 24 * H;

function hash(str: string) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return (h ^= h >>> 16) >>> 0; };
}
function rng(seed: string) {
  let a = hash(seed)();
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export const isAddress = (s: string) => /^0x[a-fA-F0-9]{40}$/.test(s.trim());
export const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

const TOKENS = [
  { symbol: "ETH", name: "Ether", price: 1800.92 }, { symbol: "USDC", name: "USD Coin", price: 1 },
  { symbol: "USDT", name: "Tether USD", price: 1 }, { symbol: "WETH", name: "Wrapped Ether", price: 1800.92 },
  { symbol: "LINK", name: "Chainlink", price: 14.2 }, { symbol: "UNI", name: "Uniswap", price: 6.1 },
  { symbol: "AAVE", name: "Aave", price: 92.4 }, { symbol: "ARB", name: "Arbitrum", price: 0.74 },
  { symbol: "LDO", name: "Lido DAO", price: 1.35 }, { symbol: "MKR", name: "Maker", price: 1480 },
  { symbol: "PEPE", name: "Pepe", price: 0.0000092 }, { symbol: "SHIB", name: "Shiba Inu", price: 0.0000121 },
];

const PARTIES: Omit<Counterparty, "id" | "address">[] = [
  { label: "Binance 14", type: "exchange" }, { label: "Coinbase Prime", type: "exchange" },
  { label: "Kraken", type: "exchange" }, { label: "Uniswap V3 Router", type: "contract" },
  { label: "1inch Router", type: "contract" }, { label: "Aave V3 Pool", type: "contract" },
  { label: "Lido stETH", type: "contract" }, { label: "OpenSea Seaport", type: "contract" },
];

function hex(r: () => number, n: number) { let s = ""; for (let i = 0; i < n; i++) s += Math.floor(r() * 16).toString(16); return s; }

export function getWallet(addressRaw: string): Wallet {
  const address = addressRaw.trim().toLowerCase();
  const r = rng(address);
  const now = NOW();
  // activity profile: dormant, steady, or hot
  const profile = r() < 0.2 ? 0.25 : r() < 0.6 ? 1 : 2.4;

  const parties: Counterparty[] = [
    ...PARTIES.map((p, i) => ({ ...p, id: `p${i}`, address: "0x" + hex(r, 40) })),
    ...Array.from({ length: 6 }, (_, i) => ({ id: `w${i}`, label: "Unlabeled wallet", type: "wallet" as const, address: "0x" + hex(r, 40) })),
  ];

  const count = 6 + Math.floor(r() * 8);
  const picked = [...TOKENS].sort(() => r() - 0.5).slice(0, count);
  if (!picked.find((t) => t.symbol === "ETH")) picked[0] = TOKENS[0];
  const holdings: Holding[] = picked.map((t) => {
    const usd = Math.pow(r(), 2.2) * (t.symbol === "ETH" ? 40000 : 9000) + 20;
    return { symbol: t.symbol, name: t.name, price: t.price, amount: usd / t.price, value: usd, change24h: (r() - 0.5) * 8 };
  }).sort((a, b) => b.value - a.value);

  const txs: Tx[] = [];
  const total = Math.round((20 + r() * 140) * profile);
  for (let i = 0; i < total; i++) {
    // recent-weighted timestamps over 30 days
    const age = Math.pow(r(), 1.8) * 30 * D;
    const kindRoll = r();
    const kind: TxKind = kindRoll < 0.34 ? "in" : kindRoll < 0.62 ? "out" : kindRoll < 0.82 ? "swap" : "contract";
    const tok = holdings[Math.floor(Math.pow(r(), 1.6) * holdings.length)];
    const usd = Math.pow(r(), 2.4) * 6000 + 5;
    const pool = kind === "swap" || kind === "contract" ? parties.filter((p) => p.type === "contract") : parties.filter((p) => p.type !== "contract");
    const cp = pool[Math.floor(r() * pool.length)];
    txs.push({
      id: "m" + i, hash: "0x" + hex(r, 64), kind, ts: now - age, symbol: tok.symbol, amount: usd / tok.price, usd: Math.round(usd * 100) / 100,
      counterparty: cp,
      note: kind === "swap" ? `Swap via ${cp.label}` : kind === "contract" ? `Contract call · ${cp.label}` : undefined,
    });
  }
  txs.sort((a, b) => b.ts - a.ts);

  return {
    address, network: "Ethereum", asOf: now, holdings, txs,
    balance: holdings.reduce((s, h) => s + h.value, 0),
    txCount: Math.round(total * (6 + r() * 14)),
    firstSeen: now - (200 + r() * 1800) * D,
  };
}

export type Window = "24h" | "7d" | "30d";
export const WINDOW_MS: Record<Window, number> = { "24h": D, "7d": 7 * D, "30d": 30 * D };

export function inWindow(w: Wallet, win: Window) {
  const cut = w.asOf - WINDOW_MS[win];
  return w.txs.filter((t) => t.ts >= cut);
}

export function flow(txs: Tx[]) {
  let incoming = 0, outgoing = 0;
  for (const t of txs) { if (t.kind === "in") incoming += t.usd; if (t.kind === "out") outgoing += t.usd; }
  return { incoming, outgoing, net: incoming - outgoing };
}

export type Signal = { label: string; value: string; detail: string };
export type Activity = { score: number; level: "Quiet" | "Moderate" | "High"; headline: string; signals: Signal[] };

/** Explainable, not a trust verdict: every point of the score maps to a visible signal. */
export function activity(w: Wallet, win: Window): Activity {
  const txs = inWindow(w, win);
  const days = WINDOW_MS[win] / D;
  const perDay = txs.length / days;
  const f = flow(txs);
  const contracts = txs.filter((t) => t.kind === "contract" || t.kind === "swap").length;
  const parties = new Set(txs.map((t) => t.counterparty.id)).size;
  const freq = Math.min(50, perDay * 6);
  const cx = Math.min(25, (contracts / Math.max(1, txs.length)) * 25);
  const mv = Math.min(25, (f.incoming + f.outgoing) / Math.max(1, w.balance) * 25);
  const score = Math.round(freq + cx + mv);
  const level = score >= 60 ? "High" : score >= 30 ? "Moderate" : "Quiet";
  const last = txs[0] ? Math.max(1, Math.round((w.asOf - txs[0].ts) / 60000)) : null;
  return {
    score, level,
    headline: `${level} activity: ${txs.length} transaction${txs.length === 1 ? "" : "s"} in the last ${win}.`,
    signals: [
      { label: "Transaction frequency", value: `${perDay.toFixed(1)} / day`, detail: `${txs.length} in ${win}` },
      { label: "Incoming vs outgoing", value: `${usd(f.incoming)} / ${usd(f.outgoing)}`, detail: f.net === 0 ? "No value moved" : f.net > 0 ? "Net inflow" : "Net outflow" },
      { label: "Recent activity", value: last === null ? "None" : last < 90 ? `${last} min ago` : last < 2880 ? `${Math.round(last / 60)} h ago` : `${Math.round(last / 1440)} d ago`, detail: "Most recent transaction" },
      { label: "Contract interactions", value: `${contracts}`, detail: `${Math.round((contracts / Math.max(1, txs.length)) * 100)}% of activity` },
      { label: "Counterparties", value: `${parties}`, detail: "Distinct addresses touched" },
    ],
  };
}

export type FlowEdge = { cp: Counterparty; in: number; out: number; txs: Tx[] };
export function flowEdges(txs: Tx[]): FlowEdge[] {
  const map = new Map<string, FlowEdge>();
  for (const t of txs) {
    const e = map.get(t.counterparty.id) ?? { cp: t.counterparty, in: 0, out: 0, txs: [] };
    if (t.kind === "in") e.in += t.usd; else e.out += t.usd;
    e.txs.push(t); map.set(t.counterparty.id, e);
  }
  return [...map.values()].sort((a, b) => b.in + b.out - (a.in + a.out));
}

export const usd = (n: number) => {
  const a = Math.abs(n);
  if (a === 0) return "$0";
  const s = a >= 1e6 ? `${(a / 1e6).toFixed(2)}M` : a >= 1e4 ? a.toLocaleString("en-US", { maximumFractionDigits: 0 }) : a.toLocaleString("en-US", { maximumFractionDigits: a < 1 ? 4 : 2, minimumFractionDigits: a < 1 ? 4 : 2 });
  return `${n < 0 ? "-" : ""}$${s}`;
};
export const ago = (ts: number, now: number) => {
  const m = Math.round((now - ts) / 60000);
  return m < 60 ? `${Math.max(1, m)}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`;
};

export const SAMPLE_ADDRESSES = [
  "0x71c7656ec7ab88b098defb751b7401b5f6d8982f",
  "0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae",
  "0x28c6c06298d514db089934071355e5743bf21d60",
];

/** Deterministic UTC time, safe to render on server and client without hydration drift. */
export const fmtTime = (ts: number) => new Date(ts).toISOString().replace("T", " ").slice(0, 16) + " UTC";
