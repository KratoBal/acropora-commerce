import { z } from "@medusajs/framework/zod"

// No length rule: registration has none either (acrobot, 2026-09-29). Only
// empty values are refused.
export const StoreChangePassword = z
  .object({
    current_password: z.string().min(1),
    new_password: z.string().min(1),
  })
  .strict()

export type StoreChangePasswordType = z.infer<typeof StoreChangePassword>
