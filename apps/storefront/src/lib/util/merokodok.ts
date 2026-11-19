import { rumLaptipus } from "./rum"
import type { SutiDontes } from "./suti-hozzajarulas"

/**
 * A MEROKODOK (GA4, GOOGLE ADS, META PIXEL) HOZZAJARULAS MOGOTT (kartya dc8cabd2, Balazs dontese 2026-11-18 21:30 UTC).
 * A TISZTA RESZ: melyik azonosito ervenyes, a hozzajarulas melyiket engedi, mit kell torolni visszavonaskor. A komponens
 * (`modules/suti/merokodok.tsx`) csak vegrehajt.
 *
 * ALAPBOL SEMMI: az azonositok kornyezeti valtozobol jonnek, URESEN (vagy ervenytelen alakkal) nincs betoltes. Valodi
 * azonosito a repoban nincs. Az azonosito egy script-CIMBE es egy inline hivasba kerul, ezert a formatuma szigoruan
 * ellenorzott: egy kitalalt ertek (idezojel, perjel, szokoz) nem juthat a lapba.
 *
 * A KATEGORIAK (a banner szovege ugyanezt igeri): STATISZTIKA = GA4; MARKETING = Google Ads es Meta pixel. Dontes nelkul
 * (nincs suti, regi verzio) semmi.
 */
export type MerokodAzonositok = {
  ga4: string | null
  ads: string | null
  meta: string | null
}

const GA4_MINTA = /^G-[A-Z0-9]{6,12}$/
const ADS_MINTA = /^AW-\d{6,12}$/
const META_MINTA = /^\d{10,20}$/

const tiszta = (
  ertek: string | undefined | null,
  minta: RegExp,
): string | null => {
  const szoveg = (ertek ?? "").trim()
  return minta.test(szoveg) ? szoveg : null
}

/** A kornyezeti valtozok ellenorzott alakja; ami nem illeszkedik, `null`. */
export function merokodAzonositok(env: {
  NEXT_PUBLIC_GA_MEASUREMENT_ID?: string
  NEXT_PUBLIC_GOOGLE_ADS_ID?: string
  NEXT_PUBLIC_META_PIXEL_ID?: string
}): MerokodAzonositok {
  return {
    ga4: tiszta(env.NEXT_PUBLIC_GA_MEASUREMENT_ID, GA4_MINTA),
    ads: tiszta(env.NEXT_PUBLIC_GOOGLE_ADS_ID, ADS_MINTA),
    meta: tiszta(env.NEXT_PUBLIC_META_PIXEL_ID, META_MINTA),
  }
}

/** Van-e bekotott merokod egyaltalan (ha nincs, a komponens semmit nem csinal). */
export const vanMerokod = (azon: MerokodAzonositok): boolean =>
  !!(azon.ga4 || azon.ads || azon.meta)

/**
 * MIT TOLTHETUNK A DONTES SZERINT. Statisztika nelkul nincs GA4; Marketing nelkul nincs Ads es pixel; dontes nelkul
 * semmi. Az azonosito nelkuli eszkoz eleve `null`.
 */
export function mitToltsunk(
  dontes: Pick<SutiDontes, "statisztika" | "marketing"> | null,
  azon: MerokodAzonositok,
): MerokodAzonositok {
  if (!dontes) return { ga4: null, ads: null, meta: null }
  return {
    ga4: dontes.statisztika ? azon.ga4 : null,
    ads: dontes.marketing ? azon.ads : null,
    meta: dontes.marketing ? azon.meta : null,
  }
}

/** A gtag.js script cime: az ELSO engedelyezett azonositoval toltodik (GA4, ennek hianyaban Ads). */
export function gtagScriptCim(toltes: MerokodAzonositok): string | null {
  const azon = toltes.ga4 ?? toltes.ads
  return azon
    ? `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(azon)}`
    : null
}

export const META_SCRIPT_CIM = "https://connect.facebook.net/en_US/fbevents.js"

/**
 * A SUTIK, AMIKET A VISSZAVONAS TOROL (a banner igerete: a visszavonas nem csak a jovore hat). A nevek a Google es a Meta
 * dokumentalt suti-nevei; a torlendo halmaz kategoriankent kulon, hogy a Statisztika visszavonasa ne vigye a Marketing
 * sutijeit, es forditva.
 */
const SUTIK: Record<"statisztika" | "marketing", RegExp[]> = {
  statisztika: [/^_ga$/, /^_ga_[A-Z0-9]+$/, /^_gid$/, /^_gat(_.+)?$/],
  marketing: [/^_gcl_(au|aw|dc|gb|ha)$/, /^_fbp$/, /^_fbc$/],
}

/** A `document.cookie` szovegebol a kategoria torlendo suti-nevei. */
export function torlendoSutik(
  sutik: string,
  kategoria: "statisztika" | "marketing",
): string[] {
  return sutik
    .split(";")
    .map((s) => s.trim().split("=")[0]!)
    .filter((nev) => nev && SUTIK[kategoria].some((minta) => minta.test(nev)))
}

/**
 * A LAP, AMIT A MEROESZKOZ LAT. A fizetesi token (`/rendeles-fizetese/<token>`) es a rendelesi azonosito (`/order/<id>`)
 * az URL-ben ulnek, ezert a rendeles es a fiok lapjat NEM kuldjuk a merofelnek: azokrol nincs esemeny (`null`). Minden
 * mas lapon az utvonal a kerdojel elott (a lekerdezes kimarad: kereso-szoveg, szuro, token jarhat benne).
 */
export function merheto(utvonal: string): string | null {
  const tipus = rumLaptipus(utvonal)
  if (tipus === "rendeles" || tipus === "fiok") return null
  return utvonal.split("?")[0]!.split("#")[0]!
}

/**
 * A MEROFEL SZAMARA LATSZO UTVONAL (a `page_location` es a `page_path` ertekeihez). A `merheto` null-t ad a rendeles es a fiok
 * lapjara (ott a token vagy a rendelesi azonosito az URL-ben ul), de a mero script (a GA4 automatikus esemenyei: gorgetes,
 * kimeno kattintas) AKKOR IS az aktualis cimet olvasna; ezert a `page_location`-t minden lapvaltaskor ATIRJUK erre az
 * ertekre, es az ilyen lapokon egy altalanos utvonalat adunk (`/hu/rendeles`), nem az igazit.
 */
export function lathatoUtvonal(utvonal: string): string {
  const ut = merheto(utvonal)
  if (ut) return ut
  const orszag = utvonal.split("/").filter(Boolean)[0] ?? "hu"
  return `/${orszag}/${rumLaptipus(utvonal)}`
}

/**
 * A SUTIK TORLESENEK DOMAINJEI. A merokodok a suti-domain tobb alakjat is hasznalhatjak (`shop.acropora.hu`, `.acropora.hu`), a
 * torles csak az egyezo domainre hat: a lista a hosztot es minden szulo-domainjet (legalabb ket cimke) adja, a domain nelkuli
 * alakkal egyutt (`undefined`).
 */
export function sutiDomainek(hoszt: string): (string | undefined)[] {
  const cimkek = hoszt.split(".").filter(Boolean)
  const domainek: (string | undefined)[] = [undefined, hoszt]
  for (let i = 0; i <= cimkek.length - 2; i += 1)
    domainek.push(`.${cimkek.slice(i).join(".")}`)
  return domainek
}
