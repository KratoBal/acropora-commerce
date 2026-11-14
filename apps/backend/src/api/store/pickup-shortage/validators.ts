import { z } from "@medusajs/framework/zod"

/** The asking cart and the ONE stock location of the greyed-out pickup option (`service_zone.fulfillment_set.location.id`). */
export const StoreGetPickupShortageParams = z
  .object({
    cart_id: z.string().min(1),
    location_id: z.string().min(1),
  })
  .strict()
