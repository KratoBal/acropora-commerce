import {
  emailKey,
  findGuestOrderId,
  guestOrderView,
  guestProblemReports,
  guestWithdrawals,
  lookupGuestOrders,
  type GuestOrderDeps,
  type GuestOrderSource,
  type GuestOrderStatus,
} from "../guest-order/lookup"
import { TRACKING_CARRIER_KEY, TRACKING_NUMBER_KEY, TRACKING_URL_KEY } from "../order-tracking"

/*
  WHAT TURNS THIS RED (V1.1, the guest order lookup). A wrong address, an unknown number or a malformed
  input giving anything but the ONE miss answer (null); the match being case- or space-sensitive; the
  sibling order of a split cart not coming along, or coming along with a DIFFERENT address; the answer
  carrying the e-mail address, a name, a phone number or a home address (the view names every field it
  passes: a field added to the source must not leak by itself); an unknown payment status passing; a
  parcel number shown without its carrier; a link the shop did not receive.
*/
const source = (over: Partial<GuestOrderSource> & { id: string; display_id: number }): GuestOrderSource => ({
  email: "Vevo@Example.hu",
  created_at: "2026-11-03T10:00:00.000Z",
  total: 15000,
  currency_code: "huf",
  payment_status: "captured",
  items: [{ id: "item_1", title: "Reef Pump (Nagy)", quantity: 2, total: 12000 }],
  shipping_method: {
    name: "Foxpost csomagpont",
    data: { foxpost_pickup_point: { name: "Pont 1", address: "1011 Budapest, Fő u. 1." } },
  },
  metadata: null,
  ...over,
})

const status: GuestOrderStatus = {
  status: "confirmed",
  label: "Visszaigazolva",
  updated_at: "2026-11-03T11:00:00.000Z",
  history: [{ to_label: "Feldolgozásra vár", created_at: "2026-11-03T10:00:00.000Z" }],
}

const deps = (
  orders: GuestOrderSource[],
  cartMates: Record<string, GuestOrderSource[]> = {},
): GuestOrderDeps & { statusCalls: string[] } => {
  const statusCalls: string[] = []
  return {
    statusCalls,
    findByDisplayId: async (displayId) => orders.find((order) => Number(order.display_id) === displayId) ?? null,
    siblingsOf: async (orderId) => cartMates[orderId] ?? [],
    statusOf: async (orderId) => {
      statusCalls.push(orderId)
      return orderId === "o_1" ? status : null
    },
    problemReportsOf: async () => [],
    withdrawalsOf: async () => [],
  }
}

describe("lookupGuestOrders: one answer for every miss", () => {
  const orders = [source({ id: "o_1", display_id: 1042 })]

  it("finds the order for the right number and address, whatever the address's case and spaces", async () => {
    for (const email of ["vevo@example.hu", "  VEVO@EXAMPLE.HU ", "Vevo@Example.hu"]) {
      const result = await lookupGuestOrders({ displayId: 1042, email }, deps(orders))
      expect(result?.map((o) => o.display_id)).toEqual([1042])
    }
  })

  it("a wrong address, an unknown number and a malformed input are all null: they cannot be told apart", async () => {
    expect(await lookupGuestOrders({ displayId: 1042, email: "masvalaki@example.hu" }, deps(orders))).toBeNull()
    expect(await lookupGuestOrders({ displayId: 9999, email: "vevo@example.hu" }, deps(orders))).toBeNull()
    expect(await lookupGuestOrders({ displayId: 1042, email: "   " }, deps(orders))).toBeNull()
    expect(await lookupGuestOrders({ displayId: 0, email: "vevo@example.hu" }, deps(orders))).toBeNull()
    expect(await lookupGuestOrders({ displayId: -3, email: "vevo@example.hu" }, deps(orders))).toBeNull()
    expect(await lookupGuestOrders({ displayId: 1.5, email: "vevo@example.hu" }, deps(orders))).toBeNull()
  })

  it("an order without an address on file never matches (not even an empty one)", async () => {
    const none = [source({ id: "o_2", display_id: 7, email: null })]
    expect(await lookupGuestOrders({ displayId: 7, email: "vevo@example.hu" }, deps(none))).toBeNull()
    expect(await lookupGuestOrders({ displayId: 7, email: "" }, deps(none))).toBeNull()
  })

  it("a miss asks for no status and no cart-mates (nothing is read for a stranger)", async () => {
    const d = deps(orders)
    await lookupGuestOrders({ displayId: 1042, email: "masvalaki@example.hu" }, d)
    expect(d.statusCalls).toEqual([])
  })
})

