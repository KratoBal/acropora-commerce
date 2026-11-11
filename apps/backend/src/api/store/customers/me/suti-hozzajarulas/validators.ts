import { z } from "@medusajs/framework/zod"

/**
 * The customer's cookie decision (customer-cookie-consent.ts): the banner's
 * version and the two optional categories. `strict`, so a body that tries to
 * send the record's time is refused; the time is the server's.
 */
export const StorePostSutiHozzajarulas = z
  .object({
    verzio: z.string().regex(/^[A-Za-z0-9._-]{1,40}$/),
    statisztika: z.boolean(),
    marketing: z.boolean(),
  })
  .strict()

export type StorePostSutiHozzajarulasType = z.infer<typeof StorePostSutiHozzajarulas>
