/**
 * A LANDING SZURO-DEFINICIOJA, ERVENYESITVE (SEO P1-14, t10; a szerzodes
 * nautilusszal egyeztetve, 29011).
 *
 * - Egy dimenzion belul VAGY, a ketto kozott ES: (A vagy B kategoria) ES (X marka).
 *   Egy ures lista azt jelenti, hogy az a dimenzio nem szur.
 * - A kategoria AZ ALKATEGORIAIVAL EGYUTT szamit, mint a kategorialapon
 *   (nautilus, 29016). Az OS a szerkeszto valasztasat kuldi, kibontas nelkul;
 *   a kibontas itt tortenik, a teljes Medusa-fan (`leszarmazottakkal`), igy egy
 *   uj alkategoria ujravetites nelkul is megjelenik.
 * - ERVENYTELEN, es a lap 404: ha mindket lista ures (az a teljes katalogus
 *   lenne), vagy ha az `attribute_filters` nem ures (a kirakat meg nem tudja
 *   alkalmazni, es egy felig alkalmazott szuro rosszabb a hianyanal). Az OS ezt
 *   mar elutasitja; a kirakat ettol fuggetlenul nem bizik meg benne.
 */
export type LandingSzuro = {
  category_ids: string[]
  os_brand_ids: string[]
}

const szovegLista = (ertek: unknown): string[] | null =>
  Array.isArray(ertek) && ertek.every((e) => typeof e === "string" && e.length > 0)
    ? (ertek as string[])
    : null

export function landingSzuro(filter: unknown): LandingSzuro | null {
  if (typeof filter !== "object" || filter === null) return null
  const f = filter as Record<string, unknown>
  const category_ids = szovegLista(f.category_ids)
  const os_brand_ids = szovegLista(f.os_brand_ids)
  const attr = f.attribute_filters
  if (!category_ids || !os_brand_ids) return null
  if (attr !== undefined && (!Array.isArray(attr) || attr.length > 0)) return null
  if (category_ids.length === 0 && os_brand_ids.length === 0) return null
  return { category_ids, os_brand_ids }
}

/**
 * A kategoriak es minden leszarmazottjuk, a fa bejarasaval. A ciklus-vedelem
 * nem elmeleti: a fa a szerver adatabol jon, es egy korbe mutato szulo
 * vegtelen bejarast adna. Egy listaban nem szereplo azonosito maga marad.
 */
export function leszarmazottakkal(
  fa: readonly { id: string; parent_category_id?: string | null }[],
  gyokerek: readonly string[]
): string[] {
  const gyerekek = new Map<string, string[]>()
  for (const k of fa) {
    if (!k.parent_category_id) continue
    gyerekek.set(k.parent_category_id, [
      ...(gyerekek.get(k.parent_category_id) ?? []),
      k.id,
    ])
  }
  const latott = new Set<string>()
  const sor = [...gyokerek]
  while (sor.length) {
    const id = sor.shift() as string
    if (latott.has(id)) continue
    latott.add(id)
    sor.push(...(gyerekek.get(id) ?? []))
  }
  return [...latott]
}
