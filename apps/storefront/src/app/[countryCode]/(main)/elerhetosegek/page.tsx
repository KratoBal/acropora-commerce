import { Metadata } from "next"

import { indexelhetoRobots, lapCim, openGraph } from "@lib/seo/oldal-metaadat"
import { elerhetosegekCanonical } from "@lib/util/lap-canonical"
import { ElerhetosegekLap } from "@modules/elerhetosegek/elerhetosegek-lap"

type Props = { params: Promise<{ countryCode: string }> }

const CIM = "Elérhetőségek"
const LEIRAS =
  "Az Acropora Kft. elérhetőségei: cím, telefonszám, e-mail-cím és nyitvatartás."

/**
 * AZ ELERHETOSEGEK OLDALA (`/hu/elerhetosegek`, commerce-audit-p1, P1/11): a
 * lablec "Elérhetőségek" linkje ide visz, nem a regi UNAS boltra. Az adatok a
 * lablec forrasabol jonnek (`CEG`), a lap statikus tartalmu.
 */
export async function generateMetadata(props: Props): Promise<Metadata> {
  const { countryCode } = await props.params
  const canonical = elerhetosegekCanonical(countryCode)
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

export default function ElerhetosegekOldal() {
  return <ElerhetosegekLap cim={CIM} />
}
