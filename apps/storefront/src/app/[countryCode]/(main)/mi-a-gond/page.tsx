import { Metadata } from "next"
import { notFound } from "next/navigation"

import { localeOf } from "@lib/i18n/locale"
import { lapCim, openGraph } from "@lib/seo/oldal-metaadat"
import { miAGondCanonical } from "@lib/util/lap-canonical"
import {
  MIAGOND_BEVEZETO,
  MIAGOND_CIM,
  TUNET_OLDALAK,
} from "@lib/util/mi-a-gond"
import MiAGondBelepo from "@modules/mi-a-gond/mi-a-gond-belepo"

type Props = { params: Promise<{ countryCode: string }> }

/**
 * A "MI A GOND A MEDENCEDDEL?" BELEPO (`/hu/mi-a-gond`, V4.3, kartya 85545d1f): tunetek listaja, Korall szovegebol. EGYELORE NEM
 * INDEXELHETO es nincs a sitemapben, menu- es lablec-link nelkul (a teszt kirakat): a szakmai ellenorzes (EL) a kikerules
 * feltetele. A szoveg csak magyarul van: az angol oldalon (`en-hu`) a lap 404.
 */
export async function generateMetadata(props: Props): Promise<Metadata> {
  const { countryCode } = await props.params
  const canonical = miAGondCanonical(countryCode)
  return {
    title: lapCim(MIAGOND_CIM),
    description: MIAGOND_BEVEZETO,
    robots: { index: false, follow: true },
    alternates: { canonical },
    openGraph: openGraph({
      cim: lapCim(MIAGOND_CIM),
      leiras: MIAGOND_BEVEZETO,
      url: canonical,
    }),
  }
}

/* ISR (FE-7), mint a tobbi publikus lap: igeny szerint epul, 300 mp-ig tarolt. */
export const revalidate = 300

export async function generateStaticParams() {
  return []
}

export default async function MiAGondOldal(props: Props) {
  const { countryCode } = await props.params
  if (localeOf(countryCode) !== "hu") notFound()
  return <MiAGondBelepo oldalak={TUNET_OLDALAK} />
}
