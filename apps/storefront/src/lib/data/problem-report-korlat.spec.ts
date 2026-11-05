import { beforeEach, describe, expect, it, vi } from "vitest"

const fetchMock = vi.fn()
vi.mock("@lib/config", () => ({
  sdk: { client: { fetch: (...a: unknown[]) => fetchMock(...a) } },
}))
let realIp: string | null = "203.0.113.31"
vi.mock("next/headers", () => ({
  headers: async () => ({
    get: (n: string) => (n === "x-real-ip" ? realIp : null),
  }),
}))

import { BEJELENTES_KORLAT } from "@lib/util/vendeg-korlat"

import { submitProblemReport } from "./problem-report"

/**
 * A PROBLEMA-BEJELENTES LATOGATONKENTI KORLATJA. MI PIROSIT: ha a keret feletti bejelentes eljut a bolthoz; ha egy latogato mas
 * latogato keretet fogyasztja; ha a fejlec nelkuli kerest korlat ala esik (kozos kulcs); ha a hiba nem a "tul sok" szoveget adja.
 */
const bejelentes = () =>
  submitProblemReport({
    orderNumber: "1043",
    email: "vevo@example.hu",
    kind: "item_damaged" as never,
    itemIds: ["item_1"],
    description: "Eltörött.",
    photoIds: [],
  })

beforeEach(() => fetchMock.mockReset())

describe("submitProblemReport: per visitor", () => {
  it("refuses the request over the limit with too_many WITHOUT asking the shop; another visitor is not affected", async () => {
    realIp = "203.0.113.31"
    fetchMock.mockResolvedValue({
      report_id: "R1",
      created_at: "2026-11-05T00:00:00.000Z",
    })
    for (let i = 0; i < BEJELENTES_KORLAT.max; i += 1)
      expect(await bejelentes()).toMatchObject({ ok: true })
    expect(await bejelentes()).toEqual({ ok: false, failure: "too_many" })
    expect(fetchMock).toHaveBeenCalledTimes(BEJELENTES_KORLAT.max)
    realIp = "203.0.113.32"
    expect(await bejelentes()).toMatchObject({ ok: true })
  })

  it("does not limit a request without the proxy header (no shared key)", async () => {
    realIp = null
    fetchMock.mockResolvedValue({ report_id: "R1", created_at: "" })
    for (let i = 0; i < 40; i += 1)
      expect(await bejelentes()).toMatchObject({ ok: true })
    expect(fetchMock).toHaveBeenCalledTimes(40)
  })
})
