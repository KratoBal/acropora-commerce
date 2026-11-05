import { z } from "@medusajs/framework/zod"

import { LIVESTOCK_KINDS } from "../../../modules/shipping-attributes/livestock-kind"

export const AdminShippingAttributeFlags = z
  .object({
    pickup_only: z.boolean().optional(),
    foxpost_forbidden: z.boolean().optional(),
    is_heavy: z.boolean().optional(),
    is_frozen: z.boolean().optional(),
    locker_unsuitable: z.boolean().optional(),
    // written by the OS from the root category; null clears it (V2.6)
    livestock_kind: z.enum(LIVESTOCK_KINDS).nullable().optional(),
  })
  .strict()

export const AdminUpsertShippingAttribute = AdminShippingAttributeFlags.extend({
  product_id: z.string().min(1),
}).strict()

export const AdminGetShippingAttributesParams = z
  .object({
    product_id: z.union([z.string(), z.array(z.string())]).optional(),
  })
  .strict()

export type AdminUpsertShippingAttributeType = z.infer<
  typeof AdminUpsertShippingAttribute
>
export type AdminShippingAttributeFlagsType = z.infer<
  typeof AdminShippingAttributeFlags
>
