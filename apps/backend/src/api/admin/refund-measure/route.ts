import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"

import { isStripeTestKey } from "../../../workflows/utils/order-payment/refund-measure"
import { listMeasureOrders, readOrderState } from "../../../workflows/utils/order-payment/refund-measure-read"

/**
 * THE TEST-REFUND MEASUREMENT, READ OVER HTTP (commerce card 04b6010e, task t-20261117-visszaterites-segedo; acrobot decision A, 2026-11-17).
 *
 * The first stage run of `book-test-refund` failed with no readable output: the Coolify task API gives no log. The evidence is therefore
 * read from the STATE, here, as often as needed, with no task, no exit code and no notification.
 *
 *   GET /admin/refund-measure                    the latest orders with a captured Stripe payment (what the script's list mode prints)
 *   GET /admin/refund-measure?order_id=order_01  that order's payment figures as Medusa returns them (type, value, finiteness of every
 *                                                 amount), `loadSide`'s own reading, and per live Stripe payment Stripe's word on the
 *                                                 intent and its refunds
 *
 * Read only: it books nothing (the refund itself is the script's `apply`). Admin only, like every `/admin` route. It REFUSES unless
 * STRIPE_API_KEY is a Stripe TEST key, so on a live backend it answers nothing. It never carries a payment's `data`, the order's metadata,
 * an e-mail address, a Stripe intent id or the key. The query is checked here, not in `middlewares.ts`.
 */
export const AdminGetRefundMeasureParams = z
  .object({
    order_id: z.string().regex(/^order_[A-Za-z0-9]+$/, "order_id must look like order_01...").optional(),
    limit: z.coerce.number().int().min(1).max(20).default(5),
  })
  .strict()

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const parsed = AdminGetRefundMeasureParams.safeParse(req.query ?? {})
  if (!parsed.success)
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Invalid refund measure query: ${parsed.error.issues.map((issue) => issue.message).join("; ")}`,
    )
  const key = process.env.STRIPE_API_KEY?.trim() ?? ""
  if (!isStripeTestKey(key))
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "this route reads the test showcase only: STRIPE_API_KEY is not a Stripe TEST key")

  if (!parsed.data.order_id) {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    res.json({ sections: [{ section: "list", value: { test_key: true, orders: await listMeasureOrders(query, parsed.data.limit) } }] })
    return
  }
  const state = await readOrderState({ container: req.scope, key, orderId: parsed.data.order_id })
  if (!state) throw new MedusaError(MedusaError.Types.NOT_FOUND, `order ${parsed.data.order_id} not found`)
  res.json({ sections: [{ section: "state", value: state }] })
}
