import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { categoryGroups, directCategoryLinks, FejlecMenu } from "./fejlec-menu"

vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "hu" }),
}))

afterEach(cleanup)

const category = (
  name: string,
  children: { name: string; children?: string[] }[] = [],
) =>
  ({
    id: `category-${name}`,
    name,
    handle: name.toLowerCase(),
    category_children: children.map((child) => ({
      id: `category-${name}-${child.name}`,
      name: child.name,
      handle: child.name.toLowerCase(),
      category_children: (child.children ?? []).map((grandchild) => ({
        id: `category-${name}-${child.name}-${grandchild}`,
        name: grandchild,
        handle: grandchild.toLowerCase(),
      })),
    })),
  }) as never

const categories = [
  category("Termékek", [
    { name: "Világítás", children: ["LED", "T5"] },
    { name: "Szivattyúk", children: ["Visszatérő"] },
  ]),
  category("Korallok", [{ name: "SPS" }, { name: "LPS" }]),
]

const openMenu = () => {
  render(<FejlecMenu kategoriak={categories} />)
  fireEvent.click(screen.getByTestId("category-menu-button"))
}

describe("a teljes képernyős kategóriamenü", () => {
  it("a Menü gomb nyitja és újra bezárja a panelt", () => {
    render(<FejlecMenu kategoriak={categories} />)

    const button = screen.getByTestId("category-menu-button")
    expect(button.getAttribute("aria-expanded")).toBe("false")

    fireEvent.click(button)
    expect(screen.getByTestId("category-menu-panel")).toBeTruthy()
    expect(button.getAttribute("aria-expanded")).toBe("true")

    fireEvent.click(button)
    expect(screen.queryByTestId("category-menu-panel")).toBeNull()
  })

  it("ráálláskor a harmadik oszlop a kiválasztott kategóriára vált", () => {
    openMenu()

    fireEvent.mouseEnter(
      screen.getAllByTestId("category-menu-top-level-item")[1],
    )

    expect(
      screen.getByTestId("category-menu-subcategories").textContent,
    ).toContain("Korallok")
    expect(
      screen.getByTestId("category-menu-subcategories").textContent,
    ).toContain("SPS")
    expect(
      screen
        .getByTestId("category-menu-subcategories")
        .getAttribute("aria-live"),
    ).toBe("polite")
    expect(
      screen.getByTestId("category-menu-subcategories").textContent,
    ).not.toContain("Világítás")
  })

  it("a második oszlop nyilaival is vált a kiválasztás", () => {
    openMenu()

    const first = screen.getAllByTestId("category-menu-top-level-item")[0]
    first.focus()
    fireEvent.keyDown(first, { key: "ArrowDown" })

    expect(document.activeElement).toBe(
      screen.getAllByTestId("category-menu-top-level-item")[1],
    )
    expect(
      screen.getByTestId("category-menu-subcategories").textContent,
    ).toContain("Korallok")
  })

  it("Escape-re bezár", () => {
    openMenu()
    fireEvent.keyDown(window, { key: "Escape" })

    expect(screen.queryByTestId("category-menu-panel")).toBeNull()
  })

  /**
   * A PANEL SAJAT FOLDJERE KATTINTVA BEZAR -- ES EZ MAS ALLITAS, MINT AMI ITT
   * KORABBAN ALLT.
   *
   * Elotte a `category-menu-backdrop` elemre kattintottunk, es zold volt. A
   * zold viszont a MEROHELYROL szolt, nem a felhasznalorol: a jsdom nem szamol
   * elrendezest, tehat egy olyan elemre is "rakattint", amit elo bongeszoben
   * TELJESEN elfed egy masik. Es pontosan ez volt a helyzet -- a panel
   * ugyanazt a teglalapot foglalta el, folotte allt, es atlatszatlan volt.
   *
   * Ez tehat az a fajta zold, ami egy VALODI hibat szentesitett. A mai allitas
   * azt meri, ami a felhasznalonak tenyleg elerheto: a panel sajat foldjet.
   */
  it("a panel saját földjére kattintva bezár", () => {
    openMenu()
    const panel = screen.getByTestId("category-menu-panel")

    fireEvent.click(panel)

    expect(screen.queryByTestId("category-menu-panel")).toBeNull()
  })

  /**
   * ES A TAGADAS: A TARTALOMRA KATTINTVA NEM ZAR.
   *
   * A fenti allitas egy `event.target === event.currentTarget` vizsgalaton
   * all. Enelkul a kezelo MINDEN kattintasra elsulne -- a kategoria-gombokra
   * is --, es a menu hasznalhatatlan lenne. Az elso allitas ezt nem venne
   * eszre: az a bezarast meri, es a hibas valtozat is bezar.
   */
  it("a panel tartalmára kattintva NEM zár be", () => {
    openMenu()

    fireEvent.click(screen.getAllByTestId("category-menu-top-level-item")[0])

    expect(screen.queryByTestId("category-menu-panel")).toBeTruthy()
  })

  /**
   * A HOLT HATTERLAP NINCS TOBBE.
   *
   * Nem eleg annyi, hogy a bezaras mashogy megy: az az elem a TAB-SORRENDBEN
   * is benne allt (gomb volt, `aria-label`-lel), tehat a billentyuzetes
   * felhasznalo elso megallója egy LATHATATLAN elem volt.
   */
  /**
   * A FOKUSZ NEM LEP KI A PANELBOL.
   *
   * Merve elo bongeszoben (2026-09-09): a nyitott panelbol a harmadik Tab utan
   * a fokusz a lap MOGOTTE ALLO tartalmara kerult (kosar, morzsamenu, fulek,
   * lablec) -- olyan elemekre, amiket a panel teljesen elfed. Egy
   * `role="dialog"`, ami elfed mindent es a fokuszt atengedi, a
   * billentyuzetes felhasznalot lathatatlan elemek koze viszi.
   *
   * A jsdom nem mozgatja a fokuszt Tab-ra magatol, tehat itt nem a bejarast
   * merjuk, hanem a HATART: az utolso elemrol tovabblepve az elsore kell
   * kerulni, es visszafele ugyanigy. Ez az, amit a kod tenylegesen csinal.
   */
  const panelElemei = () =>
    Array.from(
      screen
        .getByTestId("category-menu-panel")
        .querySelectorAll<HTMLElement>("a[href], button"),
    )

  it("az utolsó elemről továbblépve a fókusz az elsőre fordul vissza", () => {
    openMenu()
    const elemek = panelElemei()
    const utolso = elemek[elemek.length - 1]
    utolso.focus()

    /* ISMERT POZITIV KONTROLL: tenyleg az utolso elemen allunk. */
    expect(document.activeElement).toBe(utolso)

    fireEvent.keyDown(window, { key: "Tab" })

    expect(document.activeElement).toBe(elemek[0])
  })

  it("az első elemről visszafelé lépve a fókusz az utolsóra fordul", () => {
    openMenu()
    const elemek = panelElemei()
    elemek[0].focus()

    fireEvent.keyDown(window, { key: "Tab", shiftKey: true })

    expect(document.activeElement).toBe(elemek[elemek.length - 1])
  })

  /**
   * ES A KOZEPEN NEM SZOL BELE. Enelkul egy olyan valtozat is atmenne, ami
   * MINDEN Tab-ot elkap es az elsore ugrik -- az a panel bejarhatosagat
   * szuntetne meg, es a ket hatar-allitas nem venne eszre.
   */
  it("a panel közepén a Tab a böngészőre marad", () => {
    openMenu()
    const elemek = panelElemei()
    elemek[1].focus()

    fireEvent.keyDown(window, { key: "Tab" })

    expect(document.activeElement).toBe(elemek[1])
  })

  it("nincs külön, láthatatlan háttérlap", () => {
    openMenu()

    expect(screen.queryByTestId("category-menu-backdrop")).toBeNull()
  })

  it("mobilon a kategória koppintása a részletek nézetére vált, a vissza gomb pedig visszalép", () => {
    openMenu()

    fireEvent.click(screen.getAllByTestId("category-menu-top-level-item")[1])
    expect(screen.getByTestId("category-menu-back")).toBeTruthy()

    fireEvent.click(screen.getByTestId("category-menu-back"))
    expect(screen.getByTestId("category-menu-top-level").className).toContain(
      "block",
    )
    expect(
      screen.getByTestId("category-menu-subcategories").className,
    ).toContain("hidden")
  })
})

describe("a kategóriafa harmadik oszlopa", () => {
  it("a tényleges harmadik szintet csoportként, a hiányzó szintet közvetlen linkként kezeli", () => {
    const products = categories[0]

    expect(categoryGroups(products).map((group) => group.name)).toEqual([
      "Világítás",
      "Szivattyúk",
    ])
    expect(directCategoryLinks(categories[1]).map((link) => link.name)).toEqual(
      ["SPS", "LPS"],
    )
  })
})
