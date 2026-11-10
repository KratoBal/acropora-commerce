import { z } from "@medusajs/framework/zod"

/**
 * The OS's whole set of the live animals on their way that a buyer may see (V2.6 S4a). Strict: an unknown field is refused,
 * so a quantity or a note the OS might add by mistake never lands in a public table.
 */
const arrival = z
  .object({
    os_id: z.string().min(1).max(64),
    kind: z.enum(["FISH", "INVERTEBRATE", "CORAL"]),
    label: z.string().trim().min(1).max(200),
    expected_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected_on is YYYY-MM-DD"),
    status: z.enum(["ORDERED", "IN_TRANSIT"]),
    medusa_product_id: z.string().min(1).max(64).nullable(),
  })
  .strict()

export const AdminPutLivestockArrivals = z
  .object({ arrivals: z.array(arrival).max(1000) })
  .strict()
  .refine((v) => new Set(v.arrivals.map((a) => a.os_id)).size === v.arrivals.length, "os_id appears twice")

export type AdminPutLivestockArrivalsType = z.infer<typeof AdminPutLivestockArrivals>
