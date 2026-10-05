import { z } from "@medusajs/framework/zod"

import { CARRIER_NOTE_MAX, CUSTOMER_NOTE_MAX } from "../../../workflows/utils/order-notes"

const note = (max: number) => z.string().max(max).nullable().optional()

/** The checkout's two notes; a missing key stays as it is, null or "" removes it. */
export const StorePostCartNotes = z
  .object({
    customer_note: note(CUSTOMER_NOTE_MAX),
    carrier_note: note(CARRIER_NOTE_MAX),
  })
  .strict()

export type StorePostCartNotesType = z.infer<typeof StorePostCartNotes>
