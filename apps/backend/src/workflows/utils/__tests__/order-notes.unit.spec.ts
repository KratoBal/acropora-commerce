const updateCart = jest.fn()
const updateOrder = jest.fn()
jest.mock("@medusajs/medusa/core-flows", () => ({
  updateCartWorkflow: () => ({ run: (args: unknown) => updateCart(args) }),
  updateOrderWorkflow: () => ({ run: (args: unknown) => updateOrder(args) }),
}))

import { POST as adminRoute } from "../../../api/admin/order-notes/[order_id]/route"
import { AdminPostOrderNotes } from "../../../api/admin/order-notes/validators"
import middlewares from "../../../api/middlewares"
import { POST as storeRoute } from "../../../api/store/cart-notes/[cart_id]/route"
import { StorePostCartNotes } from "../../../api/store/cart-notes/validators"
import { cleanNote, notesOf, saveCartNotes, saveOrderNotes, withNotes } from "../order-notes"

const scopeWith = (entity: "cart" | "order", row: unknown) =>
  ({
    resolve: () => ({
      graph: async (q: { entity: string }) => {
        expect(q.entity).toBe(entity)
        return { data: row ? [row] : [] }
      },
    }),
  }) as never

afterEach(() => {
  updateCart.mockReset()
  updateOrder.mockReset()
})

describe("cleanNote", () => {
  it("keeps line breaks, drops control characters and trailing space, at most one empty line", () => {
    expect(cleanNote("  Kapucsengő: 12\u0007 \r\n\r\n\r\n\r\nNe hívjon  \t")).toBe("Kapucsengő: 12\n\nNe hívjon")
  })
  it("an empty or blank note is no note", () => {
    expect(cleanNote("  \n\t ")).toBeNull()
    expect(cleanNote(null)).toBeNull()
    expect(cleanNote(undefined)).toBeNull()
  })
})

describe("withNotes", () => {
  const stored = { aszf_elfogadas: { verzio: "1" }, acropora_customer_note: "régi", acropora_carrier_note: "kapu" }

  it("changes only the keys given, and never the rest of the metadata", () => {
    expect(withNotes(stored, { customer_note: "új" })).toEqual({ ...stored, acropora_customer_note: "új" })
  })
  it("an empty note removes its key", () => {
    expect(withNotes(stored, { carrier_note: "" })).toEqual({ aszf_elfogadas: { verzio: "1" }, acropora_customer_note: "régi" })
    expect(withNotes(stored, { customer_note: null })).toEqual({ aszf_elfogadas: { verzio: "1" }, acropora_carrier_note: "kapu" })
  })
  it("works on a cart with no metadata", () => {
    expect(withNotes(null, { customer_note: " Szia " })).toEqual({ acropora_customer_note: "Szia" })
  })
})

describe("the bodies", () => {
  it("allow 1000 characters to the shop and 50 to the courier, null to clear, nothing else", () => {
    expect(StorePostCartNotes.safeParse({ customer_note: "x".repeat(1000), carrier_note: "y".repeat(50) }).success).toBe(true)
    expect(StorePostCartNotes.safeParse({ customer_note: "x".repeat(1001) }).success).toBe(false)
    expect(StorePostCartNotes.safeParse({ carrier_note: "y".repeat(51) }).success).toBe(false)
    expect(StorePostCartNotes.safeParse({ customer_note: null, carrier_note: null }).success).toBe(true)
    expect(StorePostCartNotes.safeParse({ aszf_elfogadas: "x" }).success).toBe(false)
    expect(AdminPostOrderNotes).toBe(StorePostCartNotes)
  })
  it("both routes are validated", () => {
    for (const matcher of ["/store/cart-notes/:cart_id", "/admin/order-notes/:order_id"]) {
      expect((middlewares.routes ?? []).find((r) => r.matcher === matcher)?.middlewares).toHaveLength(1)
    }
  })
})

describe("saveCartNotes", () => {
  it("writes the merged metadata on an open cart and answers the notes", async () => {
    const result = await saveCartNotes(
      scopeWith("cart", { id: "cart_1", metadata: { egyeb: 1 }, completed_at: null }),
      "cart_1",
      { customer_note: "Délután", carrier_note: "Kapukód 12" }
    )
    expect(result).toEqual({ status: "saved", notes: { customer_note: "Délután", carrier_note: "Kapukód 12" } })
    expect(updateCart).toHaveBeenCalledWith({
      input: { id: "cart_1", metadata: { egyeb: 1, acropora_customer_note: "Délután", acropora_carrier_note: "Kapukód 12" } },
    })
  })
  it("refuses a cart already ordered, and a missing one, without writing", async () => {
    expect(await saveCartNotes(scopeWith("cart", { id: "cart_1", completed_at: new Date() }), "cart_1", { customer_note: "x" })).toEqual({
      status: "completed",
    })
    expect(await saveCartNotes(scopeWith("cart", null), "cart_9", { customer_note: "x" })).toEqual({ status: "not_found" })
    expect(updateCart).not.toHaveBeenCalled()
  })
})

