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
   * A PANEL BENT MARAD A NEZETBEN -- MIND A KET IRANYBAN.
   *
   * A vizszintes helyet a nyito gomb bal szele adja, ket korlattal:
   * balrol 16 pixel, jobbrol `window.innerWidth - 1080`. Ezt a szoritast
   * eddig SEMMI nem merte, pedig ket kulon modon romolhat el, es a hibaja
   * mind a ketto iranyban LATHATO: a panel vagy belelog a lap szelebe, vagy
   * kilog a nezetbol es vizszintes gorgetest hoz.
   *
   * A jsdom nem szamol elrendezest, ezert a gomb teglalapjat es a nezet
   * szelesseget KEZZEL allitom be -- igy a szoritas MINDKET aga elerheto.
   * Ez nem a kirajzolt helyet meri, hanem a SZAMITAST, es a nevek is ezt
   * mondjak.
   */
  const balSzelre = (px: number) => {
    const gomb = screen.getByTestId("category-menu-trigger-Termékek")
    gomb.getBoundingClientRect = () =>
      ({
        left: px,
        top: 0,
        right: px,
        bottom: 0,
        width: 0,
        height: 0,
        x: px,
        y: 0,
      }) as DOMRect
    fireEvent.click(gomb)
    const bal = screen.getByTestId("category-menu-panel").style.left
    /*
      ZARUNK A MERES UTAN: ugyanarra a gombra a masodik kattintas ATKAPCSOL
      (bezar), tehat egy tesztben tobb helyzetet csak igy lehet vegigmerni.
      Az elso valtozatom ezt nem tette, es a masodik hivas mar nem talalt
      panelt -- a piros a merohelyrol szolt, nem a szoritasrol.
    */
    fireEvent.keyDown(window, { key: "Escape" })
    return bal
  }

  it("a panel nem csúszik a bal széle mögé", () => {
    render(<FejlecMenu kategoriak={categories} />)

    /* ISMERT POZITIV KONTROLL: egy bosegesen fero helyen a gomb helyet veszi fel. */
    window.innerWidth = 1920
    expect(balSzelre(400)).toBe("400px")

    expect(balSzelre(-50)).toBe("16px")
  })

  it("a panel nem lóg ki a nézet jobb szélén", () => {
    render(<FejlecMenu kategoriak={categories} />)

    window.innerWidth = 1200

    /* 1200 - 1080 = 120: ennel jobbra nem kezdodhet. */
    expect(balSzelre(900)).toBe("120px")
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
