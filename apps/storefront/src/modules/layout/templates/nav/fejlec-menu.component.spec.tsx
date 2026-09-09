import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import {
  csoportosAlak,
  FejlecMenu,
  MENU_SORREND,
  menuSorrendben,
} from "./fejlec-menu"

/**
 * UGYANAZ A HAMIS, AMIT A REPO MAR HASZNAL (stock-state, product-actions,
 * allapot.ssr): a `LocalizedClientJelolo` az orszagkodot a router-bol veszi, es
 * az jsdom-ban `null`. Nem uj mechanizmus -- a meglevo alakot veszem at, hogy
 * ne keletkezzen masodik ut ugyanarra.
 */
vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "hu" }),
}))

afterEach(cleanup)

const kat = (nev: string, gyerekek: string[] = []) =>
  ({
    id: `id-${nev}`,
    name: nev,
    handle: nev.toLowerCase(),
    category_children: gyerekek.map((gy) => ({
      id: `id-${gy}`,
      name: gy,
      handle: gy.toLowerCase(),
    })),
  }) as never

/**
 * A KET MECHANIKA KULON ALL, ES KULON IS MERHETO.
 *
 * Balazs kerese ketto: a menupont NYISSON (ne navigaljon), es a sav TUNJON EL
 * gorgetesre. Ezek fuggetlenek -- az egyik elromolhat ugy, hogy a masik all,
 * ezert nem egy allitas meri oket.
 *
 * AMIT EZ A SPEC NEM MER: hogy melyik NEGY kategoria all a savban. Az kulon
 * kerdes, Balazsnal -- a komponens a KAPOTT halmazt rajzolja ki, es ez a spec
 * epp ezt hasznalja ki: sajat, kitalalt halmazt ad neki.
 */
describe("a fejléc menüje nyílik, nem ugrik", () => {
  it("a menüpont GOMB, nem hivatkozás", () => {
    render(<FejlecMenu kategoriak={[kat("Korallok", ["SPS", "LPS"])]} />)

    const tetel = screen.getByTestId("fejlec-menu-tetel")

    expect(tetel.tagName).toBe("BUTTON")
    expect(tetel.getAttribute("aria-expanded")).toBe("false")
  })

  it("kattintásra kinyílik, és a gyerekek megjelennek", () => {
    render(<FejlecMenu kategoriak={[kat("Korallok", ["SPS", "LPS"])]} />)

    expect(screen.queryByTestId("fejlec-menu-lenyilo")).toBeNull()

    fireEvent.click(screen.getByTestId("fejlec-menu-tetel"))

    expect(screen.getByTestId("fejlec-menu-lenyilo")).toBeTruthy()
    expect(screen.getAllByTestId("fejlec-menu-gyerek")).toHaveLength(2)
  })

  /**
   * A GYOKER ELERHETO MARAD -- ez a keres masik fele.
   *
   * "ne ugorjon EGYBOL a termekek fokategoriara" nem azt jelenti, hogy a
   * fokategoria elerhetetlen legyen. A lenyilo tetejen ott all a sajat
   * hivatkozasa, kulon soron.
   */
  it("a lenyílóban ott a gyökér saját hivatkozása is", () => {
    render(<FejlecMenu kategoriak={[kat("Korallok", ["SPS"])]} />)

    fireEvent.click(screen.getByTestId("fejlec-menu-tetel"))

    const gyoker = screen.getByTestId("fejlec-menu-gyoker-link")
    expect(gyoker.getAttribute("href")).toContain("/categories/korallok")
  })
})

describe("a kategória-sáv görgetésre eltűnik", () => {
  const gorget = (y: number) => {
    Object.defineProperty(window, "scrollY", { value: y, configurable: true })
    fireEvent.scroll(window)
  }

  it("a lap tetején látszik", () => {
    render(<FejlecMenu kategoriak={[kat("Korallok")]} />)

    expect(screen.getByTestId("fejlec-menu").getAttribute("data-latszik")).toBe(
      "igen",
    )
  })

  it("lejjebb görgetve eltűnik", () => {
    render(<FejlecMenu kategoriak={[kat("Korallok")]} />)

    gorget(400)

    expect(screen.getByTestId("fejlec-menu").getAttribute("data-latszik")).toBe(
      "nem",
    )
  })

  /**
   * ES A NYITOTT LENYILO IS BEZARUL. Enelkul egy lebego panel maradna a
   * kepernyon, mikozben a sav, amihez tartozik, mar nem latszik.
   */
  it("görgetéskor a nyitott lenyíló is bezárul", () => {
    render(<FejlecMenu kategoriak={[kat("Korallok", ["SPS"])]} />)

    fireEvent.click(screen.getByTestId("fejlec-menu-tetel"))
    expect(screen.getByTestId("fejlec-menu-lenyilo")).toBeTruthy()

    gorget(400)

    expect(screen.queryByTestId("fejlec-menu-lenyilo")).toBeNull()
  })
})

