const updateCart = jest.fn()
jest.mock("@medusajs/medusa/core-flows", () => ({
  updateCartWorkflow: () => ({ run: (args: unknown) => updateCart(args) }),
}))

import { POST as route } from "../../../api/store/carts/[id]/aszf-elfogadas/route"
import { StorePostAszfElfogadas } from "../../../api/store/carts/[id]/aszf-elfogadas/validators"
import middlewares from "../../../api/middlewares"
import {
  ASZF_FORRAS_MAI_BOLT,
  ASZF_VERZIO_MAI_BOLT,
  buildAszfRecord,
  fogyasztobaratEnabled,
  saveAszfAcceptance,
} from "../aszf-record"

/**
 * THE ÁSZF RECORD IS THE SERVER'S (audit A4). What must fail: the record's time,
 * version or document coming from the request; the cart's other metadata keys
 * lost in the write; an ordered cart rewritten; the endpoint taking more than
 * the customer's word; the route left without its validator.
 */
const scopeWith = (row: unknown) =>
  ({ resolve: () => ({ graph: async () => ({ data: row ? [row] : [] }) }) }) as never

const NOW = new Date("2026-10-27T12:00:00.000Z")

afterEach(() => {
  updateCart.mockReset()
  delete process.env.FOGYASZTOBARAT_ENABLED
})

describe("the record", () => {
  it("is the server's clock, version and document", () => {
    expect(buildAszfRecord(NOW)).toEqual({
      idopont: "2026-10-27T12:00:00.000Z",
      verzio: ASZF_VERZIO_MAI_BOLT,
      dokumentum: ASZF_FORRAS_MAI_BOLT,
    })
  })

  it("the Fogyasztóbarát switch is read as exactly 'true', trimmed like the storefront's", () => {
    expect(fogyasztobaratEnabled("true")).toBe(true)
    expect(fogyasztobaratEnabled(" true ")).toBe(true)
    for (const value of [undefined, "", "TRUE", "1", "false"]) expect(fogyasztobaratEnabled(value)).toBe(false)
  })
})

describe("saveAszfAcceptance", () => {
  it("writes the record on an open cart and keeps the other metadata keys", async () => {
    const result = await saveAszfAcceptance(
      scopeWith({ id: "cart_1", metadata: { acropora_pickup_cart_id: "cart_2", acropora_customer_note: "x" }, completed_at: null }),
      "cart_1",
      NOW
    )
    expect(result).toEqual({ status: "saved", record: buildAszfRecord(NOW) })
    expect(updateCart).toHaveBeenCalledWith({
      input: {
        id: "cart_1",
        metadata: {
          acropora_pickup_cart_id: "cart_2",
          acropora_customer_note: "x",
          aszf_elfogadas: buildAszfRecord(NOW),
        },
      },
    })
  })

  it("replaces an earlier record (a second accept) with the new moment", async () => {
    await saveAszfAcceptance(
      scopeWith({ id: "cart_1", metadata: { aszf_elfogadas: { idopont: "2020-01-01T00:00:00.000Z", verzio: "hamis" } } }),
      "cart_1",
      NOW
    )
    const written = (updateCart.mock.calls[0][0] as { input: { metadata: Record<string, unknown> } }).input.metadata
    expect(written.aszf_elfogadas).toEqual(buildAszfRecord(NOW))
  })

  it("an ordered cart and a missing one are not written", async () => {
    expect(await saveAszfAcceptance(scopeWith({ id: "cart_1", completed_at: new Date() }), "cart_1", NOW)).toEqual({
      status: "completed",
    })
    expect(await saveAszfAcceptance(scopeWith(null), "cart_9", NOW)).toEqual({ status: "not_found" })
    expect(updateCart).not.toHaveBeenCalled()
  })

  it("with the Fogyasztóbarát switch on it records nothing: the document is not one the backend can name yet", async () => {
    process.env.FOGYASZTOBARAT_ENABLED = "true"
    expect(await saveAszfAcceptance(scopeWith({ id: "cart_1", metadata: {} }), "cart_1", NOW)).toEqual({
      status: "unsupported_document",
    })
    expect(updateCart).not.toHaveBeenCalled()
  })
})

describe("the route", () => {
  const call = async (id: string, row: unknown) => {
    const res = { statusCode: 200, sent: undefined as unknown, status(c: number) { this.statusCode = c; return this }, json(b: unknown) { this.sent = b } }
    await route({ params: { id }, scope: scopeWith(row) } as never, res as never)
    return res
  }

  it("answers the stored record", async () => {
    const res = await call("cart_1", { id: "cart_1", metadata: {} })
    expect(res.statusCode).toBe(200)
    expect((res.sent as { aszf_elfogadas: { verzio: string } }).aszf_elfogadas.verzio).toBe(ASZF_VERZIO_MAI_BOLT)
  })

  it("404 for no cart, 409 for an ordered one, 501 for a document it cannot record", async () => {
    expect((await call("cart_9", null)).statusCode).toBe(404)
    expect((await call("cart_1", { id: "cart_1", completed_at: new Date() })).statusCode).toBe(409)
    process.env.FOGYASZTOBARAT_ENABLED = "true"
    expect((await call("cart_1", { id: "cart_1", metadata: {} })).statusCode).toBe(501)
  })
})

describe("the request body", () => {
  it("is the customer's word and nothing else", () => {
    expect(StorePostAszfElfogadas.safeParse({ elfogadom: true }).success).toBe(true)
    for (const body of [
      {},
      { elfogadom: false },
      { elfogadom: "igen" },
      { elfogadom: true, idopont: "2020-01-01T00:00:00.000Z" },
      { elfogadom: true, verzio: "hamis" },
      { elfogadom: true, dokumentum: "https://x" },
    ]) {
      expect(StorePostAszfElfogadas.safeParse(body).success).toBe(false)
    }
  })

  it("the route validates it", () => {
    const entry = middlewares.routes?.find(
      (r) =>
        r.matcher === "/store/carts/:id/aszf-elfogadas" &&
        ((r as { methods?: string[] }).methods ?? []).includes("POST")
    )
    expect(entry?.middlewares?.length).toBe(1)
  })
})
