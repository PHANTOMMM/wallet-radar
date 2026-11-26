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

const PAGE = "0x12c"; // 300 per page
async function transfers(chain: Chain, key: string, addr: string, dir: "fromAddress" | "toAddress", since: number, maxPages: number): Promise<{ rows: Transfer[]; more: boolean }> {
  let categories = ["external", "internal", "erc20"];
  const rows: Transfer[] = [];
  let pageKey: string | undefined; let more = false;
  for (let page = 0; page < maxPages; page++) {
    const params: Record<string, unknown> = { fromBlock: "0x0", [dir]: addr, category: categories, withMetadata: true, excludeZeroValue: false, maxCount: PAGE, order: "desc" };
    if (pageKey) params.pageKey = pageKey;
    let res;
    try { res = await rpc(chain, key, "alchemy_getAssetTransfers", [params]); }
    catch (e) {
      if ((e as Error).message === "NOT_ENABLED" || categories.length === 2) throw e;
      categories = ["external", "erc20"]; params.category = categories; // some chains do not index internal transfers
      res = await rpc(chain, key, "alchemy_getAssetTransfers", [params]);
    }
    const got = res.transfers as Transfer[];
    rows.push(...got);
    pageKey = res.pageKey;
    const oldest = got.length ? new Date(got[got.length - 1].metadata.blockTimestamp).getTime() : 0;
    if (!pageKey || got.length === 0 || oldest < since) return { rows, more: false };
    if (page === maxPages - 1) more = true; // page budget used up while still inside the window
  }
  return { rows, more };
}

export async function getLiveWallet(key: string, chain: Chain, addressRaw: string, depth = 1): Promise<Wallet> {
  const addr = addressRaw.trim().toLowerCase();
  const now = Date.now();
  const since = now - WINDOW_DAYS * D;
  const prices = new Map<string, number>();

  const [ethHex, nonceHex, eth, tb, outR, inR] = await Promise.all([
    rpc(chain, key, "eth_getBalance", [addr, "latest"]),
    rpc(chain, key, "eth_getTransactionCount", [addr, "latest"]),
    nativePrice(key, chain.priceSymbol),
    rpc(chain, key, "alchemy_getTokenBalances", [addr, "erc20"]),
    transfers(chain, key, addr, "fromAddress", since, depth),
    transfers(chain, key, addr, "toAddress", since, depth),
  ]);

  const outT = outR.rows, inT = inR.rows;

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
  if (ethAmt * eth >= 0.01) holdings.push({ symbol: chain.native, name: chain.native === "POL" ? "POL (Polygon)" : chain.native === "BNB" ? "BNB" : "Ether", amount: ethAmt, price: eth, value: ethAmt * eth, change24h: null });
  priced.forEach((b, i) => {
    const m = metas[i]; if (!m || m.decimals == null) return;
    const price = prices.get(b.contractAddress.toLowerCase())!;
    const amount = Number(BigInt(b.tokenBalance)) / 10 ** m.decimals;
    const value = amount * price;
    if (value < 1) return;
    holdings.push({ contract: b.contractAddress.toLowerCase(), symbol: (m.symbol || "?").slice(0, 10), name: m.name || m.symbol || "Token", amount, price, value, change24h: null });
  });
  holdings.sort((a, b) => b.value - a.value);

  // ---- transactions
  const seen = new Set<string>();
  const all = [...outT, ...inT].filter((t) => {
    if (seen.has(t.uniqueId)) return false; seen.add(t.uniqueId);
    return new Date(t.metadata.blockTimestamp).getTime() >= since && t.from?.toLowerCase() !== t.to?.toLowerCase();
  });
  const truncated = outR.more || inR.more;

  type Leg = { token?: string; dir: "in" | "out"; sym: string; amount: number; usd: number; other: string; ts: number; id: string; contractCall: boolean };
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
    const leg: Leg = { token: t.category === "erc20" ? (t.rawContract.address ?? "").toLowerCase() : undefined, dir: isOut ? "out" : "in", sym, amount, usd: Math.round(amount * price * 100) / 100, other, ts: new Date(t.metadata.blockTimestamp).getTime(), id: t.uniqueId, contractCall: isOut && t.category === "external" && amount === 0 };
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
      txs.push({ id: o.id, hash, token: o.token, kind: "swap", ts: o.ts, symbol: `${o.sym}→${i.sym}`, amount: o.amount, usd: Math.max(o.usd, i.usd), counterparty: cp, note: `Swap ${o.sym} for ${i.sym}` });
      continue;
    }
    for (const l of legs) {
      if (!l.contractCall && l.usd < 0.01) continue; // dust and airdrop noise
      const kind: TxKind = l.contractCall ? "contract" : l.dir;
      txs.push({ id: l.id, hash, token: l.token, kind, ts: l.ts, symbol: l.sym, amount: l.amount, usd: l.usd, counterparty: party(l.other, chain), note: l.contractCall ? `Contract call · ${party(l.other, chain).label}` : undefined });
    }
  }
  txs.sort((a, b) => b.ts - a.ts);

  return {
    address: addr, network: chain.name, holdings, txs,
    balance: holdings.reduce((s, h) => s + h.value, 0),
    txCount: parseInt(nonceHex, 16),
    firstSeen: txs.length ? txs[txs.length - 1].ts : now,
    live: true, truncated, asOf: now, hiddenTokens: balances.length - priced.length,
  };
}

