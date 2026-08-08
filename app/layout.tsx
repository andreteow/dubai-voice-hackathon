import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Second Opinion",
  description:
    "A voice agent that tells you when the same Dubai apartment is listed twice at two prices.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
