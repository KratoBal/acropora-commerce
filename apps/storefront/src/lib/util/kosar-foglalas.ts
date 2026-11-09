import type { Translate } from "@lib/i18n/dictionary"

/**
 * AZ EGYEDI DARAB KOSARFOGLALASA A KIRAKATON (V2.3 S2b, kartya 52024fc0; terv:
 * agents/nautilus/atadas/v23-kosarfoglalas-terv.md, "A vevo felulete").
 *
 * A bolt (S1 #703, S2a) ket dolgot ad: a kosarba tetel elutasitasat harom kod egyikevel, es a
 * `GET /store/cart-holds` valaszat (darabonkent: egyedi-e, es all-e rajta foglalas). Ez a modul
 * mindkettot ellenorzott alakra hozza, halozat nelkul: az uzenetbol es a valaszbol csak ervenyes
 * alak megy tovabb (a V2.5 `elkelt-darab.ts` szabalya), minden mas `null`, es a hivo ilyenkor
 * nem rajzol semmit.
 *
 * A SZOVEGEK A TERV JAVASLATAI, amig korall meg nem irja oket (a V2.5 szovege melle); a szotarban
 * allnak (`product.hold*`, `cartPage.hold*`, `checkoutPayment.errPieceHeld`).
 */
export const FOGLALT_KOD = "unique_piece_held"
export const KORLAT_KOD = "cart_hold_limit"
export const SOK_KOD = "unique_piece_busy"

/**
 * A LATOGATONKENTI KORLAT (barracuda, #703 review, 2. pont; az elesites feltetele). A bolt
 * kosaranként korlatoz (alapbol 5), de egy latogato sok kosarat nyithat; ez a kirakat oldalan
 * szamolja, hany UJ egyedi darabot tett kosarba egy latogato egy foglalasnyi idoben. A szam ket
 * kosarnyi: aki ennel tobbet tenne felre egy fel ora alatt, az nem egy vevo. A kulcs az `x-real-ip`
 * (`vendeg-korlat.ts`): fejlec nelkul nem szamol, a bolt kosaranketi korlatja akkor is all.
 */
export const LATOGATO_FOGLALAS_KORLAT = {
  max: 10,
  ablakMs: 30 * 60 * 1000,
} as const

export type DarabFoglalas = {
  variant_id: string
  unique: boolean
  hold: { until: string; mine: boolean } | null
}
export type FoglalasValasz = { on: boolean; pieces: DarabFoglalas[] }

const idopont = (ertek: unknown): ertek is string =>
  typeof ertek === "string" && !Number.isNaN(Date.parse(ertek))

/** A `GET /store/cart-holds` valasza, ellenorizve; hibas alakra `null` (a hivo nem rajzol semmit). */
export function foglalasValaszbol(adat: unknown): FoglalasValasz | null {
  const { on, pieces } = (adat ?? {}) as { on?: unknown; pieces?: unknown }
  if (typeof on !== "boolean" || !Array.isArray(pieces)) return null
  const darabok: DarabFoglalas[] = []
  for (const elem of pieces) {
    const { variant_id, unique, hold } = (elem ?? {}) as Record<string, unknown>
    if (typeof variant_id !== "string" || typeof unique !== "boolean")
      return null
    if (hold === null) {
      darabok.push({ variant_id, unique, hold: null })
      continue
    }
    const { until, mine } = (hold ?? {}) as Record<string, unknown>
    if (!idopont(until) || typeof mine !== "boolean") return null
    darabok.push({ variant_id, unique, hold: { until, mine } })
  }
  return { on, pieces: darabok }
}

export type Elutasitas =
  | { fajta: "foglalt"; until: Date | null }
  | { fajta: "korlat"; max: number }
  | { fajta: "sok" }

const kodUtan = (uzenet: string, kod: string): unknown => {
  const kezdet = uzenet.indexOf(`${kod}:`)
  if (kezdet < 0) return undefined
  try {
    return JSON.parse(uzenet.slice(kezdet + kod.length + 1))
  } catch {
    return undefined
  }
}

