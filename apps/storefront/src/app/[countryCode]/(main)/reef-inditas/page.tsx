import { Metadata } from "next"
import { notFound } from "next/navigation"

import { reefTermekek } from "@lib/data/reef-inditas"
import { localeOf } from "@lib/i18n/locale"
import { lapCim, openGraph } from "@lib/seo/oldal-metaadat"
import { reefInditasCanonical } from "@lib/util/lap-canonical"
import { REEF_ALCIM, REEF_CIM } from "@lib/util/reef-inditas"
import ReefInditasLap from "@modules/reef-inditas/reef-inditas-lap"

type Props = { params: Promise<{ countryCode: string }> }

/**
 * AZ "INDITSD EL A KOROLLOS AKVARIUMODAT" LAP (`/hu/reef-inditas`, V4.4, kartya 34b46727): hat lepeses cikk Korall sajat
 * szovegebol. EGYELORE NEM INDEXELHETO es nincs a sitemapben, menu- es lablec-link nelkul (a teszt kirakat): a szakmai
 * ellenorzes (EL) a kikerules feltetele, es a lap nyilvanossa tetele kulon dontes. A szoveg csak magyarul van: az angol
 * oldalon (`en-hu`) a lap 404, amig angol szoveg nincs.
 */
export async function generateMetadata(props: Props): Promise<Metadata> {
  const { countryCode } = await props.params
  const canonical = reefInditasCanonical(countryCode)
  return {
    title: lapCim(REEF_CIM),
    description: REEF_ALCIM,
    robots: { index: false, follow: true },
    alternates: { canonical },
    openGraph: openGraph({
      cim: lapCim(REEF_CIM),
      leiras: REEF_ALCIM,
      url: canonical,
    }),
  }
}

/* ISR (FE-7), mint a tobbi publikus lap: igeny szerint epul, 300 mp-ig tarolt. */
export const revalidate = 300

export async function generateStaticParams() {
  return []
}

export default async function ReefInditasOldal(props: Props) {
  const { countryCode } = await props.params
  if (localeOf(countryCode) !== "hu") notFound()
  return <ReefInditasLap termekek={await reefTermekek()} />
}
