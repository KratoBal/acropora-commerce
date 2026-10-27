import middlewares from "../middlewares"
import {
  ORDER_NOT_FOUND,
  ORDER_VIEW_HEADER,
  guardOrderRead,
  orderViewAllowed,
} from "../order-read-guard"
// The storefront's signer: the two apps cannot import each other at runtime,
// so this test is the contract between them.
import {
  alairtMegtekintesSuti,
  megtekintesEngedelyezett,
} from "../../../../storefront/src/lib/util/rendeles-megtekintes"

/**
 * THE STOCK ORDER READ ANSWERS ONLY THE CUSTOMER (audit A6b). What must fail:
 * a guest with no signature, or with one for ANOTHER order, an expired one or
 * an edited one, reading an order; a signed-in customer reading ANOTHER
 * customer's order (the account page's gap); an unknown order answering
 * differently from a refused one; an open second path when the backend has no
 * secret; the storefront's signature not being the one the backend accepts;
 * the route left without its guard.
 */
const KEY = "proba-titok-nem-valodi"
const NOW = new Date("2026-10-27T12:00:00.000Z")

const call = async (opts: {
  orderId: string
  orders: Record<string, { customer_id: string | null }>
  actor?: { actor_id: string; actor_type: string }
  header?: string
}) => {
  const req = {
    params: { id: opts.orderId },
    headers: opts.header ? { [ORDER_VIEW_HEADER]: opts.header } : {},
    auth_context: opts.actor,
    scope: {
      resolve: () => ({
        graph: async ({ filters }: { filters: { id: string } }) => ({
          data: opts.orders[filters.id] ? [{ id: filters.id, ...opts.orders[filters.id] }] : [],
        }),
      }),
    },
  }
  const res = {
    statusCode: 200,
    sent: undefined as unknown,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(body: unknown) {
      this.sent = body
    },
  }
  const next = jest.fn()
  await guardOrderRead(req as never, res as never, next)
  return { res, next }
}

const ORDERS = { order_A: { customer_id: "cus_1" }, order_B: { customer_id: "cus_2" } }

beforeEach(() => {
  process.env.STOREFRONT_REVALIDATE_SECRET = KEY
  delete process.env.ORDER_VIEW_SECRET
})
afterEach(() => {
  delete process.env.STOREFRONT_REVALIDATE_SECRET
  delete process.env.ORDER_VIEW_SECRET
})

