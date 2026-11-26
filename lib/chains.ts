// One entry per supported EVM chain. Same 0x address format, same Alchemy key.
export type ChainId = "ethereum" | "base" | "arbitrum" | "optimism" | "polygon" | "bnb";
export type Chain = { id: ChainId; name: string; host: string; priceNetwork: string; native: string; priceSymbol: string; explorer: string; llama: string; llamaNative: string };

export const CHAINS: Chain[] = [
  { id: "ethereum", name: "Ethereum", host: "eth-mainnet", priceNetwork: "eth-mainnet", native: "ETH", priceSymbol: "ETH", explorer: "https://etherscan.io", llama: "ethereum", llamaNative: "coingecko:ethereum" },
  { id: "base", name: "Base", host: "base-mainnet", priceNetwork: "base-mainnet", native: "ETH", priceSymbol: "ETH", explorer: "https://basescan.org", llama: "base", llamaNative: "coingecko:ethereum" },
  { id: "arbitrum", name: "Arbitrum", host: "arb-mainnet", priceNetwork: "arb-mainnet", native: "ETH", priceSymbol: "ETH", explorer: "https://arbiscan.io", llama: "arbitrum", llamaNative: "coingecko:ethereum" },
  { id: "optimism", name: "Optimism", host: "opt-mainnet", priceNetwork: "opt-mainnet", native: "ETH", priceSymbol: "ETH", explorer: "https://optimistic.etherscan.io", llama: "optimism", llamaNative: "coingecko:ethereum" },
  { id: "bnb", name: "BNB Chain", host: "bnb-mainnet", priceNetwork: "bnb-mainnet", native: "BNB", priceSymbol: "BNB", explorer: "https://bscscan.com", llama: "bsc", llamaNative: "coingecko:binancecoin" },
  { id: "polygon", name: "Polygon", host: "polygon-mainnet", priceNetwork: "polygon-mainnet", native: "POL", priceSymbol: "POL", explorer: "https://polygonscan.com", llama: "polygon", llamaNative: "coingecko:polygon-ecosystem-token" },
];
export const chainById = (id: string | null | undefined): Chain => CHAINS.find((c) => c.id === id) ?? CHAINS[0];

export const explorerUrl = (c: Chain, kind: "tx" | "address" | "token", v: string) => `${c.explorer}/${kind}/${v}`;
