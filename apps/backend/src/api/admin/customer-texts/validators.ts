import { z } from "@medusajs/framework/zod"

import { CUSTOMER_TEXT_LOCALES } from "../../../modules/customer-texts/catalog"

/** One key in one language: a text sets the override, `null` removes it (back to the dictionary text). */
export const AdminPostCustomerText = z
  .object({
    key: z.string().min(1).max(200),
    locale: z.enum(CUSTOMER_TEXT_LOCALES),
    value: z.string().nullable(),
  })
  .strict()

export type AdminPostCustomerTextType = z.infer<typeof AdminPostCustomerText>
