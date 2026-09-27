import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://firasa.ismailspace.cloud"),
  title: "FIRASA (فراسة) — AI-Powered Market Intelligence Terminal",
  description:
    "Institutional investment research, TradingView technical charting, deterministic RSI/SMA/MACD telemetry, portfolio risk auditing, and AI synthesis. Built for Saylani Vibe Engineering.",
  authors: [
    {
      name: "Muhammad Ismail",
      url: "https://github.com/ismail-web-dev/firasa-trading-ai",
    },
  ],
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/icon.svg",
    apple: "/logo.svg",
  },
  openGraph: {
    title: "FIRASA (فراسة) — AI-Powered Market Intelligence Terminal",
    description:
      "Institutional investment research, TradingView technical charting, deterministic RSI/SMA/MACD telemetry, portfolio risk auditing, and AI synthesis. Built for Saylani Vibe Engineering.",
    url: "https://firasa.ismailspace.cloud",
    siteName: "FIRASA Market Intelligence",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "FIRASA (فراسة) — AI-Powered Market Intelligence Terminal",
    description:
      "Institutional investment research, TradingView technical charting, deterministic RSI/SMA/MACD telemetry, portfolio risk auditing, and AI synthesis. Built for Saylani Vibe Engineering.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-terminal-bg text-terminal-text antialiased selection:bg-terminal-accent/30 selection:text-white">
        {children}
      </body>
    </html>
  );
}
