import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FIRASA — AI-Powered Market Intelligence",
  description:
    "Institutional-grade decision-support terminal, deterministic quantitative indicators, and AI market research.",
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
