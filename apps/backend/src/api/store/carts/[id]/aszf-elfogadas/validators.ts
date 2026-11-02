import { z } from "@medusajs/framework/zod"

/**
 * The customer's word, and WHAT THE SHOP SHOWED (barracuda, #622 review): the
 * time, the version and the document of the record are the server's
 * (aszf-record.ts), but the storefront says which version it displayed and in
 * which language, and the server refuses the record when its own setting names
 * another version. Without it a storefront showing the old shop's ÁSZF and a
 * backend recording the Fogyasztóbarát document (the 2026-10-06 mismatch) would
 * go through silently. The claimed version is compared and never recorded.
 * `strict`, so a body that tries to send the record's own fields is refused.
 */
export const StorePostAszfElfogadas = z
  .object({
    elfogadom: z.literal(true),
    megjelenitett_verzio: z.string().min(1).max(128),
    nyelv: z.enum(["hu", "en"]),
  })
  .strict()

export type StorePostAszfElfogadasType = z.infer<typeof StorePostAszfElfogadas>
