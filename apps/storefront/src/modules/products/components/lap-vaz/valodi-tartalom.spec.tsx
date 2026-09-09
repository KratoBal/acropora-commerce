import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import LapVaz, { MUSZAKI_LAP_SZAKASZAI } from "./index"
import {
  besorolasLanc,
  legmelyebbKategoria,
  TELEFON_HIVAS,
  TELEFON_MEGJELENITVE,
  vazTartalom,
} from "./valodi-tartalom"
import { VasarlasProvider } from "../vasarlas/allapot"
import { LEPTETO_GOMB_MERET, LEPTETO_MEZO_MERET } from "../vasarlas/dobozok"

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

/**
 * UGYANAZ A TERMEK, GONDOZOTT KAPCSOLATTAL. A `hasonlo` doboz ket allapota
 * KET KULONBOZO BEMENETEN mérheto, nem ugyanazon: a doboz csak akkor teli, ha
 * a termek metaadataban all azonosito.
 */
const TERMEK_KAPCSOLATTAL = {
  ...(TERMEK as object),
  metadata: {
    ...(TERMEK as { metadata: Record<string, string> }).metadata,
    unas_similar_ids: "prod_2,prod_3",
  },
} as never

/**
 * ES KET TOVABBI BEMENET, MERT A KET DOBOZ FUGGETLENSEGET CSAK KULON-KULON
 * BEMENETEN LEHET MERNI.
 *
 * Egy olyan termek, amin MINDKET lista all, NEM merne semmit: ott mind a ket
 * doboz megtelne akkor is, ha a ket slot ugyanarra a kulcsra nez. A kulonbseg
 * csak ott latszik, ahol az EGYIK lista all es a masik nem.
 */
