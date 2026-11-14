import { cleanup, render, screen } from "@testing-library/react"
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

import {
  MIAGOND_FIGYELMEZTETES,
  TUNET_OLDALAK,
  tunetKezelok,
  tunetOldal,
} from "@lib/util/mi-a-gond"

import MiAGondBelepo from "./mi-a-gond-belepo"
import TunetOldalLap from "./tunet-oldal-lap"

afterEach(cleanup)

/*
  WHAT TURNS THIS RED (V4.3). The entry missing a symptom or linking a wrong page; a symptom page whose sections are out of
  order (the products must come LAST, after the measuring and the steps); a product linked that the shop did not give; an empty
  product group's heading left standing; a heading that jumps a level (axe heading-order); the disclaimer missing; a cross
  reference ("N. oldal") not a link, or a link to a page that does not exist; a price or stock on the page.
*/
const szintek = (gyoker: HTMLElement) =>
  Array.from(gyoker.querySelectorAll("h1,h2,h3,h4,h5,h6")).map((h) =>
    Number(h.tagName.slice(1)),
  )

describe("a belépő", () => {
  it("MB-LISTA: mind a tíz tünet a saját oldalára linkel, a szám a cím előtt, egy h1, a figyelmeztetés ott van", () => {
    render(<MiAGondBelepo oldalak={TUNET_OLDALAK} />)
    const linkek = screen.getAllByTestId("mi-a-gond-tunet")
    expect(linkek).toHaveLength(TUNET_OLDALAK.length)
    TUNET_OLDALAK.forEach((oldal, i) => {
      expect(linkek[i]!.getAttribute("href")).toBe(`/mi-a-gond/${oldal.slug}`)
      expect(linkek[i]!.textContent).toBe(`${oldal.szam}. ${oldal.cim}`)
    })
    expect(szintek(screen.getByTestId("mi-a-gond"))).toEqual([1])
    expect(screen.getByText(MIAGOND_FIGYELMEZTETES)).toBeTruthy()
  })
})

describe("egy tünet oldala", () => {
  const mind = (oldal = TUNET_OLDALAK[1]!) =>
    Object.fromEntries(tunetKezelok(oldal).map((h) => [h, `Bolti ${h}`]))

  it("TO-SORREND: a szakaszok a sablon sorrendjében, a termékek az utolsó szakaszban, fejlécrend ugrás nélkül", () => {
    const oldal = tunetOldal("cianobakterium")!
    render(<TunetOldalLap oldal={oldal} termekek={mind(oldal)} />)
    const h2 = screen
      .getAllByRole("heading", { level: 2 })
      .map((h) => h.textContent)
    expect(h2).toEqual([
      "Hogy néz ki, és mit jelent",
      "Először ezt mérd meg",
      "Gyakori okok",
      "Teendők sorrendben",
      "Mit ne csinálj",
      "Mikor kérj segítséget",
      "Kapcsolódó termékek",
    ])
    const sz = szintek(screen.getByTestId("tunet-oldal"))
    expect(sz[0]).toBe(1)
    expect(sz.filter((s) => s === 1)).toHaveLength(1)
    sz.slice(1).forEach((s, i) => expect(s - sz[i]!).toBeLessThanOrEqual(1))
    expect(screen.getByText(MIAGOND_FIGYELMEZTETES)).toBeTruthy()
  })

  it("TO-TERMEKEK: a bolt adta termékek linkelnek a bolti címmel; amit a bolt nem adott, nem jelenik meg, az üres csoport címe sem", () => {
    const oldal = tunetOldal("cianobakterium")!
    const teljes = mind(oldal)
    render(<TunetOldalLap oldal={oldal} termekek={teljes} />)
    expect(screen.getAllByTestId("tunet-termek")).toHaveLength(
      tunetKezelok(oldal).length,
    )
    cleanup()
    const keves = { ...teljes }
    for (const k of oldal.termekek.kezelok)
      for (const t of k.termekek) delete keves[t.handle]
    render(<TunetOldalLap oldal={oldal} termekek={keves} />)
    expect(screen.queryByTestId("tunet-kezelok")).toBeNull()
    expect(screen.getByTestId("tunet-meroeszkozok")).toBeTruthy()
  })

  it("TO-URES: termék nélkül is megáll az oldal; ahol csak figyelmeztetés van (darakór), az a termék-szakaszban marad, link nélkül", () => {
    const darakor = tunetOldal("feher-pottyok-halon")!
    render(<TunetOldalLap oldal={darakor} termekek={{}} />)
    expect(screen.queryAllByTestId("tunet-termek")).toHaveLength(0)
    expect(
      screen.getByText("Gyógyszer csak szakember tanácsa után."),
    ).toBeTruthy()
    expect(screen.getByText("Teendők sorrendben")).toBeTruthy()
  })

  it("TO-KERESZT: az 'N. oldal' hivatkozás a megfelelő tünet-oldalra linkel", () => {
    const oldal = tunetOldal("kovaalga")!
    render(<TunetOldalLap oldal={oldal} termekek={{}} />)
    const keresztek = screen.getAllByTestId("tunet-kereszt")
    expect(keresztek.length).toBeGreaterThan(0)
    const dino = keresztek.find((a) => a.textContent?.startsWith("3. oldal"))
    expect(dino?.getAttribute("href")).toBe("/mi-a-gond/dinoflagellata")
  })

  it("TO-NINCS-AR: egy oldalon sincs ár vagy készlet", () => {
    for (const oldal of TUNET_OLDALAK) {
      const { unmount } = render(
        <TunetOldalLap oldal={oldal} termekek={mind(oldal)} />,
      )
      const szoveg = screen.getByTestId("tunet-oldal").textContent ?? ""
      expect(szoveg, oldal.slug).not.toMatch(/\d\s?Ft/)
      expect(szoveg, oldal.slug).not.toMatch(/készlet:/i)
      unmount()
    }
  })
})
