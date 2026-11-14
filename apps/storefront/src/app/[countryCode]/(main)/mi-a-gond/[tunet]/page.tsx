import { Metadata } from "next"
import { notFound } from "next/navigation"

import { tunetTermekek } from "@lib/data/mi-a-gond"
import { localeOf } from "@lib/i18n/locale"
import { lapCim, openGraph } from "@lib/seo/oldal-metaadat"
import { miAGondCanonical } from "@lib/util/lap-canonical"
import { tunetKezelok, tunetOldal } from "@lib/util/mi-a-gond"
import TunetOldalLap from "@modules/mi-a-gond/tunet-oldal-lap"

type Props = { params: Promise<{ countryCode: string; tunet: string }> }

/**
 * EGY TUNET OLDALA (`/hu/mi-a-gond/{tunet}`, V4.3, kartya 85545d1f). NEM INDEXELHETO, nincs a sitemapben, menu- es lablec-link
 * nelkul (a teszt kirakat; a szakmai ellenorzes (EL) a kikerules feltetele). Ismeretlen tunet es az angol oldal: 404.
 */
export async function generateMetadata(props: Props): Promise<Metadata> {
  const { countryCode, tunet } = await props.params
  const oldal = tunetOldal(tunet)
  if (!oldal || localeOf(countryCode) !== "hu")
    return { robots: { index: false } }
  const canonical = miAGondCanonical(countryCode, oldal.slug)
  const leiras = oldal.kinez[0] ?? oldal.cim
  return {
    title: lapCim(oldal.cim),
    description: leiras,
    robots: { index: false, follow: true },
    alternates: { canonical },
    openGraph: openGraph({ cim: lapCim(oldal.cim), leiras, url: canonical }),
  }
}

/* ISR (FE-7), mint a tobbi publikus lap: igeny szerint epul, 300 mp-ig tarolt. */
export const revalidate = 300

export async function generateStaticParams() {
  return []
}

export default async function TunetOldalAzOldal(props: Props) {
  const { countryCode, tunet } = await props.params
  const oldal = tunetOldal(tunet)
  if (!oldal || localeOf(countryCode) !== "hu") notFound()
  return (
    <TunetOldalLap
      oldal={oldal}
      termekek={await tunetTermekek(tunetKezelok(oldal))}
    />
  )
}
