import { HttpTypes } from "@medusajs/types"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { fireEvent } from "@testing-library/dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const updateLineItem = vi.fn()

vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "hu" }),
}))

vi.mock("@lib/data/cart", () => ({
  updateLineItem: (...args: unknown[]) => updateLineItem(...args),
  deleteLineItem: vi.fn(async () => undefined),
}))

import Item from "./index"
import {
  KOSAR_MOST_NEM_SIKERULT,
  MENNYISEG_ELUTASITVA,
} from "@lib/util/kosar-uzenet"

afterEach(cleanup)
beforeEach(() => {
  updateLineItem.mockReset()
})

/**
 * A MENNYISÉG HIBÁJA A VÁLASZBÓL JÖN, NEM A KIVÉTELBŐL.
 *
 * === A MÉRT HIBA (31a50e97) ===
 *
 * A sor korábban `.catch((err) => setError(err.message))` alakban dolgozott.
 * Fejlesztői gépen ez működik. Produkcióban NEM: a Next a szerver-műveletből
 * DOBOTT hiba üzenetét lecseréli egy általános angol mondatra és egy digestre,
 * tehát a vevő a kosárban ugyanazt az angol mentőszöveget olvasta volna, amit
 * a kedvezménykódnál már lemértünk (#371, digest 2352313220).
 *
 * === AMIT EZ A SUITE MÉR, ÉS AMIT NEM ===
 *
 * MÉRI: hogy a sor a művelet VÁLASZÁT rajzolja ki, hogy melyik mondatot, és
 * hogy siker esetén NEM ír ki semmit.
 *
 * NEM MÉRI a Next határát magát -- azt jsdom nem tudja előállítani. Az a
 * mechanizmus a #371-ben van megmérve, éles naplóból; itt az következik
 * belőle, hogy a komponens ne a kivételre támaszkodjon. A különbség nem
 * szőrszálhasogatás: ez a suite akkor is zöld lenne, ha a Next viselkedése
 * holnap megváltozna -- amit itt őrzünk, az a mi oldalunk.
 *
 * === KALIBRÁCIÓ (2026-09-14, fej ef7b4e0; minden körben 11 teszt futott le) ===
 *
 * A jóslat FÁJLBAN állt a futtatás előtt
 * (`agents/murena/scripts/joslat-kosar-hiba.md`). Öt körből öt egyezett.
 *
 *   a sor megint a KIVÉTELBŐL dolgozik        2 piros (a két mondat-szelet)
 *   BEÉGETETT mondat, mindig ugyanaz          1 piros („nem egy beégetettet")
 *   a hibaüzenet nem jut el a dobozig         3 piros (mindhárom üzenet-szelet)
 *
 * AZ ELSŐ RONTÁS SZÁNDÉKOSAN SZŰK: a `catch` ágat változatlanul hagyja, hogy a
 * dobás-szelet ne mozduljon. Egy tágabb rontás (visszatérés a teljes
 * `catch`-alapú alakra) hármat vitt volna, és akkor nem tudnánk, hogy a válasz
 * olvasása és a dobás kezelése KÉT külön állítás.
 *
 * AZ UTOLSÓ IS SZŰK, ÉS UGYANEZÉRT: az `ErrorMessage` elem a HELYÉN marad, csak
 * nem kap hibát. Ha az elemet tüntetném el, a piros a „létezik" állításról
 * szólna, nem a „működik"-ről -- és a pozitív kontroll szelet is elesne vele.
 */

/**
 * A FIXTURE CSAK AZT TÖLTI KI, AMIT A SOR TÉNYLEG OLVAS.
 *
 * A `StoreCartLineItem` sok mezőt ír elő, és mind kitölteni itt nem mérés,
 * hanem díszlet -- a kasztot ezért kimondom, nem elrejtem. Ami VARRAT (amit a
 * komponens ténylegesen kiolvas: `id`, `quantity`, `product_title`,
 * `variant`, a totálok), az valódi értékkel áll.
 */
