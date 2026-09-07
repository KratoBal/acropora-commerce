import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import ProductActions from "./index"

/**
 * A BEKÖTÉS MÉRÉSE -- AZ EGYETLEN ÚT, AMI EDDIG ÁTOLVASÁSON ÁLLT.
 *
 * === MIT MÉR, ÉS MIÉRT NEM ELÉG A DOBOZ SAJÁT TESZTJE ===
 *
 * A `StockState` négy állítása azt bizonyítja, hogy a doboz HELYESEN RAJZOL, ha
 * megkapja az állapotot. Azt nem, hogy a lap a HELYES állapottal hívja. Ez a
 * kettő két külön hiba, és a második csendes: minden teszt zöld maradna, miközben
 * a lapon egy egyedi példány "Nincs raktáron" feliratot kapna.
 *
 * Ez ugyanaz a rés, mint a SZAKADÁS: mindkét oldal helyes önmagában, csak a
 * összekötés rossz.
 *
 * === A HAMISAK, ÉS MIÉRT PONT EZEK ===
 *
 * A keret hívásait cseréljük ki (útvonal, kosárba tétel), NEM a mért kódot. A
 * `StockState`, az `availabilityOf` és az `uniquePieceOf` VALÓDI marad -- különben
 * pont azt a láncot vágnánk el, amit mérni akarunk.
 */
vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "hu" }),
  usePathname: () => "/hu/products/akropora",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: vi.fn() }),
}))

vi.mock("@lib/data/cart", () => ({
  addToCart: vi.fn(async () => undefined),
}))

/**
 * A LEBEGŐ MOBIL SÁV KI VAN HAGYVA, ÉS EZT KI KELL MONDANI.
 *
 * Nem azért, mert nem érdekes, hanem mert egy `IntersectionObserver`-t követelne
 * a jsdom-tól, és akkor a teszt a hamisítás helyességét mérné, nem a bekötést.
 * A sáv saját bekötése így ÁTOLVASÁSON marad -- ugyanazt a `availability` és
 * `similarHref` értéket kapja, egy szinttel feljebbről.
 */
vi.mock("./mobile-actions", () => ({
  default: () => null,
}))

/**
 * AZ IntersectionObserver NEM LETEZIK A jsdom-BAN, ezert a HOROG-ot hamisitjuk,
 * nem a bongeszo felületét. Igy a hamisitas egy sor, es nem kell egy fel API-t
 * ujraepiteni -- egy hamis IntersectionObserver ugyanis maga is hibazhatna, es
 * akkor a teszt azt merne.
 *
 * A visszaadott `true` azt jelenti: a gomb-oszlop LATSZIK, tehat a lebego sav
 * amugy is rejtve lenne.
 */
vi.mock("@lib/hooks/use-in-view", () => ({
  useIntersection: () => true,
}))

afterEach(cleanup)

/**
 * A VALODI ADAT ALAKJA, NEM A LEGEGYSZERUBB.
 *
 * A stage mind a 19 termeke EGY opciot hordoz (`Kivitel` = `Alap`): a vetites
 * teszi oda, amikor a forrasban nincs valasztas. Egy ures opcio-lista tehat NEM
 * a valosag legegyszerubb esete, hanem egy olyan alak, ami a boltban elo sem
 * fordul.
 *
 * MERVE (nautilus lelete, 2026-09-07): nala az ures listan egy allitas akkor is
 * ZOLD MARADT, amikor az orzot kivette -- vagyis semmit nem mert. Az en ket
 * allitasom a valodi alakon is all (lemertem, mielott atirtam), de a fixtura
 * ettol meg tevedes volt: egy kesobbi allitas, amit erre epitenek, ugyanabba a
 * csapdaba futna.
 */
const VALTOZAT = {
  id: "variant_1",
  title: "Egy méret",
  options: [{ id: "optval_1", option_id: "opt_1", value: "Alap" }],
  manage_inventory: true,
  allow_backorder: false,
  inventory_quantity: 0,
  calculated_price: {
    calculated_amount: 12000,
    original_amount: 12000,
    currency_code: "huf",
    // A beagyazott mezot az ARKEPZO olvassa (`price_list_type`). Nem azert all
    // itt, mert egy allitas nezi -- egyik sem --, hanem mert a HIVO hasznalja:
    // nelkule a lap ki sem rajzolodik. Amit a hivo hasznal es a teszt nem allit,
    // az a dupla biztos hibaja.
    calculated_price: { price_list_type: null },
  },
}

function termek(metadata: Record<string, unknown> | null) {
  return {
    id: "prod_1",
    title: "Acropora tenuis",
    handle: "acropora-tenuis",
    metadata,
    collection: { id: "col_1", handle: "elo-korallok", title: "Élő korallok" },
    options: [{ id: "opt_1", title: "Kivitel" }],
    variants: [VALTOZAT],
  } as never
}

