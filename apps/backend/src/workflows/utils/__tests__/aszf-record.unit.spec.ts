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
  aszfEffectiveDate,
  buildAszfRecord,
  buildFogyasztobaratRecord,
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
  delete process.env.FOGYASZTOBARAT_ID_HU
})

describe("the record", () => {
  it("is the server's clock, version and document", () => {
    expect(buildAszfRecord(NOW)).toEqual({
      idopont: "2026-10-27T12:00:00.000Z",
      verzio: ASZF_VERZIO_MAI_BOLT,
      dokumentum: ASZF_FORRAS_MAI_BOLT,
    })
  })

})

const DOC = '<h1>Acropora - hatályos ettől a naptól: <span class="d">2026-10-05</span></h1><p>szöveg</p>'
const answering = (body: string, status = 200) =>
  jest.fn(async () => new Response(body, { status })) as unknown as typeof fetch & jest.Mock

describe("the Fogyasztóbarát record", () => {
  it("names the document, the effective date its text states and the hash of the bytes", async () => {
    const fetcher = answering(DOC)
    const record = await buildFogyasztobaratRecord(NOW, "JPNFMVH0", fetcher)
    expect(record).toMatchObject({
      idopont: NOW.toISOString(),
      verzio: "fogyasztobarat-JPNFMVH0",
      dokumentum: "https://admin.fogyasztobarat.hu/api.php?aszf=JPNFMVH0",
      hatalyos: "2026-10-05",
    })
    expect(record.lenyomat).toBe(
      `sha256:${require("node:crypto").createHash("sha256").update(Buffer.from(DOC)).digest("hex")}`
    )
    expect((fetcher as jest.Mock).mock.calls[0][1].headers.Referer).toBe("https://shop.acropora.hu/")
  })

  it("an error code in a 200 body, an error status or a thrown request: the order goes on, the record says what is missing", async () => {
    for (const fetcher of [
      answering("Hibakód: 1002"),
      answering("x", 500),
      jest.fn(async () => {
        throw new Error("timeout")
      }) as unknown as typeof fetch,
    ])
      expect(await buildFogyasztobaratRecord(NOW, "JPNFMVH0", fetcher)).toMatchObject({
        verzio: "fogyasztobarat-JPNFMVH0",
        hatalyos: null,
        lenyomat: "nincs",
      })
  })

  it("the date is read from the header sentence only; no sentence, no date", () => {
    expect(aszfEffectiveDate(DOC)).toBe("2026-10-05")
    expect(aszfEffectiveDate("<p>2026-10-05</p>")).toBeNull()
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

  it("with the Fogyasztóbarát switch on it records that document instead of stopping", async () => {
    process.env.FOGYASZTOBARAT_ENABLED = "true"
    const result = await saveAszfAcceptance(scopeWith({ id: "cart_1", metadata: {} }), "cart_1", NOW, answering(DOC))
    expect(result).toMatchObject({ status: "saved", record: { verzio: "fogyasztobarat-JPNFMVH0", hatalyos: "2026-10-05" } })
    const written = (updateCart.mock.calls[0][0] as { input: { metadata: { aszf_elfogadas: unknown } } }).input.metadata
    expect(written.aszf_elfogadas).toEqual((result as { record: unknown }).record)
  })

  it("with the switch on and no Hungarian shop id it records nothing", async () => {
    process.env.FOGYASZTOBARAT_ENABLED = "true"
    process.env.FOGYASZTOBARAT_ID_HU = ""
    expect(await saveAszfAcceptance(scopeWith({ id: "cart_1", metadata: {} }), "cart_1", NOW)).toEqual({
      status: "not_configured",
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

  it("404 for no cart, 409 for an ordered one, 503 with the switch on and no Hungarian shop id", async () => {
    expect((await call("cart_9", null)).statusCode).toBe(404)
    expect((await call("cart_1", { id: "cart_1", completed_at: new Date() })).statusCode).toBe(409)
    process.env.FOGYASZTOBARAT_ENABLED = "true"
    process.env.FOGYASZTOBARAT_ID_HU = ""
    expect((await call("cart_1", { id: "cart_1", metadata: {} })).statusCode).toBe(503)
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
