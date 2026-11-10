import { Metadata } from "next"

import { termekKezelok, utonLevoAllatok } from "@lib/data/livestock-arrivals"
import { translator } from "@lib/i18n/dictionary"
import { localeOf } from "@lib/i18n/locale"
import { lapCim, openGraph } from "@lib/seo/oldal-metaadat"
import { erkezoAllatokCanonical } from "@lib/util/lap-canonical"
import { shopDay } from "@lib/util/livestock-arrival"
import ErkezoAllatokLap from "@modules/erkezo-allatok/erkezo-allatok-lap"

type Props = { params: Promise<{ countryCode: string }> }

/**
 * AZ "ERKEZO ALLATOK" LAP (`/hu/erkezo-allatok`, V2.6 S4c, kartya f4e4832b): az uton levo elo allatok, a bolt sajat
 * listajabol. EGYELORE NEM INDEXELHETO es nincs a sitemapben (a teszt kirakat; a lap nyilvanossa tetele, a menu es a
 * kereso elerese kulon dontes), de a lap hivhato.
 */
export async function generateMetadata(props: Props): Promise<Metadata> {
  const { countryCode } = await props.params
  const t = translator(localeOf(countryCode))
  const canonical = erkezoAllatokCanonical(countryCode)
  return {
    title: lapCim(t("arrivingAnimals.title")),
    description: t("arrivingAnimals.intro"),
    robots: { index: false, follow: true },
    alternates: { canonical },
    openGraph: openGraph({
      cim: lapCim(t("arrivingAnimals.title")),
      leiras: t("arrivingAnimals.intro"),
      url: canonical,
    }),
  }
}

/* ISR (FE-7), mint a tobbi publikus lap: igeny szerint epul, 300 mp-ig tarolt. */
export const revalidate = 300

export async function generateStaticParams() {
  return []
}

export default async function ErkezoAllatokOldal(props: Props) {
  const { countryCode } = await props.params
  const animals = await utonLevoAllatok()
  const handles = await termekKezelok(
    animals.flatMap((a) => (a.productId ? [a.productId] : [])),
  )
  return (
    <ErkezoAllatokLap
      animals={animals}
      handles={handles}
      ma={shopDay()}
      locale={localeOf(countryCode)}
    />
  )
}
