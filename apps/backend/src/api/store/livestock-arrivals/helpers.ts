import { speciesOfTitle } from "../../../modules/stock-alert/subject"

export type StoredArrival = {
  /** The commerce row's own id (never the OS's): the page sends it back to sign up for the species (`arrival_id`). */
  id: string
  kind: string
  label: string
  expected_on: string
  status: string
  medusa_product_id: string | null
}

export type StoreArrival = StoredArrival & {
  /** The species key of the stock alert (`speciesOfTitle` of the label), or null when the label names no species. */
  species_key: string | null
  /** The species can be bought now: the page then offers no sign-up (the alert would never fire; murena, V2.6). */
  species_buyable: boolean
}

/**
 * The storefront's list (V2.6 S4c, the shape murena asked for): ordered by the expected day, then by the name. The day is
 * not compared with today here (the S3a rule): the storefront says a late day. `buyable` is asked once per species.
 */
export async function storeArrivals(
  rows: readonly StoredArrival[],
  buyable: (speciesKey: string) => Promise<boolean>
): Promise<StoreArrival[]> {
  const keys = new Map<string, boolean>()
  const out: StoreArrival[] = []
  for (const row of rows) {
    const species_key = speciesOfTitle(row.label)?.key ?? null
    if (species_key && !keys.has(species_key)) keys.set(species_key, await buyable(species_key))
    out.push({
      id: row.id,
      kind: row.kind,
      label: row.label,
      expected_on: row.expected_on,
      status: row.status,
      medusa_product_id: row.medusa_product_id,
      species_key,
      species_buyable: species_key ? keys.get(species_key)! : false,
    })
  }
  return out.sort(
    (a, b) => a.expected_on.localeCompare(b.expected_on) || a.label.localeCompare(b.label, "hu")
  )
}
