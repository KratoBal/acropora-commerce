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
 * a lapon egy egyedi példány "Elfogyott" feliratot kapna.
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

const VALTOZAT = {
  id: "variant_1",
  title: "Egy méret",
  options: [],
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
    options: [],
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
    expect(gomb).toHaveTextContent("Elfogyott")
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
