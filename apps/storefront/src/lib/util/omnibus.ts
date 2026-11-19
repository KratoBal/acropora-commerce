/**
 * THE OMNIBUS REFERENCE PRICE OF A VARIANT, AS THE OS WRITES IT (V0.2, slice 3).
 *
 * The OS puts one JSON text on the variant's metadata key `omnibus_lowest_price_30d` while a price
 * reduction runs: the lowest price of the 30 days BEFORE the reduction began (acrobot's decision on
 * the acropora-os #2120, Directive 98/6/EC art. 6a). The key is cleared when the reduction ends.
 *
 * THIS FILE ONLY READS IT, STRICTLY, AND DECIDES WHETHER THE LINE MAY STAND:
 *  - any malformed text, missing field or non-positive amount: no line (a guess is worse than nothing);
 *  - the line stands only when the price the shopper pays is LOWER than the reference and the
 *    currencies agree: a "reference" that is not above the shown price is not a reduction, and the
 *    storefront must not announce one the shop does not show;
 *  - the key being present is the OS's statement that a reduction runs; the storefront does not
 *    compute anything from the price history;
 *  - the two "not complete" cases are told apart by the days in the text (acrobot's decision on
 *    barracuda's #647 review): a YOUNG history (its first price day falls INSIDE the 30 days before
 *    `reduction_start`) is read and shown with that day; a history that reaches back to the window
 *    but says "not complete" has a GAP in it (the OS now writes no value then) and a "complete"
 *    that disagrees with its own days is inconsistent: both read as no line. A misleading
 *    reference price is worse than none.
 */
export const OMNIBUS_METADATA_KEY = "omnibus_lowest_price_30d"

export interface OmnibusReference {
  /** whole major units, as the shop shows them */
  amount: number
  currencyCode: string
  /** the history reaches back the full 30 days */
  complete: boolean
  /**
   * YYYY-MM-DD: the first day we have a KNOWN PRICE for in the shop's history (shown when
   * `complete` is false). It is NOT the day the product became available: the history is younger
   * than the products it describes.
   */
  historyBegins: string
}

const DAY = /^\d{4}-\d{2}-\d{2}$/
const WINDOW_DAYS = 30

/** The day `days` calendar days before a YYYY-MM-DD day, as YYYY-MM-DD (pure calendar arithmetic). */
const daysBefore = (day: string, days: number): string => {
  const at = new Date(`${day}T00:00:00Z`)
  at.setUTCDate(at.getUTCDate() - days)
  return at.toISOString().slice(0, 10)
}

export function omnibusReferenceOf(
  metadata: Record<string, unknown> | null | undefined,
  shown: { amount: number; currencyCode: string } | null,
): OmnibusReference | null {
  const raw = metadata?.[OMNIBUS_METADATA_KEY]
  if (typeof raw !== "string" || raw === "" || !shown) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (typeof parsed !== "object" || parsed === null) return null
  const p = parsed as Record<string, unknown>
  if (typeof p.amount !== "string" || !/^\d+(\.\d+)?$/.test(p.amount))
    return null
  const amount = Number(p.amount)
  if (!Number.isFinite(amount) || amount <= 0) return null
  if (typeof p.currency !== "string" || p.currency === "") return null
  if (typeof p.complete !== "boolean") return null
  if (typeof p.history_begins !== "string" || !DAY.test(p.history_begins))
    return null
  if (typeof p.reduction_start !== "string" || !DAY.test(p.reduction_start))
    return null
  // the days are Budapest calendar days, and YYYY-MM-DD strings compare in date order
  const windowStart = daysBefore(p.reduction_start, WINDOW_DAYS)
  if (p.complete) {
    if (p.history_begins > windowStart) return null
  } else if (
    p.history_begins <= windowStart ||
    p.history_begins >= p.reduction_start
  ) {
    return null
  }
  if (p.currency.toLowerCase() !== shown.currencyCode.toLowerCase()) return null
  if (!(shown.amount < amount)) return null
  return {
    amount,
    currencyCode: shown.currencyCode,
    complete: p.complete,
    historyBegins: p.history_begins,
  }
}
