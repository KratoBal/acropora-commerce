/**
 * WHEN A CONFIRMED STOCK ALERT IS TOLD ("Szólj, ha jön hasonló", V2.4, card 0c1265d2), without Medusa, so the job and
 * its spec share the rule. The sign-up promises a mail when something COMES, not when something IS: the sold piece's
 * page lists the similar pieces buyable now (`Most kapható, hasonló darabok`), and a buyer who signed up under that
 * list has already seen them. So the row keeps the set of its subject's products it has seen buyable
 * (`known_available`), and only a buyable product outside that set is an arrival.
 *
 * THE FIRST SWEEP after the confirmation has no set yet, and builds it: a product buyable now that existed before the
 * sign-up (`created_at` before `consented_at`) is taken as seen. Two exceptions, both news by construction:
 *   - a product created after the sign-up: a piece that came while the buyer was confirming;
 *   - the sign-up's own product (`source_product_id`): its page offered the form only because it was NOT buyable.
 *   A `product` sign-up waits for exactly that product, so for it nothing is ever taken as seen.
 * The cost of the rule: an older product that came back between the sign-up and the first sweep is taken as seen.
 *
 * EVERY SWEEP keeps only the products still buyable: one that runs out and comes back is news again.
 */
export type ArrivalCandidate = {
  id: string
  title: string
  handle: string
  created_at: Date | string
}

export type ArrivalRow = {
  subject_kind: string
  source_product_id: string | null
  consented_at: Date | string
  known_available: unknown
}

export type ArrivalStep = {
  /** what the row has seen buyable after this sweep; written back every time it changes */
  known_available: string[]
  /** the product to tell the row about, or null: the newest arrival, so the mail names the freshest piece */
  arrived: ArrivalCandidate | null
}

const time = (value: Date | string) => new Date(value).getTime()

/** The stored set: an array of ids, or null before the first sweep (anything else is treated as null). */
export const knownAvailableOf = (value: unknown): string[] | null =>
  Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : null

/** One sweep for one row: `buyable` is every product of the row's subject that can be bought right now. */
export function arrivalStep(row: ArrivalRow, buyable: readonly ArrivalCandidate[]): ArrivalStep {
  const signedUp = time(row.consented_at)
  const known =
    knownAvailableOf(row.known_available) ??
    (row.subject_kind === "product"
      ? []
      : buyable.filter((p) => p.id !== row.source_product_id && time(p.created_at) < signedUp).map((p) => p.id))
  const seen = new Set(known)
  const arrivals = buyable.filter((p) => !seen.has(p.id))
  arrivals.sort((a, b) => time(b.created_at) - time(a.created_at) || a.id.localeCompare(b.id))
  const buyableIds = new Set(buyable.map((p) => p.id))
  return {
    known_available: [...seen].filter((id) => buyableIds.has(id)).sort(),
    arrived: arrivals[0] ?? null,
  }
}

/** Whether the stored set has to be written back: a first sweep, or a product that ran out. */
export const knownAvailableChanged = (before: unknown, after: readonly string[]): boolean => {
  const stored = knownAvailableOf(before)
  return !stored || stored.length !== after.length || [...stored].sort().some((id, i) => id !== after[i])
}
