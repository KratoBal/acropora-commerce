import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import LapVaz, { MUSZAKI_LAP_SZAKASZAI } from "./index"
import { legmelyebbKategoria, vazTartalom } from "./valodi-tartalom"
import { VasarlasProvider } from "../vasarlas/allapot"

/**
 * A KERET HIVASAIT CSEREJUK KI, NEM A MERT KODOT -- ugyanaz a ket hamis, mint a
 * `product-actions.component.spec.tsx`-ben, es ugyanabbol az okbol: a
 * `VasarlasProvider` utvonalat olvas es kosarba tesz, es egyik sem az, amit itt
 * merunk. A negy doboz, a `vazTartalom` es a vaz VALODI marad.
 */
vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "hu" }),
  usePathname: () => "/hu/products/amtra-tds-ec-digitalis-tds-mero",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: vi.fn() }),
}))

vi.mock("@lib/data/cart", () => ({
  addToCart: vi.fn(async () => undefined),
}))

afterEach(cleanup)

/**
 * A FIXTURA A STAGE VALODI ALAKJAT KOVETI, nem kitalalt mezoket: a metaadat négy
 * kulcsa, a kategoriak SZULO-HIVATKOZASSAL, egy valtozat "Kivitel" opcioval.
 *
 * A kategoriak MINDKET mezot viselik (`mpath` ES `parent_category_id`), mert az
 * elo API is mindkettot visszaadja -- merve 2026-09-07, `fields=*categories`.
 * A kod ma a `parent_category_id` mezot olvassa (a tipus csak azt ismeri); az
 * `mpath` azert marad itt, mert a fixtura a VALASZ alakjat koveti, nem azt,
 * hogy eppen melyik mezot hasznaljuk.
 */
const TERMEK = {
  id: "prod_1",
  title: "Amtra TDS/EC digitális TDS mérő",
  handle: "amtra-tds-ec-digitalis-tds-mero",
  thumbnail: "https://pelda.hu/kep.jpg",
  images: [{ id: "img_1", url: "https://pelda.hu/kep.jpg" }],
  description: "<p>Az <strong>Amtra</strong> mérő</p>",
  metadata: {
    unas_unit: "db",
    unas_product_url: "https://regi.hu/termek",
    unas_short_description: "rövid",
    unas_minimum_order_quantity: "1",
  },
  categories: [
    { id: "c1", name: "Termékek", mpath: "c1", parent_category_id: null },
    {
      id: "c2",
      name: "Tesztek, mérés, vezérlés",
      mpath: "c1.c2",
      parent_category_id: "c1",
    },
    {
      id: "c3",
      name: "TDS mérők",
      mpath: "c1.c2.c3",
      parent_category_id: "c2",
    },
  ],
  variants: [{ id: "v1", sku: "8023222196186", options: [] }],
  options: [
    { id: "o1", title: "Kivitel", values: [{ id: "ov1", value: "Alap" }] },
  ],
} as never

/**
 * TÁBLÁZATOS LEÍRÁS: a katalógusban 189 terméknél a műszaki adatok a leírásba
 * ágyazott táblázatokban állnak. A fül-komponens EZEKET emeli ki külön fülre.
 */
const TABLAZATOS = {
  ...(TERMEK as object),
  description:
    "<p>Bevezető szöveg</p><table><tr><td>Teljesítmény</td><td>160 W</td></tr></table>",
} as never

