import { afterEach, describe, expect, it, vi } from "vitest"

const nav = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND")
  }),
}))
const elallasAdat = vi.hoisted(() => ({
  retrieveOwnWithdrawalState: vi.fn(),
  submitOwnWithdrawal: vi.fn(),
}))
vi.mock("@lib/data/own-withdrawal", () => elallasAdat)
vi.mock("next/navigation", () => nav)
const adat = vi.hoisted(() => ({
  retrieveOrder: vi.fn(),
  retrieveOrderBusinessStatus: vi.fn(),
}))
vi.mock("@lib/data/orders", () => adat)

import OrderDetailPage from "./page"

afterEach(() => vi.clearAllMocks())

const lap = () =>
  OrderDetailPage({
    params: Promise.resolve({ id: "order_1", countryCode: "hu" }),
  })

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

  /*
    V0.3: az elallas blokk allapota a BOLT valaszabol jon (az elo allat jelzo es a leadott nyilatkozatok), nem a par
    metaadatabol. Mi pirosit: a lap a rendeles sajat azonositojatol eltero rendelesre kerdez; a bolt valasza nem jut el a
    komponensig; a hianyzo valasz (regi bolt, hiba) tevesen allapotnak latszik.
  */
  it("az elállás állapotát a rendelés saját azonosítójával kéri a bolttól, és változtatás nélkül adja tovább", async () => {
    const allapot = { liveAnimal: true, withdrawals: [] }
    adat.retrieveOrder.mockResolvedValue({ id: "order_1", display_id: 1 })
    adat.retrieveOrderBusinessStatus.mockResolvedValue(null)
    elallasAdat.retrieveOwnWithdrawalState.mockResolvedValue(allapot)
    const elem = (await lap()) as { props: { elallas: unknown } }
    expect(elallasAdat.retrieveOwnWithdrawalState).toHaveBeenCalledWith(
      "order_1",
    )
    expect(elem.props.elallas).toBe(allapot)
  })

  it("válasz nélkül (null) null-t ad tovább: a blokk semmit nem rajzol", async () => {
    adat.retrieveOrder.mockResolvedValue({ id: "order_1", display_id: 1 })
    adat.retrieveOrderBusinessStatus.mockResolvedValue(null)
    elallasAdat.retrieveOwnWithdrawalState.mockResolvedValue(null)
    const elem = (await lap()) as { props: { elallas: unknown } }
    expect(elem.props.elallas).toBeNull()
  })

  it("nem létező rendelésnél 404", async () => {
    adat.retrieveOrder.mockRejectedValue(new Error("not found"))
    adat.retrieveOrderBusinessStatus.mockResolvedValue(null)
    await expect(lap()).rejects.toThrow("NOT_FOUND")
  })
})
