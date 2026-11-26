export const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
export const num = (n: number, max = 4) => n.toLocaleString("en-US", { maximumFractionDigits: n >= 1000 ? 0 : n >= 1 ? 2 : max });
