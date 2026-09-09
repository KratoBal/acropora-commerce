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
  /**
   * A FEJLEC NEGY GYOKERE KEZZEL VALOGATOTT LISTA, ES EDDIG SEMMI NEM ORIZTE.
   *
   * === A MERT RES ===
   *
   * A `HEADER_MENU_ITEMS` egy beegetett negy-elemu lista a komponensben; a
   * panel TARTALMA jon a kategoria-fabol, a NEGY NEV nem. Merve 2026-09-09:
   * egy OTODIK nev hozzaadasa NULLA allitast vitt pirosra, es a sorrend
   * megforditasa szinten NULLAT. Vagyis a valogatas barmikor elmozdulhatott
   * volna, csendben.
   *
   * === AMIT EZ AZ ALLITAS NEM DONT EL ===
   *
   * Azt NEM, hogy EZ a negy nev a helyes. A tervlap egy valogatott listat ir
   * elo, a ket jovahagyott lap ketfelet mutat, es hogy a negy nev Balazstol
   * jovo TARTALMI szabaly volt-e, ma nem tudjuk -- a kerdes a `659272df`
   * kartyan all, `waiting` allapotban.
   *
   * Ez az allitas tehat a MAI allapotot rogziti, hogy egy valtozas LATSZODJON.
   * Ha a dontes megszuletik es mas listat ad, ez pirosodik, es akkor a
   * valtozas MELLE odakerul a dontes -- nem helyette.
   *
   * KET FUGGETLEN ERTEK, KET NEV: a HALMAZ (mely nevek) es a SORREND. A
   * masodik nelkul egy atrendezes eszrevetlen maradna, holott a fejlecben a
   * sorrend maga is allitas.
   */
  const gyokerNevek = () =>
    Array.from(
      document.querySelectorAll('[data-testid^="category-menu-trigger-"]'),
    ).map((e) => (e.textContent ?? "").trim())

  it("a fejléc négy gyökeret kínál, névre pontosan", () => {
    render(<FejlecMenu kategoriak={categories} />)

    expect(gyokerNevek().slice().sort()).toEqual(
      ["Gerinctelenek", "Halak", "Korallok", "Termékek"].sort(),
    )
  })

  it("a négy gyökér ebben a sorrendben áll", () => {
    render(<FejlecMenu kategoriak={categories} />)

    expect(gyokerNevek()).toEqual([
      "Termékek",
      "Halak",
      "Korallok",
      "Gerinctelenek",
    ])
  })

  /**
   * ES A TAGADAS: a lista NEM a kategoria-fabol epul.
   *
   * A fixtura NEGY gyokeret ad, tehat a fenti ket allitas akkor is teljesulne,
   * ha a komponens a FABOL venne a neveket. Ez az allitas ad a fanak EGY
   * OTODIK gyokeret, es azt varja, hogy a fejlecben NE jelenjen meg -- ez a
   * kulonbseg a valogatott lista es a fa kozott.
   */
  it("a fa ötödik gyökere NEM kerül a fejlécbe", () => {
    render(
      <FejlecMenu
        kategoriak={[...categories, root("Édesvízi akvarisztika")] as never}
      />,
    )

    expect(gyokerNevek()).toHaveLength(4)
    expect(gyokerNevek()).not.toContain("Édesvízi akvarisztika")
  })

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
  /*
    MINDEN MERES SAJAT RENDERELESBOL INDUL -- ES EZT EGY MERES KERTE.

    Az elso valtozat egy renderelesen belul mert tobb helyzetet, es Escape-pel
    zart kozottuk. Emiatt az Escape-figyelo KIVETELE ezt a szoritas-allitast is
    pirosra vitte -- egy olyan allitast, aminek semmi koze a zarashoz.

    Egy segedfuggveny, ami egy MASIK mechanizmuson at jut el a merohelyig,
    atvezeti annak a mechanizmusnak a hibait a sajat allitasaba.
  */
  const balSzelre = (px: number) => {
    cleanup()
    render(<FejlecMenu kategoriak={categories} />)
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
    return screen.getByTestId("category-menu-panel").style.left
  }

  it("a panel nem csúszik a bal széle mögé", () => {
    /* ISMERT POZITIV KONTROLL: egy bosegesen fero helyen a gomb helyet veszi fel. */
    window.innerWidth = 1920
    expect(balSzelre(400)).toBe("400px")

    expect(balSzelre(-50)).toBe("16px")
  })

  it("a panel nem lóg ki a nézet jobb szélén", () => {
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

  /**
   * A HAROM ZARASI UT HAROM KULON NEV -- KORABBAN EGY ALLITAS VOLT MIND A HAROM.
   *
   * MERVE (2026-09-09): mindharom mechanizmus kivetele UGYANAZT az egy
   * allitast vitte pirosra. Vagyis a nev IGAZAT mondott, es a vedelem is allt
   * -- de a piros nem mondta meg, MELYIK ut szakadt el, es ha az allitas
   * barmelyik feleben gyengul, a masik ketto vele megy.
   *
   * Harom fuggetlen ertek: a NYITO GOMB atkapcsolasa, az ESCAPE, es a
   * HATTERLAPRA kattintas. Egyik sem kovetkezik a masikbol.
   *
   * Es MINDEGYIK sajat renderelesbol indul, nem egy elozo allitas
   * maradvanyabol: egy tesztben egymas utan futtatva a masodik meres mar egy
   * MASIK ut eredmenyet mérné.
   */
  it("az újrakattintott menüpont bezár", () => {
    open()

    /* ISMERT POZITIV KONTROLL: a panel tenyleg nyitva volt. */
    expect(screen.getByTestId("category-menu-panel")).toBeTruthy()

    fireEvent.click(screen.getByTestId("category-menu-trigger-Termékek"))

    expect(screen.queryByTestId("category-menu-panel")).toBeNull()
  })

  it("Escape bezár", () => {
    open()

    fireEvent.keyDown(window, { key: "Escape" })

    expect(screen.queryByTestId("category-menu-panel")).toBeNull()
  })

  it("a tényleges külső háttérre kattintva bezár", () => {
    open()

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
