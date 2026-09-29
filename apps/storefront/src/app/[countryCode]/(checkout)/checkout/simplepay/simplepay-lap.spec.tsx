import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

const visszateres = vi.hoisted(() => vi.fn())
vi.mock("@lib/data/simplepay", () => ({ simplePayVisszateres: visszateres }))
vi.mock("@modules/common/components/localized-client-link", () => ({
  default: ({
    href,
    children,
  }: {
    href: string
    children: React.ReactNode
  }) => <a href={href}>{children}</a>,
}))

import SimplePayEredmenyLap from "./page"

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const r = Buffer.from(
  JSON.stringify({ r: 0, t: 501234567, e: "SUCCESS", m: "M", o: "payses_1-x" }),
).toString("base64")
const lap = async (q: { r?: string; s?: string }) =>
  render(await SimplePayEredmenyLap({ searchParams: Promise.resolve(q) }))

/**
 * AZ EREDMENYLAP (P4-4). MI PIROSIT: ha a lap az URL-bol (nem a hatter
 * valaszabol) mond sikert; ha sikernel hianyzik az azonosito vagy a rendeles
 * linkje; ha megszakitasnal azonosito all.
 */
describe("a SimplePay eredménylap", () => {
  it("sikernél az azonosító és a rendelés linkje, a háttér válaszából", async () => {
    visszateres.mockResolvedValue({
      event: "SUCCESS",
      status: "paid",
      order_ids: ["order_1"],
    })
    await lap({ r, s: "alairas" })

    expect(visszateres).toHaveBeenCalledWith(r, "alairas")
    expect(screen.getByText("Sikeres tranzakció.")).toBeInTheDocument()
    expect(screen.getByTestId("simplepay-tranzakcio")).toHaveTextContent(
      "SimplePay tranzakcióazonosító: 501234567",
    )
    expect(screen.getByRole("link", { name: "A rendelésed" })).toHaveAttribute(
      "href",
      "/order/order_1/confirmed",
    )
  })

  it("ugyanaz az r, de a háttér szerint megszakítva: nincs siker és nincs azonosító", async () => {
    visszateres.mockResolvedValue({ event: "CANCEL", status: "not_paid" })
    await lap({ r, s: "alairas" })

    expect(screen.queryByText("Sikeres tranzakció.")).toBeNull()
    expect(screen.getByText("Megszakítottad a fizetést.")).toBeInTheDocument()
    expect(screen.queryByTestId("simplepay-tranzakcio")).toBeNull()
    expect(
      screen.getByRole("link", { name: "Vissza a fizetéshez" }),
    ).toBeInTheDocument()
  })

  it("aláírás nélkül nem kérdez, és nem mond eredményt", async () => {
    await lap({ r })
    expect(visszateres).not.toHaveBeenCalled()
    expect(screen.queryByText("Sikeres tranzakció.")).toBeNull()
    expect(screen.queryByTestId("simplepay-tranzakcio")).toBeNull()
  })
})