const REGIO = { id: "reg_1", currency_code: "huf" } as never

describe("a terméklap bekötése a készlet-állapothoz", () => {
  /**
   * A JELZŐ NÉLKÜLI TERMÉK: ELFOGYOTT, SOHA NEM ELADVA.
   *
   * Ez a ma élő eset, mert a vetítés még nem hozza át a jelzőt. Ha valaki valaha
   * az `allow_backorder` értékből származtatná, ez a sor pirosodik ki: a fenti
   * változat `allow_backorder: false`, tehát proxyként "Eladva" lenne belőle.
   */
  it("jelző nélkül a lap ELFOGYOTT állapotot rajzol", () => {
    render(<ProductActions product={termek(null)} region={REGIO} />)

    const gomb = screen.getByTestId("add-product-button")
    expect(gomb).toBeDisabled()
    expect(gomb).toHaveTextContent("Nincs raktáron")
    expect(screen.queryByRole("link")).toBeNull()
  })

  /**
   * ÉS A JELZŐVEL: EZ AZ ISMERT POZITÍV KONTROLL.
   *
   * A fenti állítás önmagában akkor is zöld lenne, ha a lap SOHA nem tudna
   * "Eladva" állapotot rajzolni -- vagyis ha a bekötés egyáltalán nem működne.
   * Ez a szelet bizonyítja, hogy a metaadatból jövő jelző tényleg végigmegy a
   * láncon: `product.metadata` -> `uniquePieceOf` -> `availabilityOf` -> doboz.
   */
  it("kimondott jelzővel ELADVA, továbbvivő hivatkozással", () => {
    render(
      <ProductActions product={termek({ unique_piece: true })} region={REGIO} />,
    )

    expect(screen.queryByTestId("add-product-button")).toBeNull()

    const link = screen.getByRole("link", {
      name: /Hasonló példányok megnézése/,
    })
    // A cim a termek sajat gyujtemenyebol jon, orszag-koddal az elejen.
    expect(link).toHaveAttribute("href", "/hu/collections/elo-korallok")
  })
})

/**
 * A VÁLASZTÓ DOBOZ SZABÁLYA -- ÉS AMIT A KATALÓGUS MOND RÓLA.
 *
 * Picasso vevői kár szerint az ELSŐ helyre rangsorolta a választó dobozt: enélkül
 * a vevő nem tudja megmondani, melyik változatot kéri. A starter ezt MÁR kezeli,
 * a `(product.variants?.length ?? 0) > 1` feltétellel -- de erre eddig EGYETLEN
 * állítás sem állt, és a feltétel mindkét irányban számít.
 *
 * A számok a 2026-09-02-i UNAS exportból, és ez a mérés kétszer futott:
 *
 * Elsőre azt kaptam, hogy mind az 1893 terméknek pontosan egy változata van. A
 * gyanúsan egyenletes eredmény volt a jel: a `Variants` mező 1884 esetben ÜRES
 * SZTRING, és a számlálóm azt vette egynek. Újramérve:
 *
 *     1884 termék    nincs változata          -> NEM szabad választót mutatni
 *        9 termék    van valódi választása    -> MUTATNI KELL
 *
 * A kilencből nyolc Reef Factory lámpa `Szín` = Fekete / Fehér, a kilencedik egy
 * `Flakon` = Egyedi csomagolás / Flakon, ahol a második +150 felárral jár.
 *
 * MIÉRT KELL MIND A KÉT ÁLLÍTÁS, ÉS NEM CSAK A MÁSODIK: egy feltétel értéke az,
 * amit NEM enged. Ha csak azt mérnénk, hogy két változatnál megjelenik, akkor egy
 * "mindig mutasd" változtatás zölden átmenne -- és 1884 terméklapon ott állna egy
 * egygombos választó, amin nincs mit választani.
 *
 * AMIT EZ NEM MÉR: a stage-en ma egyetlen több változatú termék sincs (mind a 19
 * egyváltozatú), tehát a második eset a KÉPERNYŐN nincs bizonyítva. Az első olyan
 * termék dönti el, ami ténylegesen átkerül.
 */
/**
 * AZ EGYVÁLTOZATÚ TERMÉK NEM ÜRES OPCIÓ-LISTÁVAL JÖN. A stage mind a 19 terméke
 * pontosan egy opciót hordoz, `Kivitel` = `Alap` -- a vetítés ezt teszi oda,
 * amikor a forrásban nincs valódi választás.
 *
 * Ez a fixtúra ELŐSZÖR üres `options` tömbbel készült, és a kalibráció fogta meg,
 * hogy úgy semmit nem mér: az őrző kivétele után is zöld maradt, mert választó
 * üres opció-lista mellett akkor sem jelenne meg. Az állítás MÁS OKBÓL volt zöld,
 * mint amit a neve ígért.
 */
const KIVITEL_OPCIO = {
  id: "opt_kivitel",
  title: "Kivitel",
  values: [{ id: "optval_alap", value: "Alap" }],
}

