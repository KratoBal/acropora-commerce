import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { accessibleOrder, storePhotoWithinCap, unattachedPhotoCount } from "../../../../workflows/utils/problem-report/report"
import { decodePhoto, MAX_PHOTOS } from "../../../../workflows/utils/problem-report/rules"
import type { StorePostGuestProblemPhotoType } from "./validators"

/** The unsent uploads an order may hold: twice the report's limit (an abandoned form leaves files). */
const UNSENT_CAP = MAX_PHOTOS * 2

/**
 * POST /store/guest-orders/problem-photos
 *
 * One photo for a problem report (V1.2). The same pair as the guest lookup opens the order (every miss is ONE
 * 404, "Nem találtuk a rendelést."); the photo is read from its bytes (JPEG or PNG, at most 5 MB, nothing else),
 * named by the server, stored in the shop's file module and recorded for THIS order. Answers its id: the report
 * names the ids it takes. An order may hold at most twice the report's photo limit of unsent uploads (an
 * abandoned form leaves files; a later job removes them).
 */
export const POST = async (req: MedusaRequest<StorePostGuestProblemPhotoType>, res: MedusaResponse) => {
  const { order_number, email, content } = req.validatedBody
  const order = await accessibleOrder(req.scope, Number(order_number.replace(/^#/, "")), email)
  if (!order) {
    res.status(404).json({ message: "Nem találtuk a rendelést." })
    return
  }
  const tooMany = () =>
    res.status(429).json({ type: "too_many_photos", message: "Túl sok feltöltött kép van már ehhez a rendeléshez." })
  if ((await unattachedPhotoCount(req.scope, order.id)) >= UNSENT_CAP) {
    tooMany()
    return
  }
  const photo = decodePhoto(content)
  if (!photo.ok) {
    res.status(400).json({ type: "invalid_photo", reason: photo.reason })
    return
  }
  // the early count above is only a quick answer; the cap itself is kept after the store, so racing uploads cannot pass it
  const stored = await storePhotoWithinCap(req.scope, order.id, photo.bytes, photo.type, UNSENT_CAP)
  if (!stored) {
    tooMany()
    return
  }
  res.status(201).json({ photo_id: stored.id })
}
