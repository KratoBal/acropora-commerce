import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"

import { isLockTimeout } from "../cart-hold"
import { PARENT_ORDER_METADATA_KEY } from "../split-completion"

/**
 * THE ORDER'S PAYMENT LOCK (card efcd5add, the #905 follow-up; barracuda on #905). Every path that changes an order's payment takes
 * it, so they run one at a time on an order and each reads the order inside it:
 *   - the switch to bank transfer (`switchToBankTransfer`);
 *   - the capture at Kiszállítás and at the close (`captureOnTransitionUnderLock`);
 *   - "Csúszik a szállítás", the card hold's release (`releaseHoldUnderLock`).
 * Without it a switch and a Kiszállítás side by side could both read the order before the other wrote: the switch cancels the hold
 * the capture is taking, or opens a transfer collection on an order whose money was just taken.
 *
 * THE KEY IS THE PAYMENT'S OWNER, NOT THE CALLER (barracuda on #907): a mixed cart's two orders share ONE card payment, held on
 * the shipped (parent) order. "Csúszik a szállítás" may be called with the pickup half, and a pickup half's close goes through the
 * capture too; keyed by the named order, those would take another key than the parent's Kiszállítás capturing the same payment.
 * So the pickup half locks its parent (`paymentOwnerOf`): every path on a pair takes one key.
 *
 * Redis-backed on stage (medusa-config: locking-redis), as the split's lock. A second run waits up to a minute; the lock also
 * expires after a minute, so a crashed run cannot hold the order for good. A run that cannot get it answers a 409 in Hungarian.
 */
export const ORDER_PAYMENT_LOCK_KEY = (orderId: string) => `order-payment:${orderId}`

export type OrderPaymentLock = <T>(orderId: string, job: () => Promise<T>) => Promise<T>

/** The order whose payment this order's is: a mixed cart's pickup half's is its parent's; any other order's is its own. */
export const paymentOwnerOf = (orderId: string, metadata: Record<string, unknown> | null | undefined): string => {
  const parent = metadata?.[PARENT_ORDER_METADATA_KEY]
  return typeof parent === "string" && parent ? parent : orderId
}

export const orderPaymentLock =
  (container: MedusaContainer): OrderPaymentLock =>
  async (orderId, job) => {
    // the pair's link is written once, at the split, so reading it before the lock is safe
    const { data } = await container
      .resolve(ContainerRegistrationKeys.QUERY)
      .graph({ entity: "order", filters: { id: orderId }, fields: ["id", "metadata"] })
    const owner = paymentOwnerOf(orderId, (data?.[0] as { metadata?: Record<string, unknown> | null } | undefined)?.metadata)
    try {
      return await container.resolve(Modules.LOCKING).execute(ORDER_PAYMENT_LOCK_KEY(owner), job, { timeout: 60 })
    } catch (error) {
      if (isLockTimeout(error))
        throw new MedusaError(
          MedusaError.Types.CONFLICT,
          "Ezen a rendelésen épp fut egy fizetési művelet (átállítás, Kiszállítás vagy a zárolás feloldása): várd meg, és töltsd újra a rendelést."
        )
      throw error
    }
  }
