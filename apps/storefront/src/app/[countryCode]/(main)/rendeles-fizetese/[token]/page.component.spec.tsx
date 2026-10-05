import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

const adat = vi.hoisted(() => ({ osszegzes: null as unknown }))
vi.mock("@lib/data/rendeles-fizetese", () => ({
  linkOsszegzes: vi.fn(async () => adat.osszegzes),
}))
vi.mock("@modules/rendeles-fizetese/components/link-fizetes", () => ({
  default: ({ osszeg, token }: { osszeg: number; token: string }) => (
    <div data-testid="link-fizetes" data-osszeg={osszeg} data-token={token} />
  ),
}))
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND")
  },
}))

import { LINK_ALLAPOT_SZOVEG } from "@lib/util/rendeles-fizetese"
import RendelesFizetesePage from "./page"

/**
 * A „RENDELÉS FIZETÉSE” LAP. Ami pirosit: egy nem fizetheto link (fizetett,
 * lejart, lecserelt) fizetesi mezot mutat; egy ismeretlen token nem 404; a
 * fizetendo osszeg, a tetelek vagy a vegyes kosar bolti rendelese hianyzik; a
 * hatarido nem budapesti nap.
 */
const osszegzes = (over: Record<string, unknown> = {}) => ({
  state: "open",
  amount: 21950,
  currency_code: "huf",
  // 22:30 UTC Budapesten mar masnap
  expires_at: "2026-10-11T22:30:00.000Z",
  paid_at: null,
  orders: [
    {
      display_id: 45,
      items: [{ title: "Hanna", quantity: 1, total: 3800 }],
      shipping: [{ name: "Foxpost", amount: 1150 }],
      total: 4950,
    },
    {
      display_id: 46,
      items: [{ title: "Bohóchal", quantity: 1, total: 17000 }],
      shipping: [],
      total: 17000,
    },
  ],
  ...over,
})
const lap = async () =>
  render(
    await RendelesFizetesePage({
      params: Promise.resolve({ countryCode: "hu", token: "t.s" }),
    }),
  )
const szoveg = () => document.body.textContent?.replace(/\s/g, " ") ?? ""

afterEach(() => cleanup())

describe("Rendelés fizetése lap", () => {
  it("nyitott link: osszeg, hatarnap, mindket rendeles tetelei, alatta a fizetes", async () => {
    adat.osszegzes = osszegzes()
    await lap()
    expect(
      screen.getByTestId("link-osszeg").textContent?.replace(/\s/g, " "),
    ).toBe("21 950 Ft")
    expect(szoveg()).toContain("Rendelés: #45 és #46")
    expect(szoveg()).toContain("A link 2026. október 12. végéig érvényes.")
    expect(szoveg()).toContain("Bolti átvételes rendelésed (#46)")
    expect(szoveg()).toContain("Bohóchal × 1")
    expect(screen.getByTestId("link-fizetes").getAttribute("data-osszeg")).toBe(
      "21950",
    )
    expect(screen.getByTestId("link-fizetes").getAttribute("data-token")).toBe(
      "t.s",
    )
  })

  it("fizetett, lejart, lecserelt: a mondat a teendovel, fizetesi mezo nelkul", async () => {
    for (const state of ["paid", "expired", "superseded"] as const) {
      adat.osszegzes = osszegzes({ state })
      await lap()
      expect(screen.getByTestId(`link-allapot-${state}`).textContent).toContain(
        LINK_ALLAPOT_SZOVEG[state].cim,
      )
      expect(szoveg()).toContain(LINK_ALLAPOT_SZOVEG[state].szoveg)
      expect(screen.queryByTestId("link-fizetes")).toBeNull()
      cleanup()
    }
  })

  it("egy ismeretlen token 404", async () => {
    adat.osszegzes = null
    await expect(lap()).rejects.toThrow("NEXT_NOT_FOUND")
  })
})
