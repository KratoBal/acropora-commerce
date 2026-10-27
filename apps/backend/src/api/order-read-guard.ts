import { createHmac } from "node:crypto"

import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/**
 * THE STOCK ORDER READ ANSWERS ONLY THE CUSTOMER (audit A6b, barracuda's
 * a6b-spec.md). Medusa's `GET /store/orders/:id` has no `authenticate`
 * (the list route has), and the publishable key is public, so anyone holding
 * an order id got the name, addresses, phone and e-mail straight from the
 * backend, past the storefront page's own guard (commerce#589). The same
 * route serves the account's order page, and it did not check that the signed
 * in customer owns the order.
 *
 * AN ORDER IS READABLE IN TWO CASES, and every other request gets the SAME 404
 * as an order that does not exist (so the answer does not tell which ids
 * exist):
 *
 * 1. the signed-in customer is the order's customer;
 * 2. the request carries the storefront's view signature for this order in
 *    the `x-acropora-order-view` header: the value of the signed cookie the
 *    storefront gave the browser that placed the order
 *    (`lib/util/rendeles-megtekintes.ts`). The storefront server forwards it;
 *    the cookie is httpOnly, so a browser script cannot read it, and whoever
 *    sends the header holds the cookie, which means they placed the order.
 *
 * THE SIGNATURE CHECK BELOW IS THE STOREFRONT'S, WORD FOR WORD in what it
 * computes: the two apps cannot import each other (the backend image holds
 * only the backend), so `order-read-guard.unit.spec.ts` pins the pair with a
 * contract test, signing with the storefront's function and verifying here,
 * and the other way round for a tampered value. With no secret on the backend
 * the second case is CLOSED (only the owner reads), never open.
 *
 * The secret is the one the storefront signs with: `ORDER_VIEW_SECRET`, else
 * `STOREFRONT_REVALIDATE_SECRET` (the backend already holds the latter to call
 * the storefront's revalidation).
 */
export const ORDER_VIEW_HEADER = "x-acropora-order-view"

const KEY_DOMAIN = "domain:acropora-order-view:v1"

const secret = (): string | null =>
  process.env.ORDER_VIEW_SECRET?.trim() ||
  process.env.STOREFRONT_REVALIDATE_SECRET?.trim() ||
  null

const sign = (key: string, text: string) =>
  createHmac("sha256", createHmac("sha256", key).update(KEY_DOMAIN).digest("hex"))
    .update(text)
    .digest("hex")

const sameText = (a: string, b: string) => {
  if (a.length !== b.length) return false
  let difference = 0
  for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return difference === 0
}

/** True if `value` is a valid, unexpired view signature naming `orderId`. */
export const orderViewAllowed = (
  value: string | undefined | null,
  orderId: string,
  now: Date = new Date(),
  key: string | null = secret()
): boolean => {
  if (!value || !key || !orderId) return false
  const parts = value.split(".")
  if (parts.length !== 3) return false
  const [expiryText, ids, given] = parts as [string, string, string]
  if (!sameText(sign(key, `${expiryText}.${ids}`), given)) return false
  const expiry = Number(expiryText)
  if (!Number.isFinite(expiry) || expiry < Math.floor(now.getTime() / 1000)) return false
  return ids.split(",").includes(orderId)
}

/** The same answer for an order that is not there and one that is not the caller's. */
export const ORDER_NOT_FOUND = { type: "not_found", message: "Order not found" } as const

const headerValue = (req: MedusaRequest): string | undefined => {
  const raw = req.headers[ORDER_VIEW_HEADER]
  return Array.isArray(raw) ? raw[0] : raw
}

/**
 * After `authenticate("customer", ..., { allowUnauthenticated: true })`: the
 * guest has no `auth_context`, the signed-in customer has it.
 */
export const guardOrderRead = async (
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) => {
  const orderId = req.params.id
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "order",
    filters: { id: orderId },
    fields: ["id", "customer_id"],
  })
  const order = data?.[0] as { id: string; customer_id?: string | null } | undefined

  const context = (req as { auth_context?: { actor_id?: string; actor_type?: string } }).auth_context
  const owner =
    !!order &&
    context?.actor_type === "customer" &&
    !!context.actor_id &&
    order.customer_id === context.actor_id

  if (!order || !(owner || orderViewAllowed(headerValue(req), orderId))) {
    res.status(404).json(ORDER_NOT_FOUND)
    return
  }
  next()
}
