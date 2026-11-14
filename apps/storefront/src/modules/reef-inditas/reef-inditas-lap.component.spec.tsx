import { cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@modules/common/components/localized-client-link", () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode
    href: string
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

import { REEF_LEPESEK, reefKezelok } from "@lib/util/reef-inditas"

import ReefInditasLap from "./reef-inditas-lap"

afterEach(cleanup)

/*
  WHAT TURNS THIS RED (V4.4). A step missing or out of order; a product linked that the shop did not give (not buyable or
  gone); a product the shop gave not linked to its own page; an empty group's heading left standing; a heading that jumps a
  level (axe heading-order); the page showing a price or stock.
*/
const mind = Object.fromEntries(reefKezelok().map((h) => [h, `Bolti ${h}`]))

describe("az indítsd el a korallos akváriumodat lap", () => {
  it("RL-LEPESEK: egy h1, hat lépés h2-ként sorban, a fejlécrend nem ugrik szintet", () => {
    render(<ReefInditasLap termekek={mind} />)
    const szintek = Array.from(
      screen.getByTestId("reef-inditas").querySelectorAll("h1,h2,h3,h4,h5,h6"),
    ).map((h) => Number(h.tagName.slice(1)))
    expect(szintek[0]).toBe(1)
    expect(szintek.filter((s) => s === 1)).toHaveLength(1)
    expect(szintek.filter((s) => s === 2)).toHaveLength(6)
    szintek.slice(1).forEach((s, i) => {
      expect(s - szintek[i]).toBeLessThanOrEqual(1)
    })
    const cimek = screen
      .getAllByRole("heading", { level: 2 })
      .map((h) => h.textContent)
    expect(cimek[0]).toBe("1. lépés: Eszközök és helyszín")
    expect(cimek[5]).toBe("6. lépés: A korallok")
  })

  it("RL-TERMEKEK: a bolt adta termékek a saját oldalukra linkelnek, a bolti címmel", () => {
    render(<ReefInditasLap termekek={mind} />)
    const linkek = screen.getAllByTestId("reef-termek")
    expect(linkek).toHaveLength(reefKezelok().length)
    const elso = REEF_LEPESEK[0]!.csoportok![0]!.termekek[0]!
    const link = linkek.find(
      (a) => a.getAttribute("href") === `/termek/${elso.handle}`,
    )
    expect(link?.textContent).toBe(`Bolti ${elso.handle}`)
  })

  it("RL-KIMARAD: amit a bolt nem adott (nem megvehető, eltűnt), nem jelenik meg, és az üres csoport címe sem", () => {
    const keves = { ...mind }
    const kimarado = REEF_LEPESEK[0]!.csoportok![1]!
    for (const t of kimarado.termekek) delete keves[t.handle]
    render(<ReefInditasLap termekek={keves} />)
    expect(
      screen
        .getAllByTestId("reef-termek")
        .some((a) =>
          kimarado.termekek.some((t) =>
            a.getAttribute("href")?.endsWith(t.handle),
          ),
        ),
    ).toBe(false)
    const elsoLepes = screen.getByTestId("reef-lepes-1")
    expect(within(elsoLepes).queryByText(kimarado.cim)).toBeNull()
    expect(
      within(elsoLepes).getByText(REEF_LEPESEK[0]!.csoportok![0]!.cim),
    ).toBeTruthy()
  })

  it("RL-URES: termék nélkül is megáll mind a hat lépés szövege, link nélkül", () => {
    render(<ReefInditasLap termekek={{}} />)
    expect(screen.queryAllByTestId("reef-termek")).toHaveLength(0)
    expect(screen.queryAllByTestId("reef-csoport")).toHaveLength(0)
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(6)
    expect(screen.getAllByText(/Továbbléphetsz, ha:/)).toHaveLength(6)
  })

  it("RL-NINCS-AR: az oldalon nincs ár vagy készlet", () => {
    render(<ReefInditasLap termekek={mind} />)
    const szoveg = screen.getByTestId("reef-inditas").textContent ?? ""
    expect(szoveg).not.toMatch(/\d\s?Ft/)
    expect(szoveg).not.toMatch(/készlet:/i)
  })
})
