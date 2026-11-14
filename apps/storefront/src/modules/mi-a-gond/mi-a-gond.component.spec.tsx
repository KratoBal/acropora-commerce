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

  // korall 51978: a szifon, kefe, csipesz nem merőeszkoz: kulon mondat a Merőeszkozok lista UTAN
  it("TO-ESZKOZ: a csoport cime 'Mérőeszközök', az 'Eszköz a teendőkhöz' mondat a lista UTAN all, kulon mondatban", () => {
    const kovaalga = tunetOldal("kovaalga")!
    render(<TunetOldalLap oldal={kovaalga} termekek={mind(kovaalga)} />)
    const doboz = screen.getByTestId("tunet-meroeszkozok")
    expect(
      within(doboz).getByRole("heading", { name: "Mérőeszközök" }),
    ).toBeTruthy()
    const lista = doboz.querySelector("ul")!
    const sor = screen.getByTestId("tunet-eszkoz")
    expect(sor.textContent).toBe("Eszköz a teendőkhöz: szifon.")
    expect(
      lista.compareDocumentPosition(sor) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    cleanup()
    const darakor = tunetOldal("feher-pottyok-halon")!
    render(<TunetOldalLap oldal={darakor} termekek={{}} />)
    expect(screen.getByTestId("tunet-mero-tovabba").textContent).toBe(
      "Mérőeszközök: hőmérő, refraktométer, ammónia- és nitrit-teszt.",
    )
    expect(screen.queryByTestId("tunet-eszkoz")).toBeNull()
    expect(
      screen.getByTestId("tunet-meroeszkozok").querySelector("ul"),
    ).toBeNull()
  })

  it("TO-ESZKOZ-10: a 9. oldal mero-szovege a lista elott, az eszkoz a lista utan; a 10. oldal 'Szűrőanyag a teendőkhöz.'", () => {
    const hatodik = tunetOldal("ingadozo-ertekek")!
    render(<TunetOldalLap oldal={hatodik} termekek={mind(hatodik)} />)
    const doboz = screen.getByTestId("tunet-meroeszkozok")
    expect(doboz.textContent).toContain(
      "Mérőeszközök (KH, kalcium, magnézium, pH teszt, kalibráló oldat).",
    )
    expect(screen.getByTestId("tunet-eszkoz").textContent).toBe(
      "Eszköz a teendőkhöz: adagolópumpa.",
    )
    cleanup()
    const tizedik = tunetOldal("magas-nitrat-foszfat")!
    render(<TunetOldalLap oldal={tizedik} termekek={{}} />)
    expect(screen.getByTestId("tunet-eszkoz").textContent).toBe(
      "Szűrőanyag a teendőkhöz.",
    )
  })

  // barracuda 52002: nincs ures csoport-cim, es a szo nem szerepel ketszer egymas alatt
  it("TO-CIM: a 'Mérőeszközök' cím csak lista mellett és mérő-szöveg nélkül áll; eszköz-mondat egyedül cím nélkül; a 8. és 9. oldalon nincs duplán", () => {
    const hatos = tunetOldal("feheredo-korall")!
    render(<TunetOldalLap oldal={hatos} termekek={mind(hatos)} />)
    expect(
      within(screen.getByTestId("tunet-meroeszkozok")).getByRole("heading", {
        name: "Mérőeszközök",
      }),
    ).toBeTruthy()
    cleanup()
    const termeknelkul = tunetOldal("kovaalga")!
    render(<TunetOldalLap oldal={termeknelkul} termekek={{}} />)
    expect(screen.queryByRole("heading", { name: "Mérőeszközök" })).toBeNull()
    expect(screen.getByTestId("tunet-eszkoz").textContent).toBe(
      "Eszköz a teendőkhöz: szifon.",
    )
    cleanup()
    const nyolcadik = tunetOldal("feher-pottyok-halon")!
    render(<TunetOldalLap oldal={nyolcadik} termekek={{}} />)
    expect(screen.queryByRole("heading", { name: "Mérőeszközök" })).toBeNull()
    expect(screen.getAllByText(/Mérőeszközök/)).toHaveLength(1)
    cleanup()
    const kilencedik = tunetOldal("ingadozo-ertekek")!
    render(<TunetOldalLap oldal={kilencedik} termekek={mind(kilencedik)} />)
    expect(screen.queryByRole("heading", { name: "Mérőeszközök" })).toBeNull()
    expect(screen.getAllByText(/Mérőeszközök \(/)).toHaveLength(1)
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