describe("lookupGuestOrders: a mixed cart is two orders", () => {
  const primary = source({ id: "o_1", display_id: 1042 })
  const pickup = source({ id: "o_2", display_id: 1043, shipping_method: { name: "Bolti átvétel", data: null, store_pickup: true } })

  it("the requested order is first, its cart-mate follows", async () => {
    const d = deps([primary, pickup], { o_1: [pickup], o_2: [primary] })
    const fromPrimary = await lookupGuestOrders({ displayId: 1042, email: "vevo@example.hu" }, d)
    expect(fromPrimary?.map((o) => o.display_id)).toEqual([1042, 1043])
    const fromPickup = await lookupGuestOrders({ displayId: 1043, email: "vevo@example.hu" }, d)
    expect(fromPickup?.map((o) => o.display_id)).toEqual([1043, 1042])
  })

  it("a cart-mate with a DIFFERENT address does not come along, and neither does the order itself twice", async () => {
    const stranger = source({ id: "o_3", display_id: 1044, email: "mas@example.hu" })
    const d = deps([primary, pickup, stranger], { o_1: [primary, pickup, stranger] })
    const result = await lookupGuestOrders({ displayId: 1042, email: "vevo@example.hu" }, d)
    expect(result?.map((o) => o.display_id)).toEqual([1042, 1043])
  })
})

