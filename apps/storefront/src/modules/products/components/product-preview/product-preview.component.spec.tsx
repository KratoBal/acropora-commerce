import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@modules/common/components/localized-client-link", () => ({
  default: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}))
vi.mock("../thumbnail", () => ({
  default: () => <div data-testid="thumbnail" />,
}))
/**
 * A `PreviewPrice` ASYNC komponens, es a jsdom NEM tudja megrajzolni.
 *
 * Merve: valodi `PreviewPrice` mellett, ha van ar, a `render()` NEM hasal el,
 * hanem a TELJES fat uresen hagyja (`document.body` = `<div></div>`), tehat
 * meg a cim sem jelenik meg. Egy allitas, ami ilyen fan fut, barmit
 * allithatna: nincs mihez merni.
 *
 * Ezert all itt stub. Amit ez elvesz: az ar SZOVEGE es formazasa nem merheto
 * innen. Amit meghagy, es amiert kell: hogy a `ProductPreview` MEGHIVJA-E az
 * arat abban a blokkban, ahol a cim all -- es epp ez az, amit egy hibas
 * javitas (az ar elhagyasa) elvenne.
 */
vi.mock("./price", () => ({
  default: ({ price }: { price: { calculated_price: string } }) => (
    <span data-testid="price">{price.calculated_price}</span>
  ),
}))

import ProductPreview from "./index"

afterEach(cleanup)

const ARAS_VALTOZAT = {
  id: "variant_1",
  calculated_price: {
    calculated_amount: 1000,
    original_amount: 1000,
    currency_code: "huf",
    calculated_price: { price_list_type: "default" },
  },
}

const termek = (metadata: unknown, arral: boolean) =>
  ({
    id: "prod_1",
    handle: "teszt",
    title: "Teszt termék",
    metadata,
    variants: arral ? [ARAS_VALTOZAT] : [],
  }) as never

const megjelenit = async (metadata: unknown, arral = true) => {
  const elem = await ProductPreview({
    product: termek(metadata, arral),
    region: {} as never,
  })
  render(elem as React.ReactElement)
}

/**
 * AZ EGYEDI PELDANY JELVENYE A LISTA-KARTYAN (64c8452a).
 *
 * === MIERT KELL MIND A KET IRANY ===
 *
 * Egy "megjelenik a jelveny" allitas onmagaban akkor is zold lenne, ha a
 * jelveny MINDEN kartyan ott allna -- ami rosszabb a mai allapotnal, mert
 * minden termeket egyedi peldanynak mondana. Ezert a masodik allitas azt meri,
 * hogy jelzo NELKUL NINCS ott.
 *
 * A HATARA: ez a komponenst meri, nem a lekerdezest. Hogy a `metadata`
 * egyaltalan megerkezik-e a listaba, az a `lib/data/products.ts` `fields`
 * erteken mulik, es azt a komponens fejlece nevezi meg.
 */
describe("a lista-kártya jelvénye", () => {
  it("egyedi példánynál megjelenik a jelvény", async () => {
    await megjelenit({ unique_piece: "true" })

    expect(screen.getByTestId("unique-piece-badge")).toBeTruthy()
  })

  it("jelző nélkül NINCS jelvény", async () => {
    await megjelenit({})

    expect(screen.queryByTestId("unique-piece-badge")).toBeNull()
  })

  /**
   * ISMERT POZITIV KONTROLL: a kartya maga mind a ket esetben megrajzolodik.
   * Enelkul a fenti "nincs jelveny" allitast egy OSSZEOMLOTT komponens is
   * kielegitene.
   */
  it("a kártya jelző nélkül is megjelenik", async () => {
    await megjelenit({})

    expect(screen.getByTestId("product-wrapper")).toBeTruthy()
    expect(screen.getByTestId("product-title")).toBeTruthy()
  })
})

/**
 * A CIM ES AZ AR EGYMAS ALATT ALL, NEM EGY SORBAN.
 *
 * === AMIT EZ MER, ES AMIT NEM ===
 *
 * A jsdom nem szamol elrendezest: hogy egy 150 pixeles kartyan tulcsordul-e a
 * sor, ITT NEM DONTHETO EL. Amit merunk, az a SZERKEZET -- hogy a cim es az ar
 * kulon blokkban all, es hogy a sort osszehuzo `justify-between` nincs rajtuk.
 *
 * A tulcsordulas maga a kiszolgalt lapon merheto, 390 pixeles nezetben, es a
 * telepites utan meg is merjuk. A ket allitas egyutt fedi le a lancot: itt az
 * alak, ott a kovetkezmenye.
 *
 * === KALIBRACIO (2026-09-10) ===
 *
 *   alap                                       6 teszt, mind zold
 *   R1  space-y-1 -> flex justify-between      1 piros: "nincs egy sorba huzo..."
 *   R2  a PreviewPrice hivas torolve           1 piros: "az ar ugyanabban a blokkban..."
 *
 * Elso korben az R1 KETTOT vitt pirosra, es ez nem a tesztek hibaja volt: a
 * rontasomba beleirtam a `txt-compact-medium` osztalyt is, tehat egyszerre ket
 * dolgot valtoztattam. A szukebb rontas (csak az elrendezes) mar pontosan azt
 * az egyet dontotte el, amelyiket vartam.
 */
describe("a kártya címe és ára egymás alatt áll", () => {
  it("nincs egy sorba húzó elrendezés a cím és az ár körül", async () => {
    await megjelenit(null)

    const cim = screen.getByTestId("product-title")
    const blokk = cim.parentElement

    expect(blokk).toBeTruthy()
    expect(blokk?.className).not.toContain("justify-between")
    expect(blokk?.className).toContain("space-y-1")
  })

  /**
   * ISMERT POZITIV KONTROLL: az AR is ott van ugyanabban a blokkban. A fenti
   * tagadast egy ar NELKULI kartya is kielegitene -- es epp az volna a rosszabb
   * hiba, mert a tulcsordulas is megszunne tole.
   *
   * === EZ AZ ALLITAS EGYSZER MAR HALOTT VOLT, ES ZOLDEN ALLT ===
   *
   * Elso alakja `blokk?.children.length === 2`-t mert. Kalibraciokor kiderult,
   * hogy az ar ELHAGYASA sem viszi pirosra: a `{cheapestPrice && ...}` sor
   * torlese utan a KORULOLELO `<div>` ottmarad, tehat a gyerekek szama
   * valtozatlanul ketto. Ket okbol allt zolden: a fixture-ben nem is volt ar
   * (`variants: []`), es a szamlalas nem az AR-ra kerdez, hanem a dobozara.
   *
   * A mai alak magara az ar ELEMERE all, es a fixture ad is arat. Igy a
   * rontas nev szerint ezt az allitast donti el.
   */
  it("az ár ugyanabban a blokkban áll, a cím alatt", async () => {
    await megjelenit(null)

    const cim = screen.getByTestId("product-title")
    const blokk = cim.parentElement
    const ar = screen.getByTestId("price")

    expect(blokk?.contains(ar)).toBe(true)
    expect(blokk?.children[0]).toBe(cim)
  })

  /** A nyers Medusa szin-osztalyok helyere a terv tokenjei kerultek. */
  it("a terv tokenjein áll, nem nyers Medusa osztályokon", async () => {
    await megjelenit(null)

    const container = document.body

    expect(container.innerHTML).not.toContain("text-ui-fg-subtle")
    expect(container.innerHTML).not.toContain("txt-compact-medium")
    expect(container.innerHTML).toContain("var(--terv-szoveg)")
  })
})
