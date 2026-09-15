import { headers } from "next/headers"
import type { MetadataRoute } from "next"

import { listCategories } from "@lib/data/categories"
import { listProducts } from "@lib/data/products"
import { listRegions } from "@lib/data/regions"
import { robotsHazirend } from "@lib/util/robots-hazirend"
import { sitemapBejegyzesek } from "@lib/util/sitemap-bejegyzesek"

/**
 * A `/sitemap.xml` KISZOLGALASA.
 *
 * ELOZMENY, ES AMIERT EZ A FAJL A SORREND ELSO FELE: a `/sitemap.xml` egy ideig
 * a kozbenso reteg "szabadon tartott" utjain allt, holott sitemap SOHA nem epult
 * meg. A kirakat ezert egy RENDES LAPOT adott ra 200-zal -- egy keresonek nem
 * hianyzo sitemap, hanem egy HTML sitemap (merve az elo teszt-kirakaton,
 * 2026-09-15: 69 957 bajt, `<title>Acropora`). A bejegyzes azota kikerult, es
 * egy orzo koveteli meg, hogy minden ilyen ut mogott alljon valami. Ez a fajl
 * az a valami; a lista-bejegyzes CSAK utana kerul vissza.
 *
 * A DONTES, HOGY MELYIK CIM KERUL BE, a `lib/util/sitemap-bejegyzesek.ts`-ben
 * all: ez a modul a `next/headers`-t importalja, tehat a benne allo dontes
 * egysegteszttel nem merheto. Ugyanaz a szetvalasztas, mint a middleware es a
 * `statikus-utak.ts` kozott.
 *
 * === MIERT `force-dynamic`, UGYANAZZAL AZ INDOKKAL, MINT A ROBOTS ===
 *
 * A valasz a keres HOSZTNEVETOL fugg. Statikusan generalva egyetlen valasz
 * szuletne, es az a build kornyezetenek hosztneve szerint dontene minden kesobbi
 * keresrol -- vagyis a hosztnev-alapu szabaly csendben visszavaltozna
 * beegetette.
 *
 * === AHOL A ROBOTS TILT, OTT NEM KINALUNK UTAT ===
 *
 * Nem ovatossag: EGY szabaly, egy helyen. A teszt-bolt robotsa `disallow: /`,
 * tehat egy ott kiszolgalt sitemap olyan cimeket sorolna fel, amikrol ugyanaz a
 * rendszer azt mondja, ne jarja be oket. A ket valasz igy nem tud elcsuszni:
 * mindketto a `robotsHazirend`-bol jon.
 *
 * ES EBBOL KOVETKEZIK A `https://` IS: cimet csak arra a hosztra adunk ki, amit
 * a hazirend ENGED, az pedig az eles bolt -- ott nincs sima http.
 *
 * === A MERET, MERVE (2026-09-15, a stage bolton) ===
 *
 * 1 regio, 219 kategoria, 1492 termek -- vagyis ~1713 cim egyetlen orszagkoddal.
 * A sitemap-szabvany hatara 50 000 cim, tehat nem kell darabolni. A termekek
 * lapozva jonnek (100-asaval, ~15 keres); a felso korlat azert all, hogy egy
 * elromlott `nextPage` ne forogjon vegtelenul.
 */
export const dynamic = "force-dynamic"

const MAX_LAP = 100
const LAP_MERET = 100

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const fejlecek = await headers()
  const hoszt = fejlecek.get("host")
  const { engedett } = robotsHazirend(hoszt)
  if (!engedett || !hoszt) return []

  /*
    AZ ORSZAGKODOK ABBOL A FORRASBOL JONNEK, AMIBOL A KOZBENSO RETEGE IS. Egy
    kezzel irt lista (peldaul csak "hu") pontosan akkor avulna el, amikor egy uj
    regio indul -- es a sitemap csendben hagyna ki az egesz uj piacot.
  */
  const regiok = await listRegions()
  const orszagKodok = Array.from(
    new Set(
      regiok.flatMap(
        (regio) =>
          regio.countries
            ?.map((orszag) => orszag.iso_2)
            .filter((kod): kod is string => Boolean(kod)) ?? [],
      ),
    ),
  )
  if (orszagKodok.length === 0) return []

  const kategoriak = await listCategories({ fields: "handle,updated_at" })

  const termekek: { handle?: string | null; updated_at?: unknown }[] = []
  for (let lap = 1; lap <= MAX_LAP; lap++) {
    const { response, nextPage } = await listProducts({
      pageParam: lap,
      countryCode: orszagKodok[0],
      queryParams: { limit: LAP_MERET, fields: "handle,updated_at" },
    })
    termekek.push(...response.products)
    if (nextPage === null) break
  }

  return sitemapBejegyzesek({
    origin: `https://${hoszt}`,
    orszagKodok,
    kategoriak,
    termekek,
  })
}
