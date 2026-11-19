import { z } from "@medusajs/framework/zod"

/** Issuing a gift card (card 495c0007): whole forints up to a million, an optional expiry, recipient and note. */
export const AdminIssueGiftCard = z
  .object({
    amount: z.number().int().min(1).max(1_000_000),
    expires_at: z.coerce.date().nullish(),
    recipient_email: z.string().trim().toLowerCase().email().max(320).nullish(),
    note: z.string().trim().max(500).nullish(),
  })
  .strict()

export type AdminIssueGiftCardType = z.infer<typeof AdminIssueGiftCard>
