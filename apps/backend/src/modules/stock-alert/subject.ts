/**
 * WHAT A STOCK ALERT IS ABOUT, without Medusa, so the route and its spec share the rules.
 */
export const STOCK_ALERT_KINDS = ["species", "product"] as const
export type StockAlertKind = (typeof STOCK_ALERT_KINDS)[number]

export const STOCK_ALERT_STATUSES = ["pending", "confirmed", "unsubscribed"] as const
export type StockAlertStatus = (typeof STOCK_ALERT_STATUSES)[number]

/**
 * Epithets that name no species: "Acropora sp.", "Acropora cf. tenuis", "Montipora aff. ...". A sign-up for one of
 * them would wait for any unnamed piece of the genus, which is not what the form promises.
 */
const NOT_A_SPECIES = new Set(["sp", "spp", "cf", "aff", "var", "x"])

/**
 * THE SPECIES FROM THE PRODUCT'S TITLE, the storefront's rule (`fajKulcs` in `lib/util/eladott-darab.ts`): the
 * catalogue has no species field, and a coral's title starts with its binomial ("Acropora abrolhosensis ULTRA").
 * The key is lowercased, the label keeps the title's spelling. No binomial, or an epithet that names no species:
 * null, and the page offers no species sign-up. When the species list (korall, fajnev-lista.csv) is in the data,
 * this is the function to replace, on both sides.
 */
export function speciesOfTitle(title: string | null | undefined): { key: string; label: string } | null {
  const m = /^([A-Z][a-z]+)\s+([a-z][a-z-]+)\b/.exec(title?.trim() ?? "")
  if (!m || NOT_A_SPECIES.has(m[2]!)) return null
  return { key: `${m[1]!.toLowerCase()} ${m[2]}`, label: `${m[1]} ${m[2]}` }
}

/**
 * THE CONSENT SENTENCES, korall's (exchange/otletek-2026-11-04/v-feluleti-szovegek.md, V2.4; the product form
 * says "termékről" where the species form says "fajról", V2.6). NOT FINAL: the privacy text is waiting for a legal
 * check, so the sign-up is behind `ACROPORA_STOCK_ALERT` until Balázs approves it. Hungarian only (no English shop
 * for this, Balázs 2026-11-04). The storefront shows these same sentences; its spec reads this file.
 */
export const STOCK_ALERT_CONSENT: Record<StockAlertKind, string> = {
  species: "Hozzájárulok, hogy erre a címre értesítést küldjetek erről a fajról.",
  product: "Hozzájárulok, hogy erre a címre értesítést küldjetek erről a termékről.",
}

/** The one switch: the sign-up and its confirmation mail, on the test shop only, until the texts are approved. */
export const STOCK_ALERT_ENV = "ACROPORA_STOCK_ALERT"

export const stockAlertOn = (env: NodeJS.ProcessEnv = process.env): boolean => env[STOCK_ALERT_ENV]?.trim() === "on"
