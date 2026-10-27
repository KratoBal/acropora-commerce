import { z } from "@medusajs/framework/zod"

import { PASSWORD_MIN_LENGTH } from "../../../../password-rules"

// The NEW password needs the shop's minimum length (audit P1/8). The current
// one is only checked against the stored hash, so it may be an old short one.
export const StoreChangePassword = z
  .object({
    current_password: z.string().min(1),
    new_password: z.string().refine((value) => [...value].length >= PASSWORD_MIN_LENGTH, {
      message: `The password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
    }),
  })
  .strict()

export type StoreChangePasswordType = z.infer<typeof StoreChangePassword>
