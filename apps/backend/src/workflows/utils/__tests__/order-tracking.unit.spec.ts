const updateOrder = jest.fn()
jest.mock("@medusajs/medusa/core-flows", () => ({
  updateOrderWorkflow: () => ({ run: (args: unknown) => updateOrder(args) }),
}))

import {
  saveShippingTracking,
  TRACKING_CARRIER_KEY,
  TRACKING_NUMBER_KEY,
  TRACKING_URL_KEY,
  trackingOf,
  trackingPatch,
} from "../order-tracking"

/*
  WHAT TURNS THIS RED (V1.1). A STUB- number stored as a parcel; the same data written again (a retried
  notice must write nothing); a new number not replacing the old one (a relabelled parcel); a link
  built by the shop (none is ever invented); the rest of the metadata (notes, language, terms record)
  touched; a stale link surviving a notice that carries none.
*/
const rest = {
  acropora_customer_note: "kapucsengő",
  aszf_elfogadas: { verzio: "1" },
}
const notice = {
  carrier: "foxpost",
  tracking_number: "CLFOX0123456789",
  tracking_url: "https://carrier.example/t/1",
}

afterEach(() => updateOrder.mockReset())

describe("trackingOf", () => {
  it("reads the three keys, a missing link is null", () => {
    expect(
      trackingOf({
        [TRACKING_CARRIER_KEY]: "gls",
        [TRACKING_NUMBER_KEY]: "12345",
      }),
    ).toEqual({ carrier: "gls", number: "12345", url: null })
    expect(
      trackingOf({
        [TRACKING_CARRIER_KEY]: "gls",
        [TRACKING_NUMBER_KEY]: "12345",
        [TRACKING_URL_KEY]: "https://x.example/1",
      }),
    ).toEqual({ carrier: "gls", number: "12345", url: "https://x.example/1" })
  })

  it("is null without a number or a carrier, or when they are not text", () => {
    expect(trackingOf(null)).toBeNull()
    expect(trackingOf({})).toBeNull()
    expect(trackingOf({ [TRACKING_NUMBER_KEY]: "1" })).toBeNull()
    expect(trackingOf({ [TRACKING_CARRIER_KEY]: "gls" })).toBeNull()
    expect(trackingOf({ [TRACKING_CARRIER_KEY]: "gls", [TRACKING_NUMBER_KEY]: 5 })).toBeNull()
    expect(
      trackingOf({
        [TRACKING_CARRIER_KEY]: "gls",
        [TRACKING_NUMBER_KEY]: "  ",
      }),
    ).toBeNull()
  })
})

describe("trackingPatch", () => {
  it("is exactly the three keys, and nothing of the rest of the metadata", () => {
    expect(trackingPatch(rest, notice)).toEqual({
      [TRACKING_CARRIER_KEY]: "foxpost",
      [TRACKING_NUMBER_KEY]: "CLFOX0123456789",
      [TRACKING_URL_KEY]: "https://carrier.example/t/1",
    })
  })

  it("the same data again writes nothing", () => {
    const stored = { ...rest, ...trackingPatch(rest, notice)! }
    expect(trackingPatch(stored, notice)).toBeNull()
  })

  it("a new number replaces the old one", () => {
    const stored = { ...rest, ...trackingPatch(rest, notice)! }
    const next = trackingPatch(stored, { ...notice, tracking_number: "CLFOX0000000001" })!
    expect(next[TRACKING_NUMBER_KEY]).toBe("CLFOX0000000001")
  })

  it("a notice without a link sends the link key as an EMPTY TEXT (that removes a stored link: the merge keeps a key that is left out)", () => {
    const stored = { ...rest, ...trackingPatch(rest, notice)! }
    const next = trackingPatch(stored, { carrier: "foxpost", tracking_number: "CLFOX0123456789" })!
    expect(next[TRACKING_URL_KEY]).toBe("")
    expect(Object.keys(next).sort()).toEqual([TRACKING_CARRIER_KEY, TRACKING_NUMBER_KEY, TRACKING_URL_KEY].sort())
    // and with no stored link at all the link is never built: the key is empty
    expect(trackingPatch({}, { carrier: "gls", tracking_number: "99" })![TRACKING_URL_KEY]).toBe("")
  })

  it("a link that was stored and is sent again is unchanged, an empty one against no link is unchanged too", () => {
    const noLink = { carrier: "gls", tracking_number: "99" }
    const stored = { ...rest, ...trackingPatch({}, noLink)! }
    expect(trackingPatch(stored, noLink)).toBeNull()
  })

  it("a STUB- number or a blank number is never stored", () => {
    expect(trackingPatch(rest, { ...notice, tracking_number: "STUB-123" })).toBeNull()
    expect(trackingPatch(rest, { ...notice, tracking_number: "stub-123" })).toBeNull()
    expect(trackingPatch(rest, { ...notice, tracking_number: "   " })).toBeNull()
  })

  it("works on an order without metadata", () => {
    expect(trackingPatch(null, notice)?.[TRACKING_NUMBER_KEY]).toBe("CLFOX0123456789")
    expect(trackingPatch(undefined, notice)?.[TRACKING_NUMBER_KEY]).toBe("CLFOX0123456789")
  })
})

describe("saveShippingTracking", () => {
  const scopeWith = (row: unknown) =>
    ({ resolve: () => ({ graph: async () => ({ data: row ? [row] : [] }) }) }) as never

  it("no such order: not_found, nothing written", async () => {
    expect(await saveShippingTracking(scopeWith(null), "order_1", notice, "user_1")).toBe("not_found")
    expect(updateOrder).not.toHaveBeenCalled()
  })

  it("sends EXACTLY the three keys under the caller's id: no other key, even though the stored metadata has them", async () => {
    expect(await saveShippingTracking(scopeWith({ id: "order_1", metadata: rest }), "order_1", notice, "user_1")).toBe(
      "saved",
    )
    expect(updateOrder).toHaveBeenCalledTimes(1)
    const input = updateOrder.mock.calls[0][0].input
    expect(input.id).toBe("order_1")
    expect(input.user_id).toBe("user_1")
    expect(Object.keys(input.metadata).sort()).toEqual(
      [TRACKING_CARRIER_KEY, TRACKING_NUMBER_KEY, TRACKING_URL_KEY].sort(),
    )
    expect(input.metadata[TRACKING_NUMBER_KEY]).toBe("CLFOX0123456789")
  })

  it("a relabelled parcel without a link sends the link as an empty text", async () => {
    const stored = { ...rest, ...trackingPatch(rest, notice)! }
    expect(
      await saveShippingTracking(
        scopeWith({ id: "order_1", metadata: stored }),
        "order_1",
        { carrier: "foxpost", tracking_number: "CLFOX0000000002" },
        "user_1",
      ),
    ).toBe("saved")
    expect(updateOrder.mock.calls[0][0].input.metadata[TRACKING_URL_KEY]).toBe("")
  })

  it("already stored: unchanged, nothing written (a retried notice)", async () => {
    const stored = { ...rest, ...trackingPatch(rest, notice)! }
    expect(
      await saveShippingTracking(scopeWith({ id: "order_1", metadata: stored }), "order_1", notice, "user_1"),
    ).toBe("unchanged")
    expect(updateOrder).not.toHaveBeenCalled()
  })

  it("a STUB- number: unchanged, nothing written", async () => {
    expect(
      await saveShippingTracking(
        scopeWith({ id: "order_1", metadata: rest }),
        "order_1",
        { ...notice, tracking_number: "STUB-1" },
        "user_1",
      ),
    ).toBe("unchanged")
    expect(updateOrder).not.toHaveBeenCalled()
  })
})
