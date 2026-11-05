import { anyVariantPurchasable } from "@modules/products/components/stock-state/availability"

/**
 * A KOZBEN ELKELT EGYEDI DARAB A PENZTARNAL (V2.5, kartya ffa5d8c6). A hatter a leadas hibajanak uzenetebe a `unique_piece_sold:`
 * kodot es az elkelt darabok listajat (cim, kezelo) teszi; a kirakat ebbol visszavezeti a vevot a kosarhoz, ahol az ertesites
 * all. A kapcsolat MINDKET vege ellenorzott: az uzenetbol csak ervenyes alak megy tovabb, a kosar oldalon pedig CSAK olyan
 * kezelo szamit, ami a kosar egyik tetelen tenyleg ott van (egy kezzel irt cim nem tud ertesitest kirajzolni).
 *
 * AMI NEM ITT ALL: a kifizetett osszeg sorsa (jogi es Balazs-dontes, korall szovegen [KITOLTENDO]): az ertesites addig nem
 * igeri a visszatérítést, és a kártya zárolásáról sem mond semmit.
 */
export const ELKELT_KOD = "unique_piece_sold"
export const ELKELT_PARAM = "elkelt"
const LEGTOBB = 5
const KEZELO = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/

export type ElkeltDarab = { title: string; handle: string }

/** A leadas hibajanak uzenete: az elkelt darabok, vagy `null`, ha nem ez a hiba (vagy az alak hibas). */
export function elkeltDarabokAzUzenetbol(uzenet: string): ElkeltDarab[] | null {
  const kezdet = uzenet.indexOf(`${ELKELT_KOD}:`)
  if (kezdet < 0) return null
  let adat: unknown
  try {
    adat = JSON.parse(uzenet.slice(kezdet + ELKELT_KOD.length + 1))
  } catch {
    return null
  }
  if (!Array.isArray(adat) || adat.length === 0) return null
  const darabok: ElkeltDarab[] = []
  for (const elem of adat.slice(0, LEGTOBB)) {
    const { title, handle } = (elem ?? {}) as {
      title?: unknown
      handle?: unknown
    }
    if (
      typeof title !== "string" ||
      typeof handle !== "string" ||
      !KEZELO.test(handle)
    )
      return null
    darabok.push({ title, handle })
  }
  return darabok
}

/** A kosar cimenek kereso-parametere: a kezelok vesszovel. */
export const elkeltParam = (darabok: readonly ElkeltDarab[]): string =>
  darabok.map((d) => d.handle).join(",")

/** A parameterbol a kezelok: csak ervenyes alak, legfeljebb ot, ismetles nelkul. */
export function elkeltKezelok(ertek: string | string[] | undefined): string[] {
  const nyers = (Array.isArray(ertek) ? ertek[0] : ertek) ?? ""
  return Array.from(new Set(nyers.split(",").map((resz) => resz.trim())))
    .filter((resz) => KEZELO.test(resz))
    .slice(0, LEGTOBB)
}

/** Egy elkelt darab a kosarban: a tetel azonositoja is megvan (a "Kiveszem a kosarbol" gomb ezt torli). */
export type ElkeltTetel = ElkeltDarab & { lineId: string }

/** A kosar tetelei kozul az elkelt kezelok tetelei (cimmel, tetel-azonositoval): csak ami tenyleg a kosarban van. */
export function elkeltATetelek(
  kezelok: readonly string[],
  tetelek:
    | readonly {
        id?: string | null
        title?: string | null
        product_handle?: string | null
      }[]
    | undefined,
): ElkeltTetel[] {
  const talalt: ElkeltTetel[] = []
  for (const kezelo of kezelok) {
    const tetel = (tetelek ?? []).find(
      (t) => t.product_handle === kezelo && t.id,
    )
    if (tetel?.id)
      talalt.push({
        title: tetel.title || kezelo,
        handle: kezelo,
        lineId: tetel.id,
      })
  }
  return talalt
}

type KartyaTermek = Parameters<typeof anyVariantPurchasable>[0] & {
  handle?: string | null
}

/** Hasonlo, most kapható darabok: nem az elkelt, kapható, legfeljebb `db`. */
export function hasonloKaphato<T extends KartyaTermek>(
  termekek: readonly T[],
  elkeltKezelok: readonly string[],
  db = 3,
): T[] {
  return termekek
    .filter(
      (termek) =>
        termek.handle &&
        !elkeltKezelok.includes(termek.handle) &&
        anyVariantPurchasable(termek),
    )
    .slice(0, db)
}
