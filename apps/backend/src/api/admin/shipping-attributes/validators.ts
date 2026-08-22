import { z } from "@medusajs/framework/zod"

export const AdminShippingAttributeFlags = z
  .object({
    pickup_only: z.boolean().optional(),
    foxpost_forbidden: z.boolean().optional(),
    is_frozen: z.boolean().optional(),
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
