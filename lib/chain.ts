// Live Ethereum data via Alchemy. Server-only: the API key never reaches the browser.
// Returns the same Wallet shape as lib/mock.ts so the UI does not care where data came from.
import type { Wallet, Tx, Holding, Counterparty, TxKind } from "./mock";
import type { Chain } from "./chains";

const D = 86_400_000;
const WINDOW_DAYS = 30;

// Small hand-made label list. Anything not here is shown as a shortened address.
const KNOWN: Record<string, { label: string; type: Counterparty["type"] }> = {
  "0x28c6c06298d514db089934071355e5743bf21d60": { label: "Binance 14", type: "exchange" },
  "0x21a31ee1afc51d94c2efccaa2092ad1028285549": { label: "Binance 15", type: "exchange" },
  "0x71660c4005ba85c37ccec55d0c4493e66fe775d3": { label: "Coinbase", type: "exchange" },
  "0x2910543af39aba0cd09dbb2d50200b3e800a63d2": { label: "Kraken", type: "exchange" },
  "0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45": { label: "Uniswap V3 Router", type: "contract" },
  "0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad": { label: "Uniswap Universal Router", type: "contract" },
  "0x1111111254eeb25477b68fb85ed929f73a960582": { label: "1inch Router", type: "contract" },
  "0x00000000000000adc04c56bf30ac9d3c0aaf14dc": { label: "OpenSea Seaport", type: "contract" },
  "0xae7ab96520de3a18e5e111b5eaab095312d7fe84": { label: "Lido stETH", type: "contract" },
  "0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2": { label: "Aave V3 Pool", type: "contract" },
  "0xd8da6bf26964af9d7eed9e03e53415d37aa96045": { label: "vitalik.eth", type: "wallet" },
};

const shortAddr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
// Labels above are Ethereum mainnet addresses; never apply them on other chains.
const party = (a: string, chain: Chain): Counterparty => {
  const k = chain.id === "ethereum" ? KNOWN[a] : undefined;
  return { id: a, address: a, label: k?.label ?? shortAddr(a), type: k?.type ?? "wallet" };
};

async function post(url: string, body: unknown) {
  const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
  const j = await r.json().catch(() => null);
  if (!r.ok && !(j && j.error)) throw new Error(`upstream ${r.status}`);
  return j;
}
async function rpc(chain: Chain, key: string, method: string, params: unknown[]) {
  const j = await post(`https://${chain.host}.g.alchemy.com/v2/${key}`, { jsonrpc: "2.0", id: 1, method, params });
  if (j.error) {
    if (/not enabled/i.test(String(j.error.message))) throw new Error("NOT_ENABLED");
    throw new Error("rpc error");
  }
  return j.result;
}

async function nativePrice(key: string, symbol: string): Promise<number> {
  const r = await fetch(`https://api.g.alchemy.com/prices/v1/${key}/tokens/by-symbol?symbols=${symbol}`, { signal: AbortSignal.timeout(15000) });
  const j = await r.json();
  return Number(j?.data?.[0]?.prices?.[0]?.value) || 0;
}

/** USD price per contract address; unpriced contracts are simply absent (also acts as a spam filter). */
async function priceContracts(key: string, network: string, addrs: string[], into: Map<string, number>) {
  const todo = [...new Set(addrs)].filter((a) => !into.has(a));
  const chunks: string[][] = [];
  for (let i = 0; i < todo.length; i += 25) chunks.push(todo.slice(i, i + 25));
  await Promise.all(chunks.map(async (c) => {
    try {
      const j = await post(`https://api.g.alchemy.com/prices/v1/${key}/tokens/by-address`, { addresses: c.map((address) => ({ network, address })) });
      for (const row of j?.data ?? []) {
        const v = Number(row?.prices?.[0]?.value);
        if (v > 0) into.set(String(row.address).toLowerCase(), v);
      }
    } catch { /* leave unpriced */ }
  }));
}

type Transfer = {
  uniqueId: string; hash: string; from: string; to: string | null; value: number | null; asset: string | null;
  category: "external" | "internal" | "erc20"; rawContract: { address: string | null };
  metadata: { blockTimestamp: string };
};

async function transfers(chain: Chain, key: string, addr: string, dir: "fromAddress" | "toAddress"): Promise<Transfer[]> {
  const run = (category: string[]) => rpc(chain, key, "alchemy_getAssetTransfers", [{
    fromBlock: "0x0", [dir]: addr, category, withMetadata: true, excludeZeroValue: false, maxCount: "0x12c", order: "desc",
  }]);
  try { return (await run(["external", "internal", "erc20"])).transfers as Transfer[]; }
  catch (e) {
    if ((e as Error).message === "NOT_ENABLED") throw e;
    // some chains do not index internal transfers: retry without them
    return (await run(["external", "erc20"])).transfers as Transfer[];
  }
}

