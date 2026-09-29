import { storeCustomerRoutesMiddlewares } from "@medusajs/medusa/api/store/customers/middlewares"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"

import { ORDER_BUSINESS_STATUS_MODULE } from "../../../../../../modules/order-business-status"
import { GET as getOne } from "../[order_id]/route"
import { GET as getList } from "../route"

/**
 * A CUSTOMER SEES ONLY THEIR OWN ORDERS' BUSINESS STATUS.
 *
 * The order lookup is faked the way the database answers it: filtered by the
 * customer id the SESSION carries. Customer A owns ord_a; customer B owns
 * ord_b. What must fail if the ownership filter were lost: A asking for
 * ord_b gets 404, and the business status module is never even asked.
 */

const ORDERS: Record<string, string> = { ord_a: "cus_a", ord_b: "cus_b" }

function request(customerId: string | undefined, orderId?: string) {
  const asked: string[] = []
  const graphFilters: unknown[] = []
  const at = new Date("2026-09-29T10:00:00.000Z")
  const statuses = [
    { order_id: "ord_a", status: "confirmed", updated_at: at },
    { order_id: "ord_b", status: "stocking", updated_at: at },
  ]
  const req = {
    auth_context: customerId ? { actor_id: customerId } : undefined,
    params: orderId ? { order_id: orderId } : {},
    scope: {
      resolve: (key: string) => {
        if (key === ContainerRegistrationKeys.QUERY)
          return {
            graph: async ({
              filters,
            }: {
              filters: { customer_id: string; id?: string }
            }) => {
              graphFilters.push(filters)
              return {
                data: Object.entries(ORDERS)
                  .filter(
                    ([id, owner]) =>
                      owner === filters.customer_id &&
                      (!filters.id || filters.id === id),
                  )
                  .map(([id]) => ({ id })),
              }
            },
          }
        if (key === ORDER_BUSINESS_STATUS_MODULE)
          return {
            listOrderBusinessStatusModels: async ({
              order_id,
            }: {
              order_id: string[]
            }) => {
              asked.push(...order_id)
              return statuses.filter((row) => order_id.includes(row.order_id))
            },
            retrieveOrderBusinessStatusForOrder: async (id: string) => {
              asked.push(id)
              const status = statuses.find((row) => row.order_id === id)
              if (!status)
                throw new MedusaError(MedusaError.Types.NOT_FOUND, "none")
              return {
                status,
                history: [
                  {
                    from_status: null,
                    to_status: "pending_processing",
                    created_at: at,
                  },
                  {
                    from_status: "pending_processing",
                    to_status: status.status,
                    created_at: at,
                  },
                ],
              }
            },
          }
        throw new Error(`unexpected resolve ${key}`)
      },
    },
  }
  const res = {
    body: undefined as unknown,
    json(body: unknown) {
      this.body = body
    },
  }
  return { req, res, asked, graphFilters }
}

const run = async (
  route: typeof getOne,
  customerId: string | undefined,
  orderId?: string,
) => {
  const call = request(customerId, orderId)
  await route(call.req as never, call.res as never)
  return call
}

describe("GET /store/customers/me/order-business-statuses/:order_id", () => {
  it("returns the customer's own order's status and history, in the shop's words", async () => {
    const { res } = await run(getOne, "cus_a", "ord_a")
    expect(res.body).toEqual({
      business_status: {
        order_id: "ord_a",
        status: "confirmed",
        label: "Visszaigazolva",
        updated_at: "2026-09-29T10:00:00.000Z",
        history: [
          {
            from_status: null,
            from_label: null,
            to_status: "pending_processing",
            to_label: "Feldolgozásra vár",
            created_at: "2026-09-29T10:00:00.000Z",
          },
          {
            from_status: "pending_processing",
            from_label: "Feldolgozásra vár",
            to_status: "confirmed",
            to_label: "Visszaigazolva",
            created_at: "2026-09-29T10:00:00.000Z",
          },
        ],
      },
    })
  })

  it("answers 404 for another customer's order, and never asks the status module", async () => {
    const call = request("cus_a", "ord_b")
    await expect(
      getOne(call.req as never, call.res as never),
    ).rejects.toMatchObject({ type: MedusaError.Types.NOT_FOUND })
    expect(call.asked).toEqual([])
    // the ownership filter came from the session, not from the request
    expect(call.graphFilters).toEqual([{ customer_id: "cus_a", id: "ord_b" }])
  })

  it("answers 404 for an order that does not exist, the same as a foreign one", async () => {
    const call = request("cus_a", "ord_missing")
    await expect(
      getOne(call.req as never, call.res as never),
    ).rejects.toMatchObject({ type: MedusaError.Types.NOT_FOUND })
  })

  it("answers null for an own order that has no business status yet", async () => {
    ORDERS.ord_new = "cus_a"
    try {
      const { res } = await run(getOne, "cus_a", "ord_new")
      expect(res.body).toEqual({ business_status: null })
    } finally {
      delete ORDERS.ord_new
    }
  })

  it("refuses without a signed-in customer", async () => {
    const call = request(undefined, "ord_a")
    await expect(
      getOne(call.req as never, call.res as never),
    ).rejects.toMatchObject({ type: MedusaError.Types.UNAUTHORIZED })
  })
})

describe("GET /store/customers/me/order-business-statuses", () => {
  it("lists only the customer's own orders", async () => {
    const { res, asked } = await run(getList, "cus_b")
    expect(res.body).toEqual({
      business_statuses: [
        {
          order_id: "ord_b",
          status: "stocking",
          label: "Készletezés alatt",
          updated_at: "2026-09-29T10:00:00.000Z",
        },
      ],
    })
    expect(asked).toEqual(["ord_b"])
  })
})

describe("the customer session in front of these routes", () => {
  it("is required by Medusa's own middleware for every /store/customers/me* route", () => {
    // these routes rely on it instead of repeating it: if a Medusa upgrade
    // drops or narrows it, this turns red
    const guard = storeCustomerRoutesMiddlewares.find(
      (route) =>
        route.matcher === "/store/customers/me*" && route.method === "ALL",
    )
    expect(guard?.middlewares).toHaveLength(1)
    expect(String(guard?.middlewares?.[0])).toContain("authenticate")
  })
})
