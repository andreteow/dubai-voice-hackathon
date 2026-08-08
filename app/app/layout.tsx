import type { Metadata } from "next";

import "../product.css";

/**
 * The product half of the site. The `.product` wrapper is what scopes the dark
 * stylesheet — and what `base.css` keys off to paint the page background dark.
 */
export const metadata: Metadata = {
  title: "Live demo",
  description:
    "Ask about Dubai rental listings out loud. Answers come from memory in about a second.",
  robots: { index: false },
};

export default function ProductLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="product">{children}</div>;
}
