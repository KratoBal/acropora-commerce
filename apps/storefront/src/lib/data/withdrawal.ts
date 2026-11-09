"use server"

import {
  postWithdrawal,
  type WithdrawalResult,
} from "@lib/data/withdrawal-post"

export type { WithdrawalResult }

/** The guest's declaration: the order's number and the address the customer opened it with. */
export async function submitWithdrawal(input: {
  orderNumber: string
  email: string
  customerName: string
  itemIds: string[]
}): Promise<WithdrawalResult> {
  return postWithdrawal("/store/guest-orders/withdrawal", {
    order_number: input.orderNumber.trim(),
    email: input.email.trim(),
    customer_name: input.customerName,
    item_ids: input.itemIds,
  })
}
