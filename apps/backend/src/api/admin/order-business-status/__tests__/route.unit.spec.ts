import { MedusaError } from "@medusajs/framework/utils"

import { ORDER_BUSINESS_STATUS_MODULE } from "../../../../modules/order-business-status"
import { GET } from "../[order_id]/route"

/**
 * THE OS READS THE BUSINESS STATUS HERE. What must fail: the history losing
 * who moved the order (actor, source), `next_statuses` offering a step the
 * rules refuse or missing an allowed one, `changed_at` not the latest change,
 * or an order without a status answering 200 with nothing in it.
 */
const at = (minute: number) => new Date(`2026-10-05T10:${String(minute).padStart(2, "0")}:00.000Z`)

function run(orderId: string, found: boolean) {
  const sent: unknown[] = []
  const req = {
    params: { order_id: orderId },
    scope: {
      resolve: (key: string) => {
        expect(key).toBe(ORDER_BUSINESS_STATUS_MODULE)
        return {
          retrieveOrderBusinessStatusForOrder: async (id: string) => {
            if (!found)
              throw new MedusaError(MedusaError.Types.NOT_FOUND, `No business status exists for order ${id}`)
            return {
              status: { order_id: id, status: "stocking", updated_at: at(30) },
              history: [
                { from_status: null, to_status: "pending_processing", actor: "system", source: "order_created", created_at: at(0) },
                { from_status: "pending_processing", to_status: "stocking", actor: "admin", source: "admin", created_at: at(20) },
              ],
            }
          },
        }
      },
    },
  }
  const res = { json: (body: unknown) => void sent.push(body) }
  return { promise: GET(req as never, res as never), sent }
}

describe("GET /admin/order-business-status/:order_id", () => {
  it("gives the status, the admin's next steps and the history with who moved it", async () => {
    const { promise, sent } = run("order_1", true)
    await promise
    expect(sent).toEqual([
      {
        business_status: {
          order_id: "order_1",
          status: "stocking",
          label: "Készletezés alatt",
          changed_at: at(20).toISOString(),
          next_statuses: [
            { status: "out_for_delivery", label: "Kiszállítás" },
            { status: "ready_for_pickup", label: "Átvehető" },
            { status: "closed_unsuccessfully", label: "Sikertelenül lezárt rendelés" },
          ],
          history: [
            {
              from_status: null,
              from_label: null,
              to_status: "pending_processing",
              to_label: "Feldolgozásra vár",
              actor: "system",
              source: "order_created",
              created_at: at(0).toISOString(),
            },
            {
              from_status: "pending_processing",
              from_label: "Feldolgozásra vár",
              to_status: "stocking",
              to_label: "Készletezés alatt",
              actor: "admin",
              source: "admin",
              created_at: at(20).toISOString(),
            },
          ],
        },
      },
    ])
  })

  it("an order without a business status is 404, not an empty 200", async () => {
    const { promise, sent } = run("order_none", false)
    await expect(promise).rejects.toMatchObject({ type: MedusaError.Types.NOT_FOUND })
    expect(sent).toEqual([])
  })
})
