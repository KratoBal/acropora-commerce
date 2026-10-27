import { Metadata } from "next"

import { indexelhetoRobots, lapCim, openGraph } from "@lib/seo/oldal-metaadat"
import { szallitasCanonical } from "@lib/util/lap-canonical"
import { SzallitasLap } from "@modules/lablec-oldalak/szallitas-lap"

type Props = { params: Promise<{ countryCode: string }> }

const CIM = "Szállítás"
const LEIRAS = "Az Acropora webshop szállítási módjai és költségei."

/**
 * A SZALLITAS OLDALA (`/hu/szallitas`, commerce-audit-p1, lablec): a lablec "Szállítás" linkje ide visz, nem a regi UNAS boltra. A szoveg a regi bolt oldalaé (`regi-bolt-szovegek.ts`).
 */
export async function generateMetadata(props: Props): Promise<Metadata> {
  const { countryCode } = await props.params
  const canonical = szallitasCanonical(countryCode)
  return {
    title: lapCim(CIM),
    description: LEIRAS,
    robots: indexelhetoRobots(),
    alternates: { canonical },
    openGraph: openGraph({ cim: lapCim(CIM), leiras: LEIRAS, url: canonical }),
  }
}

/* ISR (FE-7), mint a tobbi publikus lap: igeny szerint epul, 300 mp-ig tarolt. */
export const revalidate = 300

export async function generateStaticParams() {
  return []
}

export default function SzallitasOldal() {
  return <SzallitasLap cim={CIM} />
}