describe("guestOrderView: only named fields leave", () => {
  it("carries no e-mail address, name, phone or home address, even when the source object has them", () => {
    const leaky = {
      ...source({ id: "o_1", display_id: 1042 }),
      shipping_address: { first_name: "Anna", last_name: "Kovács", phone: "+3612345678", address_1: "Titok u. 5." },
      customer_id: "cus_1",
      email_copy: "Vevo@Example.hu",
    } as GuestOrderSource
    const text = JSON.stringify(guestOrderView(leaky, status))
    for (const secret of [
      "Vevo@Example.hu",
      "vevo@example.hu",
      "Anna",
      "Kovács",
      "+3612345678",
      "Titok u.",
      "cus_1",
      "o_1",
    ])
      expect(text).not.toContain(secret)
  })

  it("passes the order's own facts: lines, amounts, shipping method, the parcel shop, the status", () => {
    const view = guestOrderView(source({ id: "o_1", display_id: 1042 }), status)
    expect(view).toMatchObject({
      display_id: 1042,
      total: 15000,
      currency_code: "huf",
      payment_status: "captured",
      items: [{ id: "item_1", title: "Reef Pump (Nagy)", quantity: 2, total: 12000 }],
      shipping: {
        method_name: "Foxpost csomagpont",
        pickup_point: { name: "Pont 1", address: "1011 Budapest, Fő u. 1." },
      },
      business_status: { label: "Visszaigazolva" },
    })
  })

  it("an unknown payment status is null, a known one passes", () => {
    expect(
      guestOrderView(source({ id: "o", display_id: 1, payment_status: "something_new" }), null).payment_status,
    ).toBeNull()
    expect(guestOrderView(source({ id: "o", display_id: 1, payment_status: null }), null).payment_status).toBeNull()
    expect(guestOrderView(source({ id: "o", display_id: 1, payment_status: "awaiting" }), null).payment_status).toBe(
      "awaiting",
    )
  })

  it("the tracking comes from the order's own three keys, with the link only when one was stored", () => {
    const stored = guestOrderView(
      source({
        id: "o",
        display_id: 1,
        metadata: {
          [TRACKING_CARRIER_KEY]: "gls",
          [TRACKING_NUMBER_KEY]: "123456",
          [TRACKING_URL_KEY]: "https://x.example/t/1",
          egyeb: "x",
        },
      }),
      null,
    )
    expect(stored.tracking).toEqual({ carrier: "gls", number: "123456", url: "https://x.example/t/1" })
    const noLink = guestOrderView(
      source({
        id: "o",
        display_id: 1,
        metadata: { [TRACKING_CARRIER_KEY]: "gls", [TRACKING_NUMBER_KEY]: "123456", [TRACKING_URL_KEY]: "" },
      }),
      null,
    )
    expect(noLink.tracking).toEqual({ carrier: "gls", number: "123456", url: null })
    expect(
      guestOrderView(source({ id: "o", display_id: 1, metadata: { [TRACKING_NUMBER_KEY]: "123456" } }), null).tracking,
    ).toBeNull()
    expect(guestOrderView(source({ id: "o", display_id: 1 }), null).tracking).toBeNull()
  })

  it("a home delivery has no parcel shop, a missing shipping method is null", () => {
    expect(
      guestOrderView(source({ id: "o", display_id: 1, shipping_method: { name: "GLS házhoz", data: {}, store_pickup: false } }), null)
        .shipping,
    ).toEqual({
      method_name: "GLS házhoz",
      pickup_point: null,
      store_pickup: false,
    })
    expect(guestOrderView(source({ id: "o", display_id: 1, shipping_method: null }), null).shipping).toBeNull()
  })

  it("a bad date is null, not an exception", () => {
    expect(guestOrderView(source({ id: "o", display_id: 1, created_at: "nem datum" }), null).created_at).toBeNull()
    expect(guestOrderView(source({ id: "o", display_id: 1, created_at: null }), null).created_at).toBeNull()
  })
})

describe("the order's problem reports", () => {
  const stored = (over: Record<string, unknown> = {}) => ({
    id: "ordprb_1",
    kind: "item_damaged" as const,
    created_at: "2026-11-04T10:00:00.000Z",
    status: "new",
    // what the module also holds and the customer view must NEVER pass on
    description: "Titkos leírás",
    phone: "+36 30 111 2222",
    item_ids: ["item_1"],
    ...over,
  })

  it("shows the case reference, the kind, the time and a two-step state, the oldest first", () => {
    const reports = guestProblemReports([
      stored({ id: "ordprb_2", created_at: "2026-11-05T10:00:00.000Z", status: "pulled" }),
      stored(),
    ] as never)
    expect(reports).toEqual([
      { id: "ordprb_1", kind: "item_damaged", created_at: "2026-11-04T10:00:00.000Z", stage: "received" },
      { id: "ordprb_2", kind: "item_damaged", created_at: "2026-11-05T10:00:00.000Z", stage: "in_progress" },
    ])
  })

  it("never passes the text, the phone number or the line ids", () => {
    const view = guestOrderView(source({ id: "o_1", display_id: 1042 }), null, [stored()] as never)
    const text = JSON.stringify(view)
    expect(text).not.toContain("Titkos leírás")
    expect(text).not.toContain("+36 30 111 2222")
    expect(text).not.toContain("item_ids")
    expect(view.problem_reports).toHaveLength(1)
  })

  it("an order without a report has an empty list, and each order of a split cart gets its own", async () => {
    const orders = [source({ id: "o_1", display_id: 1042 })]
    const mate = source({ id: "o_2", display_id: 1043 })
    const d = deps(orders, { o_1: [mate] })
    d.problemReportsOf = async (orderId) => (orderId === "o_2" ? ([stored()] as never) : [])
    const result = await lookupGuestOrders({ displayId: 1042, email: "vevo@example.hu" }, d)
    expect(result?.map((o) => o.problem_reports.length)).toEqual([0, 1])
  })
})