function kosarSor(): HttpTypes.StoreCartLineItem {
  return {
    id: "item-1",
    quantity: 1,
    product_title: "Próba termék",
    product_handle: "proba-termek",
    thumbnail: null,
    unit_price: 1000,
    total: 1000,
    original_total: 1000,
    variant: {
      id: "variant-1",
      title: "Alap",
      product: { id: "prod-1", metadata: {}, images: [] },
    },
  } as unknown as HttpTypes.StoreCartLineItem
}

function sortRajzol() {
  return render(
    <table>
      <tbody>
        <Item item={kosarSor()} currencyCode="huf" />
      </tbody>
    </table>,
  )
}

describe("a kosársor hibaüzenete", () => {
  /**
   * ISMERT POZITÍV KONTROLL, ÉS ITT KÉT DOLGOT IGAZOL: hogy a sor egyáltalán
   * kirajzolódik jsdom alatt, ÉS hogy a mennyiség-választó ott van. Enélkül az
   * összes lenti állítás egy üres fán futna, és a hiányzó hibaüzenetet
   * sikernek olvasnánk.
   */
  it("a sor kirajzolódik, és van mennyiség-választója", () => {
    sortRajzol()

    expect(screen.getByTestId("product-row")).toBeTruthy()
    expect(screen.getByTestId("product-select-button")).toBeTruthy()
  })

  it("siker esetén nem ír ki hibát", async () => {
    updateLineItem.mockResolvedValue({ ok: true })
    sortRajzol()

    fireEvent.change(screen.getByTestId("product-select-button"), {
      target: { value: "2" },
    })

    await waitFor(() => expect(updateLineItem).toHaveBeenCalled())
    expect(
      screen.queryByTestId("product-error-message")?.textContent ?? "",
    ).toBe("")
  })

  /**
   * A LÉNYEGI ÁLLÍTÁS: a kiírt szöveg a VÁLASZ `uzenet` mezőjéből jön. Ha a
   * komponens visszatérne a kivétel olvasására, ez a szelet pirosodik ki --
   * mert a mock nem dob, csak visszaad.
   */
  it("a válasz üzenetét rajzolja ki, szó szerint", async () => {
    updateLineItem.mockResolvedValue({
      ok: false,
      uzenet: MENNYISEG_ELUTASITVA,
    })
    sortRajzol()

    fireEvent.change(screen.getByTestId("product-select-button"), {
      target: { value: "2" },
    })

    await waitFor(() =>
      expect(screen.getByTestId("product-error-message").textContent).toContain(
        MENNYISEG_ELUTASITVA,
      ),
    )
  })

  /**
   * A MÁSIK MONDAT IS ÁTMEGY. Enélkül a fenti szelet egy olyan változatot is
   * kielégítene, ami MINDIG ezt az egy konstanst írja ki -- és akkor nem az
   * átadást mérnénk, hanem egy beégetett szöveget.
   */
  it("a másik mondatot is kiírja, nem egy beégetettet", async () => {
    updateLineItem.mockResolvedValue({
      ok: false,
      uzenet: KOSAR_MOST_NEM_SIKERULT,
    })
    sortRajzol()

    fireEvent.change(screen.getByTestId("product-select-button"), {
      target: { value: "2" },
    })

    await waitFor(() =>
      expect(screen.getByTestId("product-error-message").textContent).toContain(
        KOSAR_MOST_NEM_SIKERULT,
      ),
    )
  })

  /**
   * ÉS AMI DOBÁSKÉNT MÉGIS ÁTJÖN, AZ SEM HAGYJA PÖRÖGNI A LAPOT. Az
   * `updateLineItem` a két hiányzó azonosítóra továbbra is DOB (az a mi
   * hibánk, nem a vevőé), és erre az ágra is kell látható mondat -- különben a
   * vevő egy örökké forgó pörgettyűt néz.
   */
  it("dobásnál is kiír mondatot, és nem marad pörgő állapotban", async () => {
    updateLineItem.mockRejectedValue(new Error("Missing cart ID"))
    sortRajzol()

    fireEvent.change(screen.getByTestId("product-select-button"), {
      target: { value: "2" },
    })

    await waitFor(() =>
      expect(screen.getByTestId("product-error-message").textContent).toContain(
        KOSAR_MOST_NEM_SIKERULT,
      ),
    )
  })
})
