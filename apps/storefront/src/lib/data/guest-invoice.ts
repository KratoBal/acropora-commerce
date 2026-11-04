"use server"

import { sdk } from "@lib/config"
import { hibaAllapota } from "@lib/util/kedvezmeny-uzenet"
import type {
  GuestInvoiceDocument,
  GuestInvoiceResult,
} from "@lib/util/guest-invoice"

/**
 * The guest's invoice links (V1.1): the order's own number and the e-mail address the customer opened the page with go to the
 * backend, which identifies the order the same way the lookup does and asks the OS for the links. Nothing is cached (a link is
 * single use, and the answer is one customer's); the address is NEVER logged, a failure writes only the status code.
 */
export async function requestGuestInvoice(input: {
  orderNumber: string
  email: string
}): Promise<GuestInvoiceResult> {
  try {
    const answer = await sdk.client.fetch<{
      documents?: GuestInvoiceDocument[]
    }>("/store/guest-orders/invoice", {
      method: "POST",
      body: {
        order_number: input.orderNumber.trim(),
        email: input.email.trim(),
      },
      cache: "no-store",
    })
    if (!Array.isArray(answer?.documents)) return { ok: false }
    return answer.documents.length > 0
      ? { ok: true, documents: answer.documents }
      : { ok: true, documents: [] }
  } catch (hiba) {
    console.error(
      "A vendég számla-kérés nem sikerült:",
      hibaAllapota(hiba) ?? "(nincs állapotkód)",
    )
    return { ok: false }
  }
}
