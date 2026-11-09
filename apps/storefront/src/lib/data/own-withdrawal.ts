"use server"

import { getAuthHeaders } from "@lib/data/cookies"
import {
  postWithdrawal,
  type WithdrawalResult,
} from "@lib/data/withdrawal-post"

/**
 * The signed-in customer's declaration for THEIR order: the session decides whose it is (the shop answers another
 * customer's order or a missing one with the same 404), the customer id never goes in the request.
 */
export async function submitOwnWithdrawal(input: {
  orderId: string
  customerName: string
  itemIds: string[]
}): Promise<WithdrawalResult> {
  const auth = await getAuthHeaders()
  if (!("authorization" in auth)) return { ok: false, failure: "not_found" }
  return postWithdrawal(
    `/store/customers/me/orders/${encodeURIComponent(input.orderId)}/withdrawal`,
    { customer_name: input.customerName, item_ids: input.itemIds },
    auth,
  )
}
