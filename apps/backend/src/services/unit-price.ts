/**
 * THE UNIT PRICE FROM THE PRODUCT'S NAME (commerce-audit-p1, P1/3; acrobot
 * 36825: "from the pattern at the end of the name, exactly one quantity; the
 * whole computed list goes to a check; test shop and test feed only").
 *
 * THE STOREFRONT'S RULE, WORD FOR WORD in what it computes
 * (`storefront lib/util/egysegar.ts`, where the reasoning is written in full):
 * the two apps cannot import each other at runtime, so this is a copy, and
 * `unit-price.unit.spec.ts` is the contract test between them.
 *
 * The pack size is only in the name as text ("Aquaforest Pro Bio F 25g"); there
 * is no structured quantity field in Commerce. A real unit price is never
 * written from a guess, so the rule is narrow and anything unclear gets NO unit
 * price:
 *
 *   - exactly ONE `<number><g|gr|kg|ml|l>` quantity in the name; two or more
 *     ("5 l / 1 kg") is unclear;
 *   - a multiplier ("4x25g", "2 x 50 ml", "25g x 4") is unclear;
 *   - `mg` is not a pack unit (2000mg is a dose): no letter may precede the unit;
 *   - dimensions ("180x90cm") are not g/ml/l, so they do not count;
 *   - a flow rate ("16000 l/h"), a range ("300-900l") and a thousands separator
 *     ("19.000 l") are unclear (measured on the test catalogue, #595 review);
 *   - a zero or negative quantity is unclear.
 *
 * The base is the kilogram and the litre; the price is rounded to whole forints.
 */
export type UnitPrice = {
  /** The base: kilogram or litre. */
  base: "kg" | "l"
  /** Forints per base unit, rounded to a whole number. */
  price: number
  /** The pack as written in the name, with a space: "25 g". */
  pack: string
  /**
   * The Merchant feed's `unit_pricing_measure`: "25g", "3785ml" (number + unit,
   * no space; Google allows at most two decimals). `null` when the name's number
   * is finer than that: then the feed gets no value.
   */
  feedMeasure: string | null
}

/*
  No `u` flag and no lookbehind (the storefront's compile target is older):
  a letter is `A-Za-z` plus the Latin-1/Latin Extended-A range, and the
  character before the quantity is consumed by the match itself (`(^|...)`).
*/
const QUANTITY =
  /(^|[^A-Za-zÀ-ſ\d.,])(\d+(?:[.,]\d+)?)\s*(kg|gr|g|ml|l)(?![A-Za-zÀ-ſ\d])/gi

/** A multiplier before or after the quantity: "4x25g", "2 x 50 ml", "25g x 4", "25g*4". */
const MULTIPLIER_BEFORE = /\d\s*[x×*]\s*\d+(?:[.,]\d+)?\s*(kg|gr|g|ml|l)(?![A-Za-zÀ-ſ\d])/i
const MULTIPLIER_AFTER = /(^|[^A-Za-zÀ-ſ\d.,])\d+(?:[.,]\d+)?\s*(kg|gr|g|ml|l)\s*[x×*]\s*\d/i

/** A flow rate ("16000 l/h", "600l/h", "(9500l/h)"): not the pack's content. */
const RATE = /\d\s*(kg|gr|g|ml|l)\s*\/\s*[A-Za-zÀ-ſ]/i
/** A range ("300-900l", "100 - 400 l"): "900l" is an end point, not a pack. */
const RANGE = /\d\s*[-–—]\s*\d+(?:[.,]\d+)?\s*(kg|gr|g|ml|l)(?![A-Za-zÀ-ſ\d])/i
/**
 * A thousands separator ("19.000 l", "1.000 g", "19 000 ml"): Hungarian writes
 * the decimal with a comma, so "19.000" is 19000, not 19. Unclear: no unit price.
 */
const THOUSANDS = /\d{1,3}[.\s]\d{3}\s*(kg|gr|g|ml|l)(?![A-Za-zÀ-ſ\d])/i

const toNumber = (text: string) => Number(text.replace(",", "."))

export function unitPriceFromName(
  name: string | null | undefined,
  /** The product's price in forints (Medusa v2 amounts are in major units, not fillér). */
  price: number | null | undefined
): UnitPrice | null {
  if (!name || typeof price !== "number" || !Number.isFinite(price) || price <= 0) return null
  if (MULTIPLIER_BEFORE.test(name) || MULTIPLIER_AFTER.test(name)) return null
  // flow rate, range, thousands separator: the cases #595's review measured
  if (RATE.test(name) || RANGE.test(name) || THOUSANDS.test(name)) return null

  const matches = Array.from(name.matchAll(QUANTITY))
  if (matches.length !== 1) return null

  // match: [whole, the character before, the number, the unit]
  const [, , valueText, unitText] = matches[0] as unknown as [string, string, string, string]
  const value = toNumber(valueText)
  if (!Number.isFinite(value) || value <= 0) return null

  const unit = unitText.toLowerCase()
  const mass = unit === "kg" || unit === "g" || unit === "gr"
  const inBase = mass
    ? unit === "kg"
      ? value
      : value / 1000
    : unit === "l"
      ? value
      : value / 1000
  const rounded = Math.round(price / inBase)
  if (!Number.isFinite(rounded) || rounded <= 0) return null

  const feedUnit = unit === "gr" ? "g" : unit
  const decimals = (valueText.split(/[.,]/)[1] ?? "").length
  return {
    base: mass ? "kg" : "l",
    price: rounded,
    pack: `${valueText} ${feedUnit}`,
    feedMeasure: decimals <= 2 ? `${value}${feedUnit}` : null,
  }
}
