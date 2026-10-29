import type { Metadata } from "next"

import { STORE_DESCRIPTION, STORE_NAME } from "@lib/store"

/**
 * AZ OLDALAK METAADATA, OLDALTIPUSONKENT, EGY HELYEN (SEO frontend FE-1,
 * Balazs 2026-10-07).
 *
 * Merve a teszt kirakaton (2026-10-07): a kezdolapon es a kategorian nem volt
 * meta description, a termeklapon a leiras a cim masolata volt, a keresesen
 * angol helykitolto allt („Store”, „Explore all of our products.”), a
 * kosaron „Cart”, a markan „Boyu collection”. Ez a modul adja a magyar
 * cimet, a leirast, az OpenGraph-ot es a robots-szabalyt; a lapok csak hivjak.
 *
 * A NOINDEX-EK NEM ITT VANNAK MEG: a kereses, a szuro es a lapozas szabalya a
 * roadmap FE-4-e. Itt az indexelheto lapok kapnak kifejezett szabalyt.
 */

/** A meta description hossza: a talalati lista ennyit mutat nagyjabol. */
export const LEIRAS_MAX = 155

/** HTML-bol egy soros, rovid leiras, szohataron vagva (vagy `null`, ha ures). */
export function leirasSzovegbol(
  szoveg: string | null | undefined,
  max: number = LEIRAS_MAX,
): string | null {
  const tiszta = (szoveg ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim()
  if (!tiszta) return null
  if (tiszta.length <= max) return tiszta
  const vagott = tiszta.slice(0, max - 1)
  const szohatar = vagott.lastIndexOf(" ")
  return `${(szohatar > max / 2 ? vagott.slice(0, szohatar) : vagott).trimEnd()}…`
}

/** Az indexelheto oldaltipusok. A tobbi a FE-4-ig a Next alapertelmezeset kapja. */
export type IndexelhetoOldal = "home" | "category" | "product" | "brand"

/**
 * A TERMEK SAJAT ROBOTS-DONTESE (kartya cc404355, t13). A UNAS-ban egy termek
 * kezzel irt Meta blokkja `Robots` erteket hordozhat (ma kettonel all, mindketto
 * `noindex, nofollow`); az OS ezt `metadata.seo_robots`-kent vetiti ki. Ez egy
 * meghozott dontes, nem SEO-szoveg: a lap, a sitemap es a Merchant feed is ebbol
 * dont. A tokeneket kulon nezzuk: a `nofollow` csak akkor all, ha a forras mondja.
 */
export function termekRobotsJel(metadata?: Record<string, unknown> | null): {
  noindex: boolean
  nofollow: boolean
} {
  const ertek = metadata?.seo_robots
  const szoveg = typeof ertek === "string" ? ertek.toLowerCase() : ""
  // a `none` a robots-szabványban egyenlő a `noindex, nofollow`-val
  // (barracuda #548, acrobot 29093)
  const none = /\bnone\b/.test(szoveg)
  return {
    noindex: none || /\bnoindex\b/.test(szoveg),
    nofollow: none || /\bnofollow\b/.test(szoveg),
  }
}

/** A termeklap robots-szabalya: a sajat dontes, kulonben indexelheto. */
export function termekRobots(
  metadata?: Record<string, unknown> | null,
): Metadata["robots"] {
  const jel = termekRobotsJel(metadata)
  return jel.noindex
    ? { index: false, follow: !jel.nofollow }
    : indexelhetoRobots()
}

/** Az indexelheto lap robots-szabalya, kimondva. */
export function indexelhetoRobots(): Metadata["robots"] {
  return { index: true, follow: true }
}

/**
 * A SZURT LAP: KERESES, FACET, RENDEZES (SEO frontend FE-4, Balazs 2026-10-07,
 * 4. pont). `noindex, follow`: a kereso ne vegye fel a talalatai koze (a
 * kombinaciok szama korlatlan, a tartalom az alaplap masolata), de a linkjeit
 * kovesse, mert azok a termekekre visznek.
 *
 * ES A robots.txt NEM TILTJA EZEKET: egy tiltott URL-t a kereso le sem tolt,
 * tehat ezt a noindexet sem latna, es a cim a talalatok kozott maradhatna. Ezt
 * a `robots-kereses.spec.ts` meri az eles robots.txt-n.
 *
 * A canonical az alaplapra mutat, valtozatlanul (az alaplap metaadatabol jon).
 */
export function szurtLapRobots(): Metadata["robots"] {
  return { index: false, follow: true }
}

/** Az alaplap metaadata, szurt lapra: ugyanaz, `noindex, follow`-val. */
export function szurtMetaadat(alap: Metadata): Metadata {
  return { ...alap, robots: szurtLapRobots() }
}

/** A lap OpenGraph-ja: magyar nyelv, a bolt neve, es a kanonikus cim, ha van. */
export function openGraph(input: {
  cim: string
  leiras: string
  url?: string
  kepek?: string[]
}): Metadata["openGraph"] {
  return {
    title: input.cim,
    description: input.leiras,
    siteName: STORE_NAME,
    locale: "hu_HU",
    type: "website",
    ...(input.url ? { url: input.url } : {}),
    ...(input.kepek?.length ? { images: input.kepek } : {}),
  }
}

/** A cim a bolt nevevel, egyetlen formaban. */
export function lapCim(nev: string): string {
  return `${nev} | ${STORE_NAME}`
}

/** A kezdolap leirasa. */
export function kezdolapLeiras(): string {
  return STORE_DESCRIPTION
}

/** A kategorialap leirasa: a sajat leirasa, vagy egy magyar mondat a nevevel. */
export function kategoriaLeiras(nev: string, leiras?: string | null): string {
  return (
    leirasSzovegbol(leiras) ??
    `A(z) ${nev} kategória termékei az ${STORE_NAME} webáruházban.`
  )
}

/** A markalap leirasa: a sajat leirasa, vagy egy magyar mondat a nevevel. */
export function markaLeiras(nev: string, leiras?: string | null): string {
  return (
    leirasSzovegbol(leiras) ??
    `A(z) ${nev} márka termékei az ${STORE_NAME} webáruházban.`
  )
}

/**
 * A termeklap leirasa, sorrendben (SEO P0 terv, P1 12. pont):
 * 1. a SEO-leiras (`seo_description`): az OS vetiti a metaadatba, a jovahagyott
 *    termek-tudas szovegebol vagy a UNAS SEO-mezojebol
 *    (`medusa-product-projection.service.ts`, a `seoMetadata`);
 * 2. a rovid leiras (az UNAS-bol jott `unas_short_description`);
 * 3. a leiras eleje;
 * 4. egy magyar mondat a nevvel. Soha nem a cim masolata.
 */
export function termekLeiras(termek: {
  title?: string | null
  description?: string | null
  metadata?: Record<string, unknown> | null
}): string {
  return (
    termekSajatLeiras(termek) ??
    `${termek.title ?? ""}: rendelés az ${STORE_NAME} webáruházban.`.trim()
  )
}

/**
 * A TERMEK SAJAT LEIRASA, a fenti lanc elso harom lepese, a negyedik (a
 * kitalalt mondat) NELKUL: `null`, ha a termeknek nincs leirasa. A termek
 * strukturalt adata (JSON-LD `description`, commerce-audit-p1, S5) ezt hasznalja:
 * a meta leirasnak kell valami, a Product blokkba viszont egy sablonmondat
 * semmit nem ad, inkabb maradjon el a mezo. A `max` a meta leirasnal 155, a
 * strukturalt adatnal hosszabb.
 */
export function termekSajatLeiras(
  termek: {
    description?: string | null
    metadata?: Record<string, unknown> | null
  },
  max: number = LEIRAS_MAX,
): string | null {
  const seo = termek.metadata?.seo_description
  const rovid = termek.metadata?.unas_short_description
  return (
    leirasSzovegbol(typeof seo === "string" ? seo : null, max) ??
    leirasSzovegbol(typeof rovid === "string" ? rovid : null, max) ??
    leirasSzovegbol(termek.description, max)
  )
}

/**
 * A kereses es az osszes termek lapja. A keresesi talalat (`?q=`) a `_szurt`
 * belso utra megy (`belso-utvonalak.js`), es ott `szurtMetaadat` adja a
 * `noindex, follow`-t; az osszes termek alaplapja indexelheto.
 */
export function keresesMetaadat(kifejezes?: string | null): {
  cim: string
  leiras: string
} {
  const q = kifejezes?.trim()
  return q
    ? {
        cim: lapCim(`Keresés: ${q}`),
        leiras: `Találatok erre: „${q}” az ${STORE_NAME} webáruházban.`,
      }
    : {
        cim: lapCim("Összes termék"),
        leiras: `Az ${STORE_NAME} webáruház összes terméke.`,
      }
}

/**
 * AZ ANGOL HELYKITOLTOK, AMIKET A STARTER HAGYOTT (merve a teszt kirakaton).
 * A tesztek ezt a listat keresik a lapok metaadataban; ha egy uj lap ezekkel
 * jonne, pirosra valt.
 */
export const ANGOL_HELYKITOLTOK: readonly RegExp[] = [
  /^Store$/,
  /^Cart$/,
  /Explore all of our products/i,
  /\bcollection\b/i,
  /\bcategory\.$/i,
  /^Product \|/,
  /View your cart/i,
  /Verify your email/i,
]

/**
 * ANGOL SZAVAK A LAPOK STATIKUS SZOVEGEIBEN (barracuda atvetele, #519).
 *
 * Az `ANGOL_HELYKITOLTOK` csak a MAR MEGTALALT starter-szovegeket ismeri, tehat
 * egy uj lap mas angol szovege (pl. a regi „Order Confirmed” / „You purchase was
 * successful”) atcsuszik rajta. Ez a lista a szavakra figyel. CSAK a lapok
 * statikus `title` es `description` szovegere valo: termeknevekben (Coral Food,
 * All-in-one) angol szo jogosan allhat, ezert a renderelt cimre nem.
 *
 * A hatar betu-alapu (`\p{L}`), nem `\b`: a `\b` az ekezetes betut nem-betunek
 * latja, es egy magyar szo belsejeben is hatart talalna.
 */
export const ANGOL_SZAVAK = [
  "the",
  "your",
  "our",
  "all",
  "and",
  "with",
  "order",
  "orders",
  "confirmed",
  "purchase",
  "successful",
  "view",
  "verify",
  "email",
  "account",
  "sign",
  "login",
  "cart",
  "checkout",
  "store",
  "shop",
  "product",
  "products",
  "collection",
  "category",
  "explore",
  "search",
  "results",
  "page",
  "not",
  "found",
  "welcome",
] as const

const ANGOL_SZO = new RegExp(
  `(?<!\\p{L})(${ANGOL_SZAVAK.join("|")})(?!\\p{L})`,
  "iu",
)

/** Az elso angol szo a szovegben, vagy `null`. */
export function angolSzo(szoveg: string): string | null {
  return ANGOL_SZO.exec(szoveg)?.[1] ?? null
}
