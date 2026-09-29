import { z } from "@medusajs/framework/zod";

import {
  DEFAULT_PICKUP_POINT_SEARCH_LIMIT,
  MAX_PICKUP_POINT_SEARCH_LIMIT,
} from "../../../../services/foxpost-pickup-points";

export const StoreGetFoxpostPickupPointsParams = z
  .object({
    q: z.string().trim().min(1).max(100).optional(),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(MAX_PICKUP_POINT_SEARCH_LIMIT)
      .default(DEFAULT_PICKUP_POINT_SEARCH_LIMIT),
  })
  .strict();

export type StoreGetFoxpostPickupPointsParamsType = z.infer<
  typeof StoreGetFoxpostPickupPointsParams
>;
