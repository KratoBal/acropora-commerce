import { readFileSync } from "fs"
import { join } from "path"

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import {
  csoportosAlak,
  FejlecMenu,
  MENU_SORREND,
  menuSorrendben,
  oszlopSzam,
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

/** A megjegyzeseket kiszedi: ez a fajl a sajat javitasat SZOVEGBEN is leirja. */
const kodSzoveg = (szoveg: string) =>
  szoveg.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")

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

/**
 * A SAV GORGETESKOR IS OTT MARAD -- ES EZ EGY VISSZAVONT VISELKEDES HELYEN ALL.
 *
 * Itt korabban harom allitas volt arrol, hogy a sav a 120. pixel folott
 * ELTUNIK. Az felreolvasas volt: a "kategoria fa", aminek el kell tunnie, a
 * LABLEC racsa (harom kitelepitett lapon merve), a mai bolt menusavja pedig
 * feltapad es vegig latszik. Balazs dontese: "a fejlec menusav tapadjon".
 *
 * A REJTES HELYERE NEM SEMMI KERUL, HANEM A TAGADASA: ha valaki visszateszi a
 * gorgetes-figyelot, ezek az allitasok pirosra fordulnak. Egy torolt teszt
 * helyen ures hely marad, es az ures hely nem orzo.
 */
describe("a kategória-sáv görgetéskor is ott marad", () => {
  const gorget = (y: number) => {
    Object.defineProperty(window, "scrollY", { value: y, configurable: true })
    fireEvent.scroll(window)
  }

  it("lejjebb görgetve is látszik, és nem kap rejtő osztályt", () => {
    render(<FejlecMenu kategoriak={[kat("Korallok")]} />)

    gorget(400)

    const sav = screen.getByTestId("fejlec-menu")

    expect(sav).toBeTruthy()
    expect(sav.className).not.toContain("lg:hidden")
  })

  /**
   * ES A NYITOTT PANEL SEM ZARUL BE GORGETESRE. A regi viselkedes epp ezt
   * csinalta, mert a sav maga tunt el alola; tapado savnal a panel vele
   * mozdul, tehat nincs mi elol bezarni.
   */
  it("görgetéskor a nyitott panel nyitva marad", () => {
    render(<FejlecMenu kategoriak={[kat("Korallok", ["SPS"])]} />)

    fireEvent.click(screen.getByTestId("fejlec-menu-tetel"))
    expect(screen.getByTestId("fejlec-menu-lenyilo")).toBeTruthy()

    gorget(400)

    expect(screen.getByTestId("fejlec-menu-lenyilo")).toBeTruthy()
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

/**
 * A VALODI FA ALAKJA, NEM KEZZEL KITALALT FIXTURA.
 *
 * A darabszamok merve vannak (2026-09-09, a kitelepitett kategoria-lapokrol, az
 * allando szulo-hivatkozas levonasaval). A kezzel irt fixturaim epp azert nem
 * hoztak elo az egy-csoportos panelt, mert mindig kettot-hármat adtam neki --
 * a valodi fan viszont a Korallok EGY gyereket hordoz.
 *
 *     gyoker           gyerek   ebbol unokas
 *     Termekek             23             17
 *     Halak                15              0
 *     Gerinctelenek         7              0
 *     Korallok              1              1
 */
const valodiAlak = (nev: string, gyerek: number, unokas: number) =>
  ({
    id: `id-${nev}`,
    name: nev,
    handle: nev.toLowerCase(),
    category_children: Array.from({ length: gyerek }, (_, i) => ({
      id: `${nev}-cs${i}`,
      name: `${nev} csoport ${i}`,
      handle: `${nev.toLowerCase()}-cs${i}`,
      category_children:
        i < unokas
          ? [{ id: `${nev}-u${i}`, name: `unoka ${i}`, handle: `u${i}` }]
          : [],
    })),
  }) as never

/**
 * A RACS OSZLOPSZAMA ONNAN JON, AHONNAN A BONGESZO IS VESZI.
 *
 * Az elso valtozat egy `data-oszlopok` jelolot olvasott. A kalibracio
 * megmutatta, hogy az PROXY: elrontottam a racs STILUSAT, a jelolo pedig
 * valtozatlan maradt, tehat nulla teszt lett piros. Azota a szam egyetlen
 * helyen all, egy CSS-valtozoban, es ez a segedfuggveny AZT olvassa.
 */
const panelOszlopok = () => {
  const racs = screen
    .getByTestId("fejlec-menu-lenyilo")
    .querySelector(".grid") as HTMLElement | null

  return racs?.style.getPropertyValue("--panel-oszlopok").trim() ?? null
}

describe("a panel csak annyi oszlopot vesz fel, amennyit kitölt", () => {
  it("a cellák számát adja, legfeljebb ötöt", () => {
    expect(oszlopSzam(23)).toBe(5)
    expect(oszlopSzam(15)).toBe(5)
    expect(oszlopSzam(7)).toBe(5)
    expect(oszlopSzam(5)).toBe(5)
    expect(oszlopSzam(1)).toBe(1)
  })

  it("üres listánál sem ad nulla oszlopot", () => {
    expect(oszlopSzam(0)).toBe(1)
  })

  /**
   * A MASIK FELE, ES A KALIBRACIO KENYSZERITETTE KI.
   *
   * A szam egy CSS-valtozoban all, a racs pedig abbol veszi az oszlopokat. Ket
   * fel, es egy allitas csak az EGYIKET fogja: ha valaki a `grid-cols-5`
   * alakra cserelne az osztalyt, a valtozo valtozatlan maradna, es minden fenti
   * allitas zold lenne -- kozben a panel mindig ot oszlopos.
   */
  it("a rács a változóból veszi az oszlopszámot, nem rögzített értékből", () => {
    render(<FejlecMenu kategoriak={[valodiAlak("Korallok", 1, 1)]} />)

    fireEvent.click(screen.getByTestId("fejlec-menu-tetel"))

    const racs = screen
      .getByTestId("fejlec-menu-lenyilo")
      .querySelector(".grid") as HTMLElement

    expect(racs.className).toContain("repeat(var(--panel-oszlopok)")
  })

  /**
   * EZ AZ ALLITAS A LELET MAGA: a Korallok egyetlen gyereket hordoz, es
   * allando ot oszlop mellett negy ures oszlop maradna mellette.
   */
  it("a Korallok valódi alakja EGY oszlopot kap, nem ötöt", () => {
    render(<FejlecMenu kategoriak={[valodiAlak("Korallok", 1, 1)]} />)

    fireEvent.click(screen.getByTestId("fejlec-menu-tetel"))

    expect(panelOszlopok()).toBe("1")
  })

  /**
   * ES A MASIK IRANY, KULONBEN AZ ALLITAS "MINDIG EGY OSZLOP" MELLETT IS ZOLD
   * LENNE: a Termekek valodi alakja tovabbra is otot kap.
   */
  it("a Termékek valódi alakja öt oszlopot kap", () => {
    render(<FejlecMenu kategoriak={[valodiAlak("Termékek", 23, 17)]} />)

    fireEvent.click(screen.getByTestId("fejlec-menu-tetel"))

    const lenyilo = screen.getByTestId("fejlec-menu-lenyilo")

    expect(panelOszlopok()).toBe("5")
    expect(lenyilo.getAttribute("data-alak")).toBe("csoportos")
  })

  /**
   * A NEGY GYOKER VALODI ALAKJA EGYUTT, mert a lelet abbol jott elo, hogy a
   * negyet egymas mellett neztem, nem kulon-kulon.
   */
  it("mind a négy gyökér a mért alakjával", () => {
    const vart = [
      {
        nev: "Termékek",
        gyerek: 23,
        unokas: 17,
        alak: "csoportos",
        oszlop: "5",
      },
      { nev: "Halak", gyerek: 15, unokas: 0, alak: "listas", oszlop: "5" },
      {
        nev: "Gerinctelenek",
        gyerek: 7,
        unokas: 0,
        alak: "listas",
        oszlop: "5",
      },
      { nev: "Korallok", gyerek: 1, unokas: 1, alak: "csoportos", oszlop: "1" },
    ]

    for (const v of vart) {
      cleanup()
      render(
        <FejlecMenu kategoriak={[valodiAlak(v.nev, v.gyerek, v.unokas)]} />,
      )
      fireEvent.click(screen.getByTestId("fejlec-menu-tetel"))

      const lenyilo = screen.getByTestId("fejlec-menu-lenyilo")

      expect(lenyilo.getAttribute("data-alak")).toBe(v.alak)
      expect(panelOszlopok()).toBe(v.oszlop)
    }
  })
})

/**
 * A PANEL NYITVA MARAD, AMIG AZ EGER ODAER -- MERT EGYSZER NEM MARADT.
 *
 * Balazs szava: "a felso menusor lenyilik de ha lehozom onna az egeret akkor
 * eltunik tehat nem kattinthato". A kitelepitett lapon merve a gomb alja az 50.
 * pixelen allt, a panel teteje a 78-on: HUSZONNYOLC pixeles res, ami egyik
 * elemhez sem tartozott. Mar 55 pixelnel bezarult.
 *
 * AMIT EZ A SPEC MER, ES AMIT NEM: a res maga ELRENDEZES, es jsdom nem szamol
 * elrendezest -- azt csak a kitelepitett lapon lehet megnezni
 * (`scripts/menu-panel-elesben.cjs` melle keszult a meres). Amit ITT merni
 * lehet, az a MECHANIZMUS: melyik elem zar, es melyik nem.
 */
describe("a panel nyitva marad, amíg az egér odaér", () => {
  const nyit = () => {
    render(<FejlecMenu kategoriak={[kat("Korallok", ["SPS", "LPS"])]} />)
    fireEvent.click(screen.getByTestId("fejlec-menu-tetel"))
    expect(screen.getByTestId("fejlec-menu-lenyilo")).toBeTruthy()
  }

  /**
   * EZ A REGRESSZIO-ORZO, ES A FORRASRA MER -- INDOKKAL.
   *
   * Eloszor viselkedessel probaltam: nyitas, majd `mouseLeave` a MENUPONT
   * burkolatan, es a panel maradjon nyitva. PIROS lett, es nem a kod miatt: a
   * React a `mouseenter`/`mouseleave` esemenyeket a gyokeren delegalva
   * szimulalja, tehat egy gyereken kivaltott `mouseLeave` a SZULO kezelojehez
   * is eljut. jsdom-ban ez a kulonbseg nem merheto.
   *
   * Amit merni lehet: HOL all a kezelo. Egy darab all belole, es a savon. Ha
   * valaki visszateszi a menupontokra (ott volt, es epp ezert zarult be a res
   * felett), ez pirosra fordul.
   */
  it("egyetlen záró kezelő áll, és a sávon", () => {
    const kod = kodSzoveg(
      readFileSync(join(__dirname, "fejlec-menu.tsx"), "utf-8"),
    )

    expect(kod.match(/onMouseLeave/g) ?? []).toHaveLength(1)
    expect(kod).toMatch(
      /data-testid="fejlec-menu"\s*\n\s*onMouseLeave=\{\(\) => setNyitott\(null\)\}/,
    )
  })

  /** ES A MASIK IRANY: a SAVROL lelepve viszont be KELL zarulnia. */
  it("a sávról lelépve bezárul", () => {
    nyit()

    fireEvent.mouseLeave(screen.getByTestId("fejlec-menu"))

    expect(screen.queryByTestId("fejlec-menu-lenyilo")).toBeNull()
  })

  /**
   * A PANEL A SAVON BELUL ALL A DOM-ban. Enelkul a bele lepes maga valtana ki
   * a `mouseleave`-et a savon, es a fenti ket allitas egyutt sem segitene.
   */
  it("a panel a sáv leszármazottja", () => {
    nyit()

    const sav = screen.getByTestId("fejlec-menu")
    const panel = screen.getByTestId("fejlec-menu-lenyilo")

    expect(sav.contains(panel)).toBe(true)
  })

  /**
   * ES A RES BEZARASA: a sav a fejlec TELJES magassagat elfoglalja, tehat az
   * alja ott van, ahol a panel teteje. Ez osztaly-allitas, mert a pixel csak a
   * kitelepitett lapon merheto -- de a mechanizmus ez az egy osztaly.
   */
  it("a sáv a fejléc teljes magasságát elfoglalja", () => {
    render(<FejlecMenu kategoriak={[kat("Korallok", ["SPS"])]} />)

    expect(screen.getByTestId("fejlec-menu").className).toContain("h-full")
  })
})
