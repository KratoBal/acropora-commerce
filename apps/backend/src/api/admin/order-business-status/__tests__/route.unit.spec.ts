import { MedusaError } from "@medusajs/framework/utils"

import { ORDER_BUSINESS_STATUS_MODULE } from "../../../../modules/order-business-status"
import { GET, POST } from "../[order_id]/route"
import { POST as RESEND } from "../[order_id]/resend-notification/route"
import { notifyStatusChange } from "../../../../workflows/utils/webshop-mail/status-notify"
import { transitionOrderBusinessStatusWorkflow } from "../../../../workflows/transition-order-business-status"

jest.mock("../../../../workflows/utils/webshop-mail/status-notify", () => ({
  notifyStatusChange: jest.fn(async () => ({ sent: true })),
}))
jest.mock("../../../../workflows/transition-order-business-status", () => ({
  transitionOrderBusinessStatusWorkflow: jest.fn(() => ({
    run: async () => ({ result: { order_id: "order_1", status: "closed" } }),
  })),
}))

/**
 * THE OS READS THE BUSINESS STATUS HERE. What must fail: the history losing
 * who moved the order (actor, source), `next_statuses` offering a step the
 * rules refuse or missing an allowed one, `changed_at` not the latest change,
 * or an order without a status answering 200 with nothing in it.
 */
const at = (minute: number) => new Date(`2026-10-05T10:${String(minute).padStart(2, "0")}:00.000Z`)

type Mail = { template: string; trigger_type?: string | null; status: "pending" | "success" | "failure"; created_at: Date }

