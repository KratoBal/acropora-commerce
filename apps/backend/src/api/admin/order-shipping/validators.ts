import { z } from "@medusajs/framework/zod"

import { DEFAULT_PICKUP_POINT_SEARCH_LIMIT, MAX_PICKUP_POINT_SEARCH_LIMIT } from "../../../services/pickup-point-search"

/** The OS's point search for one order: the order decides the carrier and the heavy-goods rule. */
export const AdminGetOrderPickupPointsParams = z
  .object({
    q: z.string().trim().min(1).max(100),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(MAX_PICKUP_POINT_SEARCH_LIMIT)
      .default(DEFAULT_PICKUP_POINT_SEARCH_LIMIT),
  })
  .strict()

export type AdminGetOrderPickupPointsParamsType = z.infer<typeof AdminGetOrderPickupPointsParams>

/** The new point: only its id (and for GLS which picker it came from), never its details. */
export const AdminPostOrderPickupPoint = z
  .object({
    point_id: z.string().trim().min(1).max(100),
    source: z.enum(["finder", "fallback"]).optional(),
    /**
     * The OS user's name (nautilus 26576): the admin key is the same for every
     * OS user, so without it every change would seem to come from one person.
     * Stated by the caller, not verified here; the key's own actor is kept
     * beside it.
     */
    actor: z.string().trim().min(1).max(100).optional(),
  })
  .strict()

export type AdminPostOrderPickupPointType = z.infer<typeof AdminPostOrderPickupPoint>
