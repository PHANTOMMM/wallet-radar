// One entry per supported EVM chain. Same 0x address format, same Alchemy key.
export type ChainId = "ethereum" | "base" | "arbitrum" | "optimism" | "polygon" | "bnb";
export type Chain = { id: ChainId; name: string; host: string; priceNetwork: string; native: string; priceSymbol: string };

export const CHAINS: Chain[] = [
  { id: "ethereum", name: "Ethereum", host: "eth-mainnet", priceNetwork: "eth-mainnet", native: "ETH", priceSymbol: "ETH" },
  { id: "base", name: "Base", host: "base-mainnet", priceNetwork: "base-mainnet", native: "ETH", priceSymbol: "ETH" },
  { id: "arbitrum", name: "Arbitrum", host: "arb-mainnet", priceNetwork: "arb-mainnet", native: "ETH", priceSymbol: "ETH" },
  { id: "optimism", name: "Optimism", host: "opt-mainnet", priceNetwork: "opt-mainnet", native: "ETH", priceSymbol: "ETH" },
  { id: "bnb", name: "BNB Chain", host: "bnb-mainnet", priceNetwork: "bnb-mainnet", native: "BNB", priceSymbol: "BNB" },
  { id: "polygon", name: "Polygon", host: "polygon-mainnet", priceNetwork: "polygon-mainnet", native: "POL", priceSymbol: "POL" },
];
export const chainById = (id: string | null | undefined): Chain => CHAINS.find((c) => c.id === id) ?? CHAINS[0];
