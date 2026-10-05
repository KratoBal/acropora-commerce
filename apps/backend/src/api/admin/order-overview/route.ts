import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"

import { loadOrderQueryPage } from "../../../services/order-query-loader"
import { medusaOrderQueryLoader } from "../../../services/order-query-medusa-loader"

/**
 * THE ORDER LIST FOR THE ACROPORA OS ("Rendelések"): one page of orders, newest
 * first, each with its business status, buyer, shipping, payment, mixed-cart
 * pair and customer signals (`order-query-projection.ts`). Admin only, like
 * every `/admin` route. Invoicing and parcels are the OS's own records, so
 * `invoice_status` stays null here.
 *
 * The query is checked here, not in `middlewares.ts`, so this read touches no
 * shared file.
 */
export const AdminGetOrderOverviewParams = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .strict()

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const parsed = AdminGetOrderOverviewParams.safeParse(req.query ?? {})
  if (!parsed.success)
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Invalid order overview query: ${parsed.error.issues.map((issue) => issue.message).join("; ")}`,
    )
  const page = await loadOrderQueryPage(medusaOrderQueryLoader(req.scope, parsed.data))
  res.json(page)
}