const TERMEK_CSAK_KIEGESZITOVEL = {
  ...(TERMEK as object),
  metadata: {
    ...(TERMEK as { metadata: Record<string, string> }).metadata,
    unas_accessory_ids: "prod_7,prod_8",
  },
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

  /**
   * A BESOROLAS MOSTANTOL LANC, NEM EGY NEV.
   *
   * Ez az allitas eddig a `getByText("TDS mérők")` alakot hasznalta, vagyis a
   * legmelyebb kategoriat ONALLO szovegkent kereste -- es JOGGAL bukott el,
   * amikor a sor a lancot mutatja. A tervlapon a cim folott
   * `WYSIWYG · SPS · ACROPORIDAE` all, tehat lanc, nem egy nev.
   *
   * A GYOKER KIMARAD: a terven a sor a masodik szinttel kezdodik, es a gyoker
   * amugy is a morzsamenuben all.
   */
  it("a névvel, a besorolás láncával és a cikkszámmal tölti a címsort", () => {
    render(<LapVaz tartalom={vazTartalom(TERMEK)} />)

    expect(screen.getByTestId("vaz-termek-nev").textContent).toContain("Amtra")
    expect(screen.getByTestId("vaz-cikkszam").textContent).toBe("8023222196186")

    const besorolas = screen.getByTestId("vaz-besorolas").textContent

    expect(besorolas).toBe("Tesztek, mérés, vezérlés · TDS mérők")
    expect(besorolas).not.toContain("Termékek")
  })

  /**
   * ES A TISZTA FUGGVENY KULON, MERT A KIRAJZOLAS NEM MINDIG ELERHETO: egy
   * kategoria nelkuli termeknel a sor MEG SEM JELENIK, es akkor a fenti
   * allitas `getByTestId` hivasa hasal el, nem az allitas mond valamit.
   */
  it("kategória nélkül a lánc üres", () => {
    expect(besorolasLanc({ id: "p", title: "x" } as never)).toEqual([])
  })

  it("a lánc a gyökér nélkül, sorrendben áll elő", () => {
    expect(besorolasLanc(TERMEK)).toEqual([
      "Tesztek, mérés, vezérlés",
      "TDS mérők",
    ])
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
   * A HATAR-ALLITAS: EGY KILENC KARAKTERES LEIRAS IS MEGJELENIK.
   *
   * MIERT KELL, ES MIERT EPP EZ AZ ALAK. A doboz feltetele ma az, hogy a
   * megtisztitott leiras NEM ures -- nincs benne hossz-kuszob, es nem is szabad,
   * hogy legyen. Egy kuszob kezenfekvo lenne (a legrovidebb leiras hat
   * karakter), es EPP A LEGHASZNOSABB adatot rejtene el.
   *
   * MERVE a teljes bolton (acrobot, 2026-09-08, mind az 1492 termek), A
   * MEGTISZTITOTT SZOVEGEN: negyven karakter alatt 25 termek all, szaz alatt
   * 82 -- es ezek nem torott sorok, hanem tomor muszaki specek:
   *
   * A "MEGTISZTITOTT" JELOLES NEM SZORSZALHASOGATAS, ES EPP A FENTI ERVET ERINTI.
   * Ugyanez a ket szam a NYERS `description` mezon 19 es 70. A doboz a
   * MEGTISZTITOTT szoveget jeleniti meg, tehat egy kesobbi hossz-kuszob is azon
   * vagna -- vagyis a 25 az ervenyes szam ehhez az ervhez, a 19 nem. Aki a nyers
   * mezon ellenorizne, 19-et kapna, es nem csak a szamot tartana gyanusnak,
   * hanem az ervet is.
   *
   * (A korabbi valtozat 81-et irt a szaz alatti sorra. Az a szam egyik meressel
   * sem all elo: tisztitottan 82, kisebb-egyenlovel 83. Valoszinuleg egy
   * korabbi, mas alaku tisztitassal keszult -- de mivel nem tudom reprodukalni,
   * a mert ertek all a helyen, nem a regi.)
   *
   *   eheim-skim-350-felszinleszivo            9 karakter   "300l/h 5W"
   *   megaveggiemag-magneses-algalap-csipesz  20 karakter   "19mm uvegvastagsagig"
   *   resun-wave-maker-hwm2000-600l-h         31 karakter   "3 Watt 600 liter/ora 60 literig"
   *
   * Egy kesobbi kor "megtisztitana" a dobozt egy minimum-hosszal, es senki nem
   * venne eszre, hogy huszonot termekrol tuntette el az EGYETLEN muszaki adatot.
   * Ez az allitas azert all itt, hogy az a kor PIROSAT kapjon.
   *
   * ES A JELOLO NELKULI ALAK KULON SZAMIT: a tisztito 1175 termeknel jelolot lat,
   * de ezeknel a rovideknel NEM -- ha valaha a jelolo megletetol fugghetne a
   * megjelenes, ez az allitas fogja meg.
   */
  it("kilenc karakteres, jelölő nélküli leírás is megjelenik", () => {
    const rovid = {
      ...(TERMEK as object),
      description: "300l/h 5W",
    } as never

    render(<LapVaz tartalom={vazTartalom(rovid)} />)

    const fulek = document.querySelector('[data-vaz-szakasz="fulek"]')
    expect(fulek?.getAttribute("data-vaz-ures")).toBe("nem")
    expect(fulek?.textContent).toContain("300l/h 5W")
  })

  /**
   * ES A MASIK OLDAL: MEZO NELKUL A DOBOZ VARAKOZIK.
   *
   * A ket allitas egyutt mondja meg a hatart: nem a HOSSZ dont, hanem hogy VAN-E
   * mezo. A boltban 266 termeknek nincs (1492-bol), es URES sztring EGY SINCS --
   * vagyis a "van, de semmi" eset nem letezik.
   */
  it("leírás nélkül a fülek doboz üresen marad", () => {
    const nincs = { ...(TERMEK as object), description: null } as never

    render(<LapVaz tartalom={vazTartalom(nincs)} />)

    const fulek = document.querySelector('[data-vaz-szakasz="fulek"]')
    expect(fulek?.getAttribute("data-vaz-ures")).toBe("igen")
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
        tartalom={vazTartalom(
          TERMEK_KAPCSOLATTAL,
          undefined,
          <div>hasonló lista</div>,
        )}
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
   * A KIEGESZITO DOBOZ UGYANAZ A SZERZODES, MASIK LISTA -- ES A DOBOZ MAR ALLT.
   *
   * A vazban a `kiegeszitok` doboz ("Ami meg kellhet hozza") a kezdetektol ott
   * volt, es URESEN varakozott: az iro oldal irja a kulcsot, a kirakat nem
   * olvasta. Szakadas, nem hianyzo kepesseg.
   */
  it("átadott kiegészítő résszel a kiegészítő doboz nem üres", () => {
    render(
      <LapVaz
        tartalom={vazTartalom(
          TERMEK_CSAK_KIEGESZITOVEL,
          undefined,
          undefined,
          undefined,
          undefined,
          <div>kiegészítő lista</div>,
        )}
      />,
    )

    const doboz = document.querySelector('[data-vaz-szakasz="kiegeszitok"]')
    expect(doboz?.getAttribute("data-vaz-ures")).toBe("nem")
    expect(doboz?.textContent).toContain("kiegészítő lista")
  })

  it("kiegészítő azonosító NÉLKÜL a doboz üresen marad, a rész átadása ellenére", () => {
    render(
      <LapVaz
        tartalom={vazTartalom(
          TERMEK,
          undefined,
          undefined,
          undefined,
          undefined,
          <div>kiegészítő lista</div>,
        )}
      />,
    )

    const doboz = document.querySelector('[data-vaz-szakasz="kiegeszitok"]')
    expect(doboz?.getAttribute("data-vaz-ures")).toBe("igen")
  })

  /**
   * A KET LISTA FUGGETLENSEGE -- ES EZ AZ AZ ALLITAS, AMIERT A KET FENTI LETEZIK.
   *
   * Mind a ketto zold maradna akkor is, ha a ket slot ugyanarra a kulcsra nez:
   * egy hasonlo-azonositokkal all termek megtoltene a kiegeszito dobozt is.
   *
   * Ezert a bemenet olyan, ahol MINDEN MAS FELTETEL IGAZ, es csak a kulcs ter
   * el -- es MIND A KET reszt atadjuk, hogy a dontes tenyleg az azonositokon
   * alljon, ne azon, mit adtunk at.
   */
  it("csak kiegészítővel: a kiegészítő doboz telik meg, a hasonló ÜRES marad", () => {
    render(
      <LapVaz
        tartalom={vazTartalom(
          TERMEK_CSAK_KIEGESZITOVEL,
          undefined,
          <div>hasonló lista</div>,
          undefined,
          undefined,
          <div>kiegészítő lista</div>,
        )}
      />,
    )

    const kiegeszitok = document.querySelector(
      '[data-vaz-szakasz="kiegeszitok"]',
    )
    const hasonlo = document.querySelector('[data-vaz-szakasz="hasonlo"]')

    expect(kiegeszitok?.textContent).toContain("kiegészítő lista")
    expect(hasonlo?.getAttribute("data-vaz-ures")).toBe("igen")
  })

  it("csak hasonlóval: a hasonló doboz telik meg, a kiegészítő ÜRES marad", () => {
    render(
      <LapVaz
        tartalom={vazTartalom(
          TERMEK_KAPCSOLATTAL,
          undefined,
          <div>hasonló lista</div>,
          undefined,
          undefined,
          <div>kiegészítő lista</div>,
        )}
      />,
    )

    const kiegeszitok = document.querySelector(
      '[data-vaz-szakasz="kiegeszitok"]',
    )
    const hasonlo = document.querySelector('[data-vaz-szakasz="hasonlo"]')

    expect(hasonlo?.textContent).toContain("hasonló lista")
    expect(kiegeszitok?.getAttribute("data-vaz-ures")).toBe("igen")
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
      <VasarlasProvider product={TERMEK_KAPCSOLATTAL}>
        <LapVaz
          tartalom={vazTartalom(
            TERMEK_KAPCSOLATTAL,
            true,
            <div>hasonló lista</div>,
          )}
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

  /**
   * A KAPCSOLATFELVETEL DOBOZ -- HAROM ALLITAS, ES A HARMADIK TAGADO.
   *
   * Az elso ketto azt meri, ami OTT VAN. A harmadik azt, ami szandekosan NINCS:
   * a terv termek-specifikus mondata. Enelkul egy kesobbi kor "kiegeszithetne" a
   * dobozt egy kitalalt mondattal, es semmi nem szolna -- a doboz tovabbra is
   * telinek szamitana, es a ket meglevo allitas zold maradna.
   */
  it("a kapcsolatfelvétel doboz a bolt telefonszámát viseli, hívható linkként", () => {
    render(<LapVaz tartalom={vazTartalom(TERMEK)} />)

    const link = screen.getByTestId("vaz-kerdezd-telefon")
    expect(link).toHaveTextContent(TELEFON_MEGJELENITVE)
    expect(link).toHaveAttribute("href", TELEFON_HIVAS)
  })

  it("a telefonszám réz SZÍNŰ szövegen áll, nem a felület tokenjén", () => {
    render(<LapVaz tartalom={vazTartalom(TERMEK)} />)

    expect(screen.getByTestId("vaz-kerdezd-telefon")).toHaveStyle({
      color: "var(--terv-kiemel-tinta)",
    })
  })

  it("a doboz NEM tartalmaz termék-specifikus mondatot", () => {
    render(<LapVaz tartalom={vazTartalom(TERMEK)} />)

    const doboz = document.querySelector('[data-vaz-szakasz="kerdezd"]')
    const szoveg = (doboz?.textContent ?? "").replace(/\s+/g, " ").trim()

    /*
     * A doboz szovege a CIME es a TELEFONSZAM, semmi mas. Barmi tovabbi mondat
     * csak kitalalt lehet: a tervbeli ket valtozat ("Ez a torzs 2019 ota nalunk
     * no...", "Tobb mint 20 akvariumot szereltunk fel...") termek-tudason all,
     * ami egyetlen mezobol sem vezetheto le.
     */
    const cim = "Kérdezd minket"
    expect(szoveg).toBe(`${cim}${TELEFON_MEGJELENITVE}`)
  })

  /**
   * A HASONLO DOBOZ CSAK AKKOR TELI, HA VAN MIT MUTATNIA.
   *
   * A hivo egy BURKOLO ELEMET ad at (`<div>` a Suspense korul), es az MINDIG
   * letezik -- a `VazDoboz` uressegi vizsgalata pedig a `children` letezeset
   * nezi, nem azt, hogy a benne allo szerver-komponens vegul rajzol-e valamit.
   *
   * A #147 ota a `RelatedProducts` gondozott kapcsolat nelkul `null`-t ad, ami
   * ma MINDEN termeknel igy van. A burkolo attol meg atmegy, tehat a doboz
   * TELINEK jelolt (folytonos keret, hatter, cim) es URESEN rajzol -- pontosan
   * az, amit a `VazDoboz` sajat fejlece tilt: "egy ures doboz, ami kesznek
   * latszik, rosszabb a hianyzonal".
   *
   * Ezert a dontes az ADATBOL jon, nem a doboz sajat ures againak eredmenyebol.
   */
  it("gondozott kapcsolat nélkül a hasonló doboz üresen marad, nem telinek jelölve", () => {
    render(
      <LapVaz
        tartalom={vazTartalom(
          TERMEK,
          undefined,
          <div data-testid="related-products-container" />,
        )}
      />,
    )

    const doboz = document.querySelector('[data-vaz-szakasz="hasonlo"]')
    expect(doboz?.getAttribute("data-vaz-ures")).toBe("igen")
  })

  it("a tizennégy doboz akkor is mind ott áll, ha csak a fele kap tartalmat", () => {
    render(<LapVaz tartalom={vazTartalom(TERMEK)} />)

    expect(document.querySelectorAll("[data-vaz-szakasz]")).toHaveLength(
      MUSZAKI_LAP_SZAKASZAI.length,
    )
  })
})

/**
 * A LEPTETO MERETE A TERVBOL -- ES AMIERT EPP EBBEN A SPECBEN ALL.
 *
 * === EGY SZABALY, KET HELY, ES AZ ALLITASOM ELOSZOR A HALOTT FELERE ULT ===
 *
 * A leptetobol KETTO letezik: egy a `product-actions/index.tsx`-ben (a regi
 * ag) es egy a `vasarlas/dobozok.tsx`-ben (a vaz). A ket alak ma beture
 * ugyanaz volt.
 *
 * Eloszor a `product-actions.component.spec.tsx`-be irtam az allitast, mert
 * ott mar renderelodik lepteto. A teszt PIROSAT adott -- es helyesen: az a
 * spec a `ProductActions`-t rendereli KOZVETLENUL, tehat a REGI ag leptetojet
 * kapja. Az a lepteto ma a vevo ele SOHA nem kerul: a kapu a sablon szintjen
 * all (`templates/index.tsx`), es a `hasznaljaVazat` mindket agan igazat ad.
 *
 * Vagyis egy zold allitas ott azt bizonyitotta volna, hogy a HALOTT masolat
 * helyes -- es kozben az elo alak barmikor elmozdulhatott volna nemán.
 *
 * Ezert all itt: ez a spec a `VasarlasProvider`-en at a VAZAT rendereli,
 * ugyanazt, amit a vevo lat.
 *
 * === AMIT NEM MER ===
 *
 * A festett meretet nem: a jsdom nem forditja le a Tailwind osztalyokat. Egy
 * elirt osztalynev (`h-[54pxx]`) ezen atmenne. A jeloles meglétet meri, nem a
 * kirajzolt pixelt.
 */
describe("a léptető mérete a tervből", () => {
  it("a mínusz és a plusz gomb viseli a mért méretet", () => {
    render(
      <VasarlasProvider product={TERMEK}>
        <LapVaz tartalom={vazTartalom(TERMEK, true)} />
      </VasarlasProvider>,
    )

    for (const cimke of ["Mennyiség csökkentése", "Mennyiség növelése"]) {
      const gomb = screen.getByLabelText(cimke)
      for (const jeloles of LEPTETO_GOMB_MERET.split(" ")) {
        expect(gomb.className).toContain(jeloles)
      }
    }
  })

  it("a mennyiség mezője viseli a mért méretet", () => {
    render(
      <VasarlasProvider product={TERMEK}>
        <LapVaz tartalom={vazTartalom(TERMEK, true)} />
      </VasarlasProvider>,
    )

    const mezo = screen.getByLabelText("Mennyiség")
    for (const jeloles of LEPTETO_MEZO_MERET.split(" ")) {
      expect(mezo.className).toContain(jeloles)
    }
  })

  /**
   * A SZAMOK LITERALKENT, szandekosan: a konstansbol olvasva az allitas
   * onmagat igazolna vissza, es barmilyen ertekre zold maradna.
   *
   * Az 54 UGYANAZ, mint a fo gombe (`FO_GOMB_MERET`). A tervben a ket elem
   * egy sorban all, es egy vonalban zar -- ha valaha kulonboznenek, az hiba.
   */
  it("a mért értékek: 54 magas, 42 széles gomb, 34 széles mező, 15 pixeles szám", () => {
    expect(LEPTETO_GOMB_MERET).toContain("h-[54px]")
    expect(LEPTETO_GOMB_MERET).toContain("w-[42px]")
    expect(LEPTETO_MEZO_MERET).toContain("h-[54px]")
    expect(LEPTETO_MEZO_MERET).toContain("w-[34px]")
    /**
     * A BETUMERET IS LITERAL, ES EDDIG KIMARADT.
     *
     * A fenti ciklus a konstansbol olvas, tehat ha valaki a konstansban irja at
     * a `text-[15px]`-et, a ciklus VELE EGYUTT MOZDUL es zold marad. Pontosan
     * az az eset, amit ez a doboz kizarni hivatott -- csak erre az egy ertekre
     * nem allt allitas.
     */
    expect(LEPTETO_MEZO_MERET).toContain("text-[15px]")
  })

  /**
   * A CSELEKVES-SOR KOZE 10 PIXEL, a terv 2a lapjarol (`display:flex; gap:10px`).
   *
   * ITT ALL, ES NEM A `dobozok.component.spec.tsx`-ben: a `MennyisegDoboz` a
   * vasarlasi kontextusbol olvas, es provider nelkul `null`-t ad. Kozvetlenul
   * renderelve tehat nem lenne mit merni -- a sort csak a felepitett lapon
   * lehet elerni.
   */
  it("a léptető és a fő gomb közt 10 pixel a köz", () => {
    render(
      <VasarlasProvider product={TERMEK}>
        <LapVaz tartalom={vazTartalom(TERMEK, true)} />
      </VasarlasProvider>,
    )

    // SZERKEZETI UT, NEM NEV SZERINTI: a mezo szuloje a lepteto kerete, annak
    // a szuloje a sor. Egy `closest(".gap-\\[10px\\]")` korben forogna --
    // azt keresne, amit allitani akar, es sosem tudna elbukni.
    const mezo = screen.getByLabelText("Mennyiség")
    const sor = mezo.parentElement?.parentElement

    expect(sor?.className).toContain("flex")
    expect(sor?.className).toContain("gap-[10px]")
  })
})
