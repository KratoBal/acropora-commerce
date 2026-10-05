import { z } from "@medusajs/framework/zod"

/**
 * The OS's shipping notice (agreed with nautilus, 26342/26345): the carrier,
 * the carrier's parcel barcode, and only if the carrier gave one, a public
 * tracking address. Strict: any other key is a 400.
 */
export const AdminOrderShippingNotice = z
  .object({
    carrier: z.enum(["foxpost", "gls"]),
    tracking_number: z.string().trim().min(1).max(64),
    tracking_url: z
      .string()
      .url()
      .refine((value) => value.startsWith("https://"), "https only")
      .optional(),
    parcel_id: z.string().max(128).optional(),
  })
  .strict()

export type AdminOrderShippingNoticeType = z.infer<typeof AdminOrderShippingNotice>
