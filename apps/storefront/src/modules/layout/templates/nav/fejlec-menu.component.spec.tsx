import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { FejlecMenu } from "./fejlec-menu"

vi.mock("next/navigation", () => ({ useParams: () => ({ countryCode: "hu" }) }))
afterEach(cleanup)

const root = (
  name: string,
  children: { name: string; children?: string[] }[] = [],
) =>
  ({
    id: name,
    name,
    handle: name.toLowerCase(),
    category_children: children.map((child) => ({
      id: `${name}-${child.name}`,
      name: child.name,
      handle: child.name.toLowerCase(),
      category_children: (child.children ?? []).map((grandchild) => ({
        id: `${name}-${child.name}-${grandchild}`,
        name: grandchild,
        handle: grandchild.toLowerCase(),
      })),
    })),
  }) as never

const categories = [
  root("Termékek", [
    { name: "Világítás", children: ["LED", "T5"] },
    { name: "Szivattyúk" },
  ]),
  root("Halak", [{ name: "Gébek" }]),
  root("Korallok", [{ name: "SPS" }]),
  root("Gerinctelenek", [{ name: "Rákok" }]),
]
const open = () => {
  render(<FejlecMenu kategoriak={categories} />)
  fireEvent.click(screen.getByTestId("category-menu-trigger-Termékek"))
}

describe("a kis lenyíló kategóriamenü", () => {
  it("a rögzített menüpont alatt megjelenik a három hasáb", () => {
    open()
    expect(screen.getByTestId("category-menu-panel").textContent).toContain(
      "Termékek",
    )
    expect(
      screen.getByTestId("category-menu-quick-links").textContent,
    ).toContain("Akciók")
    expect(
      screen.getByTestId("category-menu-editorial-card").textContent,
    ).toContain("Így állítsd")
  })
  /**
   * A PANEL NEM DIALOGUS -- ES A NYITO GOMB LENYILOKENT VAN JELOLVE.
   *
   * HAROM FUGGETLEN ERTEK, HAROM NEV. Az elso azt orzi, hogy a `role="dialog"`
   * ne kerulhessen vissza; a masodik es a harmadik azt, hogy a helyette allo
   * lenyilo-minta MEGVAN. A masodik ketto nelkul egy olyan valtozat is
   * atmenne, ami a szerepet levette, es SEMMIT nem tett a helyere -- akkor a
   * panelnek egyaltalan nem lenne kapcsolata a gombjaval.
   *
   * MIERT KERULT LE A SZEREP: egy `role="dialog"` azt igeri, hogy a Tab nem
   * lep ki a retegbol. Itt kilep, es `aria-modal` sincs. A hatterlap
   * (`fixed inset-0`) az EGERTOL elzarja a mogottes lapot, a billentyuzet
   * viszont belesetal -- ket bemeneti eszkoz mast lat ugyanarrol.
   */
  it("a panel nem dialógusnak van jelölve", () => {
    open()

    const panel = screen.getByTestId("category-menu-panel")

    /* ISMERT POZITIV KONTROLL: a panel tenyleg kint van. */
    expect(panel).toBeTruthy()

    expect(panel.getAttribute("role")).toBeNull()
    expect(panel.getAttribute("aria-modal")).toBeNull()
  })

  it("a nyitó gomb a panelre mutat, és jelzi, hogy nyitva van", () => {
    open()

    const gomb = screen.getByTestId("category-menu-trigger-Termékek")
    const panel = screen.getByTestId("category-menu-panel")

    expect(gomb.getAttribute("aria-expanded")).toBe("true")
    expect(gomb.getAttribute("aria-controls")).toBe(panel.id)
  })

  /*
    A NEV MEGNEVEZI, MELYIK GYOKER VAN NYITVA -- ES A NEVE PONTOSAN ENNYIT
    ALLIT. Elso valtozatomban "zarva is van neve" allt a nevben, holott a
    teszt csak a NYITOTT allapotot meri; zarva a panel nem is letezik.
  */
  it("a panel neve megnevezi a nyitott gyökeret", () => {
    open()

    expect(
      screen.getByTestId("category-menu-panel").getAttribute("aria-label"),
    ).toContain("Termékek")
  })

  it("Escape, az újrakattintott menüpont és a tényleges külső háttér is bezár", () => {
    open()
    fireEvent.keyDown(window, { key: "Escape" })
    expect(screen.queryByTestId("category-menu-panel")).toBeNull()
    fireEvent.click(screen.getByTestId("category-menu-trigger-Termékek"))
    fireEvent.click(screen.getByTestId("category-menu-trigger-Termékek"))
    expect(screen.queryByTestId("category-menu-panel")).toBeNull()
    fireEvent.click(screen.getByTestId("category-menu-trigger-Termékek"))
    fireEvent.click(screen.getByTestId("category-menu-backdrop"))
    expect(screen.queryByTestId("category-menu-panel")).toBeNull()
  })
  it("a nyíl helyben nyit csempéket és nem navigál, a szöveg saját lapra mutat", () => {
    open()
    expect(screen.getByText("Világítás").getAttribute("href")).toContain(
      "/categories/világítás",
    )
    fireEvent.click(screen.getAllByTestId("category-menu-category-expand")[1])
    expect(screen.getByTestId("category-menu-panel")).toBeTruthy()
    expect(
      screen.getByTestId("category-menu-subcategory-tiles").textContent,
    ).toContain("LED")
  })
  it("a második hasáb nyilaival is bejárható", () => {
    open()
    const first = screen.getAllByTestId("category-menu-category-expand")[0]
    first.focus()
    fireEvent.keyDown(first, { key: "ArrowDown" })
    expect(document.activeElement).toBe(
      screen.getAllByTestId("category-menu-category-expand")[1],
    )
  })
})
