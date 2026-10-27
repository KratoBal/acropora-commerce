import { Metadata } from "next"

import { indexelhetoRobots, lapCim, openGraph } from "@lib/seo/oldal-metaadat"
import { kepesTajekoztatoCanonical } from "@lib/util/lap-canonical"
import { KepesTajekoztatoLap } from "@modules/lablec-oldalak/kepes-tajekoztato-lap"

type Props = { params: Promise<{ countryCode: string }> }

const CIM = "Képes vásárlói tájékoztató"
const LEIRAS = "Képes vásárlói tájékoztató a Fogyasztóbarát szerint."

/**
 * A KEPES VASARLOI TAJEKOZTATO (`/hu/jogi/kepes-tajekoztato`, commerce-audit-p1, lablec): a lablec linkje ide visz. A statikus szegmens elobbre valo, mint a `[dokumentum]`, ezert a hetes lista (`JOGI_DOKUMENTUMOK`) es az ASZF-rogzites erintetlen.
 */
export async function generateMetadata(props: Props): Promise<Metadata> {
  const { countryCode } = await props.params
  const canonical = kepesTajekoztatoCanonical(countryCode)
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

export default function KepesTajekoztatoOldal() {
  return <KepesTajekoztatoLap cim={CIM} />
}
