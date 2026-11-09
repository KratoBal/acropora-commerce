const updateCart = jest.fn()
jest.mock("@medusajs/medusa/core-flows", () => ({
  updateCartWorkflow: () => ({ run: (args: unknown) => updateCart(args) }),
}))

import { mergeMetadata } from "@medusajs/framework/utils"

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

const CLAIM = { verzio: ASZF_VERZIO_MAI_BOLT, nyelv: "hu" as const }
const FB_CLAIM = { verzio: "fogyasztobarat-JPNFMVH0", nyelv: "hu" as const }

const NOW = new Date("2026-10-27T12:00:00.000Z")

afterEach(() => {
  updateCart.mockReset()
  delete process.env.FOGYASZTOBARAT_ENABLED
  delete process.env.FOGYASZTOBARAT_ID_HU
  delete process.env.LEGAL_GATE_MODE
  delete process.env.ACROPORA_STOREFRONT_URL
})

describe("the record", () => {
  it("is the server's clock, version and document", () => {
    expect(buildAszfRecord(NOW)).toEqual({
      idopont: "2026-10-27T12:00:00.000Z",
      verzio: ASZF_VERZIO_MAI_BOLT,
      dokumentum: ASZF_FORRAS_MAI_BOLT,
      nyelv: "hu",
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
    // a redirect could hand back another document's bytes under this source
    expect((fetcher as jest.Mock).mock.calls[0][1].redirect).toBe("error")
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
  // WHAT TURNS THIS RED (a0f8668e, barracuda #644): the write sending the cart's other keys back (a full-picture write can undo a
  // key another writer set in between); the record not under its own key. Medusa merges the one key into the cart's metadata.
  it("sends only its own key on an open cart; merged the way Medusa merges, the other keys stay", async () => {
    const result = await saveAszfAcceptance(
      scopeWith({ id: "cart_1", metadata: { acropora_pickup_cart_id: "cart_2", acropora_customer_note: "x" }, completed_at: null }),
      "cart_1", CLAIM,
      NOW
    )
    expect(result).toEqual({ status: "saved", record: buildAszfRecord(NOW) })
    expect(updateCart).toHaveBeenCalledWith({
      input: { id: "cart_1", metadata: { aszf_elfogadas: buildAszfRecord(NOW) } },
    })
    const sent = (updateCart.mock.calls[0][0] as { input: { metadata: Record<string, unknown> } }).input.metadata
    expect(mergeMetadata({ acropora_pickup_cart_id: "cart_2", acropora_customer_note: "x" }, sent)).toEqual({
      acropora_pickup_cart_id: "cart_2",
      acropora_customer_note: "x",
      aszf_elfogadas: buildAszfRecord(NOW),
    })
  })

  it("replaces an earlier record (a second accept) with the new moment", async () => {
    await saveAszfAcceptance(
      scopeWith({ id: "cart_1", metadata: { aszf_elfogadas: { idopont: "2020-01-01T00:00:00.000Z", verzio: "hamis" } } }),
      "cart_1", CLAIM,
      NOW
    )
    const written = (updateCart.mock.calls[0][0] as { input: { metadata: Record<string, unknown> } }).input.metadata
    expect(written.aszf_elfogadas).toEqual(buildAszfRecord(NOW))
  })

  it("an ordered cart and a missing one are not written", async () => {
    expect(await saveAszfAcceptance(scopeWith({ id: "cart_1", completed_at: new Date() }), "cart_1", CLAIM, NOW)).toEqual({
      status: "completed",
    })
    expect(await saveAszfAcceptance(scopeWith(null), "cart_9", CLAIM, NOW)).toEqual({ status: "not_found" })
    expect(updateCart).not.toHaveBeenCalled()
  })

  it("with the Fogyasztóbarát switch on it records that document instead of stopping", async () => {
    process.env.FOGYASZTOBARAT_ENABLED = "true"
    const result = await saveAszfAcceptance(scopeWith({ id: "cart_1", metadata: {} }), "cart_1", FB_CLAIM, NOW, answering(DOC))
    expect(result).toMatchObject({ status: "saved", record: { verzio: "fogyasztobarat-JPNFMVH0", hatalyos: "2026-10-05" } })
    const written = (updateCart.mock.calls[0][0] as { input: { metadata: { aszf_elfogadas: unknown } } }).input.metadata
    expect(written.aszf_elfogadas).toEqual((result as { record: unknown }).record)
  })

  it("with the switch on and no Hungarian shop id it records nothing", async () => {
    process.env.FOGYASZTOBARAT_ENABLED = "true"
    process.env.FOGYASZTOBARAT_ID_HU = ""
    expect(await saveAszfAcceptance(scopeWith({ id: "cart_1", metadata: {} }), "cart_1", FB_CLAIM, NOW)).toEqual({
      status: "not_configured",
    })
    expect(updateCart).not.toHaveBeenCalled()
  })

  /**
   * THE TWO SWITCHES CANNOT DRIFT APART IN SILENCE (barracuda, #622). MI PIROSÍT:
   * ha a háttér Fogyasztóbarát-rekordot írna, miközben a kirakat a mai bolt
   * ÁSZF-jét mutatta (és fordítva); ha egy angol elfogadás magyar dokumentumra
   * szóló rekordot kapna.
   */
  it("backend on, the shop showed the old shop's ÁSZF: refused, nothing written", async () => {
    process.env.FOGYASZTOBARAT_ENABLED = "true"
    expect(await saveAszfAcceptance(scopeWith({ id: "cart_1", metadata: {} }), "cart_1", CLAIM, NOW, answering(DOC))).toEqual({
      status: "version_mismatch",
    })
    expect(updateCart).not.toHaveBeenCalled()
  })

  it("backend off, the shop showed the Fogyasztóbarát document: refused too", async () => {
    expect(await saveAszfAcceptance(scopeWith({ id: "cart_1", metadata: {} }), "cart_1", FB_CLAIM, NOW)).toEqual({
      status: "version_mismatch",
    })
    expect(updateCart).not.toHaveBeenCalled()
  })

  it("an English acceptance is refused even with the English source filled in: the record would name the Hungarian text", async () => {
    process.env.FOGYASZTOBARAT_ENABLED = "true"
    process.env.FOGYASZTOBARAT_ID_EN = "ENSHOP01"
    expect(
      await saveAszfAcceptance(scopeWith({ id: "cart_1", metadata: {} }), "cart_1", { ...FB_CLAIM, nyelv: "en" }, NOW, answering(DOC))
    ).toEqual({ status: "language_unsupported" })
    expect(updateCart).not.toHaveBeenCalled()
  })

  it("the record carries the language it names", async () => {
    expect(buildAszfRecord(NOW).nyelv).toBe("hu")
    expect((await buildFogyasztobaratRecord(NOW, "JPNFMVH0", answering(DOC))).nyelv).toBe("hu")
  })
})

describe("the test mode record (Balázs 2026-11-02)", () => {
  const TEST_CLAIM = { verzio: "teszt-mod", nyelv: "hu" as const }
  const testMode = () => {
    process.env.LEGAL_GATE_MODE = "test"
    process.env.ACROPORA_STOREFRONT_URL = "https://shop-staging.acropora.hu"
  }

  it("is marked as a test-mode acceptance and names no document; no Fogyasztóbarát request is made", async () => {
    testMode()
    const fetcher = answering(DOC)
    const result = await saveAszfAcceptance(scopeWith({ id: "cart_1", metadata: {} }), "cart_1", TEST_CLAIM, NOW, fetcher)
    expect(result).toMatchObject({
      status: "saved",
      record: { verzio: "teszt-mod", teszt_mod: true, nyelv: "hu", idopont: NOW.toISOString() },
    })
    expect((result as { record: { dokumentum: string } }).record.dokumentum).toContain("nincs")
    expect(fetcher).not.toHaveBeenCalled()
    const written = (updateCart.mock.calls[0][0] as { input: { metadata: { aszf_elfogadas: unknown } } }).input.metadata
    expect(written.aszf_elfogadas).toEqual((result as { record: unknown }).record)
  })

  it("a storefront that showed the old shop's ÁSZF, or the Fogyasztóbarát one, is refused (the two modes cannot drift)", async () => {
    testMode()
    for (const claim of [CLAIM, FB_CLAIM])
      expect(await saveAszfAcceptance(scopeWith({ id: "cart_1", metadata: {} }), "cart_1", claim, NOW)).toEqual({
        status: "version_mismatch",
      })
    expect(updateCart).not.toHaveBeenCalled()
  })

  it("on the live shop test mode is not granted: the test claim is refused, nothing is written", async () => {
    testMode()
    process.env.ACROPORA_STOREFRONT_URL = "https://shop.acropora.hu"
    expect(await saveAszfAcceptance(scopeWith({ id: "cart_1", metadata: {} }), "cart_1", TEST_CLAIM, NOW)).toEqual({
      status: "version_mismatch",
    })
    expect(updateCart).not.toHaveBeenCalled()
  })
})

describe("the route", () => {
  const call = async (id: string, row: unknown, claim = CLAIM) => {
    const res = { statusCode: 200, sent: undefined as unknown, status(c: number) { this.statusCode = c; return this }, json(b: unknown) { this.sent = b } }
    await route(
      { params: { id }, scope: scopeWith(row), validatedBody: { elfogadom: true, megjelenitett_verzio: claim.verzio, nyelv: claim.nyelv } } as never,
      res as never
    )
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

  it("409 with its own code when the shop showed another version or an unwired language", async () => {
    const mismatch = await call("cart_1", { id: "cart_1", metadata: {} }, FB_CLAIM)
    expect(mismatch.statusCode).toBe(409)
    expect((mismatch.sent as { code: string }).code).toBe("aszf_version_mismatch")
    const language = await call("cart_1", { id: "cart_1", metadata: {} }, { ...CLAIM, nyelv: "en" })
    expect(language.statusCode).toBe(409)
    expect((language.sent as { code: string }).code).toBe("aszf_language_unsupported")
  })
})

describe("the request body", () => {
  it("is the customer's word and nothing else", () => {
    const ok = { elfogadom: true, megjelenitett_verzio: "unas-shop-2026-09-29", nyelv: "hu" }
    expect(StorePostAszfElfogadas.safeParse(ok).success).toBe(true)
    for (const body of [
      {},
      { elfogadom: true },
      { ...ok, nyelv: "de" },
      { ...ok, megjelenitett_verzio: "" },
      { elfogadom: false },
      { elfogadom: "igen" },
      { ...ok, idopont: "2020-01-01T00:00:00.000Z" },
      { ...ok, verzio: "hamis" },
      { ...ok, dokumentum: "https://x" },
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
