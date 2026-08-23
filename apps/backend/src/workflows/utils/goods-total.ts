import { BigNumberInput } from "@medusajs/framework/types"
import { MathBN, MedusaError } from "@medusajs/framework/utils"

export const ACROPORA_LINE_ITEM_KIND_METADATA_KEY =
  "acropora_line_item_kind" as const
export const ACROPORA_LINE_ITEM_KINDS = ["goods", "fee"] as const
export type AcroporaLineItemKind = (typeof ACROPORA_LINE_ITEM_KINDS)[number]

export type GoodsTotalLineItem = {
  unit_price: BigNumberInput
  quantity: BigNumberInput
  /**
   * Whether `unit_price` already contains tax.
   *
   * Required, and required to be TRUE for merchandise. The goods total is
   * compared against a gross threshold, so a net price would be measured
   * against the wrong number. Absent or false is an error rather than a
   * fallback: a wrong price is more dangerous than an explicit failure.
   */
  is_tax_inclusive?: boolean | null
  metadata?: Record<string, unknown> | null
}

/**
 * Fees must opt out explicitly. Existing merchandise items need no metadata;
 * future fee creators must write `acropora_line_item_kind: "fee"`.
 */
export const isFeeLineItem = (item: GoodsTotalLineItem): boolean =>
  item.metadata?.[ACROPORA_LINE_ITEM_KIND_METADATA_KEY] === "fee"

/**
 * Asserts the one thing the goods total silently assumed until now.
 *
 * The total is `unit_price * quantity`, which equals the gross merchandise
 * value ONLY if the prices already contain tax. Nothing checked that, so a net
 * price would have been added to a gross sum and compared against a gross
 * threshold, without failing anywhere.
 *
 * Unknown and net are separated in the message on purpose: they need different
 * fixes. Unknown means the caller did not pass the field; net means the store
 * prices are configured the other way, which is a configuration decision, not a
 * code bug.
 */
const assertTaxInclusive = (item: GoodsTotalLineItem, index: number): void => {
  if (item.is_tax_inclusive === true) {
    return
  }

  if (item.is_tax_inclusive === false) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Goods line ${index} is priced without tax. The goods total is a gross amount, and net and gross must not be mixed.`
    )
  }

  throw new MedusaError(
    MedusaError.Types.INVALID_DATA,
    `Goods line ${index} has no known tax status. The goods total is a gross amount, so the tax semantics must be stated, not assumed.`
  )
}

/**
 * Merchandise value before fees, shipping, promotions and loyalty.
 * `unit_price * quantity` matches Medusa 2.19 line-item subtotal semantics while
 * keeping fee exclusion independent from display names and variant presence.
 *
 * Fee lines are dropped BEFORE the tax check: a fee is not merchandise, so its
 * tax status cannot affect this number either way.
 */
export const calculateGoodsTotal = (items: GoodsTotalLineItem[]): number => {
  const total = items.reduce((sum, item, index) => {
    if (isFeeLineItem(item)) {
      return sum
    }

    assertTaxInclusive(item, index)

    const lineTotal = MathBN.mult(item.unit_price, item.quantity)

    if (
      !lineTotal.isFinite() ||
      !lineTotal.isInteger() ||
      lineTotal.isNegative()
    ) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Goods line totals must be non-negative whole forints"
      )
    }

    return MathBN.add(sum, lineTotal)
  }, MathBN.convert(0))

  const value = total.toNumber()

  if (!Number.isSafeInteger(value)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Goods total exceeds the safe whole-forint range"
    )
  }

  return value
}