function run(orderId: string, found: boolean, mails: Mail[] | "no_module" = []) {
  const sent: unknown[] = []
  const req = {
    params: { order_id: orderId },
    scope: {
      resolve: (key: string) => {
        if (key === "notification") {
          if (mails === "no_module") throw new Error("notification is not registered")
          return {
            listNotifications: async (filters: Record<string, unknown>) => {
              expect(filters).toEqual({ resource_id: orderId })
              return mails
            },
          }
        }
        expect(key).toBe(ORDER_BUSINESS_STATUS_MODULE)
        return {
          retrieveOrderBusinessStatusForOrder: async (id: string) => {
            if (!found)
              throw new MedusaError(MedusaError.Types.NOT_FOUND, `No business status exists for order ${id}`)
            return {
              status: { order_id: id, status: "stocking", updated_at: at(30) },
              history: [
                { id: "h0", from_status: null, to_status: "pending_processing", actor: "system", source: "order_created", created_at: at(0) },
                { id: "h1", from_status: "pending_processing", to_status: "stocking", actor: "admin", source: "admin", created_at: at(20) },
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
              notification: null,
            },
            {
              from_status: "pending_processing",
              from_label: "Feldolgozásra vár",
              to_status: "stocking",
              to_label: "Készletezés alatt",
              actor: "admin",
              source: "admin",
              created_at: at(20).toISOString(),
              notification: null,
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

describe("the history's mails (\"Értesítő email elküldve\")", () => {
  const history = [
    { id: "h0", from_status: null, to_status: "pending_processing", actor: "system", source: "order_created", created_at: at(0) },
    { id: "h1", from_status: "pending_processing", to_status: "confirmed", actor: "admin", source: "admin", created_at: at(10) },
    { id: "h2", from_status: "confirmed", to_status: "stocking", actor: "admin", source: "admin", created_at: at(20) },
    { id: "h3", from_status: "stocking", to_status: "out_for_delivery", actor: "admin", source: "admin", created_at: at(30) },
  ]
  const read = async (mails: Mail[] | "no_module") => {
    const sent: any[] = []
    const req = {
      params: { order_id: "order_1" },
      scope: {
        resolve: (key: string) =>
          key === "notification"
            ? mails === "no_module"
              ? (() => {
                  throw new Error("not registered")
                })()
              : { listNotifications: async () => mails }
            : {
                retrieveOrderBusinessStatusForOrder: async () => ({
                  status: { order_id: "order_1", status: "out_for_delivery", updated_at: at(30) },
                  history,
                }),
              },
      },
    }
    await GET(req as never, { json: (body: unknown) => void sent.push(body) } as never)
    return sent[0].business_status.history.map((row: any) => row.notification)
  }

  it("each row gets its own mail: the confirmation on creation, the trigger on the rest, the newest of a resend", async () => {
    const rows = await read([
      { template: "order-placed", trigger_type: "order-placed", status: "success", created_at: at(1) },
      { template: "order-status-confirmed", trigger_type: "order-status:h1", status: "failure", created_at: at(11) },
      { template: "order-status-confirmed", trigger_type: "order-status:h1", status: "success", created_at: at(15) },
      { template: "order-shipped", trigger_type: "order-shipped", status: "success", created_at: at(29) },
    ])
    expect(rows).toEqual([
      { status: "sent", at: at(1).toISOString(), template: "order-placed", resent: 0 },
      { status: "sent", at: at(15).toISOString(), template: "order-status-confirmed", resent: 1 },
      null,
      // Kiszállítás stood back for the Feladtuk mail, so the row shows that one
      { status: "sent", at: at(29).toISOString(), template: "order-shipped", resent: 0 },
    ])
  })

  it("a failed mail reads failed, not sent", async () => {
    const rows = await read([
      { template: "order-status-confirmed", trigger_type: "order-status:h1", status: "failure", created_at: at(11) },
    ])
    expect(rows[1]).toEqual({ status: "failed", at: at(11).toISOString(), template: "order-status-confirmed", resent: 0 })
  })

  it("without a notification module, every row is null and the status still reads", async () => {
    expect(await read("no_module")).toEqual([null, null, null, null])
  })
})

describe("POST: the change, then the customer's mail", () => {
  const post = async (body: Record<string, unknown>) => {
    const sent: any[] = []
    const req = {
      params: { order_id: "order_1" },
      validatedBody: body,
      scope: {
        resolve: () => ({
          retrieveOrderBusinessStatusForOrder: async () => ({
            status: { order_id: "order_1", status: "closed" },
            history: [
              { id: "h0", to_status: "pending_processing" },
              { id: "h9", to_status: "closed" },
            ],
          }),
        }),
      },
    }
    await POST(req as never, { json: (b: unknown) => void sent.push(b) } as never)
    return sent[0]
  }

  beforeEach(() => jest.mocked(notifyStatusChange).mockClear())

  it("ticked by default: the newest history row's mail", async () => {
    const answer = await post({ status: "closed" })
    expect(transitionOrderBusinessStatusWorkflow).toHaveBeenCalled()
    expect(notifyStatusChange).toHaveBeenCalledWith(expect.anything(), { orderId: "order_1", status: "closed", historyId: "h9" })
    expect(answer.notification).toEqual({ sent: true })
  })

  it("unticked: the status changes, no mail", async () => {
    const answer = await post({ status: "closed", notify_customer: false })
    expect(notifyStatusChange).not.toHaveBeenCalled()
    expect(answer).toEqual({ business_status: { order_id: "order_1", status: "closed" }, notification: { sent: false, reason: "not_requested" } })
  })
})

describe("POST resend-notification", () => {
  const resend = async (body: Record<string, unknown>) => {
    const sent: any[] = []
    const req = {
      params: { order_id: "order_1" },
      validatedBody: body,
      scope: {
        resolve: () => ({
          retrieveOrderBusinessStatusForOrder: async () => ({
            status: { order_id: "order_1", status: "closed" },
            history: [
              { id: "h0", to_status: "pending_processing" },
              { id: "h9", to_status: "closed" },
            ],
          }),
        }),
      },
    }
    await RESEND(req as never, { json: (b: unknown) => void sent.push(b) } as never)
    return sent[0]
  }

  beforeEach(() => jest.mocked(notifyStatusChange).mockClear())

  it("the latest row by default, a named row on request, always as a resend", async () => {
    await resend({})
    await resend({ history_id: "h0" })
    const calls = jest.mocked(notifyStatusChange).mock.calls.map(([, input]) => input)
    expect(calls.map(({ historyId, status }) => [historyId, status])).toEqual([
      ["h9", "closed"],
      ["h0", "pending_processing"],
    ])
    expect(calls.every((input) => typeof input.resendAt === "number")).toBe(true)
  })

  it("an unknown row is 404 and sends nothing", async () => {
    await expect(resend({ history_id: "nincs" })).rejects.toMatchObject({ type: MedusaError.Types.NOT_FOUND })
    expect(notifyStatusChange).not.toHaveBeenCalled()
  })
})

/**
 * A REFUSAL FROM INSIDE THE TRANSITION (stage trial 2026-10-07). The capture's
 * "A rendelés szerkesztése épp most fut ..." is a CONFLICT thrown in a workflow
 * step, and it leaves `run()` SERIALIZED, not as a MedusaError instance. What
 * must fail: the route letting it reach the error handler (the English line),
 * or matching only `instanceof` and so missing the serialized shape.
 */
describe("POST /admin/order-business-status/:order_id, a refused capture", () => {
  it("is a 409 with the step's own sentence, from the serialized error", async () => {
    const { serializeError } = jest.requireActual("@medusajs/framework/utils")
    const sentence = "A rendelés szerkesztése épp most fut. Próbáld újra néhány másodperc múlva."
    ;(transitionOrderBusinessStatusWorkflow as jest.Mock).mockReturnValueOnce({
      run: async () => {
        throw serializeError(new MedusaError(MedusaError.Types.CONFLICT, sentence))
      },
    })
    const sent: unknown[] = []
    const statuses: number[] = []
    const res = {
      json: (body: unknown) => void sent.push(body),
      status: (code: number) => {
        statuses.push(code)
        return res
      },
    }
    await POST(
      { params: { order_id: "order_1" }, scope: { resolve: () => ({}) }, validatedBody: { status: "out_for_delivery" } } as never,
      res as never
    )
    expect({ status: statuses[0], body: sent[0] }).toEqual({
      status: 409,
      body: { type: "conflict", code: "refused", message: sentence },
    })
    expect(notifyStatusChange).not.toHaveBeenCalled()
  })
})
