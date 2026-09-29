import { afterEach, describe, expect, it, vi } from "vitest"

const nav = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND")
  }),
}))
vi.mock("next/navigation", () => nav)
const adat = vi.hoisted(() => ({
  retrieveOrder: vi.fn(),
  retrieveOrderBusinessStatus: vi.fn(),
}))
vi.mock("@lib/data/orders", () => adat)

import OrderDetailPage from "./page"

afterEach(() => vi.clearAllMocks())

const lap = () =>
  OrderDetailPage({ params: Promise.resolve({ id: "order_1" }) })

/**
 * A RESZLETEK LAPJA (P5, 4b). MI PIROSIT: ha a lap nem a rendeles sajat
 * allapotat adja at (a P5-4b kalibraciojabol: `allapot={null}` mellett minden
 * allitas zold maradt); ha nem letezo rendelesnel nem 404.
 */
describe("a rendelés részletei lap", () => {
  it("a rendelést és a saját üzleti állapotát adja tovább", async () => {
    const rendeles = { id: "order_1", display_id: 1 }
    const allapot = {
      order_id: "order_1",
      status: "confirmed",
      label: "Visszaigazolva",
      updated_at: "x",
    }
    adat.retrieveOrder.mockResolvedValue(rendeles)
    adat.retrieveOrderBusinessStatus.mockResolvedValue(allapot)

    const elem = (await lap()) as {
      props: { rendeles: unknown; allapot: unknown }
    }

    expect(adat.retrieveOrderBusinessStatus).toHaveBeenCalledWith("order_1")
    expect(elem.props.rendeles).toBe(rendeles)
    expect(elem.props.allapot).toBe(allapot)
  })

  it("nem létező rendelésnél 404", async () => {
    adat.retrieveOrder.mockRejectedValue(new Error("not found"))
    adat.retrieveOrderBusinessStatus.mockResolvedValue(null)
    await expect(lap()).rejects.toThrow("NOT_FOUND")
  })
})