describe("the withdrawal declarations in the customer view", () => {
  const stored = (over: Record<string, unknown> = {}) => ({
    id: "ordwdr_1",
    created_at: new Date("2026-11-05T18:00:00Z"),
    item_ids: ["item_1"],
    customer_name: "Titkos Név",
    status: "new",
    ...over,
  })

  it("shows the reference, the time of receipt and the lines, the oldest first", () => {
    const list = guestWithdrawals([
      stored({ id: "ordwdr_2", created_at: "2026-11-06T09:00:00.000Z", item_ids: ["item_2"] }),
      stored(),
    ] as never)
    expect(list).toEqual([
      { id: "ordwdr_1", created_at: "2026-11-05T18:00:00.000Z", item_ids: ["item_1"] },
      { id: "ordwdr_2", created_at: "2026-11-06T09:00:00.000Z", item_ids: ["item_2"] },
    ])
  })

  it("never passes the name typed into the declaration or the shop's own status", () => {
    const view = guestOrderView(source({ id: "o_1", display_id: 1042 }), null, [], [stored()] as never)
    const text = JSON.stringify(view)
    expect(text).not.toContain("Titkos Név")
    expect(text).not.toContain("customer_name")
    expect(text).not.toContain("\"status\":\"new\"")
    expect(view.withdrawals).toHaveLength(1)
  })

  it("an order without a declaration has an empty list, and each order of a split cart gets its own", async () => {
    const orders = [source({ id: "o_1", display_id: 1042 })]
    const mate = source({ id: "o_2", display_id: 1043 })
    const d = deps(orders, { o_1: [mate] })
    d.withdrawalsOf = async (orderId) => (orderId === "o_2" ? ([stored()] as never) : [])
    const result = await lookupGuestOrders({ displayId: 1042, email: "vevo@example.hu" }, d)
    expect(result?.map((o) => o.withdrawals.length)).toEqual([0, 1])
  })
})

describe("emailKey", () => {
  it("trims and lower-cases, and an absent address is the empty key", () => {
    expect(emailKey("  A@B.hu ")).toBe("a@b.hu")
    expect(emailKey(null)).toBe("")
    expect(emailKey(undefined)).toBe("")
  })
})

describe("findGuestOrderId: the same pair as the lookup, the id of ONE order", () => {
  const deps = (found: GuestOrderSource | null) => ({ findByDisplayId: jest.fn().mockResolvedValue(found) })

  it("gives the order's id for the right number and address, whatever the address's case and spaces", async () => {
    const d = deps(source({ id: "order_1", display_id: 1042 }))
    expect(await findGuestOrderId({ displayId: 1042, email: "  vevo@EXAMPLE.hu " }, d)).toBe("order_1")
    expect(d.findByDisplayId).toHaveBeenCalledWith(1042)
  })

  it("every miss is null: a wrong address, an unknown number, a malformed number, an order with no address", async () => {
    expect(await findGuestOrderId({ displayId: 1042, email: "masvalaki@example.hu" }, deps(source({ id: "o", display_id: 1042 })))).toBeNull()
    expect(await findGuestOrderId({ displayId: 1042, email: "vevo@example.hu" }, deps(null))).toBeNull()
    for (const displayId of [0, -3, 1.5, Number.NaN]) {
      const d = deps(source({ id: "o", display_id: 1 }))
      expect(await findGuestOrderId({ displayId, email: "vevo@example.hu" }, d)).toBeNull()
      expect(d.findByDisplayId).not.toHaveBeenCalled()
    }
    expect(await findGuestOrderId({ displayId: 1042, email: "" }, deps(source({ id: "o", display_id: 1042, email: null })))).toBeNull()
  })
})
