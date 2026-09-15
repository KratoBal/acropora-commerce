import { HttpTypes } from "@medusajs/types"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { fireEvent } from "@testing-library/dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const placeOrder = vi.fn()

vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "hu" }),
  unstable_rethrow: () => undefined,
}))

vi.mock("@lib/data/cart", () => ({
  placeOrder: (...args: unknown[]) => placeOrder(...args),
}))

vi.mock("@stripe/react-stripe-js", () => ({
  useStripe: () => null,
  useElements: () => null,
}))

import PaymentButton from "./index"
import {
  RENDELES_ELUTASITVA,
  RENDELES_MOST_NEM_SIKERULT,
} from "@lib/util/penztar-uzenet"

afterEach(cleanup)
beforeEach(() => {
  placeOrder.mockReset()
})

/**
 * A RENDELÉS HIBÁJA A VÁLASZBÓL JÖN, NEM A KIVÉTELBŐL.
 *
 * === A MÉRT HIBA (31a50e97) ===
 *
 * A gomb korábban `.catch((err) => setErrorMessage(err.message))` alakban
 * dolgozott. Produkcióban a Next a szerver-műveletből DOBOTT hiba üzenetét
 * lecseréli egy általános angol mondatra és egy digestre, tehát a vevő a
 * pénztár UTOLSÓ lépésén kapta volna ugyanazt az angol mentőszöveget, amit a
 * kedvezménykódnál már lemértünk (#371, digest 2352313220).
 *
 * === AMIT EZ A SUITE MÉR, ÉS AMIT NEM ===
 *
 * MÉRI a MANUÁLIS fizetési ágat (`pp_system_default`), mert az Stripe nélkül
 * is előáll: hogy a válasz üzenete jelenik meg, melyik, és hogy siker esetén
 * nem írunk ki semmit.
 *
 * NEM MÉRI a Stripe ágat -- ahhoz Stripe-elemek kellenének --, és NEM MÉRI a
 * `redirect` viselkedését sem: a sikeres rendelés átirányít, és azt VALÓDI
 * RENDELÉS nélkül nem tudom előállítani. Valódi rendelést nem indítottam. A
 * két ág forrása bájtra azonos (egyetlen cserével készült mindkettő), de ez
 * ÁLLÍTÁS a kódról, nem mérés a viselkedésről, és így is mondom.
 *
 * === KALIBRÁCIÓ (2026-09-14, fej 2fffd47; minden körben 37 teszt futott le) ===
 *
 * A jóslat FÁJLBAN állt a futtatás előtt
 * (`agents/murena/scripts/joslat-penztar-hiba.md`).
 *
 *   BEÉGETETT mondat, mindig ugyanaz   1 piros („nem egy beégetettet")
 *
 * A rontás MINDKÉT ágat átírta (a Stripe-osat is), és mégis egy piros jött --
 * mert a Stripe ágat ez a suite nem méri. Ez nem hiba, hanem a fenti korlát
 * SZÁMSZERŰ alakja: ami nincs mérve, az egy rontástól sem mozdul.
 */

/** Manuális fizetési mód: ez az ág Stripe nélkül is kirajzolódik. */
function manualisKosar(): HttpTypes.StoreCart {
  return {
    id: "cart-1",
    email: "proba@example.com",
    shipping_address: { id: "addr-1", country_code: "hu" },
    billing_address: { id: "addr-2", country_code: "hu" },
    shipping_methods: [{ id: "sm-1" }],
    payment_collection: {
      payment_sessions: [{ id: "ps-1", provider_id: "pp_system_default" }],
    },
  } as unknown as HttpTypes.StoreCart
}

function gombotRajzol() {
  return render(
    <PaymentButton cart={manualisKosar()} data-testid="submit-order-button" />,
  )
}

describe("a rendelés gomb hibaüzenete", () => {
  /**
   * ISMERT POZITÍV KONTROLL: a manuális ág rajzolódik ki, és a gomb nincs
   * letiltva. Enélkül minden lenti állítás egy üres fán vagy egy halott
   * gombon futna, és a hiányzó hibaüzenetet sikernek olvasnánk.
   */
  it("a manuális ág rajzolódik ki, és a gomb kattintható", () => {
    gombotRajzol()

    const gomb = screen.getByTestId("submit-order-button")
    expect(gomb.tagName).toBe("BUTTON")
    expect((gomb as HTMLButtonElement).disabled).toBe(false)
  })

  it("siker esetén nem ír ki hibát", async () => {
    placeOrder.mockResolvedValue({ ok: true })
    gombotRajzol()

    fireEvent.click(screen.getByTestId("submit-order-button"))

    await waitFor(() => expect(placeOrder).toHaveBeenCalled())
    expect(
      screen.queryByTestId("manual-payment-error-message")?.textContent ?? "",
    ).toBe("")
  })

  it("a válasz üzenetét rajzolja ki, szó szerint", async () => {
    placeOrder.mockResolvedValue({ ok: false, uzenet: RENDELES_ELUTASITVA })
    gombotRajzol()

    fireEvent.click(screen.getByTestId("submit-order-button"))

    await waitFor(() =>
      expect(
        screen.getByTestId("manual-payment-error-message").textContent,
      ).toContain(RENDELES_ELUTASITVA),
    )
  })

  /**
   * A MÁSIK MONDAT IS ÁTMEGY, különben egy beégetett szöveget mérnénk.
   */
  it("a másik mondatot is kiírja, nem egy beégetettet", async () => {
    placeOrder.mockResolvedValue({
      ok: false,
      uzenet: RENDELES_MOST_NEM_SIKERULT,
    })
    gombotRajzol()

    fireEvent.click(screen.getByTestId("submit-order-button"))

    await waitFor(() =>
      expect(
        screen.getByTestId("manual-payment-error-message").textContent,
      ).toContain(RENDELES_MOST_NEM_SIKERULT),
    )
  })
})
