import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wallet Radar",
  description: "Understand any public wallet in seconds.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0c0d0f" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
