import type { MedusaContainer } from "@medusajs/framework/types"

import { ORDER_BUSINESS_STATUS_MODULE } from "../../modules/order-business-status"
import OrderBusinessStatusModuleService from "../../modules/order-business-status/service"
import { transitionOrderBusinessStatusWorkflow } from "../transition-order-business-status"

/**
 * Gives a new order its first business status, Feldolgozásra vár, once.
 *
 * TWO PATHS CREATE ORDERS, AND ONLY ONE OF THEM RAN THIS BEFORE. The store
 * checkout goes through `completeCartWorkflow`, which creates the order with
 * `createOrdersStep` and never calls `createOrderWorkflow`; its own
 * `orderCreated` hook exists inside the workflow but is not exposed (the
 * workflow returns only the `validate` hook). So the hook on
 * `createOrderWorkflow` never ran for a store order, and the first real stage
 * order (2026-09-29) had no business status at all. Measured against
 * @medusajs/core-flows 2.20.1, `dist/cart/workflows/complete-cart.js`.
 *
 * Both paths now call this function: the `createOrderWorkflow` hook, and the
 * `order.placed` subscriber that `completeCartWorkflow` triggers. It is
 * IDEMPOTENT, because the two may one day meet on the same order: when a status
 * already exists it writes nothing, instead of letting the transition rules
 * refuse a second "new order" entry.
 */
export async function ensureInitialBusinessStatus(
  container: MedusaContainer,
  orderId: string,
): Promise<"created" | "exists"> {
  const service = container.resolve<OrderBusinessStatusModuleService>(
    ORDER_BUSINESS_STATUS_MODULE,
  )
  const [existing] = await service.listOrderBusinessStatusModels({
    order_id: orderId,
  })
  if (existing) return "exists"

  await transitionOrderBusinessStatusWorkflow(container).run({
    input: {
      order_id: orderId,
      to: "pending_processing",
      actor: "system",
      source: "order_created",
    },
  })
  return "created"
}
