import { z } from "@medusajs/framework/zod";

import {
  DEFAULT_PICKUP_POINT_SEARCH_LIMIT,
  MAX_PICKUP_POINT_SEARCH_LIMIT,
} from "../../../../services/pickup-point-search";

// Unlike Foxpost's route there is no "whole list" mode: the GLS directory is
// only ever searched.
export const StoreGetGlsPickupPointsParams = z
  .object({
    q: z.string().trim().min(1).max(100),
    option_id: z.string().trim().min(1).max(100),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(MAX_PICKUP_POINT_SEARCH_LIMIT)
      .default(DEFAULT_PICKUP_POINT_SEARCH_LIMIT),
    // the checkout that greys out an out-of-order locker asks for it (GLS prompt, point 6)
    include_unavailable: z.enum(["true", "false"]).default("false"),
    // a82ed229: the cart decides too; an item that does not fit a locker
    // leaves parcel shops only (the completion checks it again)
    cart_id: z.string().trim().min(1).max(100).optional(),
  })
  .strict();

export type StoreGetGlsPickupPointsParamsType = z.infer<
  typeof StoreGetGlsPickupPointsParams
>;