// ---------- single transaction ----------
export type TxDetail = {
  hash: string; chain: string; status: "success" | "failed" | "unknown"; block: number | null; ts: number | null;
  from: string; to: string | null; valueNative: number; valueUsd: number; native: string;
  feeNative: number | null; feeUsd: number | null; gasUsed: number | null; method: string | null;
  transfers: { from: string; to: string | null; symbol: string; amount: number; token?: string }[];
};

export async function getTxDetail(key: string, chain: Chain, hash: string): Promise<TxDetail> {
  const [tx, rc] = await Promise.all([rpc(chain, key, "eth_getTransactionByHash", [hash]), rpc(chain, key, "eth_getTransactionReceipt", [hash])]);
  if (!tx) throw new Error("NOT_FOUND");
  const px = await nativePrice(key, chain.priceSymbol);
  let ts: number | null = null;
  try { const b = await rpc(chain, key, "eth_getBlockByNumber", [tx.blockNumber, false]); ts = parseInt(b.timestamp, 16) * 1000; } catch { /* pending */ }
  const gasUsed = rc ? parseInt(rc.gasUsed, 16) : null;
  const gp = rc?.effectiveGasPrice ? BigInt(rc.effectiveGasPrice) : tx.gasPrice ? BigInt(tx.gasPrice) : null;
  const fee = gasUsed != null && gp != null ? Number(BigInt(gasUsed) * gp) / 1e18 : null;
  // ERC-20 transfers decoded from the receipt's Transfer events (topic0 = keccak("Transfer(address,address,uint256)")).
  const TRANSFER = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
  const evs = ((rc?.logs ?? []) as { address: string; topics: string[]; data: string }[]).filter((l) => l.topics?.[0] === TRANSFER && l.topics.length === 3).slice(0, 12);
  const metaOf = new Map<string, { symbol: string; decimals: number } | null>();
  await Promise.all([...new Set(evs.map((l) => l.address.toLowerCase()))].map(async (a) => {
    try { const m = await rpc(chain, key, "alchemy_getTokenMetadata", [a]); metaOf.set(a, m?.decimals != null ? { symbol: m.symbol ?? "?", decimals: m.decimals } : null); } catch { metaOf.set(a, null); }
  }));
  const unp = (t: string) => "0x" + t.slice(26);
  const transfers: TxDetail["transfers"] = evs.flatMap((l) => {
    const m = metaOf.get(l.address.toLowerCase()); if (!m) return [];
    let raw = 0n; try { raw = BigInt(l.data); } catch { return []; }
    return [{ from: unp(l.topics[1]), to: unp(l.topics[2]), symbol: m.symbol.slice(0, 10), amount: Number(raw) / 10 ** m.decimals, token: l.address.toLowerCase() }];
  });
  const input: string = tx.input ?? "0x";
  return {
    hash: tx.hash, chain: chain.id, status: rc ? (rc.status === "0x1" ? "success" : "failed") : "unknown",
    block: tx.blockNumber ? parseInt(tx.blockNumber, 16) : null, ts, from: tx.from, to: tx.to,
    valueNative: Number(BigInt(tx.value)) / 1e18, valueUsd: (Number(BigInt(tx.value)) / 1e18) * px, native: chain.native,
    feeNative: fee, feeUsd: fee != null ? fee * px : null, gasUsed, method: input.length >= 10 ? input.slice(0, 10) : null, transfers,
  };
}

// ---------- single token ----------
export type TokenInfo = { address: string; chain: string; symbol: string; name: string; decimals: number | null; price: number | null; logo: string | null };
export async function getTokenInfo(key: string, chain: Chain, address: string): Promise<TokenInfo> {
  const a = address.toLowerCase();
  const [m, pr] = await Promise.all([rpc(chain, key, "alchemy_getTokenMetadata", [a]), (async () => { const m2 = new Map<string, number>(); await priceContracts(key, chain.priceNetwork, [a], m2); return m2.get(a) ?? null; })()]);
  if (!m || (!m.symbol && !m.name) || m.decimals == null) throw new Error("NOT_FOUND");
  return { address: a, chain: chain.id, symbol: m.symbol ?? "?", name: m.name ?? "Unknown token", decimals: m.decimals ?? null, price: pr, logo: m.logo ?? null };
}