export async function getLiveWallet(key: string, chain: Chain, addressRaw: string): Promise<Wallet> {
  const addr = addressRaw.trim().toLowerCase();
  const now = Date.now();
  const since = now - WINDOW_DAYS * D;
  const prices = new Map<string, number>();

  const [ethHex, nonceHex, eth, tb, outT, inT] = await Promise.all([
    rpc(chain, key, "eth_getBalance", [addr, "latest"]),
    rpc(chain, key, "eth_getTransactionCount", [addr, "latest"]),
    nativePrice(key, chain.priceSymbol),
    rpc(chain, key, "alchemy_getTokenBalances", [addr, "erc20"]),
    transfers(chain, key, addr, "fromAddress"),
    transfers(chain, key, addr, "toAddress"),
  ]);

  // ---- holdings
  let balances: { contractAddress: string; tokenBalance: string }[] = tb.tokenBalances ?? [];
  if (tb.pageKey) {
    try { const p2 = await rpc(chain, key, "alchemy_getTokenBalances", [addr, "erc20", { pageKey: tb.pageKey }]); balances = balances.concat(p2.tokenBalances ?? []); } catch { /* first page only */ }
  }
  // Polygon exposes its native coin as an ERC-20 at 0x…1010; counting it again would double the balance.
  const NATIVE_ALIAS = new Set(["0x0000000000000000000000000000000000001010", "0x0000000000000000000000000000000000000000"]);
  balances = balances.filter((b) => { try { return BigInt(b.tokenBalance) > 0n && !NATIVE_ALIAS.has(b.contractAddress.toLowerCase()); } catch { return false; } });

  const transferContracts = [...outT, ...inT].filter((t) => t.category === "erc20" && t.rawContract.address).map((t) => t.rawContract.address!.toLowerCase());
  await priceContracts(key, chain.priceNetwork, [...balances.map((b) => b.contractAddress.toLowerCase()), ...transferContracts], prices);

  const priced = balances.filter((b) => prices.has(b.contractAddress.toLowerCase())).slice(0, 40);
  const metas = await Promise.all(priced.map((b) => rpc(chain, key, "alchemy_getTokenMetadata", [b.contractAddress]).catch(() => null)));
  const holdings: Holding[] = [];
  const ethAmt = Number(BigInt(ethHex)) / 1e18;
  if (ethAmt * eth >= 0.01) holdings.push({ symbol: chain.native, name: chain.native === "POL" ? "POL (Polygon)" : "Ether", amount: ethAmt, price: eth, value: ethAmt * eth, change24h: null });
  priced.forEach((b, i) => {
    const m = metas[i]; if (!m || m.decimals == null) return;
    const price = prices.get(b.contractAddress.toLowerCase())!;
    const amount = Number(BigInt(b.tokenBalance)) / 10 ** m.decimals;
    const value = amount * price;
    if (value < 1) return;
    holdings.push({ symbol: (m.symbol || "?").slice(0, 10), name: m.name || m.symbol || "Token", amount, price, value, change24h: null });
  });
  holdings.sort((a, b) => b.value - a.value);

  // ---- transactions
  const seen = new Set<string>();
  const all = [...outT, ...inT].filter((t) => {
    if (seen.has(t.uniqueId)) return false; seen.add(t.uniqueId);
    return new Date(t.metadata.blockTimestamp).getTime() >= since && t.from?.toLowerCase() !== t.to?.toLowerCase();
  });
  // Only truncated if a capped page still reached back inside the window (older rows may be missing).
  const oldest = (t: Transfer[]) => (t.length ? new Date(t[t.length - 1].metadata.blockTimestamp).getTime() : Infinity);
  const truncated = (outT.length >= 300 && oldest(outT) > since) || (inT.length >= 300 && oldest(inT) > since);

  type Leg = { dir: "in" | "out"; sym: string; amount: number; usd: number; other: string; ts: number; id: string; contractCall: boolean };
  const byHash = new Map<string, Leg[]>();
  for (const t of all) {
    const from = t.from.toLowerCase(), to = (t.to ?? "").toLowerCase();
    const isOut = from === addr;
    const other = isOut ? to : from;
    if (!other) continue;
    let price = 0, sym = t.asset ?? "ETH";
    if (t.category === "erc20") { price = prices.get((t.rawContract.address ?? "").toLowerCase()) ?? 0; if (!price) continue; /* unpriced token = airdrop spam */ }
    else { price = eth; sym = chain.native; }
    const amount = t.value ?? 0;
    const leg: Leg = { dir: isOut ? "out" : "in", sym, amount, usd: Math.round(amount * price * 100) / 100, other, ts: new Date(t.metadata.blockTimestamp).getTime(), id: t.uniqueId, contractCall: isOut && t.category === "external" && amount === 0 };
    (byHash.get(t.hash) ?? byHash.set(t.hash, []).get(t.hash)!).push(leg);
  }

  const txs: Tx[] = [];
  for (const [hash, legs] of byHash) {
    const ins = legs.filter((l) => l.dir === "in"), outs = legs.filter((l) => l.dir === "out");
    const swapped = ins.length > 0 && outs.length > 0 && ins.some((i) => outs.some((o) => o.sym !== i.sym));
    if (swapped) {
      const o = outs.reduce((a, b) => (b.usd > a.usd ? b : a)), i = ins.reduce((a, b) => (b.usd > a.usd ? b : a));
      const ext = outs.find((l) => (chain.id === "ethereum" && KNOWN[l.other]?.type === "contract")) ?? o;
      const cp = party(ext.other, chain);
      txs.push({ id: o.id, hash, kind: "swap", ts: o.ts, symbol: `${o.sym}→${i.sym}`, amount: o.amount, usd: Math.max(o.usd, i.usd), counterparty: cp, note: `Swap ${o.sym} for ${i.sym}` });
      continue;
    }
    for (const l of legs) {
      if (!l.contractCall && l.usd < 0.01) continue; // dust and airdrop noise
      const kind: TxKind = l.contractCall ? "contract" : l.dir;
      txs.push({ id: l.id, hash, kind, ts: l.ts, symbol: l.sym, amount: l.amount, usd: l.usd, counterparty: party(l.other, chain), note: l.contractCall ? `Contract call · ${party(l.other, chain).label}` : undefined });
    }
  }
  txs.sort((a, b) => b.ts - a.ts);

  return {
    address: addr, network: chain.name, holdings, txs,
    balance: holdings.reduce((s, h) => s + h.value, 0),
    txCount: parseInt(nonceHex, 16),
    firstSeen: txs.length ? txs[txs.length - 1].ts : now,
    live: true, truncated,
  };
}
