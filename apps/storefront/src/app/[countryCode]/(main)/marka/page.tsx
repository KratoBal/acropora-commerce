import { Metadata } from "next"

import { markaLista } from "@lib/data/brands"
import { translator } from "@lib/i18n/dictionary"
import { localeOf } from "@lib/i18n/locale"
import { indexelhetoRobots, lapCim, openGraph } from "@lib/seo/oldal-metaadat"
import { markaListaCanonical } from "@lib/util/lap-canonical"
import { MarkaListaLap } from "@modules/marka/marka-lista-lap"

type Props = { params: Promise<{ countryCode: string }> }

/**
 * A FORGALMAZOTT MARKAK LISTAJA (`/hu/marka`, Balazs, 2026-10-27,
 * kirakat-lablec-kep): a lablec Oldalterkep oszlopanak uj linkje ide visz. A
 * lista a marka-modul `GET /store/brands` valasza, vagyis csak a termekkel
 * rendelkezo markak; mindegyik a sajat markaoldalara visz (`/marka/<handle>`).
 */
export async function generateMetadata(props: Props): Promise<Metadata> {
  const { countryCode } = await props.params
  const canonical = markaListaCanonical(countryCode)
  // the title and the description follow the page's language (`hu`, `en-hu`):
  // the page body is translated (`brandIndex.*`)
  const locale = localeOf(countryCode)
  const t = translator(locale)
  const cim = lapCim(t("brandIndex.title"))
  const leiras = t("brandIndex.metaDescription")
  return {
    title: cim,
    description: leiras,
    robots: indexelhetoRobots(),
    alternates: { canonical },
    openGraph: openGraph({ cim, leiras, url: canonical, locale }),
  }
}

/* ISR (FE-7), mint a markaoldal: igeny szerint epul, 300 mp-ig tarolt. */
export const revalidate = 300

export async function generateStaticParams() {
  return []
}

export default async function MarkaListaOldal(props: Props) {
  const { countryCode } = await props.params
  /*
    EGY ATMENETI BOLTI HIBA NE ADJON HIBALAPOT (barracuda, #576): ures lista
    es naplosor; a lap ures listanal kimondja, hogy nincs mit mutatni, es a
    kovetkezo revalidalas ujra probalja. A kezdolap markasavja ugyanigy tesz.
  */
  const markak = await markaLista().catch((hiba) => {
    console.warn("[marka] a markalista nem jott meg:", hiba)
    return []
  })
  return <MarkaListaLap markak={markak} countryCode={countryCode} />
}
