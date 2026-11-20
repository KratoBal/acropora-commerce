import { Metadata } from "next"

import { translator } from "@lib/i18n/dictionary"
import { localeOf } from "@lib/i18n/locale"
import { indexelhetoRobots, lapCim, openGraph } from "@lib/seo/oldal-metaadat"
import { elerhetosegekCanonical } from "@lib/util/lap-canonical"
import { ElerhetosegekLap } from "@modules/elerhetosegek/elerhetosegek-lap"

type Props = { params: Promise<{ countryCode: string }> }

/**
 * AZ ELERHETOSEGEK OLDALA (`/hu/elerhetosegek`, commerce-audit-p1, P1/11): a
 * lablec "Elérhetőségek" linkje ide visz, nem a regi UNAS boltra. Az adatok a
 * lablec forrasabol jonnek (`CEG`), a lap statikus tartalmu.
 */
export async function generateMetadata(props: Props): Promise<Metadata> {
  const { countryCode } = await props.params
  const canonical = elerhetosegekCanonical(countryCode)
  // a lap cime es leirasa a lap nyelvén (a kirakat angol nezete, 2026-11-19)
  const t = translator(localeOf(countryCode))
  const cim = t("contactPage.title")
  const leiras = t("contactPage.metaDescription")
  return {
    title: lapCim(cim),
    description: leiras,
    robots: indexelhetoRobots(),
    alternates: { canonical },
    openGraph: openGraph({ cim: lapCim(cim), leiras, url: canonical }),
  }
}

/* ISR (FE-7), mint a tobbi publikus lap: igeny szerint epul, 300 mp-ig tarolt. */
export const revalidate = 300

export async function generateStaticParams() {
  return []
}

export default async function ElerhetosegekOldal(props: Props) {
  const { countryCode } = await props.params
  return <ElerhetosegekLap locale={localeOf(countryCode)} />
}
