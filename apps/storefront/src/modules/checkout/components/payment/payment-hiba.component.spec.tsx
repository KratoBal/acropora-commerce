import { HttpTypes } from "@medusajs/types"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { fireEvent } from "@testing-library/dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const initiatePaymentSession = vi.fn()
const push = vi.fn()

vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "hu" }),
  usePathname: () => "/hu/checkout",
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams("step=payment"),
}))

vi.mock("@lib/data/cart", () => ({
  initiatePaymentSession: (...args: unknown[]) =>
    initiatePaymentSession(...args),
}))

import Payment from "./index"
import {
  FIZETES_ELUTASITVA,
  FIZETES_MOST_NEM_SIKERULT,
} from "@lib/util/penztar-uzenet"

afterEach(cleanup)
beforeEach(() => {
  initiatePaymentSession.mockReset()
  push.mockReset()
})

/**
 * A FIZETÉSI LÉPÉS HIBÁJA A VÁLASZBÓL JÖN, NEM A KIVÉTELBŐL.
 *
 * === A MÉRT HIBA (31a50e97), ÉS ITT KETTŐ VOLT ===
 *
 * 1. A beküldő ág `err.message`-t rajzolt ki. Produkcióban a Next a
 *    szerver-műveletből DOBOTT hiba üzenetét lecseréli egy általános angol
 *    mondatra (#371), tehát a vevő azt olvasta volna.
 *
 * 2. ÉS A MÓDVÁLASZTÓ ÁG NÉMA VOLT. Ott a hívás `catch` NÉLKÜL állt: ha a
 *    fizetési munkamenet indítása elhasalt, a felület kiválasztottnak mutatta
 *    a módot, és a vevő SEMMILYEN jelet nem kapott. Ez nem a határ-hiba, hanem
 *    egy második, önálló hiba ugyanabban a komponensben -- a kártya nem
 *    nevezte meg, a javítás során mértem.
 *
 * === AMIT EZ MÉR, ÉS AMIT NEM ===
 *
 * MÉRI a beküldő ágat: hogy a válasz üzenete jelenik meg, melyik, és hogy
 * sikertelen indítás után NEM lépünk tovább a „review" lépésre.
 *
 * NEM MÉRI a MÓDVÁLASZTÓ ágat, pedig épp az volt a néma. Az az ág csak
 * Stripe-szerű szolgáltatónál hív, a Stripe-os doboz pedig valódi
 * Stripe-elemeket kér, amiket jsdom alatt nem állítok elő. Vagyis a 2. pontra
 * itt ÁLLÍTÁS van a kódról (a hívás `try/catch`-ben áll, és ugyanoda ír), nem
 * mérés a viselkedésről -- és ezt inkább kimondom, mint hogy a fejléc többet
 * ígérjen, mint amennyit a suite tart.
 *
 * NEM MÉRI az élő pénztár-utat sem: valódi rendelést nem indítottam.
 *
 * === KALIBRÁCIÓ ===
 *
 * A számok a mérés után kerülnek ide; a jóslat fájlban áll a futtatás előtt.
 */

function kosar(): HttpTypes.StoreCart {
  return {
    id: "cart-1",
    email: "proba@example.com",
    total: 1990,
    shipping_address: { id: "addr-1", country_code: "hu" },
    billing_address: { id: "addr-2", country_code: "hu" },
    shipping_methods: [{ id: "sm-1" }],
    payment_collection: {
      payment_sessions: [
        { id: "ps-1", provider_id: "pp_masik", status: "pending" },
      ],
    },
  } as unknown as HttpTypes.StoreCart
}

/**
 * A BEKULDO AG CSAK AKKOR HIVJA a muveletet, ha a kivalasztott mod NEM az,
 * ami mar aktiv. Ezert a fixture aktiv munkamenete mas szolgaltato (`pp_masik`),
 * es a teszt eloszor RAKATTINT a felkinalt modra. Ezt megmertem: enelkul a
 * gomb le van tiltva (`!selectedPaymentMethod`), vagy a hivas kimarad.
 */
function modotValaszt() {
  fireEvent.click(screen.getAllByRole("radio")[0])
}

function lapotRajzol() {
  return render(
    <Payment
      cart={kosar()}
      availablePaymentMethods={[{ id: "pp_system_default" }]}
    />,
  )
}

describe("a fizetési lépés hibaüzenete", () => {
  /**
   * ISMERT POZITÍV KONTROLL: a lépés nyitva van, és a beküldő gomb ott áll.
   * Enélkül minden lenti állítás egy üres fán futna.
   */
  it("a lépés nyitva van, és van beküldő gombja", () => {
    lapotRajzol()

    expect(screen.getByTestId("submit-payment-button")).toBeTruthy()
  })

  it("a válasz üzenetét rajzolja ki, szó szerint", async () => {
    initiatePaymentSession.mockResolvedValue({
      ok: false,
      uzenet: FIZETES_ELUTASITVA,
    })
    lapotRajzol()
    modotValaszt()

    fireEvent.click(screen.getByTestId("submit-payment-button"))

    await waitFor(() =>
      expect(
        screen.getByTestId("payment-method-error-message").textContent,
      ).toContain(FIZETES_ELUTASITVA),
    )
  })

  it("a másik mondatot is kiírja, nem egy beégetettet", async () => {
    initiatePaymentSession.mockResolvedValue({
      ok: false,
      uzenet: FIZETES_MOST_NEM_SIKERULT,
    })
    lapotRajzol()
    modotValaszt()

    fireEvent.click(screen.getByTestId("submit-payment-button"))

    await waitFor(() =>
      expect(
        screen.getByTestId("payment-method-error-message").textContent,
      ).toContain(FIZETES_MOST_NEM_SIKERULT),
    )
  })

  /**
   * ÉS SIKERTELEN INDÍTÁS UTÁN NEM LÉPÜNK TOVÁBB. Ez a fontosabbik fele: a
   * „review" lépésen már nincs mit fizetni, tehát egy hibaüzenet MELLETT
   * továbbengedni rosszabb, mint meg sem próbálni.
   */
  it("sikertelen indítás után nem lép tovább", async () => {
    initiatePaymentSession.mockResolvedValue({
      ok: false,
      uzenet: FIZETES_ELUTASITVA,
    })
    lapotRajzol()
    modotValaszt()

    fireEvent.click(screen.getByTestId("submit-payment-button"))

    await waitFor(() =>
      expect(
        screen.getByTestId("payment-method-error-message").textContent,
      ).toContain(FIZETES_ELUTASITVA),
    )
    expect(push).not.toHaveBeenCalled()
  })

  /**
   * ISMERT POZITÍV KONTROLL A FENTIHEZ: sikeres indítás után TOVÁBBLÉPÜNK.
   * Enélkül a „nem lép tovább" állítást egy olyan változat is kielégítené,
   * ami SOHA nem lép tovább -- és akkor egy törött pénztárat igazolnánk.
   */
  it("sikeres indítás után továbblép", async () => {
    initiatePaymentSession.mockResolvedValue({ ok: true })
    lapotRajzol()
    modotValaszt()

    fireEvent.click(screen.getByTestId("submit-payment-button"))

    await waitFor(() => expect(push).toHaveBeenCalled())
    expect(String(push.mock.calls[0][0])).toContain("step=review")
  })
})
