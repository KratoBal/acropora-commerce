import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { guardAdminCapture } from "../workflows/utils/admin-capture-guard"
import { adminCaptureOperations } from "../workflows/utils/admin-capture-guard-operations"

/**
 * An admin capture of a card payment takes the order's current total; a
 * smaller amount goes through an order edit (admin-capture-guard.ts). A
 * refused capture stops here with 400: nothing is booked, nothing is taken
 * from the card, the hold stays.
 */
export const captureOnlyOrderTotal = async (
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) => {
  const raw = (req.body as { amount?: unknown } | undefined)?.amount
  /*
    THE GUARD FAILS CLOSED. A numeric string is read as its number (should
    Medusa's validation ever coerce it, it must not slip past as "left out"),
    anything else that is not a number stops here.
  */
  const requested =
    raw === undefined || raw === null
      ? undefined
      : typeof raw === "number" || (typeof raw === "string" && raw.trim() !== "")
        ? Number(raw)
        : NaN
  if (requested !== undefined && !Number.isFinite(requested)) {
    res.status(400).json({ type: "invalid_data", message: "A levonandó összeg nem szám." })
    return
  }

  let result: Awaited<ReturnType<typeof guardAdminCapture>>
  try {
    result = await guardAdminCapture(req.params.id, requested, adminCaptureOperations(req.scope))
  } catch (error) {
    res.status(400).json({
      type: "not_allowed",
      message: `A levonás nem történt meg, mert a rendelés összegét nem sikerült ellenőrizni: ${
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
