import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";

import "./base.css";

/**
 * Fraunces carries the marketing headlines; Inter carries everything else,
 * including the whole product surface. Both are exposed as CSS variables so the
 * two stylesheets can reach them without importing anything.
 */
const display = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
});

const body = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://second-opinion.local"),
  title: {
    default: "Second Opinion — the same apartment, listed twice",
    template: "%s · Second Opinion",
  },
  description:
    "A voice agent over Dubai rental listings. It finds the same apartment advertised twice at two prices, and tells you which listings not to trust.",
  openGraph: {
    title: "Second Opinion",
    description:
      "You're negotiating against a price someone already beat. A voice agent that finds the same Dubai apartment listed twice.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