/** A bolt elutasitasa a hibauzenetbol, vagy `null`, ha nem ez a harom (vagy az alak hibas). */
export function foglalasElutasitas(uzenet: string): Elutasitas | null {
  const foglalt = kodUtan(uzenet, FOGLALT_KOD)
  if (Array.isArray(foglalt) && foglalt.length > 0) {
    const vegek = foglalt
      .map((sor) => (sor as { until?: unknown })?.until)
      .filter(idopont)
      .map((ertek) => new Date(ertek))
    return {
      fajta: "foglalt",
      until: vegek.length
        ? new Date(Math.max(...vegek.map((d) => d.getTime())))
        : null,
    }
  }
  const korlat = kodUtan(uzenet, KORLAT_KOD) as { max?: unknown } | undefined
  if (
    korlat &&
    typeof korlat.max === "number" &&
    Number.isInteger(korlat.max) &&
    korlat.max > 0
  )
    return { fajta: "korlat", max: korlat.max }
  if (Array.isArray(kodUtan(uzenet, SOK_KOD))) return { fajta: "sok" }
  return null
}

/** Hany perc van hatra a foglalasbol, felfele kerekitve, legalabb 1 (a "0 perc mulva" nem mondat). */
export const percMulva = (until: Date, most: Date): number =>
  Math.max(1, Math.ceil((until.getTime() - most.getTime()) / 60_000))

/** Az ora:perc budapesti idoben, a lap nyelvetol fuggetlenul (a bolt Budapesten tart). */
export const oraPerc = (ido: Date): string =>
  new Intl.DateTimeFormat("hu-HU", {
    timeZone: "Europe/Budapest",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(ido)

/** A kosarba tetel elutasitasanak mondata, vagy `null`, ha a hiba nem a foglalase. */
export function kosarbaElutasitasMondat(
  uzenet: string,
  t: Translate,
  most: Date = new Date(),
): string | null {
  const elutasitas = foglalasElutasitas(uzenet)
  if (!elutasitas) return null
  if (elutasitas.fajta === "korlat")
    return t("product.holdLimit", { max: elutasitas.max })
  if (elutasitas.fajta === "sok") return t("product.holdBusy")
  return elutasitas.until && elutasitas.until.getTime() > most.getTime()
    ? t("product.holdHeldByOther", { perc: percMulva(elutasitas.until, most) })
    : t("product.holdHeldByOtherNoTime")
}

/**
 * Egy darab a valaszbol: a MASIK kosar allo foglalasa (a lap ezt rajzolja ki), vagy `null`.
 * A sajat foglalas itt nem akadaly, a lejart sem.
 */
export function masKosaraban(
  valasz: FoglalasValasz | null,
  variantId: string,
  most: Date = new Date(),
): { until: Date } | null {
  const darab = valasz?.on
    ? valasz.pieces.find((p) => p.variant_id === variantId)
    : undefined
  if (!darab?.hold || darab.hold.mine) return null
  const until = new Date(darab.hold.until)
  return until.getTime() > most.getTime() ? { until } : null
}

/** A kosar sajat foglalasai tetelenkent: a vege, es hogy lejart-e. Csak egyedi darab, csak sajat. */
export function sajatFoglalasok(
  valasz: FoglalasValasz | null,
  most: Date = new Date(),
): Map<string, { until: Date; lejart: boolean }> {
  const eredmeny = new Map<string, { until: Date; lejart: boolean }>()
  if (!valasz?.on) return eredmeny
  for (const darab of valasz.pieces) {
    if (!darab.unique || !darab.hold?.mine) continue
    const until = new Date(darab.hold.until)
    eredmeny.set(darab.variant_id, {
      until,
      lejart: until.getTime() <= most.getTime(),
    })
  }
  return eredmeny
}
