import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Acropora · Storefront lab",
  description: "Acropora OS Medusa storefront tesztkörnyezet",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="hu">
      <body>{children}</body>
    </html>
  );
}
