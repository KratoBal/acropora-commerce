import {
  INVOICE_SECRET_ENV,
  INVOICE_URL_ENV,
  invoiceLinkConfig,
  requestInvoiceLinks,
  signLinkRequest,
} from "../invoice-link"

/*
  WHAT TURNS THIS RED (V1.1). The signature drifting from the OS's (the fixed vector below is the same one the OS's spec
  holds: both sides must keep it); a short or missing secret, or a missing or non-http address, leaving the feature ON; the
  request carrying anything but the order id, the time and the signature; an OS answer that is not a clean 200 with a list of
  well-formed download links being handed on; the OS's own error text reaching the caller.
*/
const SECRET = "s".repeat(40)
const URL_OK = "https://api.example.test/api/integrations/webshop-invoice/link"
const LINK = "https://api.example.test/api/integrations/webshop-invoice/download/abc.def"
const config = { secret: SECRET, url: URL_OK }

const answer = (status: number, body: unknown) =>
  jest.fn().mockResolvedValue({ status, json: async () => body } as unknown as Response)

describe("signLinkRequest", () => {
  it("matches the OS's signature for the fixed vector", () => {
    expect(signLinkRequest(SECRET, "order_1", 1_800_000_000)).toBe("54bMT1ZRIkVEDtKczpDZi-4LrMkVaUfqYrgn90XcxUw")
  })
  it("changes with the order, the time and the secret", () => {
    const base = signLinkRequest(SECRET, "order_1", 1_800_000_000)
    expect(signLinkRequest(SECRET, "order_2", 1_800_000_000)).not.toBe(base)
    expect(signLinkRequest(SECRET, "order_1", 1_800_000_001)).not.toBe(base)
    expect(signLinkRequest("t".repeat(40), "order_1", 1_800_000_000)).not.toBe(base)
  })
})

describe("invoiceLinkConfig", () => {
  it("is on only with a 32+ character secret and an http(s) address", () => {
    expect(invoiceLinkConfig({ [INVOICE_SECRET_ENV]: SECRET, [INVOICE_URL_ENV]: URL_OK })).toEqual({
      secret: SECRET,
      url: URL_OK,
    })
    for (const env of [
      {},
      { [INVOICE_SECRET_ENV]: SECRET },
      { [INVOICE_URL_ENV]: URL_OK },
      { [INVOICE_SECRET_ENV]: "short", [INVOICE_URL_ENV]: URL_OK },
      { [INVOICE_SECRET_ENV]: "", [INVOICE_URL_ENV]: URL_OK },
      { [INVOICE_SECRET_ENV]: SECRET, [INVOICE_URL_ENV]: "ftp://x.test/y" },
      { [INVOICE_SECRET_ENV]: SECRET, [INVOICE_URL_ENV]: "not a url" },
    ])
      expect(invoiceLinkConfig(env)).toBeNull()
  })
})

describe("requestInvoiceLinks", () => {
  it("posts the signed request (order id, time, signature only) and returns the clean documents", async () => {
    const fetcher = answer(200, {
      documents: [{ invoice_number: "SZ/1", document_type: "INVOICE", issue_date: "2026-11-01T10:00:00.000Z", url: LINK }],
    })
    const outcome = await requestInvoiceLinks("order_1", config, { fetcher, now: () => 1_800_000_000_000 })
    expect(outcome).toEqual({
      kind: "ok",
      documents: [{ invoice_number: "SZ/1", document_type: "INVOICE", issue_date: "2026-11-01T10:00:00.000Z", url: LINK }],
    })
    const [url, init] = fetcher.mock.calls[0]!
    expect(url).toBe(URL_OK)
    expect(init.method).toBe("POST")
    expect(JSON.parse(init.body)).toEqual({
      order_id: "order_1",
      ts: 1_800_000_000,
      sig: "54bMT1ZRIkVEDtKczpDZi-4LrMkVaUfqYrgn90XcxUw",
    })
  })

  it("an empty list is a clean answer (no invoice yet)", async () => {
    expect(await requestInvoiceLinks("order_1", config, { fetcher: answer(200, { documents: [] }) })).toEqual({
      kind: "ok",
      documents: [],
    })
  })

  it("is unavailable without a configuration, on a non-200, on a network error, and on a malformed body", async () => {
    expect(await requestInvoiceLinks("order_1", null)).toEqual({ kind: "unavailable" })
    expect(await requestInvoiceLinks("order_1", config, { fetcher: answer(404, {}) })).toEqual({ kind: "unavailable" })
    expect(await requestInvoiceLinks("order_1", config, { fetcher: answer(500, { message: "secret detail" }) })).toEqual({
      kind: "unavailable",
    })
    expect(
      await requestInvoiceLinks("order_1", config, { fetcher: jest.fn().mockRejectedValue(new Error("down")) }),
    ).toEqual({ kind: "unavailable" })
    expect(await requestInvoiceLinks("order_1", config, { fetcher: answer(200, { documents: "no" }) })).toEqual({
      kind: "unavailable",
    })
    expect(await requestInvoiceLinks("order_1", config, { fetcher: answer(200, null) })).toEqual({ kind: "unavailable" })
  })

  it("one malformed document (a foreign link, an unknown type, no link) makes the whole answer unavailable", async () => {
    const good = { invoice_number: "SZ/1", document_type: "INVOICE", issue_date: null, url: LINK }
    // a correction invoice is one of the documents the customer gets
    expect(
      await requestInvoiceLinks("order_1", config, {
        fetcher: answer(200, { documents: [{ ...good, document_type: "CORRECTION" }] }),
      }),
    ).toEqual({ kind: "ok", documents: [{ ...good, document_type: "CORRECTION" }] })
    for (const bad of [
      { ...good, url: "https://evil.test/elsewhere" },
      { ...good, url: "javascript:alert(1)" },
      { ...good, document_type: "PROFORMA" },
      { ...good, url: undefined },
      null,
      "text",
    ])
      expect(
        await requestInvoiceLinks("order_1", config, { fetcher: answer(200, { documents: [good, bad] }) }),
      ).toEqual({ kind: "unavailable" })
  })
})