/**
 * A NEGY MENUPONT ES A SORRENDJUK BALAZS SZAVABOL JON, NEM ADATBOL.
 *
 * "MIndenhol: Termékek, Halak, Korallok, Gerinctelenek" (2026-09-09 09:54).
 *
 * MIERT ALL ITT KULON ALLITAS A SORRENDRE: mert a sorrend semmilyen adatbol
 * NEM vezetheto le. Meret szerint sem (Korallok 8, Gerinctelenek 27, megis a
 * Korallok all elorebb), es a bolt `rank` mezojebol sem (az
 * Termekek, Gerinctelenek, Halak, Korallok sorrendet ad). Egy szamolt sorrend
 * tehat CSENDBEN mast adna -- ez az allitas epp azt fogja meg.
 */
describe("a menü négy pontja, Balázs sorrendjében", () => {
  it("a rögzített lista pontosan a kért négy név, ebben a sorrendben", () => {
    expect([...MENU_SORREND]).toEqual([
      "Termékek",
      "Halak",
      "Korallok",
      "Gerinctelenek",
    ])
  })

  it("a kapott halmazt a rögzített sorrendbe rakja, nem a saját sorrendjében hagyja", () => {
    /* A bolt `rank` szerinti sorrendje -- szandekosan MAS, mint a kert. */
    const boltSzerint = [
      kat("Termékek"),
      kat("Gerinctelenek"),
      kat("Halak"),
      kat("Korallok"),
    ]

    expect(menuSorrendben(boltSzerint).map((k) => k.name)).toEqual([
      "Termékek",
      "Halak",
      "Korallok",
      "Gerinctelenek",
    ])
  })

  /**
   * EGY HIANYZO NEV KIMARAD, ES NEM HELYETTESITUNK. Ha egy kategoria nincs a
   * boltban, az adat-kerdes -- nem talalunk ki helyette masikat.
   */
  it("hiányzó kategória egyszerűen kimarad", () => {
    const csakKetto = [kat("Termékek"), kat("Korallok")]

    expect(menuSorrendben(csakKetto).map((k) => k.name)).toEqual([
      "Termékek",
      "Korallok",
    ])
  })

  it("a sávban is ebben a sorrendben rajzolódnak", () => {
    render(
      <FejlecMenu
        kategoriak={[kat("Gerinctelenek"), kat("Termékek"), kat("Halak")]}
      />,
    )

    const nevek = screen
      .getAllByTestId("fejlec-menu-tetel")
      .map((e) => e.textContent)

    expect(nevek).toEqual(["Termékek", "Halak", "Gerinctelenek"])
  })
})

/**
 * HAROM SZINTU HAMIS: gyoker, csoport, elem. A fenti `kat` KET szintet ad, es
 * az a sima listas alakhoz eleg -- a csoportos panelhez unoka is kell.
 */
const katFa = (nev: string, csoportok: Record<string, string[]>) =>
  ({
    id: `id-${nev}`,
    name: nev,
    handle: nev.toLowerCase(),
    category_children: Object.entries(csoportok).map(([cs, elemek]) => ({
      id: `id-${cs}`,
      name: cs,
      handle: cs.toLowerCase(),
      category_children: elemek.map((e) => ({
        id: `id-${e}`,
        name: e,
        handle: e.toLowerCase(),
      })),
    })),
  }) as never

/**
 * A PANEL KET ALAKJA, ES MIERT AZ ADAT DONT.
 *
 * A mai bolt mega-menuje csoportos: nagybetus fejlec, alatta nehany elem. Ez
 * CSAK ott ertelmes, ahol a gyerekeknek van sajat gyerekuk. Merve 2026-09-09:
 * a Termekek alatt 86 unoka all, a Halak es a Gerinctelenek alatt egy sem.
 * Csoportos alakban azok a panelek csupa fejlec es nulla elem lennenek.
 *
 * EZERT MER ITT KET IRANY: hogy a csoportos alak megjelenik, ES hogy unoka
 * nelkul NEM jelenik meg. Egy iranybol nem derulne ki, hogy a dontes egyaltalan
 * fugg-e az adattol.
 */