describe("the order read guard", () => {
  it("a guest with no signature gets the 404", async () => {
    const { res, next } = await call({ orderId: "order_A", orders: ORDERS })
    expect(res.statusCode).toBe(404)
    expect(res.sent).toEqual(ORDER_NOT_FOUND)
    expect(next).not.toHaveBeenCalled()
  })

  it("a guest with a valid signature naming this order passes", async () => {
    const header = alairtMegtekintesSuti(["order_A"], new Date(), KEY)!
    const { next } = await call({ orderId: "order_A", orders: ORDERS, header })
    expect(next).toHaveBeenCalledTimes(1)
  })

  it("a signature for another order, an edited one and an expired one get the 404", async () => {
    const [expiryB, , signatureB] = alairtMegtekintesSuti(["order_B"], new Date(), KEY)!.split(".")
    const [expiryA, idsA, signatureA] = alairtMegtekintesSuti(["order_A"], new Date(), KEY)!.split(".")
    const stale = alairtMegtekintesSuti(["order_A"], new Date(Date.now() - 2 * 60 * 60 * 1000), KEY)!
    for (const header of [
      // a real signature, but for order_B
      alairtMegtekintesSuti(["order_B"], new Date(), KEY)!,
      // order_B's signature with the list rewritten to name order_A
      `${expiryB}.order_A.${signatureB}`,
      // order_A's signature with the expiry pushed out
      `${Number(expiryA) + 99999}.${idsA}.${signatureA}`,
      // a signature for order_A that has expired
      stale,
    ]) {
      const { res, next } = await call({ orderId: "order_A", orders: ORDERS, header })
      expect(res.statusCode).toBe(404)
      expect(next).not.toHaveBeenCalled()
    }
  })

  it("the signed-in owner passes without a signature, another customer gets the 404", async () => {
    const owner = await call({
      orderId: "order_A",
      orders: ORDERS,
      actor: { actor_id: "cus_1", actor_type: "customer" },
    })
    expect(owner.next).toHaveBeenCalledTimes(1)
    const other = await call({
      orderId: "order_A",
      orders: ORDERS,
      actor: { actor_id: "cus_2", actor_type: "customer" },
    })
    expect(other.res.statusCode).toBe(404)
    expect(other.next).not.toHaveBeenCalled()
  })

  it("an actor that is not a customer is not the owner", async () => {
    const { res } = await call({
      orderId: "order_A",
      orders: ORDERS,
      actor: { actor_id: "cus_1", actor_type: "user" },
    })
    expect(res.statusCode).toBe(404)
  })

  it("an order with no customer is not 'owned' by an empty actor", async () => {
    const { res } = await call({
      orderId: "order_X",
      orders: { order_X: { customer_id: null } },
      actor: { actor_id: "", actor_type: "customer" },
    })
    expect(res.statusCode).toBe(404)
  })

  it("an unknown order and a refused one answer exactly alike", async () => {
    const unknown = await call({ orderId: "order_nincs", orders: ORDERS })
    const refused = await call({ orderId: "order_A", orders: ORDERS })
    expect(unknown.res.statusCode).toBe(refused.res.statusCode)
    expect(unknown.res.sent).toEqual(refused.res.sent)
  })

  it("an unknown order stays 404 even with a signature naming it", async () => {
    const header = alairtMegtekintesSuti(["order_nincs"], new Date(), KEY)!
    const { res } = await call({ orderId: "order_nincs", orders: ORDERS, header })
    expect(res.statusCode).toBe(404)
  })

  it("without a secret on the backend the signature path is closed, the owner's is not", async () => {
    delete process.env.STOREFRONT_REVALIDATE_SECRET
    const header = alairtMegtekintesSuti(["order_A"], new Date(), KEY)!
    const guest = await call({ orderId: "order_A", orders: ORDERS, header })
    expect(guest.res.statusCode).toBe(404)
    const owner = await call({
      orderId: "order_A",
      orders: ORDERS,
      actor: { actor_id: "cus_1", actor_type: "customer" },
    })
    expect(owner.next).toHaveBeenCalledTimes(1)
  })

  it("ORDER_VIEW_SECRET wins over the revalidate secret, like on the storefront", async () => {
    process.env.ORDER_VIEW_SECRET = "masik-titok"
    const withRevalidateKey = alairtMegtekintesSuti(["order_A"], new Date(), KEY)!
    const withOrderViewKey = alairtMegtekintesSuti(["order_A"], new Date(), "masik-titok")!
    expect((await call({ orderId: "order_A", orders: ORDERS, header: withRevalidateKey })).res.statusCode).toBe(404)
    expect((await call({ orderId: "order_A", orders: ORDERS, header: withOrderViewKey })).next).toHaveBeenCalled()
  })
})

describe("the backend and the storefront agree on the signature", () => {
  it("what the storefront signs, the backend accepts, for every order it names", () => {
    const value = alairtMegtekintesSuti(["order_A", "order_B"], NOW, KEY)!
    expect(orderViewAllowed(value, "order_A", NOW, KEY)).toBe(true)
    expect(orderViewAllowed(value, "order_B", NOW, KEY)).toBe(true)
    expect(orderViewAllowed(value, "order_C", NOW, KEY)).toBe(false)
  })

  it("one changed character is refused by both", () => {
    const value = alairtMegtekintesSuti(["order_A"], NOW, KEY)!
    const changed = `${value.slice(0, -1)}${value.endsWith("0") ? "1" : "0"}`
    expect(orderViewAllowed(changed, "order_A", NOW, KEY)).toBe(false)
    expect(megtekintesEngedelyezett(changed, "order_A", NOW, KEY)).toBe(false)
  })

  it("they agree on expiry and on the wrong key", () => {
    const value = alairtMegtekintesSuti(["order_A"], NOW, KEY)!
    const later = new Date(NOW.getTime() + 61 * 60 * 1000)
    expect(orderViewAllowed(value, "order_A", later, KEY)).toBe(false)
    expect(megtekintesEngedelyezett(value, "order_A", later, KEY)).toBe(false)
    expect(orderViewAllowed(value, "order_A", NOW, "masik")).toBe(false)
    expect(megtekintesEngedelyezett(value, "order_A", NOW, "masik")).toBe(false)
  })
})

describe("the wiring", () => {
  it("guards GET /store/orders/:id, after the optional customer authentication", () => {
    const route = middlewares.routes?.find(
      (r) =>
        r.matcher === "/store/orders/:id" &&
        ((r as { methods?: string[] }).methods ?? []).includes("GET")
    )
    expect(route?.middlewares).toHaveLength(2)
    expect(route?.middlewares?.[1]).toBe(guardOrderRead)
  })
})
