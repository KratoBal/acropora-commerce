import { afterEach, describe, expect, it, vi } from "vitest"

const sdk = vi.hoisted(() => ({ client: { fetch: vi.fn() } }))
vi.mock("@lib/config", () => ({ sdk }))
vi.mock("./cookies", () => ({
  getAuthHeaders: vi.fn(async () => ({ authorization: "Bearer x" })),
  getCacheOptions: vi.fn(async () => ({})),
}))

import {
  listOrderBusinessStatuses,
  retrieveOrderBusinessStatus,
} from "./orders"

afterEach(() => vi.clearAllMocks())

/**
 * AZ UZLETI ALLAPOT LEKERESE (#410). MI PIROSIT: ha nem a vevo sajat
 * utvonalat kerdezi, a vevo hitelesitesevel; ha egy hiba az egesz lapot
 * viszi (ures lista helyett dob).
 */
describe("a rendelések üzleti állapotának lekérése", () => {
  it("a vevő saját útvonalát kérdezi, a hitelesítéssel, és a listát adja", async () => {
    sdk.client.fetch.mockResolvedValue({
      business_statuses: [
        {
          order_id: "order_1",
          status: "confirmed",
          label: "Visszaigazolva",
          updated_at: "x",
        },
      ],
    })
    const lista = await listOrderBusinessStatuses()
    const [ut, opciok] = sdk.client.fetch.mock.calls[0]
    expect(ut).toBe("/store/customers/me/order-business-statuses")
    expect(opciok.headers).toEqual({ authorization: "Bearer x" })
    expect(lista.map((a) => a.label)).toEqual(["Visszaigazolva"])
  })

  it("hibánál üres lista, nem dob", async () => {
    sdk.client.fetch.mockRejectedValue(new Error("502"))
    await expect(listOrderBusinessStatuses()).resolves.toEqual([])
  })
})

describe("egy rendelés üzleti állapotának lekérése", () => {
  it("a rendelés saját útvonalát kérdezi, és az állapotot adja", async () => {
    sdk.client.fetch.mockResolvedValue({
      business_status: {
        order_id: "order_1",
        status: "confirmed",
        label: "Visszaigazolva",
        updated_at: "x",
      },
    })
    const allapot = await retrieveOrderBusinessStatus("order_1")
    expect(sdk.client.fetch.mock.calls[0][0]).toBe(
      "/store/customers/me/order-business-statuses/order_1",
    )
    expect(allapot?.label).toBe("Visszaigazolva")
  })

  it("állapot nélkül és hibánál null", async () => {
    sdk.client.fetch.mockResolvedValue({ business_status: null })
    await expect(retrieveOrderBusinessStatus("order_1")).resolves.toBeNull()
    sdk.client.fetch.mockRejectedValue(new Error("404"))
    await expect(retrieveOrderBusinessStatus("order_x")).resolves.toBeNull()
  })
})
