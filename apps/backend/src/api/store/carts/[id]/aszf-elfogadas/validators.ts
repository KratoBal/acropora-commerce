import { z } from "@medusajs/framework/zod"

/**
 * The customer's word and nothing else: the time, the version and the document
 * are the server's (aszf-record.ts). `strict`, so a body that tries to send
 * them is refused, not quietly ignored.
 */
export const StorePostAszfElfogadas = z.object({ elfogadom: z.literal(true) }).strict()

export type StorePostAszfElfogadasType = z.infer<typeof StorePostAszfElfogadas>
