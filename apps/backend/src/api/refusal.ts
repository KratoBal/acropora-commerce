import type { MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

/**
 * A REFUSAL KEEPS ITS SENTENCE (stage trial 2026-10-07, order #56). Medusa's
 * error handler replaces every CONFLICT message with a fixed English line ("The
 * request conflicted with another request. You may retry ..."), so our Hungarian
 * refusals never reached the OS or, on the payment page, the customer. The route
 * answers the 409 itself, with the refusal's own message.
 *
 * `isMedusaError`, not `instanceof`: a workflow step's error comes out of
 * `run()` serialized (a plain object with `__isMedusaError` and `type`), and the
 * handler would still replace its message.
 *
 * Only a CONFLICT is answered here; anything else goes on to the error handler.
 */
export const answerRefusal = (res: MedusaResponse, error: unknown): boolean => {
  if (!MedusaError.isMedusaError(error) || (error as { type?: unknown }).type !== MedusaError.Types.CONFLICT) return false
  res.status(409).json({ type: "conflict", code: "refused", message: (error as { message: string }).message })
  return true
}
