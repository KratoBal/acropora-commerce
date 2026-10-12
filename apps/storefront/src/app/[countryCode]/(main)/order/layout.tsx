import { Metadata } from "next"

/**
 * A RENDELES-LAPOK (visszaigazolas, atadas tokennel) NEM INDEXELHETOK. A
 * robots.txt is tiltja oket (FE-4, acrobot dontese 2026-10-12), de egy mar
 * felfedezett URL-t a Disallow nem vesz ki az indexbol, ezert a lapon is
 * kimondjuk (barracuda #540 review).
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function OrderLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
