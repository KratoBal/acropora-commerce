import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"

import { grantLoyaltyBonuses } from "../workflows/utils/loyalty/grant-bonuses"

/**
 * A REGISTRATION PAYS THE SIGN-UP BONUS (card dfb79916; the old shop: 500 points), and the newsletter bonus too when the address was
 * confirmed earlier. A guest checkout's customer record (`has_account` false) pays nothing, and nothing is credited while the
 * accrual's master switch is off (`grantLoyaltyBonuses`). The function never throws, so a failing ledger cannot fail the
 * registration; it logs what to credit by hand.
 */
export default async function customerCreatedLoyaltyBonus({ event, container }: SubscriberArgs<{ id: string }>) {
  const customerId = event.data?.id
  if (!customerId) return
  await grantLoyaltyBonuses(container, customerId)
}

export const config: SubscriberConfig = {
  event: "customer.created",
}
