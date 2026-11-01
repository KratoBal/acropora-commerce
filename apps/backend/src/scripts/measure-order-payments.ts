import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

import { orderReadout } from "../workflows/utils/order-payment/readout"
import { loadSide, ORDER_FIELDS } from "../workflows/utils/shared-stripe-capture-operations"

/**
 * READ-ONLY: prints, for each order id given, the live shape of its payment figures and what `loadSide` makes of them
 * (commerce cards 0cca8305 and 04b6010e; acrobot 39608). Writes nothing, and never prints a payment's `data` or the
 * order's metadata (the Stripe intent's client secret is in `data`).
 *
 *   medusa exec ./src/scripts/measure-order-payments.ts <order_id> [<order_id> ...]
 *
 * Run it on the TEST backend after each step of the measurement (a refund booked, a difference paid, a hold released):
 * the `refunds_field` and the `finite` flags say whether `payment_collections.payments.refunds.amount` is a usable number
 * on a live module, `side` is `loadSide`'s own reading (`other_captured` is what a paid difference counts for).
 */
export default async function measureOrderPayments({ container, args }: ExecArgs) {
  const ids = (args ?? []).filter((arg) => typeof arg === "string" && arg.startsWith("order_"))
  if (!ids.length) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Give one or more order ids: medusa exec ./src/scripts/measure-order-payments.ts order_01...")
  }
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  for (const id of ids) {
    const { data } = await query.graph({ entity: "order", filters: { id }, fields: ORDER_FIELDS })
    const readout = data?.[0] ? orderReadout(data[0]) : null
    const side = await loadSide(container, id)
    // `data` and `metadata` are dropped on purpose
    const safeSide = side && {
      order_id: side.order_id,
      total: side.total,
      currency_code: side.currency_code,
      other_captured: side.other_captured,
      payment_canceled: side.payment_canceled,
      payment: side.payment && {
        id: side.payment.id,
        amount: side.payment.amount,
        captured: side.payment.captured,
        provider_id: side.payment.provider_id,
        collection_status: side.payment.collection_status,
      },
    }
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ order: id, readout, side: safeSide }, null, 2))
  }
}
