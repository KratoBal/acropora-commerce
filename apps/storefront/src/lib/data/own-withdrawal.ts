"use server"

import { sdk } from "@lib/config"
import { getAuthHeaders } from "@lib/data/cookies"
import type { GuestWithdrawal } from "@lib/util/guest-order"
import type { OwnWithdrawalState } from "@lib/util/withdrawal"
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

/**
 * What the order page needs to draw the withdrawal block (the shop's GET on the customer's own order): the live animal
 * flag and the declarations made so far. `null` for everything that is not a clean answer (no session, another
 * customer's order, an older shop without the flag, a failure): the page then draws NOTHING, because a button or a
 * legal line on a guess is worse than none. Nothing is cached: the list changes with every declaration.
 */
export async function retrieveOwnWithdrawalState(
  orderId: string,
): Promise<OwnWithdrawalState | null> {
  const auth = await getAuthHeaders()
  if (!("authorization" in auth)) return null
  try {
    const answer = await sdk.client.fetch<{
      live_animal?: unknown
      withdrawals?: GuestWithdrawal[]
    }>(`/store/customers/me/orders/${encodeURIComponent(orderId)}/withdrawal`, {
      method: "GET",
      headers: auth,
      cache: "no-store",
    })
    if (typeof answer?.live_animal !== "boolean") return null
    return {
      liveAnimal: answer.live_animal,
      withdrawals: Array.isArray(answer.withdrawals) ? answer.withdrawals : [],
    }
  } catch {
    return null
  }
}
