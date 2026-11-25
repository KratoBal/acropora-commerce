import type { MedusaContainer } from "@medusajs/framework/types"
import { MedusaError, Modules } from "@medusajs/framework/utils"

import { isLockTimeout } from "../cart-hold"

/**
 * THE ORDER'S PAYMENT LOCK (card efcd5add, the #905 follow-up; barracuda on #905). Every path that changes an order's payment takes
 * it, so they run one at a time on an order and each reads the order inside it:
 *   - the switch to bank transfer (`switchToBankTransfer`);
 *   - the capture at Kiszállítás and at the close (`captureOnTransitionUnderLock`);
 *   - "Csúszik a szállítás", the card hold's release (`releaseHoldUnderLock`).
 * Without it a switch and a Kiszállítás side by side could both read the order before the other wrote: the switch cancels the hold
 * the capture is taking, or opens a transfer collection on an order whose money was just taken.
 *
 * Redis-backed on stage (medusa-config: locking-redis), as the split's lock. A second run waits up to a minute; the lock also
 * expires after a minute, so a crashed run cannot hold the order for good. A run that cannot get it answers a 409 in Hungarian.
 */
export const ORDER_PAYMENT_LOCK_KEY = (orderId: string) => `order-payment:${orderId}`

export type OrderPaymentLock = <T>(orderId: string, job: () => Promise<T>) => Promise<T>

export const orderPaymentLock =
  (container: MedusaContainer): OrderPaymentLock =>
  async (orderId, job) => {
    try {
      return await container.resolve(Modules.LOCKING).execute(ORDER_PAYMENT_LOCK_KEY(orderId), job, { timeout: 60 })
    } catch (error) {
      if (isLockTimeout(error))
        throw new MedusaError(
          MedusaError.Types.CONFLICT,
          "Ezen a rendelésen épp fut egy fizetési művelet (átállítás, Kiszállítás vagy a zárolás feloldása): várd meg, és töltsd újra a rendelést."
        )
      throw error
    }
  }
