import { Metadata } from "next"

import { markaLista } from "@lib/data/brands"
import { indexelhetoRobots, lapCim, openGraph } from "@lib/seo/oldal-metaadat"
import { markaListaCanonical } from "@lib/util/lap-canonical"
import { MarkaListaLap } from "@modules/marka/marka-lista-lap"

type Props = { params: Promise<{ countryCode: string }> }

const CIM = "Forgalmazott márkák"
const LEIRAS =
  "Az Acropora által forgalmazott márkák: tengeri akvarisztikai termékek gyártói egy helyen."

/**
 * A FORGALMAZOTT MARKAK LISTAJA (`/hu/marka`, Balazs, 2026-10-27,
 * kirakat-lablec-kep): a lablec Oldalterkep oszlopanak uj linkje ide visz. A
 * lista a marka-modul `GET /store/brands` valasza, vagyis csak a termekkel
 * rendelkezo markak; mindegyik a sajat markaoldalara visz (`/marka/<handle>`).
 */
export async function generateMetadata(props: Props): Promise<Metadata> {
  const { countryCode } = await props.params
  const canonical = markaListaCanonical(countryCode)
  return {
    title: lapCim(CIM),
    description: LEIRAS,
    robots: indexelhetoRobots(),
    alternates: { canonical },
    openGraph: openGraph({ cim: lapCim(CIM), leiras: LEIRAS, url: canonical }),
  }
}

/* ISR (FE-7), mint a markaoldal: igeny szerint epul, 300 mp-ig tarolt. */
export const revalidate = 300

export async function generateStaticParams() {
  return []
}

export default async function MarkaListaOldal() {
  /*
    EGY ATMENETI BOLTI HIBA NE ADJON HIBALAPOT (barracuda, #576): ures lista
    es naplosor; a lap ures listanal kimondja, hogy nincs mit mutatni, es a
    kovetkezo revalidalas ujra probalja. A kezdolap markasavja ugyanigy tesz.
  */
  const markak = await markaLista().catch((hiba) => {
    console.warn("[marka] a markalista nem jott meg:", hiba)
    return []
  })
  return <MarkaListaLap cim={CIM} markak={markak} />
}