describe("saveOrderNotes", () => {
  const order = (fulfillments: unknown[] = []) => ({
    id: "order_1",
    metadata: { acropora_customer_note: "régi", acropora_carrier_note: "kapu" },
    fulfillments,
  })

  it("writes the notes under the admin user", async () => {
    const result = await saveOrderNotes(scopeWith("order", order()), "order_1", { carrier_note: "hátsó bejárat" }, "user_1")
    expect(result).toEqual({ status: "saved", notes: { customer_note: "régi", carrier_note: "hátsó bejárat" } })
    expect(updateOrder).toHaveBeenCalledWith({
      input: {
        id: "order_1",
        user_id: "user_1",
        metadata: { acropora_customer_note: "régi", acropora_carrier_note: "hátsó bejárat" },
      },
    })
  })
  it("after the label is out the courier note stays, the shop note can still change", async () => {
    const labelled = scopeWith("order", order([{ id: "ful_1", canceled_at: null }]))
    expect(await saveOrderNotes(labelled, "order_1", { carrier_note: "más" }, "user_1")).toEqual({ status: "label_out" })
    expect(updateOrder).not.toHaveBeenCalled()
    expect((await saveOrderNotes(labelled, "order_1", { customer_note: "új", carrier_note: " kapu " }, "user_1")).status).toBe("saved")
  })
  it("a canceled fulfillment does not count as a label", async () => {
    const canceled = scopeWith("order", order([{ id: "ful_1", canceled_at: new Date() }]))
    expect((await saveOrderNotes(canceled, "order_1", { carrier_note: "más" }, "user_1")).status).toBe("saved")
  })
})

describe("the routes' answers", () => {
  const call = async (route: typeof storeRoute | typeof adminRoute, req: Record<string, unknown>) => {
    const res = { statusCode: 200, body: undefined as unknown, status: jest.fn(), json: jest.fn() }
    res.status.mockImplementation((code: number) => ((res.statusCode = code), res))
    res.json.mockImplementation((body: unknown) => (res.body = body))
    await route(req as never, res as never)
    return res
  }

  it("store: 404 and 409 in Hungarian, 200 with the notes", async () => {
    expect(await call(storeRoute, { scope: scopeWith("cart", null), params: { cart_id: "c" }, validatedBody: {} })).toMatchObject({
      statusCode: 404,
      body: { message: "Nincs ilyen kosár." },
    })
    expect(
      await call(storeRoute, { scope: scopeWith("cart", { id: "c", completed_at: 1 }), params: { cart_id: "c" }, validatedBody: {} })
    ).toMatchObject({ statusCode: 409 })
    expect(
      await call(storeRoute, {
        scope: scopeWith("cart", { id: "c", completed_at: null }),
        params: { cart_id: "c" },
        validatedBody: { customer_note: "x" },
      })
    ).toMatchObject({ statusCode: 200, body: { customer_note: "x", carrier_note: null } })
  })

  it("admin: 409 after the label, with the actor as the change's user", async () => {
    const labelled = scopeWith("order", { id: "o", metadata: {}, fulfillments: [{ id: "f" }] })
    expect(
      await call(adminRoute, {
        scope: labelled,
        params: { order_id: "o" },
        validatedBody: { carrier_note: "x" },
        auth_context: { actor_id: "user_7" },
      })
    ).toMatchObject({
      statusCode: 409,
      body: { message: "A csomag már feladásra került, a szállítónak szóló megjegyzés nem módosítható." },
    })
    await call(adminRoute, {
      scope: labelled,
      params: { order_id: "o" },
      validatedBody: { customer_note: "x" },
      auth_context: { actor_id: "user_7" },
    })
    expect(updateOrder).toHaveBeenCalledWith({ input: expect.objectContaining({ user_id: "user_7" }) })
  })
})

describe("notesOf", () => {
  it("reads only non-empty strings", () => {
    expect(notesOf({ acropora_customer_note: "  ", acropora_carrier_note: 5 })).toEqual({ customer_note: null, carrier_note: null })
  })
})