function egyValtozatosTermek() {
  return {
    id: "prod_1",
    title: "Amtra TDS/EC digitális TDS mérő",
    handle: "amtra-tds-ec-digitalis-tds-mero",
    metadata: null,
    collection: null,
    options: [KIVITEL_OPCIO],
    variants: [
      {
        ...VALTOZAT,
        options: [{ option_id: "opt_kivitel", value: "Alap" }],
      },
    ],
  } as never
}

const SZIN_OPCIO = {
  id: "opt_szin",
  title: "Szín",
  values: [
    { id: "optval_fekete", value: "Fekete" },
    { id: "optval_feher", value: "Fehér" },
  ],
}

function ketValtozatosTermek() {
  return {
    id: "prod_2",
    title: "Reef Factory Reef Flare Pro M 160W",
    handle: "reef-factory-reef-flare-pro-m-160w",
    metadata: null,
    collection: null,
    options: [SZIN_OPCIO],
    variants: [
      {
        ...VALTOZAT,
        id: "variant_fekete",
        title: "Fekete",
        options: [{ option_id: "opt_szin", value: "Fekete" }],
      },
      {
        ...VALTOZAT,
        id: "variant_feher",
        title: "Fehér",
        options: [{ option_id: "opt_szin", value: "Fehér" }],
      },
    ],
  } as never
}

describe("a választó doboz megjelenése", () => {
  /**
   * A KATALÓGUS TÖBBSÉGE: 1884 termék, egyetlen változat. Itt a doboz HIÁNYA a
   * helyes viselkedés, nem a hiányossága.
   */
  /**
   * EZ AZ ÁLLÍTÁS MEGFORDULT, ÉS AZ INDOK ITT MARAD, MERT KÜLÖNBEN ÚGY NÉZNE KI,
   * MINTHA SOHA NEM LETT VOLNA MÁSIK SZABÁLY.
   *
   * Eredetileg így szólt: "egyetlen változatnál NINCS választó" -- és akkor ez
   * volt a helyes, mert egy egygombos választó, amin nincs mit választani, zaj.
   *
   * Balázs váz-kérése (2026-09-07) ezt felülírta: a lap ÁLLJON ÖSSZE úgy, ahogy
   * a terv, és ami mögött nincs kész funkció, az legyen ott üresen. Acrobot
   * pontosítása pedig szétválasztotta, ami eddig egybe volt kötve:
   *
   *     LÁTHATÓSÁG      az opciókon múlik
   *     VÁLASZTHATÓSÁG  a változatok számán
   *
   * Így az eredeti mérés nem veszett el: "egyetlen változatnál nincs VÁLASZTÁS"
   * továbbra is igaz és mérhető -- csak nem a doboz hiányából olvassuk ki.
   *
   * A mögötte álló számok változatlanok: 1884 terméknek nincs változata, 9-nek
   * van valódi választása (8 Reef Factory lámpa Szín szerint, plusz egy flakon).
   */
  it("egyetlen változatnál a doboz OTT ÁLL, de nem választható", () => {
    render(<ProductActions product={egyValtozatosTermek()} region={REGIO} />)

    expect(screen.getByTestId("product-options")).toBeTruthy()

    const gombok = screen.getAllByTestId("option-button")
    expect(gombok.length).toBeGreaterThan(0)
    for (const gomb of gombok) {
      expect((gomb as HTMLButtonElement).disabled).toBe(true)
    }
  })

  /**
   * A HARMADIK ÁLLAPOT: opció nélkül nincs mit kirajzolni. E nélkül a doboz üres
   * kerettel állna ott, cím nélkül, és az rosszabb a hiányzónál.
   */
  it("opció nélkül a doboz nem jelenik meg", () => {
    const opcioNelkul = {
      ...(egyValtozatosTermek() as object),
      options: [],
    } as never
    render(<ProductActions product={opcioNelkul} region={REGIO} />)

    expect(screen.queryByTestId("product-options")).toBeNull()
  })

  /**
   * A KILENC TERMÉK, AMELYIKNÉL VAN MIT VÁLASZTANI. Mindkét értéknek látszania
   * kell: egy választó, ami csak az egyiket mutatja, rosszabb a hiányzónál.
   */
  it("két változatnál megjelenik a választó, mindkét értékkel ÉS választható", () => {
    render(<ProductActions product={ketValtozatosTermek()} region={REGIO} />)

    expect(screen.getByTestId("product-options")).toBeTruthy()

    // és itt a gombok NEM tiltottak -- ez választja el a két állapotot
    for (const gomb of screen.getAllByTestId("option-button")) {
      expect((gomb as HTMLButtonElement).disabled).toBe(false)
    }

    const gombok = screen
      .getAllByTestId("option-button")
      .map((gomb) => gomb.textContent)

    expect(gombok).toEqual(["Fekete", "Fehér"])
  })
})
