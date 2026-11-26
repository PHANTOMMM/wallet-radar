import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SiteFooter, SiteHeader } from "@/components/Shell";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://wallet-radar-wine.vercel.app"),
  title: { default: "Wallet Radar", template: "%s · Wallet Radar" },
  description: "Understand any public wallet in seconds.",
  openGraph: { siteName: "Wallet Radar", type: "website" },
  twitter: { card: "summary" },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0c0d0f" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <SiteHeader />
        <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
