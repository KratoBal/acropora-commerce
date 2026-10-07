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

/** Az indexelheto lap robots-szabalya, kimondva. */
export function indexelhetoRobots(): Metadata["robots"] {
  return { index: true, follow: true }
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
 * A termeklap leirasa: a rovid leiras (az UNAS-bol jott `unas_short_description`),
 * ha nincs, a leiras eleje, ha az sincs, egy magyar mondat a nevvel. Soha nem a
 * cim masolata.
 */
export function termekLeiras(termek: {
  title?: string | null
  description?: string | null
  metadata?: Record<string, unknown> | null
}): string {
  const rovid = termek.metadata?.unas_short_description
  return (
    leirasSzovegbol(typeof rovid === "string" ? rovid : null) ??
    leirasSzovegbol(termek.description) ??
    `${termek.title ?? ""}: rendelés az ${STORE_NAME} webáruházban.`.trim()
  )
}

/** A kereses es az osszes termek lapja (a noindex a FE-4-ben jon). */
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
