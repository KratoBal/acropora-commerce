"use server"

import { sdk } from "@lib/config"
import { hibaAllapota } from "@lib/util/kedvezmeny-uzenet"
import {
  lookupKindOfStatus,
  type GuestOrder,
  type GuestOrderLookupResult,
} from "@lib/util/guest-order"

/**
 * The guest order lookup (V1.1): the order number and the e-mail address go to the backend, nothing is
 * cached (the state changes by the minute, and the answer is one customer's), and the address is
 * NEVER logged: a failure writes only the status code.
 */
export async function lookupGuestOrder(input: {
  orderNumber: string
  email: string
}): Promise<GuestOrderLookupResult> {
  try {
    const answer = await sdk.client.fetch<{ orders?: GuestOrder[] }>(
      "/store/guest-orders/lookup",
      {
        method: "POST",
        body: {
          order_number: input.orderNumber.trim(),
          email: input.email.trim(),
        },
        cache: "no-store",
      },
    )
    return Array.isArray(answer?.orders) && answer.orders.length > 0
      ? { ok: true, orders: answer.orders }
      : { ok: false, kind: "unavailable" }
  } catch (hiba) {
    const status = hibaAllapota(hiba)
    if (status !== 404)
      console.error(
        "A vendég rendelés-keresés nem sikerült:",
        status ?? "(nincs állapotkód)",
      )
    return { ok: false, kind: lookupKindOfStatus(status) }
  }
}
