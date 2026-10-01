import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { captureBeforeOrderEdit } from "../workflows/utils/capture-before-order-edit"
import { onlineCardProviderIds } from "../workflows/utils/payment-providers"
import { editCaptureOperations } from "../workflows/utils/capture-before-order-edit-operations"

/**
 * Before Medusa confirms an order edit, a card hold is captured for the edited
 * total (capture-before-order-edit.ts); without it the confirm cancels the
 * hold. A refused edit, or a capture that fails, stops the confirm: the edit
 * stays requested, and the hold stays where it was.
 */
export const captureBeforeOrderEditConfirm = async (
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) => {
  let result: Awaited<ReturnType<typeof captureBeforeOrderEdit>>

  try {
    result = await captureBeforeOrderEdit(
      req.params.id,
      editCaptureOperations(req.scope),
      onlineCardProviderIds()
    )
  } catch (error) {
    res.status(400).json({
      type: "not_allowed",
      message: `A kártyás fizetés levonása nem sikerült, a szerkesztés nincs megerősítve: ${
        (error as Error)?.message ?? error
      }`,
    })
    return
  }

  if (result.action === "refuse") {
    res.status(400).json({ type: "not_allowed", message: result.message })
    return
  }

  next()
}