describe("a váz valódi tartalma", () => {
  /**
   * A FÜL-SÁV MEGJELENIK, HA A LEÍRÁSBAN TÁBLÁZAT ÁLL.
   *
   * Ezt az állítást a kalibráció kényszerítette ki. Az előző, viselkedés-alapú
   * állításom ("a leírás jelölőként jelenik meg a fülek dobozában") NEM tudta
   * megkülönböztetni a fül-komponenst a saját leírás-blokkomtól: mindkettő
   * jelölőként rendereli a szöveget. Vagyis nem védte azt, amiért felvettem.
   *
   * Ez viszont a LÁTHATÓ KÖVETKEZMÉNYRE szól: táblázatos leírásnál két fül
   * keletkezik (Leírás és Műszaki adatok), és a saját blokkom ilyet nem ad.
   * Ha valaki a #50 munkáját visszacseréli, ez pirosra vált.
   */
  it("táblázatos leírásnál fül-sáv jelenik meg", () => {
    render(<LapVaz tartalom={vazTartalom(TABLAZATOS)} />)

    const fulek = document.querySelector('[data-vaz-szakasz="fulek"]')
    const gombok = fulek?.querySelectorAll('[role="tab"]') ?? []

    expect(gombok.length).toBe(2)
    const feliratok = Array.from(gombok).map((g) => g.textContent)
    expect(feliratok).toContain("Leírás")
    expect(feliratok).toContain("Műszaki adatok")
  })

  /**
   * A HALMAZBAN NEM MINDIG JON VISSZA A TELJES OS-LANC.
   *
   * Merve az elo API-n (2026-09-07): az egyik termek HAT kategoriat kapott (a
   * gyokerrel es a kozbulsokkel egyutt), egy masik CSAK EGYET -- azt, amihez
   * hozza van rendelve, harom szintu `mpath`-tal, es a szuloje NINCS a
   * halmazban.
   *
   * A level-kereses erre a masodik alakra is helyes valaszt kell adjon.
   * Enelkul az allitasaink csak a "teljes lanc" esetet mernek, es a
   * gyakoribbat nem.
   */
  it("egyetlen, hozzárendelt kategóriánál azt adja, a szülője nélkül is", () => {
    const termek = {
      ...(TERMEK as object),
      categories: [
        {
          id: "c9",
          name: "Hanna fotométerek",
          mpath: "c1.c7.c9",
          parent_category_id: "c7",
        },
      ],
    } as never

    expect(legmelyebbKategoria(termek)).toBe("Hanna fotométerek")
  })

  /**
   * ES A SORREND NEM SZAMIT. A valasz sorrendje nem szerzodes; ha a level-
   * kereses helyett barmikor "az elso elem" allna a kodban, ez pirosodik ki.
   */
  it("fordított sorrendben is a levelet választja, nem az elsőt", () => {
    const termek = {
      ...(TERMEK as object),
      categories: [
        { id: "c1", name: "Termékek", mpath: "c1", parent_category_id: null },
        {
          id: "c3",
          name: "TDS mérők",
          mpath: "c1.c2.c3",
          parent_category_id: "c2",
        },
        {
          id: "c2",
          name: "Tesztek, mérés, vezérlés",
          mpath: "c1.c2",
          parent_category_id: "c1",
        },
      ],
    } as never

    expect(legmelyebbKategoria(termek)).toBe("TDS mérők")
  })

  it("a legmélyebb kategóriát választja, nem a gyökeret", () => {
    expect(legmelyebbKategoria(TERMEK)).toBe("TDS mérők")
  })

  it("a névvel, a besorolással és a cikkszámmal tölti a címsort", () => {
    render(<LapVaz tartalom={vazTartalom(TERMEK)} />)

    expect(screen.getByTestId("vaz-termek-nev").textContent).toContain("Amtra")
    expect(screen.getByTestId("vaz-cikkszam").textContent).toBe("8023222196186")
    expect(screen.getByText("TDS mérők")).toBeTruthy()
  })

  /**
   * A LEÍRÁS A FÜLEK DOBOZÁBAN JELENIK MEG, JELÖLŐKÉNT.
   *
   * Ez az állítás SZÁNDÉKOSAN nem a komponens nevére szól, hanem a
   * viselkedésre: a leírás a `fulek` dobozban áll, és a `<strong>` valódi
   * jelölőként renderelődik, nem szövegként.
   *
   * Így akkor is érvényes marad, ha a fülek komponense cserélődik -- és épp ez
   * történt: a saját leírás-blokkom helyére a #50 már beolvadt fül-komponense
   * került, hogy a Codex munkája ne essen ki a műszaki lapról.
   */
  it("a leírás a fülek dobozában, jelölőként jelenik meg", () => {
    render(<LapVaz tartalom={vazTartalom(TERMEK)} />)

    const fulek = document.querySelector('[data-vaz-szakasz="fulek"]')
    expect(fulek?.getAttribute("data-vaz-ures")).toBe("nem")
    expect(fulek?.querySelector("strong")).toBeTruthy()
    expect(fulek?.textContent).not.toContain("<strong>")
  })

  /**
   * A LÉNYEG: AMINEK NINCS FORRÁSA, AZ ÜRESEN MARAD. Ez nem hiányosság, hanem a
   * kikötés -- kitalált adat nem kerül a lapra.
   *
   * A műszaki paraméterek strukturáltan sehol nem állnak (a leírásba ágyazott
   * táblázatokban élnek), a csomagajánlatnak, a tartozékoknak és a hasonló
   * termékeknek nincs forrásuk, a méretezés-segéd pedig számítás, nem adat.
   */
  it("forrás nélküli dobozok üresen maradnak", () => {
    render(<LapVaz tartalom={vazTartalom(TERMEK)} />)

    for (const kulcs of [
      "meretezes-seged",
      "muszaki-adatok",
      "csomagajanlat",
      "kiegeszitok",
      "hasonlo",
    ]) {
      const doboz = document.querySelector(`[data-vaz-szakasz="${kulcs}"]`)
      expect(doboz?.getAttribute("data-vaz-ures")).toBe("igen")
    }
  })

  /**
   * ÉS A MÁSIK IRÁNY: ami MEGVAN, az NEM maradhat üresen. E nélkül egy elrontott
   * leképezés (rossz kulcsnév, elgépelt mező) csendben visszaadna egy teljesen
   * üres vázat, és a "minden doboz a helyén" állítás igaz maradna rá.
   */
  it("a meglévő adat dobozai NEM üresek", () => {
    render(<LapVaz tartalom={vazTartalom(TERMEK)} />)

    for (const kulcs of ["cimsor", "foto", "fulek", "elerhetoseg"]) {
      const doboz = document.querySelector(`[data-vaz-szakasz="${kulcs}"]`)
      expect(doboz?.getAttribute("data-vaz-ures")).toBe("nem")
    }
  })

  /**
   * KÉP NÉLKÜLI TERMÉK: a fotó doboza üres marad, és a többi változatlan. A
   * katalógusban van kép nélküli termék, tehát ez nem elméleti eset.
   */
  /**
   * A FOTO SLOT HAROM ALLITASA. A harmadik nem adodik az elso kettobol, es epp
   * az a fontos: hogy az ATADOTT tartalom NEM MELLE kerul, hanem HELYETTE.
   * Enelkul egy olyan valtozat is zold maradna, ami mind a kettot kirajzolja --
   * a galeriat ES a vaz egykepes fotojat.
   */
  it("átadott fotó rész a fotó dobozba kerül", () => {
    render(
      <LapVaz
        tartalom={vazTartalom(
          TERMEK,
          undefined,
          undefined,
          <div data-testid="sajat-galeria">galéria</div>,
        )}
      />,
    )

    const doboz = document.querySelector('[data-vaz-szakasz="foto"]')
    expect(doboz?.getAttribute("data-vaz-ures")).toBe("nem")
    expect(screen.getByTestId("sajat-galeria")).toBeTruthy()
  })

  it("átadott fotó rész HELYETT áll, nem mellette", () => {
    render(
      <LapVaz
        tartalom={vazTartalom(
          TERMEK,
          undefined,
          undefined,
          <div data-testid="sajat-galeria">galéria</div>,
        )}
      />,
    )

    // a vaz sajat egykepes fotoja NEM jelenhet meg mellette
    expect(document.querySelectorAll('[data-testid="vaz-foto"]')).toHaveLength(
      0,
    )
  })

  it("átadott fotó rész nélkül a váz saját fotója áll ott", () => {
    render(<LapVaz tartalom={vazTartalom(TERMEK)} />)

    const doboz = document.querySelector('[data-vaz-szakasz="foto"]')
    expect(doboz?.getAttribute("data-vaz-ures")).toBe("nem")
    expect(document.querySelector('[data-testid="sajat-galeria"]')).toBeNull()
  })

  it("kép nélküli terméknél a fotó doboza üres", () => {
    const kepNelkul = {
      ...(TERMEK as object),
      thumbnail: null,
      images: [],
    } as never
    render(<LapVaz tartalom={vazTartalom(kepNelkul)} />)

    const foto = document.querySelector('[data-vaz-szakasz="foto"]')
    expect(foto?.getAttribute("data-vaz-ures")).toBe("igen")

    const cimsor = document.querySelector('[data-vaz-szakasz="cimsor"]')
    expect(cimsor?.getAttribute("data-vaz-ures")).toBe("nem")
  })

  /**
   * A MÁR BEOLVADT MUNKA BEFOGADÁSA. Acrobot kikötése: ezek nem újraépítendők,
   * a váznak be kell fogadnia őket.
   *
   * Régió nélkül a `mennyiség` doboz üres marad -- ez nem hiba, hanem az, hogy
   * ár és készlet régió nélkül nem értelmezhető.
   */
  it("aktív vásárlási állapottal a mennyiség doboz nem üres", () => {
    render(
      <VasarlasProvider product={TERMEK}>
        <LapVaz tartalom={vazTartalom(TERMEK, true)} />
      </VasarlasProvider>,
    )

    const doboz = document.querySelector('[data-vaz-szakasz="mennyiseg"]')
    expect(doboz?.getAttribute("data-vaz-ures")).toBe("nem")
  })

  it("vásárlási állapot nélkül a mennyiség doboz üresen marad", () => {
    render(<LapVaz tartalom={vazTartalom(TERMEK)} />)

    const doboz = document.querySelector('[data-vaz-szakasz="mennyiseg"]')
    expect(doboz?.getAttribute("data-vaz-ures")).toBe("igen")
  })

  /**
   * A 13. DOBOZ: A HASONLO TERMEKEK.
   *
   * Ket allitas, mert az egyik nem adodik a masikbol: hogy a KAPOTT lista a
   * terv dobozaba kerul, ES hogy forras nelkul a doboz VARAKOZIK. A masodik
   * nelkul egy olyan valtozat is zold maradna, ami mindig kitoltottnek jeloli
   * a dobozt.
   */
  it("átadott hasonló résszel a hasonló doboz nem üres", () => {
    render(
      <LapVaz
        tartalom={vazTartalom(TERMEK, undefined, <div>hasonló lista</div>)}
      />,
    )

    const doboz = document.querySelector('[data-vaz-szakasz="hasonlo"]')
    expect(doboz?.getAttribute("data-vaz-ures")).toBe("nem")
    expect(doboz?.textContent).toContain("hasonló lista")
  })

  it("átadott hasonló rész nélkül a hasonló doboz üresen marad", () => {
    render(<LapVaz tartalom={vazTartalom(TERMEK)} />)

    const doboz = document.querySelector('[data-vaz-szakasz="hasonlo"]')
    expect(doboz?.getAttribute("data-vaz-ures")).toBe("igen")
  })

  /**
   * ES A HARMADIK ALLITAS ARROL SZOL, AMIT A SLOT NEM VIHET EL.
   *
   * A hasonlo lista a vasarlasi resztol FUGGETLENUL kerul a helyere. Ha a ket
   * slot valaha egymasba csuszna (ugyanaz a kulcs, elirt sorrend), az EGYIK
   * doboz csendben elnyelne a masik tartalmat -- es a ket fenti allitas kulon
   * futtatva ettol meg zold maradna.
   */
  it("a vásárlási rész és a hasonló lista külön dobozba kerül", () => {
    render(
      <VasarlasProvider product={TERMEK}>
        <LapVaz
          tartalom={vazTartalom(TERMEK, true, <div>hasonló lista</div>)}
        />
      </VasarlasProvider>,
    )

    const mennyiseg = document.querySelector('[data-vaz-szakasz="mennyiseg"]')
    const hasonlo = document.querySelector('[data-vaz-szakasz="hasonlo"]')

    expect(mennyiseg?.textContent).not.toContain("hasonló lista")
    expect(hasonlo?.textContent).toContain("hasonló lista")
  })

  /**
   * A NEGY DOBOZ KULON ALL -- ES EZ AZ AZ ALLITAS, AMIERT EZ A KOR LETEZIK.
   *
   * A terv a jobb oszlopot negy dobozra bontja, es eddig mind a negy tartalma
   * EGY dobozban allt. Egy allitas, ami csak annyit mond, hogy "a mennyiseg
   * doboz nem ures", ezt a valtozast NEM latta volna: az a doboz eddig is tele
   * volt. Ezert a negy dobozt KULON-KULON kell megnevezni.
   */
  it("az ár, a választó és a mennyiség külön dobozba kerül", () => {
    render(
      <VasarlasProvider product={TERMEK}>
        <LapVaz tartalom={vazTartalom(TERMEK, true)} />
      </VasarlasProvider>,
    )

    for (const kulcs of ["ar", "valaszto", "mennyiseg"]) {
      const doboz = document.querySelector(`[data-vaz-szakasz="${kulcs}"]`)
      expect(doboz, kulcs).not.toBeNull()
      expect(doboz?.getAttribute("data-vaz-ures"), kulcs).toBe("nem")
    }

    // a gomb PONTOSAN a mennyiseg dobozban all, nem az arban
    const mennyiseg = document.querySelector('[data-vaz-szakasz="mennyiseg"]')
    const ar = document.querySelector('[data-vaz-szakasz="ar"]')
    expect(mennyiseg?.querySelector("button")).not.toBeNull()
    expect(ar?.querySelector("button")).toBeNull()
  })

  /**
   * ES A VALASZTO DOBOZ NEM AZ URES AGABOL DOL EL.
   *
   * Egy egyedi peldanynal a doboz maga is `null`-t adna -- de ha CSAK az
   * dontene, a vaz TELINEK jelolne egy uresen rajzolo dobozt. A kulonbseg
   * latszik a vevonek: egy telinek jelolt ures doboz nem varakozik, hanem
   * hianyzik.
   */
  it("egyedi példánynál a választó doboz üresen marad, nem telinek jelölve", () => {
    const egyedi = {
      ...(TERMEK as object),
      metadata: { unas_unit: "db", unique_piece: "true" },
    } as never

    render(
      <VasarlasProvider product={egyedi}>
        <LapVaz tartalom={vazTartalom(egyedi, true)} />
      </VasarlasProvider>,
    )

    const doboz = document.querySelector('[data-vaz-szakasz="valaszto"]')
    expect(doboz?.getAttribute("data-vaz-ures")).toBe("igen")
  })

  it("a tizennégy doboz akkor is mind ott áll, ha csak a fele kap tartalmat", () => {
    render(<LapVaz tartalom={vazTartalom(TERMEK)} />)

    expect(document.querySelectorAll("[data-vaz-szakasz]")).toHaveLength(
      MUSZAKI_LAP_SZAKASZAI.length,
    )
  })
})
