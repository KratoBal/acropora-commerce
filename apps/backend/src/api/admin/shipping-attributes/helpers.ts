import { MedusaContainer } from "@medusajs/framework"

import { SHIPPING_ATTRIBUTES_MODULE } from "../../../modules/shipping-attributes"
import type { LivestockKind } from "../../../modules/shipping-attributes/livestock-kind"
import ShippingAttributesModuleService from "../../../modules/shipping-attributes/service"
import { withPickupOnlyDerived } from "./pickup-only-derived"

export type ShippingAttributeFlags = {
  pickup_only: boolean
  pickup_only_derived: boolean
  foxpost_forbidden: boolean
  is_heavy: boolean
  is_frozen: boolean
  locker_unsuitable: boolean
  livestock_kind: LivestockKind | null
}

/**
 * A product with no record is not "unknown", it is "nothing set". Missing data
 * must never read as a restriction, so every default is false.
 */
export const defaultFlags = (product_id: string) => ({
  id: null,
  product_id,
  pickup_only: false,
  pickup_only_derived: false,
  foxpost_forbidden: false,
  is_heavy: false,
  is_frozen: false,
  locker_unsuitable: false,
  livestock_kind: null,
})

export const resolveService = (
  scope: MedusaContainer
): ShippingAttributesModuleService =>
  scope.resolve(SHIPPING_ATTRIBUTES_MODULE)

/**
 * Writes to one product's row run one after the other (in this process). The mark rule reads the row and then writes it, and
 * two writes for the same product (an OS round and a widget save) must not both decide from the same old row: that would let
 * a hand-set value be marked as derived. One process only: a second backend instance is not covered.
 */
const inFlight = new Map<string, Promise<unknown>>()
const oneAtATime = <T>(key: string, work: () => Promise<T>): Promise<T> => {
  const run = (inFlight.get(key) ?? Promise.resolve()).then(work)
  const tail = run.catch(() => undefined)
  inFlight.set(key, tail)
  void tail.then(() => {
    if (inFlight.get(key) === tail) inFlight.delete(key)
  })
  return run
}

/**
 * Upsert by product id. The unique index on `product_id` is the real guard;
 * this lookup keeps the common path from relying on a constraint violation.
 * `adopt` is not stored: it lets a write that carries the mark claim a value that was already on (`pickup-only-derived.ts`).
 */
export const upsertByProductId = (
  scope: MedusaContainer,
  product_id: string,
  flags: Partial<ShippingAttributeFlags>,
  options: { adopt?: boolean } = {}
) =>
  oneAtATime(product_id, async () => {
    const service = resolveService(scope)

    const [existing] = await service.listShippingAttributes(
      { product_id },
      { take: 1 }
    )

    // who set pickup_only follows the write (`pickup-only-derived.ts`)
    const resolved = withPickupOnlyDerived(existing ?? null, flags, options.adopt)

    if (!existing) {
      const [created] = await service.createShippingAttributes([
        { product_id, ...resolved },
      ])
      return created
    }

    const [updated] = await service.updateShippingAttributes([
      { id: existing.id, ...resolved },
    ])
    return updated
  })
