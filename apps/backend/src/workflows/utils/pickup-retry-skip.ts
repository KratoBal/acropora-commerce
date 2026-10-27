import type { ICartModuleService, MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import { PICKUP_RETRY_SKIP_METADATA_KEY } from "./pickup-retry"
import { PICKUP_CART_METADATA_KEY } from "./split-completion"

/**
 * "DO NOT RETRY THIS PICKUP ORDER" (barracuda's note on #592, audit P1/6).
 *
 * The retry job finishes a mixed cart's missing pickup order. When the shop
 * deliberately does not fulfil it (the customer cancelled the live animal), the
 * job would still make the order within seven days. A person marks the SHIPPED
 * cart; from then on the job does not retry it and does not write its ERROR
 * line. THE OS LIST STILL SHOWS IT, with the mark (acrobot, 2026-10-27 20:51
 * UTC): the customer's card may still be held for the missing order, and
 * releasing or refunding it is a person's decision, so the reminder stays for as
 * long as the cart is a candidate. The mark stops the retry and nothing else.
 *
 * WHAT IT WRITES: one metadata key on the shipped cart, `{ at, reason, by }`,
 * and nothing else (the other keys stay). Clearing writes `null`, so the
 * history of who stopped it stays readable until the next marking. It writes
 * through the cart module, not the cart workflow: the shipped cart is already
 * completed, which the workflow's checks are not made for.
 */
export type PickupSkipResult =
  | { status: "saved"; skipped: boolean; marker: PickupSkipMarker | null }
  | { status: "not_found" }
  | { status: "not_a_mixed_cart" }

export type PickupSkipMarker = { at: string; reason: string; by: string | null }

export const setPickupRetrySkip = async (
  container: MedusaContainer,
  parentCartId: string,
  input: { skip: boolean; reason?: string; by?: string | null },
  now: Date = new Date()
): Promise<PickupSkipResult> => {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "cart",
    filters: { id: parentCartId },
    fields: ["id", "metadata", "completed_at"],
  })
  const cart = data?.[0] as
    | { id: string; metadata?: Record<string, unknown> | null; completed_at?: unknown }
    | undefined
  if (!cart) return { status: "not_found" }
  // only a completed cart that names a pickup cart is a shipped half of a mixed cart
  if (!cart.completed_at || typeof cart.metadata?.[PICKUP_CART_METADATA_KEY] !== "string") {
    return { status: "not_a_mixed_cart" }
  }

  const marker: PickupSkipMarker | null = input.skip
    ? { at: now.toISOString(), reason: input.reason ?? "", by: input.by ?? null }
    : null
  await container
    .resolve<ICartModuleService>(Modules.CART)
    .updateCarts(cart.id, { metadata: { ...(cart.metadata ?? {}), [PICKUP_RETRY_SKIP_METADATA_KEY]: marker } })
  return { status: "saved", skipped: input.skip, marker }
}
