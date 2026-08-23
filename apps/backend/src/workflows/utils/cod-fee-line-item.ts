import { MedusaError } from "@medusajs/framework/utils"

import { CommerceSettingsService } from "../../modules/commerce-settings/accessor"
import { getCashOnDeliveryFee } from "./cod-fee"
import { ACROPORA_LINE_ITEM_KIND_METADATA_KEY } from "./goods-total"

/**
 * The cash-on-delivery fee as a domain object.
 *
 * The fee is NOT a shipping fee. The model is merchandise plus shipping plus
 * the cash-on-delivery handling fee, and the fee is a real, positive line item
 * that carries its own marker.
 *
 * This file is pure domain: no HTTP, no Medusa workflow, no payment logic and
 * no order creation. The later insertion points (checkout, draft order, our own
 * order creation) all build the fee from here, so the business rule exists once.
 */

/** The second half of the marker contract. The first half lives in goods-total. */
export const ACROPORA_FEE_TYPE_METADATA_KEY = "fee_type" as const

export const CASH_ON_DELIVERY_FEE_TYPE = "cash_on_delivery" as const

/** Shown to the customer. Never used to identify the line. */
export const CASH_ON_DELIVERY_FEE_TITLE = "Utánvét kezelési díj"

export type CashOnDeliveryFeeMetadata = {
  [ACROPORA_LINE_ITEM_KIND_METADATA_KEY]: "fee"
  [ACROPORA_FEE_TYPE_METADATA_KEY]: typeof CASH_ON_DELIVERY_FEE_TYPE
}

export type CashOnDeliveryFeeLineItemData = {
  title: string
  quantity: number
  unit_price: number
  is_custom_price: true
  /**
   * The fee is a consumer price like every other amount in this checkout, and
   * the goods total invariant demands that tax semantics be stated rather than
   * assumed. Stating it here keeps the fee on the same side as the shipping
   * price, which the provider also returns tax-inclusive.
   */
  is_tax_inclusive: true
  /**
   * A fee is not shipped. Without this, the line would be checked against a
   * shipping profile at cart completion, and a line with no variant has none,
   * which would make the order impossible to complete.
   */
  requires_shipping: false
  metadata: CashOnDeliveryFeeMetadata
}

/** Anything that can carry the marker. Deliberately narrow. */
export type MarkableLineItem = {
  id?: string | null
  metadata?: Record<string, unknown> | null
}

export const isCashOnDeliveryFeeLineItem = (
  item: MarkableLineItem | null | undefined
): boolean =>
  item?.metadata?.[ACROPORA_LINE_ITEM_KIND_METADATA_KEY] === "fee" &&
  item?.metadata?.[ACROPORA_FEE_TYPE_METADATA_KEY] === CASH_ON_DELIVERY_FEE_TYPE

export const findCashOnDeliveryFeeLineItems = <T extends MarkableLineItem>(
  items: (T | null | undefined)[] | null | undefined
): T[] =>
  (items ?? []).filter(
    (item): item is T => !!item && isCashOnDeliveryFeeLineItem(item)
  )

/**
 * Builds the fee line from an amount that has already been validated.
 *
 * A zero fee means the business waived it, and a waived fee is NOT a zero
 * forint line: a zero line is noise on an invoice and something for a later
 * reader to misread. The caller decides not to add a fee at all; asking this
 * builder for one is a programming error, so it says so.
 */
export const buildCashOnDeliveryFeeLineItem = (
  feeHuf: number
): CashOnDeliveryFeeLineItemData => {
  if (!Number.isInteger(feeHuf) || feeHuf <= 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `A cash-on-delivery fee line needs a positive whole amount, received ${feeHuf}. A waived fee means no line at all.`
    )
  }

  return {
    title: CASH_ON_DELIVERY_FEE_TITLE,
    quantity: 1,
    unit_price: feeHuf,
    is_custom_price: true,
    is_tax_inclusive: true,
    requires_shipping: false,
    metadata: {
      [ACROPORA_LINE_ITEM_KIND_METADATA_KEY]: "fee",
      [ACROPORA_FEE_TYPE_METADATA_KEY]: CASH_ON_DELIVERY_FEE_TYPE,
    },
  }
}

/**
 * Reads the configured fee and builds the line.
 *
 * The amount comes from the commerce settings on every call, which is what
 * keeps it editable at runtime: changing the setting changes the next fee
 * without a rebuild, a deployment or a migration.
 */
export const buildCashOnDeliveryFeeLineItemFromSettings = async (
  service: CommerceSettingsService
): Promise<CashOnDeliveryFeeLineItemData> =>
  buildCashOnDeliveryFeeLineItem(await getCashOnDeliveryFee(service))

/**
 * The fee may exist once per cart or order.
 *
 * Two guards rather than one, because they answer different questions at
 * different moments: may I add one now, and is the current state still sane.
 * With several insertion points the invariant is harder to hold, not easier,
 * so it is checked on both sides.
 */
export const assertCanAddCashOnDeliveryFee = (
  items: (MarkableLineItem | null | undefined)[] | null | undefined
): void => {
  const existing = findCashOnDeliveryFeeLineItems(items)

  if (existing.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `A cash-on-delivery fee is already present, so a second one must not be created. Found ${existing.length}.`
    )
  }
}

export const assertAtMostOneCashOnDeliveryFee = (
  items: (MarkableLineItem | null | undefined)[] | null | undefined
): void => {
  const existing = findCashOnDeliveryFeeLineItems(items)

  if (existing.length > 1) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `A cart or order may carry one cash-on-delivery fee, found ${existing.length}.`
    )
  }
}
