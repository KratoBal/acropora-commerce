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
 *    compute anything from the price history.
 */
export const OMNIBUS_METADATA_KEY = "omnibus_lowest_price_30d"

export interface OmnibusReference {
  /** whole major units, as the shop shows them */
  amount: number
  currencyCode: string
  /** the history reaches back the full 30 days */
  complete: boolean
  /** YYYY-MM-DD: the first day we have a price for (shown when `complete` is false) */
  historyBegins: string
}

const DAY = /^\d{4}-\d{2}-\d{2}$/

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
  if (p.currency.toLowerCase() !== shown.currencyCode.toLowerCase()) return null
  if (!(shown.amount < amount)) return null
  return {
    amount,
    currencyCode: shown.currencyCode,
    complete: p.complete,
    historyBegins: p.history_begins,
  }
}
