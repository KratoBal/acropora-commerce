import { z } from "@medusajs/framework/zod";

/**
 * The guest order lookup's body: the order number (digits, `#` allowed) and the e-mail address. Strict:
 * any other key is a 400. The FORMAT is checked here; whether the pair matches an order is one
 * answer for every miss (404) in the route.
 */
export const StorePostGuestOrderLookup = z
  .object({
    order_number: z
      .string()
      .trim()
      .regex(/^#?\d{1,10}$/),
    email: z.string().trim().email().max(254),
  })
  .strict();

export type StorePostGuestOrderLookupType = z.infer<
  typeof StorePostGuestOrderLookup
>;
