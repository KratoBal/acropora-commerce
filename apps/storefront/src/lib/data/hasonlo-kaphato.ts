import { listProducts } from "@lib/data/products"
import { hasonloKaphato, type ElkeltDarab } from "@lib/util/elkelt-darab"
import { termeklistaMezok } from "@lib/util/termeklista-mezok"

/**
 * HASONLO, MOST KAPHATO DARABOK AZ ELKELT HELYETT (V2.5): az elkelt darab kategoriajabol, legfeljebb harom. Ha a kategoria nem
 * olvashato, vagy a lekeres elhasal, ures lista: az ertesites a "most nincs kaphato hasonlo darabunk" mondatot mondja, a kosar
 * oldal pedig nem torik meg egy hiba miatt.
 */
export async function hasonloKaphatoTermekek(input: {
  elkeltek: readonly ElkeltDarab[]
  countryCode: string
}) {
  try {
    const elso = input.elkeltek[0]
    if (!elso) return []
    const sajat = await listProducts({
      countryCode: input.countryCode,
      queryParams: {
        handle: elso.handle,
        limit: 1,
        fields: termeklistaMezok,
      } as never,
    })
    const kategoria = sajat.response.products[0]?.categories?.[0]?.id
    if (!kategoria) return []
    const lista = await listProducts({
      countryCode: input.countryCode,
      queryParams: {
        category_id: [kategoria],
        limit: 24,
        fields: termeklistaMezok,
      } as never,
    })
    return hasonloKaphato(
      lista.response.products,
      input.elkeltek.map((darab) => darab.handle),
    )
  } catch (hiba) {
    console.error(
      "A hasonló darabok lekérése nem sikerült:",
      hiba instanceof Error ? hiba.message : String(hiba),
    )
    return []
  }
}
