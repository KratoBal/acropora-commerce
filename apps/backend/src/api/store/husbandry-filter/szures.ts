/**
 * THE HUSBANDRY FILTER OF A LIVE-ANIMAL CATEGORY (V2.2 S5, card d2fc06e7; the spec's 4th point: "Szűrők a kategórián:
 * tartási nehézség, korallos akváriumban tartható, minimális medence (literre sávokban)").
 *
 * The facts come from the product's `metadata.husbandry` (a JSON string the OS projects: only live animals, only verified
 * blocks, behind MEDUSA_PROJECT_HUSBANDRY; murena's contract, 46072). The Store API's product list cannot filter on a
 * metadata key, so the shop reads the category's products here, next to the database, and only the matching ids travel;
 * the storefront hands them to `/store/products` as its `id` filter (the landing pages' pattern, t10).
 *
 * THE READING IS TOLERANT, as the storefront's (`apps/storefront/src/lib/util/tartasi-adat.ts`): no key, not a string,
 * bad JSON, another `v` or an unknown kind: no data; an unknown value: that one fact is missing. Nothing is invented.
 *
 * AN ANIMAL THE FILTER CANNOT PLACE IS NOT DROPPED SILENTLY (murena, 46095): it is left out of the filtered list, and the
 * answer counts it (`unchecked`), so the page can say so and link to the whole list.
 */

export const NEHEZSEGEK = ["KONNYU", "KOZEPES", "HALADO", "SZAKERTO"] as const
export type Nehezseg = (typeof NEHEZSEGEK)[number]

/**
 * THE TANK BANDS: A PROPOSAL, NOT A DECISION. The spec asks for "literre sávokban" and names no band; these three are
 * nautilus's reading (46091), accepted for the slice by murena (46095). An animal is in the band of its own minimum tank.
 */
export const SAVOK = ["0-100", "101-300", "301-"] as const
export type Sav = (typeof SAVOK)[number]

export function savja(minLiter: number): Sav {
  if (minLiter <= 100) return "0-100"
  if (minLiter <= 300) return "101-300"
  return "301-"
}

const FAJTAK = ["fish", "coral", "invertebrate"]

/** The three facts the filter needs; null when the product carries no readable block. */
export type SzuroTeny = {
  difficulty: Nehezseg | null
  /** Only "IGEN" counts as kept with corals; "FELTETELES" and the rest are answers, not "yes". */
  reefSafe: string | null
  minLiter: number | null
}

export function szuroTenyek(
  metadata: Record<string, unknown> | null | undefined
): SzuroTeny | null {
  const nyers = metadata?.husbandry
  if (typeof nyers !== "string") return null
  let o: Record<string, unknown>
  try {
    const parsed: unknown = JSON.parse(nyers)
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null
    o = parsed as Record<string, unknown>
  } catch {
    return null
  }
  if (o.v !== 1 || typeof o.kind !== "string" || !FAJTAK.includes(o.kind)) return null
  const reefSafe = ["IGEN", "NEM", "FELTETELES", "ALLITAS_NELKULI", "NEM_FAJ_SZINTU"].includes(
    o.reef_safe as string
  )
    ? (o.reef_safe as string)
    : null
  return {
    difficulty: (NEHEZSEGEK as readonly unknown[]).includes(o.difficulty)
      ? (o.difficulty as Nehezseg)
      : null,
    reefSafe,
    minLiter:
      typeof o.min_liter === "number" && Number.isFinite(o.min_liter) && o.min_liter > 0
        ? o.min_liter
        : null,
  }
}

export type Szuro = { difficulty: Nehezseg[]; reefSafe: boolean; tank: Sav[] }

const lista = (v: unknown): string[] =>
  (Array.isArray(v) ? v : v === undefined ? [] : [v]).filter(
    (x): x is string => typeof x === "string"
  )

/** The query's filter: unknown values are dropped (a stale link still answers), repeats merged. */
export function szuroKeresbol(query: Record<string, unknown>): Szuro {
  const csak = <T extends string>(ertekek: readonly T[], v: unknown) =>
    Array.from(new Set(lista(v).filter((x): x is T => (ertekek as readonly string[]).includes(x))))
  return {
    difficulty: csak(NEHEZSEGEK, query.difficulty),
    reefSafe: lista(query.reef_safe).includes("1"),
    tank: csak(SAVOK, query.tank),
  }
}

export const szuroAktiv = (s: Szuro) => s.difficulty.length > 0 || s.reefSafe || s.tank.length > 0

export type Termek = { id: string; tenyek: SzuroTeny | null }

export type Valasz = {
  /** The products matching every active group (within a group any value), newest first; empty without a filter. */
  product_ids: string[]
  /** The products the active filter cannot place: a fact it asks about is missing (or the whole block is). */
  unchecked: number
  /** Per value, how many of the category's products carry it: the page shows only what has a count. */
  facets: { difficulty: Record<Nehezseg, number>; reef_safe: number; tank: Record<Sav, number> }
}

/**
 * The filter over the category's products (newest first, as the list). Within a group any chosen value matches, the
 * groups together all must. An animal a decided group already rules out is not "unchecked": the filter placed it.
 */
export function szures(termekek: readonly Termek[], szuro: Szuro): Valasz {
  const facets: Valasz["facets"] = {
    difficulty: { KONNYU: 0, KOZEPES: 0, HALADO: 0, SZAKERTO: 0 },
    reef_safe: 0,
    tank: { "0-100": 0, "101-300": 0, "301-": 0 },
  }
  const product_ids: string[] = []
  let unchecked = 0
  for (const { id, tenyek } of termekek) {
    if (tenyek?.difficulty) facets.difficulty[tenyek.difficulty]++
    if (tenyek?.reefSafe === "IGEN") facets.reef_safe++
    if (tenyek?.minLiter != null) facets.tank[savja(tenyek.minLiter)]++
    if (!szuroAktiv(szuro)) continue

    // per active group: true (matches), false (ruled out), null (cannot tell)
    const csoportok: (boolean | null)[] = []
    if (szuro.difficulty.length)
      csoportok.push(tenyek?.difficulty ? szuro.difficulty.includes(tenyek.difficulty) : null)
    if (szuro.reefSafe) csoportok.push(tenyek?.reefSafe ? tenyek.reefSafe === "IGEN" : null)
    if (szuro.tank.length)
      csoportok.push(tenyek?.minLiter != null ? szuro.tank.includes(savja(tenyek.minLiter)) : null)
    if (csoportok.includes(false)) continue
    if (csoportok.includes(null)) unchecked++
    else product_ids.push(id)
  }
  return { product_ids, unchecked, facets }
}
