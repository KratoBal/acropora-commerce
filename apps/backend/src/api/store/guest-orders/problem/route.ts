import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { notifyProblemReportReceived } from "../../../../workflows/utils/webshop-mail/problem-report-received-mail"
import { accessibleOrder, createReport } from "../../../../workflows/utils/problem-report/report"
import { cleanDescription, cleanPhone } from "../../../../workflows/utils/problem-report/rules"
import type { StorePostGuestProblemType } from "./validators"

/**
 * POST /store/guest-orders/problem
 *
 * The problem report itself (V1.2). The same pair as the guest lookup opens the order (every miss is ONE 404);
 * the items must be that order's lines, the photos that order's own uploads no report took yet. Answers 201 with
 * the report's id and time: the customer's confirmation. Nothing is promised here (no warranty sentence, no
 * deadline): those are the owner's and the lawyer's.
 */
export const POST = async (req: MedusaRequest<StorePostGuestProblemType>, res: MedusaResponse) => {
  const body = req.validatedBody
  const order = await accessibleOrder(req.scope, Number(body.order_number.replace(/^#/, "")), body.email)
  if (!order) {
    res.status(404).json({ message: "Nem találtuk a rendelést." })
    return
  }
  const result = await createReport(req.scope, order, {
    kind: body.kind,
    itemIds: body.item_ids,
    receivedAt: body.received_at ? new Date(body.received_at) : null,
    description: cleanDescription(body.description),
    phone: cleanPhone(body.phone),
    photoIds: body.photo_ids,
  })
  if (result.status === "bad_items") {
    res
      .status(400)
      .json({ type: "invalid_items", message: "Az egyik kiválasztott tétel nem ehhez a rendeléshez tartozik." })
    return
  }
  if (result.status === "duplicate") {
    // the same problem is already reported: the customer gets the reference that stands (no new case is made)
    res.status(409).json({
      type: "already_reported",
      report_id: result.id,
      message: "Erről a problémáról már van bejelentésed.",
    })
    return
  }
  if (result.status === "bad_photos") {
    res.status(400).json({ type: "invalid_photos", message: "Az egyik kép nem használható ehhez a bejelentéshez." })
    return
  }
  // the customer's acknowledgement mail: its failure never changes the answer (the report is filed)
  await notifyProblemReportReceived(req.scope, {
    order: { id: order.id, displayId: order.displayId, email: order.email },
    reportId: result.id,
  })
  res.status(201).json({ report_id: result.id, created_at: result.createdAt })
}
