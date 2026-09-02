import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createOrderWorkflow } from "@medusajs/medusa/core-flows"

import { transitionOrderBusinessStatusWorkflow } from "../transition-order-business-status"

import {
  findCashOnDeliveryFeeLineItems,
  type MarkableLineItem,
} from "../utils/cod-fee-line-item"

/**
 * Notices an order that carries more than one cash-on-delivery fee.
 *
 * WHY THIS EXISTS ON THE ORDER PATH AT ALL. The store checkout is guarded:
 * `completeCartWorkflow.hooks.validate` refuses to turn a cart into an order
 * while its fee lines disagree with its payment method. Draft orders and
 * admin-created orders do not go through that hook. They go through
 * `createOrderWorkflow`, and today nothing there looks at the fee.
 *
 * The gap is not theoretical. The admin draft-order item endpoint accepts a
 * line with no variant, a title and a custom price - which is exactly the shape
 * of this fee - so the same fee can be added twice by hand, and the second one
 * is charged to the customer with no warning anywhere.
 *
 * IT ONLY WARNS, AND THAT IS THE MOST IT CAN DO HERE. By the time this hook
 * runs the order exists. Throwing would start compensation against an order
 * that may already have an authorized payment behind it, which turns a
 * duplicated fee into a far worse failure. `completeCartWorkflow.hooks.validate`
 * is a gate because it runs while being wrong is still free; this is a smoke
 * alarm, and calling it a gate would be a lie about where the protection is.
 *
 * WHAT IT CANNOT SEE, WRITTEN DOWN SO NOBODY READS MORE INTO IT. The hook is
 * handed `{ order, additional_data }`, and the order is a query result whose
 * field list is fixed in the Medusa source: addresses, summary, items and their
 * tax lines and adjustments, credit lines, shipping methods, transactions,
 * currency, total, id. There is NO payment collection, no payment session and
 * no provider - and on a draft order the payment method often does not exist
 * yet at all.
 *
 * So the other half of the check, "a cash-on-delivery order that is missing its
 * fee", CANNOT be made here. Not for want of a query: the fact is not knowable
 * at this moment. The order path is therefore watched in one direction only,
 * and a missing fee still goes unnoticed until someone reads the invoice.
 *
 * Measured against @medusajs/core-flows 2.19.0 by reading the source; the
 * condition that expires it is the version moving, not the date.
 */

/**
 * The name says DUPLICATE, and that is the whole scope.
 *
 * It is deliberately not called something like "checkOrderCashOnDeliveryFee":
 * that name would promise the missing-fee case too, and a guard whose name
 * claims more than it does misleads exactly the way a green number does when
 * nothing was measured. The log line repeats the limit for the same reason -
 * whoever reads it is reading a warning, not this file.
 */
export const warnOnDuplicateCashOnDeliveryFee = (
  order: unknown,
  logger: { error: (message: string) => void }
): void => {
  const items = (order as { items?: MarkableLineItem[] } | null)?.items
  const fees = findCashOnDeliveryFeeLineItems(items)

  if (fees.length <= 1) {
    return
  }

  const orderId = (order as { id?: string } | null)?.id ?? "unknown"

  logger.error(
    `Order ${orderId} was created carrying ${fees.length} cash-on-delivery fee lines, and it may only carry one. ` +
      `The customer has been charged the fee more than once. Line ids: ${fees
        .map((fee) => fee.id ?? "unknown")
        .join(", ")}. ` +
      `This check sees duplicates ONLY: it has no payment data here, so an order that pays cash on delivery ` +
      `and is MISSING its fee is not detected by it, and never will be at this point.`
  )
}

createOrderWorkflow.hooks.orderCreated(async ({ order }, { container }) => {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  try {
    warnOnDuplicateCashOnDeliveryFee(order, logger)
  } catch (error) {
    /**
     * A failure to LOOK must never become a failure to create the order. The
     * order is already there; an exception escaping this hook would compensate
     * a completed creation because a check could not run.
     */
    logger.error(
      `The cash-on-delivery fee check could not run on a newly created order: ${
        error instanceof Error ? error.message : String(error)
      }. The order was not affected, but it was not checked either.`
    )
  }

  await transitionOrderBusinessStatusWorkflow(container).run({
    input: {
      order_id: (order as { id: string }).id,
      to: "pending_processing",
      actor: "system",
      source: "order_created",
    },
  })
})
