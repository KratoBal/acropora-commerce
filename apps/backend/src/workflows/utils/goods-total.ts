import { BigNumberInput } from "@medusajs/framework/types"
import { MathBN, MedusaError } from "@medusajs/framework/utils"

export const ACROPORA_LINE_ITEM_KIND_METADATA_KEY =
  "acropora_line_item_kind" as const
export const ACROPORA_LINE_ITEM_KINDS = ["goods", "fee"] as const
export type AcroporaLineItemKind = (typeof ACROPORA_LINE_ITEM_KINDS)[number]

export type GoodsTotalLineItem = {
  unit_price: BigNumberInput
  quantity: BigNumberInput
  metadata?: Record<string, unknown> | null
}

/**
 * Fees must opt out explicitly. Existing merchandise items need no metadata;
 * future fee creators must write `acropora_line_item_kind: "fee"`.
 */
export const isFeeLineItem = (item: GoodsTotalLineItem): boolean =>
  item.metadata?.[ACROPORA_LINE_ITEM_KIND_METADATA_KEY] === "fee"

/**
 * Merchandise value before fees, shipping, promotions and loyalty.
 * `unit_price * quantity` matches Medusa 2.19 line-item subtotal semantics while
 * keeping fee exclusion independent from display names and variant presence.
 */
export const calculateGoodsTotal = (items: GoodsTotalLineItem[]): number => {
  const total = items.reduce((sum, item) => {
    if (isFeeLineItem(item)) {
      return sum
    }

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
