import { beforeEach, describe, expect, it, vi } from "vitest"

const fetchMock = vi.fn()
vi.mock("@lib/config", () => ({
  sdk: { client: { fetch: (...a: unknown[]) => fetchMock(...a) } },
}))
let realIp: string | null = "203.0.113.7"
vi.mock("next/headers", () => ({
  headers: async () => ({
    get: (n: string) => (n === "x-real-ip" ? realIp : null),
  }),
}))

import { lookupGuestOrder } from "./guest-order"
import { requestGuestInvoice } from "./guest-invoice"

/**
 * A KERESES ES A SZAMLA-KERES LATOGATONKENTI KORLATA A SZERVER-MUVELETEKBEN. MI PIROSIT: ha a 21. keres is eljut a bolthoz; ha a
 * korlat a latogato helyett mindenkit egy kulcsba tesz; ha a fejlec nelkuli keres is korlat ala esik; ha a keresesek es a szamla-
 * kerek egy keretbol fogynak.
 */
beforeEach(() => fetchMock.mockReset())

describe("lookupGuestOrder: per visitor", () => {
  it("passes twenty requests of one visitor to the shop and answers the 21st with too_many WITHOUT asking the shop", async () => {
    realIp = "203.0.113.11"
    fetchMock.mockResolvedValue({ orders: [{ display_id: 1 }] })
    for (let i = 0; i < 20; i += 1)
      expect(
        await lookupGuestOrder({ orderNumber: "1", email: "a@b.hu" }),
      ).toMatchObject({ ok: true })
    const refused = await lookupGuestOrder({
      orderNumber: "1",
      email: "a@b.hu",
    })
    expect(refused).toEqual({ ok: false, kind: "too_many" })
    expect(fetchMock).toHaveBeenCalledTimes(20)
    // another visitor is not affected
    realIp = "203.0.113.12"
    expect(
      await lookupGuestOrder({ orderNumber: "1", email: "a@b.hu" }),
    ).toMatchObject({ ok: true })
  })

  it("does not limit a request without the proxy header (no shared key)", async () => {
    realIp = null
    fetchMock.mockResolvedValue({ orders: [{ display_id: 1 }] })
    for (let i = 0; i < 40; i += 1)
      expect(
        await lookupGuestOrder({ orderNumber: "1", email: "a@b.hu" }),
      ).toMatchObject({ ok: true })
    expect(fetchMock).toHaveBeenCalledTimes(40)
  })
})

describe("requestGuestInvoice: per visitor, apart from the lookup", () => {
  it("refuses the 21st invoice request of one visitor without asking the shop; the lookup allowance is separate", async () => {
    realIp = "203.0.113.21"
    fetchMock.mockResolvedValue({ documents: [] })
    for (let i = 0; i < 20; i += 1)
      expect(
        await requestGuestInvoice({ orderNumber: "1", email: "a@b.hu" }),
      ).toEqual({ ok: true, documents: [] })
    expect(
      await requestGuestInvoice({ orderNumber: "1", email: "a@b.hu" }),
    ).toEqual({ ok: false })
    expect(fetchMock).toHaveBeenCalledTimes(20)
    // the same visitor's lookups still have their own allowance
    fetchMock.mockResolvedValue({ orders: [{ display_id: 1 }] })
    expect(
      await lookupGuestOrder({ orderNumber: "1", email: "a@b.hu" }),
    ).toMatchObject({ ok: true })
  })
})
