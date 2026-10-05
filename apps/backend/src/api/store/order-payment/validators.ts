import { z } from "@medusajs/framework/zod"

/** The payment page's calls carry nothing but the token in the path. */
export const StoreOrderPaymentEmptyBody = z.object({}).strict()

export type StoreOrderPaymentEmptyBodyType = z.infer<typeof StoreOrderPaymentEmptyBody>
