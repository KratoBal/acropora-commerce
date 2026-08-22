/**
 * Materializing the cash-on-delivery fee on the cart.
 *
 * Medusa 2.19 has NO positive surcharge primitive. Measured, not assumed:
 *
 * - `utils/dist/totals/cart/index.js` builds the total as
 *   `total = tempTotal - discountSubtotal - creditLinesTotal`, so both
 *   adjustments and credit lines SUBTRACT.
 * - `utils/dist/totals/credit-lines/index.js` forces the credit-line total to
 *   zero when it is `<= epsilon`, so a negative credit line is silently dropped.
 *   Credit lines cannot carry a fee at all.
 * - A custom line item would enter `item_total`, and `item_total` is the only
 *   attribute the Admin API allows in a shipping price rule
 *   (`admin/shipping-options/validators.js`: `z.literal("item_total")`). The
 *   free-shipping threshold runs on it, and cash on delivery is offered exactly
 *   on the options that have free shipping, so a fee-as-line-item could tip a
 *   cart over 50,000 HUF and give away the shipping. That collision is
 *   reachable, not theoretical.
 * - `PaymentCollection.amount` is overwritten from `cart.raw_total` on every
 *   refresh (`refresh-payment-collection.js`), so the payment side cannot hold
 *   the fee independently either.
 *
 * What is left is a NEGATIVE shipping-method adjustment, which raises the total
 * without touching `item_total`. Two properties make it safe:
 *
 * - the promotion engine skips adjustments with no `code`
 *   (`promotion/dist/services/promotion-module.js`: `if (!isString(adjustment.code)) continue`),
 *   so recomputing promotions does not remove it. An adjustment that DOES carry
 *   a code is collected and then removed unconditionally, which is why the fee
 *   must stay codeless;
 * - cash on delivery is only ever allowed when a real shipping method exists,
 *   so there is always something to attach it to.
 *
 * THE COST, and it must not be hidden: the adjustment is counted as a discount,
 * so `cart.discount_total` becomes NEGATIVE by the fee amount. A storefront must
 * read the fee from this adjustment, not from `discount_total`.
 */

/**
 * Marks the adjustments this module owns, and it lives in `provider_id`.
 *
 * Not in `metadata`, and not in `code`, and neither choice is arbitrary:
 *
 * - `code` MUST stay empty. The promotion engine builds its adjustment map from
 *   every adjustment that HAS a string code
 *   (`promotion/dist/services/promotion-module.js`) and then emits a REMOVE
 *   action for each one it finds, so a coded adjustment would be deleted on the
 *   next cart refresh.
 * - `metadata` is on the model but NOT on `CreateShippingMethodAdjustmentDTO`
 *   (`types/dist/cart/mutations.d.ts`, lines 700-726), so passing it would rely
 *   on an untyped field surviving the write.
 * - `provider_id` is on both the model and the DTO, is never shown to a
 *   customer, and is not translated.
 */
export const CASH_ON_DELIVERY_FEE_MARKER = "acropora_cod_fee"

/** Shown to the customer. Never used to identify the adjustment. */
export const CASH_ON_DELIVERY_FEE_DESCRIPTION = "Utánvét kezelési díj"

export type ShippingMethodAdjustmentLike = {
  id: string
  shipping_method_id?: string | null
  amount?: number | null
  code?: string | null
  provider_id?: string | null
}

export type ShippingMethodLike = {
  id: string
  // Nullable entries, because that is what Medusa's generated Query types hand
  // back. Filtering them here keeps every caller from having to.
  adjustments?: (ShippingMethodAdjustmentLike | null)[] | null
}

export type CashOnDeliveryFeePlan = {
  toRemoveIds: string[]
  toCreate: {
    shipping_method_id: string
    amount: number
    provider_id: string
    description: string
  }[]
}

export const isCashOnDeliveryFeeAdjustment = (
  adjustment: ShippingMethodAdjustmentLike
): boolean => adjustment.provider_id === CASH_ON_DELIVERY_FEE_MARKER

/**
 * Works out the smallest set of changes that makes the cart carry exactly the
 * intended fee.
 *
 * Pure and idempotent: called twice with the same input, the second call returns
 * an empty plan. That is what "applied once per order" means in practice, and it
 * is also what keeps the hook from rewriting the cart on every refresh.
 *
 * The fee goes on ONE shipping method, chosen deterministically by id, so a cart
 * with several methods cannot end up paying twice.
 */
export const planCashOnDeliveryFee = ({
  shippingMethods,
  feeAmount,
}: {
  shippingMethods: (ShippingMethodLike | null | undefined)[]
  feeAmount: number
}): CashOnDeliveryFeePlan => {
  const methods = (shippingMethods ?? []).filter(
    (method): method is ShippingMethodLike => !!method?.id
  )

  const existing = methods.flatMap((method) =>
    (method.adjustments ?? [])
      .filter(
        (adjustment): adjustment is ShippingMethodAdjustmentLike =>
          !!adjustment && isCashOnDeliveryFeeAdjustment(adjustment)
      )
      .map((adjustment) => ({ ...adjustment, shipping_method_id: method.id }))
  )

  if (feeAmount <= 0 || !methods.length) {
    return { toRemoveIds: existing.map((a) => a.id), toCreate: [] }
  }

  // The adjustment is negative because Medusa subtracts adjustments from the
  // total. A negative discount is an addition.
  const desiredAmount = -feeAmount
  const target = [...methods].sort((a, b) =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  )[0]

  const correct = existing.filter(
    (a) =>
      a.shipping_method_id === target.id &&
      Number(a.amount) === desiredAmount &&
      // A code would make the promotion engine take ownership of it.
      (a.code === null || a.code === undefined)
  )

  const keep = correct.slice(0, 1)
  const keepIds = new Set(keep.map((a) => a.id))
  const toRemoveIds = existing
    .filter((a) => !keepIds.has(a.id))
    .map((a) => a.id)

  if (keep.length) {
    return { toRemoveIds, toCreate: [] }
  }

  return {
    toRemoveIds,
    toCreate: [
      {
        shipping_method_id: target.id,
        amount: desiredAmount,
        provider_id: CASH_ON_DELIVERY_FEE_MARKER,
        description: CASH_ON_DELIVERY_FEE_DESCRIPTION,
        // `code` is deliberately absent, see CASH_ON_DELIVERY_FEE_MARKER.
      },
    ],
  }
}
