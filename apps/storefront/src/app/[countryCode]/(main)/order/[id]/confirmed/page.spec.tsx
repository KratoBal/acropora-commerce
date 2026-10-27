import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

const adat = vi.hoisted(() => ({
  suti: undefined as string | undefined,
  vevo: null as { id: string } | null,
  rendelesek: {} as Record<string, unknown>,
}))
vi.mock("@lib/data/cookies", () => ({ getRendelesMegtekintes: async () => adat.suti }))
vi.mock("@lib/data/customer", () => ({ retrieveCustomer: async () => adat.vevo }))
vi.mock("@lib/data/orders", () => ({
  retrieveOrder: async (id: string) => {
    if (!adat.rendelesek[id]) throw new Error("nincs")
    return adat.rendelesek[id]
  },
}))
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND")
  },
}))
vi.mock("@modules/common/components/localized-client-link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}))
vi.mock("@modules/order/templates/order-completed-template", () => ({
  default: ({ order, par }: { order: { email: string }; par: { id: string } | null }) => (
    <div data-testid="reszletes" data-par={par?.id ?? ""}>
      {order.email}
    </div>
  ),
}))

import { alairtMegtekintesSuti } from "@lib/util/rendeles-megtekintes"

import OrderConfirmedPage from "./page"

afterEach(() => {
  cleanup()
  adat.suti = undefined
  adat.vevo = null
  adat.rendelesek = {}
  delete process.env.ORDER_VIEW_SECRET
})

/**
 * A VISSZAIGAZOLO LAP SZEMELYES ADATAI (audit P1/5). MI PIROSIT: ha az
 * azonosito egyedul megmutatja a reszleteket; ha a sajat suti vagy a sajat
 * bejelentkezett vevo nem latja; ha egy MASIK vevo latja; ha a par-rendeles
 * olyannak is megjelenik, akinek nincs ra joga.
 */
const rendeles = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  display_id: 50,
  email: "vevo@example.test",
  customer_id: "cus_1",
  ...extra,
})

const lap = async (id: string) =>
  render(await OrderConfirmedPage({ params: Promise.resolve({ id }) } as never))

describe("a rendelés-visszaigazoló lap", () => {
  it("az azonosító egyedül csak a rendelésszámot és a köszönetet mutatja, az e-mail-címet nem", async () => {
    adat.rendelesek = { order_A: rendeles("order_A") }
    await lap("order_A")
    expect(screen.getByTestId("order-complete-minimal")).toBeTruthy()
    expect(screen.getByTestId("order-id").textContent).toBe("#50")
    expect(screen.queryByTestId("reszletes")).toBeNull()
    expect(document.body.textContent).not.toContain("vevo@example.test")
  })

  it("a leadáskor kapott aláírt süti megnyitja a részleteket", async () => {
    process.env.ORDER_VIEW_SECRET = "proba-titok-nem-valodi"
    adat.suti = alairtMegtekintesSuti(["order_A"])!
    adat.rendelesek = { order_A: rendeles("order_A") }
    await lap("order_A")
    expect(screen.getByTestId("reszletes").textContent).toBe("vevo@example.test")
  })

  it("egy másik rendelésre szóló süti nem nyitja meg ezt", async () => {
    process.env.ORDER_VIEW_SECRET = "proba-titok-nem-valodi"
    adat.suti = alairtMegtekintesSuti(["order_B"])!
    adat.rendelesek = { order_A: rendeles("order_A") }
    await lap("order_A")
    expect(screen.queryByTestId("reszletes")).toBeNull()
  })

  it("a bejelentkezett tulajdonos süti nélkül is látja, egy másik vevő nem", async () => {
    adat.rendelesek = { order_A: rendeles("order_A") }
    adat.vevo = { id: "cus_1" }
    await lap("order_A")
    expect(screen.getByTestId("reszletes")).toBeTruthy()
    cleanup()
    adat.vevo = { id: "cus_masik" }
    await lap("order_A")
    expect(screen.queryByTestId("reszletes")).toBeNull()
    expect(screen.getByTestId("order-complete-minimal")).toBeTruthy()
  })

  it("a pár-rendelés csak akkor jelenik meg, ha az is a látogatóé", async () => {
    process.env.ORDER_VIEW_SECRET = "proba-titok-nem-valodi"
    const par = { acropora_pickup_order_id: "order_P" }
    adat.rendelesek = {
      order_A: rendeles("order_A", { metadata: par }),
      order_P: rendeles("order_P"),
    }
    adat.suti = alairtMegtekintesSuti(["order_A", "order_P"])!
    await lap("order_A")
    expect(screen.getByTestId("reszletes").getAttribute("data-par")).toBe("order_P")
    cleanup()
    adat.suti = alairtMegtekintesSuti(["order_A"])!
    await lap("order_A")
    expect(screen.getByTestId("reszletes").getAttribute("data-par")).toBe("")
  })

  it("ismeretlen rendelés: nem található", async () => {
    await expect(lap("order_nincs")).rejects.toThrow("NEXT_NOT_FOUND")
  })
})
