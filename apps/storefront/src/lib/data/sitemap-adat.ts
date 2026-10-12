import { sdk } from "@lib/config"
import { markaLista } from "@lib/data/brands"
import { getPublicCacheOptions } from "@lib/data/cookies"
import { listCategories } from "@lib/data/categories"
import { listProducts } from "@lib/data/products"
import { listRegions } from "@lib/data/regions"
import { valogatasLista } from "@lib/data/valogatas"
import {
  termekesKategoriakBol,
  type SitemapBemenet,
  type SitemapTipus,
  type TermekSor,
} from "@lib/util/sitemap-bejegyzesek"

/**
 * A SITEMAP ADATAI, TIPUSONKENT CSAK AMI KELL (FE-5).
 *
 * Az egyes `/sitemap/<tipus>.xml` cimek kulon keresek, ezert mindegyik csak a
 * sajat adatat kerdezi le: a lapok es a markak a termekek ~15 lapozasat nem
 * varjak meg. A kategoriak viszont igen, mert az ures kategoria kiszuresehez
 * tudni kell, melyik kategoriaban all termek.
 *
 * === MERET (merve 2026-09-15, a stage bolton) ===
 * 1 regio, 219 kategoria, 1492 termek: tipusonkent is joval 50 000 cim alatt.
 */
const MAX_LAP = 100
const LAP_MERET = 100

type Sor = { handle?: string | null; updated_at?: unknown }

/**
 * A VALOGATASOK (SEO LANDING, t9) FORRASA. Amig `null`, a valogatas-sitemap az
 * indexbe sem kerul. A t9 (nautilus) ide koti be a landing-lista lekereset.
 */
export const LANDING_FORRAS: (() => Promise<Sor[]>) | null = valogatasLista

export async function orszagKodok(): Promise<string[]> {
  const regiok = await listRegions()
  return Array.from(
    new Set(
      regiok.flatMap(
        (regio) =>
          regio.countries
            ?.map((orszag) => orszag.iso_2)
            .filter((kod): kod is string => Boolean(kod)) ?? [],
      ),
    ),
  )
}

async function termekek(countryCode: string): Promise<TermekSor[]> {
  const mind: TermekSor[] = []
  let betelt = true
  for (let lap = 1; lap <= MAX_LAP; lap++) {
    const { response, nextPage } = await listProducts({
      pageParam: lap,
      countryCode,
      queryParams: {
        limit: LAP_MERET,
        fields: "handle,updated_at,categories.id",
      },
    })
    mind.push(...(response.products as TermekSor[]))
    if (nextPage === null) {
      betelt = false
      break
    }
  }
  // a betelt korlat nyomot hagy, de nem dob: egy csonka sitemap tobbet er a seminel
  if (betelt)
    console.warn(
      `[sitemap] a lapozasi korlat (${MAX_LAP}) betelt a(z) ${countryCode} orszagkodnal, a lista csonka lehet`,
    )
  return mind
}

/**
 * A szűrés nyomot hagy, ha nem futhat (barracuda #542 review): ha a termékek
 * nem hozták a kategóriájukat, a kategória-sitemap szűretlen, és ezt a napló
 * kimondja, ugyanúgy, mint a lapozási korlát betelését.
 */
function termekesKategoriak(
  orszagok: readonly { termekek: TermekSor[] }[],
): Set<string> | undefined {
  const halmaz = termekesKategoriakBol(orszagok.flatMap((o) => o.termekek))
  if (!halmaz)
    console.warn(
      "[sitemap] a termékek nem hozták a kategóriájukat, a kategória-sitemap szűretlen",
    )
  return halmaz
}

/**
 * A SAJAT ROBOTS-TILTASU TERMEKEK HANDLE-JEI (t13). Nem a termeklista hozza a
 * `metadata`-t: az 10,6-szor nagyobb valaszt adott (acrobot stage-merese,
 * 2026-10-12, ~4,3 MB sitemap-epitesenkent), ezert a commerce a metaadatot az
 * adatbazis mellett olvassa, es csak a handle-ket kuldi. Ha a vegpont hibazik,
 * a sitemap nem dol el: szures nelkul megy ki, es a hiany nyomot hagy.
 */
async function noindexTermekek(): Promise<Set<string>> {
  try {
    const { handles } = await sdk.client.fetch<{ handles: string[] }>(
      `/store/noindex-products`,
      {
        method: "GET",
        next: {
          ...(await getPublicCacheOptions("products")),
          revalidate: 300,
        },
      },
    )
    return new Set(handles ?? [])
  } catch (hiba) {
    console.warn("[sitemap] a noindex-es termekek listaja nem jott meg:", hiba)
    return new Set()
  }
}

export async function sitemapBemenet(
  origin: string,
  tipus: SitemapTipus,
): Promise<SitemapBemenet> {
  const kodok = await orszagKodok()
  const kellTermek = tipus === "termekek" || tipus === "kategoriak"
  const orszagok = await Promise.all(
    kodok.map(async (countryCode) => ({
      countryCode,
      termekek: kellTermek ? await termekek(countryCode) : [],
    })),
  )
  return {
    origin,
    orszagok:
      tipus === "termekek"
        ? orszagok
        : orszagok.map((o) => ({ ...o, termekek: [] })),
    kategoriak:
      tipus === "kategoriak"
        ? await listCategories({
            fields: "id,handle,updated_at,parent_category_id",
          })
        : [],
    noindexTermekek: tipus === "termekek" ? await noindexTermekek() : undefined,
    termekesKategoriak:
      tipus === "kategoriak" ? termekesKategoriak(orszagok) : undefined,
    markak:
      tipus === "markak"
        ? await markaLista().catch((hiba) => {
            console.warn("[sitemap] a markalista nem jott meg:", hiba)
            return []
          })
        : [],
    landingek:
      tipus === "valogatasok" && LANDING_FORRAS ? await LANDING_FORRAS() : [],
  }
}
