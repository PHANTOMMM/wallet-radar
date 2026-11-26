export const walletHref = (chain: string, address: string, tab = "") => `/wallet/${chain}/${address}${tab ? `/${tab}` : ""}`;
export const txHref = (chain: string, hash: string) => `/tx/${chain}/${hash}`;
export const tokenHref = (chain: string, address: string) => `/token/${chain}/${address}`;
