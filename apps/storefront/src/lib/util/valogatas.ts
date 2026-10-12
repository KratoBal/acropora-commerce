/**
 * A VÁLOGATÁS (SEO LANDING) KIRAKAT-SZABÁLYAI, TISZTA FÜGGVÉNYKÉNT (t10).
 *
 * A szűrő érvényessége ugyanaz, mint a commerce-ben (`store/landing-pages/szuro.ts`):
 * legalább egy kategória vagy márka, és üres `attribute_filters`. A kirakat a
 * commerce-től függetlenül is ellenőrzi, mert egy érvénytelen lapból itt a
 * TELJES katalógus lenne (nautilus egyeztetés, 29011).
 */
export function valogatasErvenyes(filter: unknown): boolean {
  if (typeof filter !== "object" || filter === null) return false
  const f = filter as Record<string, unknown>
  const lista = (x: unknown) => (Array.isArray(x) ? x : null)
  const kat = lista(f.category_ids)
  const mar = lista(f.os_brand_ids)
  const attr = f.attribute_filters
  if (!kat || !mar) return false
  if (attr !== undefined && (!Array.isArray(attr) || attr.length > 0))
    return false
  return kat.length + mar.length > 0
}

export const VALOGATAS_LAPMERET = 12

/** Egy lap azonosítói és a lapok száma. A 0 termékes válogatásnak 1 lapja van. */
export function valogatasLapja(
  azonositok: readonly string[],
  lap: number,
  meret: number = VALOGATAS_LAPMERET,
): { azonositok: string[]; lapok: number; letezik: boolean } {
  const lapok = Math.max(1, Math.ceil(azonositok.length / meret))
  const letezik = Number.isInteger(lap) && lap >= 1 && lap <= lapok
  return {
    azonositok: letezik ? azonositok.slice((lap - 1) * meret, lap * meret) : [],
    lapok,
    letezik,
  }
}

/** A válogatás leírása: a SEO-leírás, különben a bevezető, különben egy mondat. */
export function valogatasLeirasForrasa(v: {
  title: string
  meta_description: string | null
  intro: string | null
}): string {
  return (
    v.meta_description?.trim() ||
    v.intro?.trim() ||
    `${v.title}: válogatás az Acropora webáruházban.`
  )
}
