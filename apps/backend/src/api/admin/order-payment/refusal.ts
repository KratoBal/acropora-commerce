import type { MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

/**
 * A REFUSAL KEEPS ITS SENTENCE (stage trial 2026-10-07, order #56). Medusa's
 * error handler replaces every CONFLICT message with a fixed English line ("The
 * request conflicted with another request. You may retry ..."), so the Hungarian
 * refusals of these routes never reached the OS: the operator saw the English
 * text. The route answers the 409 itself, with the refusal's own message.
 *
 * Only a CONFLICT is answered here; anything else goes on to the error handler.
 */
export const answerRefusal = (res: MedusaResponse, error: unknown): boolean => {
  if (!(error instanceof MedusaError) || error.type !== MedusaError.Types.CONFLICT) return false
  res.status(409).json({ type: "conflict", code: "refused", message: error.message })
  return true
}
