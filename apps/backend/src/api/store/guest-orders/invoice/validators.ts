import { z } from "@medusajs/framework/zod"

/**
 * The guest invoice request's body (V1.1): the same pair as the lookup, for ONE order: its number (digits, `#` allowed) and the
 * e-mail address the customer ordered with. Strict: any other key is a 400. Whether the pair matches an order is one answer
 * for every miss (404) in the route.
 */
export const StorePostGuestInvoice = z
  .object({
    order_number: z
      .string()
      .trim()
      .regex(/^#?\d{1,10}$/),
    email: z.string().trim().email().max(254),
  })
  .strict()

export type StorePostGuestInvoiceType = z.infer<typeof StorePostGuestInvoice>