describe("a lenyíló széles panel, csoportokkal", () => {
  it("csoportos alakot választ, ha a gyerekek többségének van saját gyereke", () => {
    expect(
      csoportosAlak([
        { category_children: [{ id: "a" }] },
        { category_children: [{ id: "b" }] },
        { category_children: [] },
      ] as never),
    ).toBe(true)
  })

  it("sima listát választ, ha egyetlen gyereknek sincs saját gyereke", () => {
    expect(
      csoportosAlak([
        { category_children: [] },
        { category_children: [] },
      ] as never),
    ).toBe(false)
  })

  it("a csoportos panelben a csoportcím a gyerek, az elemek az unokák", () => {
    render(
      <FejlecMenu
        kategoriak={[
          katFa("Termékek", {
            Eledelek: ["Haleledelek", "Koralltápok"],
            Lehabzók: ["ATB", "Nyos"],
          }),
        ]}
      />,
    )

    fireEvent.click(screen.getByTestId("fejlec-menu-tetel"))

    expect(
      screen.getByTestId("fejlec-menu-lenyilo").getAttribute("data-alak"),
    ).toBe("csoportos")
    expect(
      screen
        .getAllByTestId("fejlec-menu-csoport-cim")
        .map((e) => e.textContent),
    ).toEqual(["Eledelek", "Lehabzók"])
    expect(
      screen.getAllByTestId("fejlec-menu-gyerek").map((e) => e.textContent),
    ).toEqual(["Haleledelek", "Koralltápok", "ATB", "Nyos"])
  })

  /**
   * A HATAR MIND A KET IRANYBAN ALL ITT.
   *
   * A kepen hat csoport ellenorizheto, es mind a hat egybevag azzal, hogy
   * legfeljebb OT elem latszik, aztan egy "Tobb" hivatkozas jon. Egy iranyt
   * merni keves lenne: az "otnel nincs Tobb" allitas fogja meg azt, ha valaki
   * a hatart eggyel elmozditja.
   */
  it("hatodik elemtől a lista ötnél elvágódik, és Több hivatkozás jön", () => {
    render(
      <FejlecMenu
        kategoriak={[
          katFa("Termékek", {
            Áramoltatók: ["a1", "a2", "a3", "a4", "a5", "a6"],
          }),
        ]}
      />,
    )

    fireEvent.click(screen.getByTestId("fejlec-menu-tetel"))

    expect(screen.getAllByTestId("fejlec-menu-gyerek")).toHaveLength(5)
    expect(
      screen.getByTestId("fejlec-menu-tobb").getAttribute("href"),
    ).toContain("/categories/áramoltatók")
  })

  it("pontosan öt elemnél NINCS Több hivatkozás", () => {
    render(
      <FejlecMenu
        kategoriak={[
          katFa("Termékek", {
            Akváriumkarbantartás: ["a1", "a2", "a3", "a4", "a5"],
          }),
        ]}
      />,
    )

    fireEvent.click(screen.getByTestId("fejlec-menu-tetel"))

    expect(screen.getAllByTestId("fejlec-menu-gyerek")).toHaveLength(5)
    expect(screen.queryByTestId("fejlec-menu-tobb")).toBeNull()
  })

  /**
   * ES A MASIK ALAK: unoka nelkul nincs csoportcim, a gyerekek maguk az elemek.
   * Ez a Halak es a Gerinctelenek mai allapota.
   */
  it("unoka nélkül a gyerekek maguk a lista elemei, csoportcím nélkül", () => {
    render(<FejlecMenu kategoriak={[kat("Halak", ["Gébek", "Íjhalak"])]} />)

    fireEvent.click(screen.getByTestId("fejlec-menu-tetel"))

    expect(
      screen.getByTestId("fejlec-menu-lenyilo").getAttribute("data-alak"),
    ).toBe("listas")
    expect(screen.queryByTestId("fejlec-menu-csoport-cim")).toBeNull()
    expect(
      screen.getAllByTestId("fejlec-menu-gyerek").map((e) => e.textContent),
    ).toEqual(["Gébek", "Íjhalak"])
  })
})
