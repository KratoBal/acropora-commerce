/**
 * A VALODI FELHASZNALOI MERES (RUM) KOZOS SZABALYAI (FE-7, SEO frontend
 * roadmap: exchange/seo/seo-frontend-roadmap-2026-10-07.md).
 *
 * A bongeszo a Core Web Vitals ertekeit (`useReportWebVitals`) a `/api/rum`
 * utra kuldi, a kirakat egy JSON sort ir rola a naplojaba. A 28. napi
 * Search Console mezoadat elott ebbol latszik, melyik oldaltipus lassu.
 *
 * === MIERT OLDALTIPUS, ES MIERT NEM URL ===
 *
 * Az URL szemelyes vagy titkos adatot is hordozhat: a `/rendeles-fizetese/<token>`
 * egy fizetesi token, az `/order/<id>` egy rendeles. A naploba ezert csak az
 * oldal TIPUSA kerul (termek, kategoria, ...), es a tipus eleg is: a
 * roadmap meroszama oldaltipusonkent all.
 */

export const RUM_MEROSZAMOK = ["CLS", "LCP", "INP", "FCP", "TTFB"] as const
export type RumMeroszam = (typeof RUM_MEROSZAMOK)[number]

export const RUM_ERTEKELESEK = ["good", "needs-improvement", "poor"] as const
export type RumErtekeles = (typeof RUM_ERTEKELESEK)[number]

export const RUM_LAPTIPUSOK = [
  "kezdolap",
  "termek",
  "kategoria",
  "gyujtemeny",
  "osszes-termek",
  "jogi",
  "kosar",
  "penztar",
  "fiok",
  "rendeles",
  "egyeb",
] as const
export type RumLaptipus = (typeof RUM_LAPTIPUSOK)[number]

export interface RumTorzs {
  /** a meroszam neve */
  n: RumMeroszam
  /** az ertek: ms, a CLS-nel egyseg nelkul */
  v: number
  r: RumErtekeles
  t: RumLaptipus
}

/** A kliens ennyinel hosszabb torzset nem kuld, a vegpont nem fogad el. */
export const RUM_MAX_BAJT = 512

/**
 * Az oldal tipusa az utvonalbol. Az elso szegmens az orszagkod (`/hu/...`);
 * a belso `_p`, `_v`, `_szurt` elotag a lapozott, valtozatos es szurt alak,
 * ugyanaz a tipus.
 */
export function rumLaptipus(utvonal: string): RumLaptipus {
  const reszek = utvonal.split("?")[0]!.split("/").filter(Boolean)
  let i = 1 // az orszagkod utan
  while (reszek[i] && /^(_p|_v|_szurt|%5F(p|v|szurt))$/i.test(reszek[i]!)) {
    // `_p/<lap>` es `_v/<valtozat>` egy erteket is visz
    i += /^(_szurt|%5Fszurt)$/i.test(reszek[i]!) ? 1 : 2
  }
  switch (reszek[i]) {
    case undefined:
      return reszek.length <= 1 ? "kezdolap" : "egyeb"
    case "termek":
      return "termek"
    case "categories":
      return "kategoria"
    case "collections":
      return "gyujtemeny"
    case "store":
      return "osszes-termek"
    case "jogi":
      return "jogi"
    case "cart":
      return "kosar"
    case "checkout":
      return "penztar"
    case "account":
      return "fiok"
    case "order":
    case "rendeles-fizetese":
      return "rendeles"
    default:
      return "egyeb"
  }
}

/** Az ertek kerekitve: a CLS negy tizedesre, a tobbi egesz ms-re. */
export function rumErtek(nev: RumMeroszam, ertek: number): number {
  return nev === "CLS" ? Math.round(ertek * 10_000) / 10_000 : Math.round(ertek)
}

/** A felso korlat meroszamonkent: ami folotte all, az nem meres, hanem szemet. */
const FELSO_KORLAT: Record<RumMeroszam, number> = {
  CLS: 10,
  LCP: 120_000,
  INP: 120_000,
  FCP: 120_000,
  TTFB: 120_000,
}

/**
 * A beerkezo torzs ellenorzese. Csak a negy ismert mezot fogadja el,
 * ismert ertekkel: barmi mas `null`, es a vegpont 400-zal valaszol. Igy a
 * naploba kivulrol nem kerulhet tetszoleges szoveg.
 */
export function ervenyesRumTorzs(torzs: unknown): RumTorzs | null {
  if (!torzs || typeof torzs !== "object" || Array.isArray(torzs)) return null
  const t = torzs as Record<string, unknown>
  if (Object.keys(t).some((kulcs) => !["n", "v", "r", "t"].includes(kulcs)))
    return null
  if (!RUM_MEROSZAMOK.includes(t.n as RumMeroszam)) return null
  if (!RUM_ERTEKELESEK.includes(t.r as RumErtekeles)) return null
  if (!RUM_LAPTIPUSOK.includes(t.t as RumLaptipus)) return null
  const n = t.n as RumMeroszam
  if (typeof t.v !== "number" || !Number.isFinite(t.v)) return null
  if (t.v < 0 || t.v > FELSO_KORLAT[n]) return null
  return { n, v: t.v, r: t.r as RumErtekeles, t: t.t as RumLaptipus }
}

/**
 * A mintavetel aranya a `NEXT_PUBLIC_RUM_ARANY` valtozobol (0 es 1 kozott).
 * Ures vagy hibas ertek: 1 (minden lapletoltes). A 0 kikapcsolja.
 */
export function rumArany(ertek: string | undefined): number {
  if (ertek === undefined || ertek.trim() === "") return 1
  const szam = Number(ertek)
  if (!Number.isFinite(szam)) return 1
  return Math.min(1, Math.max(0, szam))
}
