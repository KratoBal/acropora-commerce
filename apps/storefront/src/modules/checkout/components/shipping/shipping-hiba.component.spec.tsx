import { HttpTypes } from "@medusajs/types"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { fireEvent } from "@testing-library/dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const setShippingMethod = vi.fn()

vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "hu" }),
  usePathname: () => "/hu/checkout",
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams("step=delivery"),
}))

vi.mock("@lib/data/cart", () => ({
  setShippingMethod: (...args: unknown[]) => setShippingMethod(...args),
}))

vi.mock("@lib/data/fulfillment", () => ({
  calculatePriceForShippingOption: vi.fn(async () => null),
}))

import Shipping from "./index"
import {
  SZALLITAS_ELUTASITVA,
  SZALLITAS_MOST_NEM_SIKERULT,
} from "@lib/util/penztar-uzenet"

afterEach(cleanup)
beforeEach(() => {
  setShippingMethod.mockReset()
})

/**
 * A SZÁLLÍTÁSI MÓD HIBÁJA A VÁLASZBÓL JÖN, NEM A KIVÉTELBŐL.
 *
 * === A MÉRT HIBA (31a50e97) ===
 *
 * A lépés korábban `.catch((err) => setError(err.message))` alakban dolgozott.
 * Produkcióban a Next a szerver-műveletből DOBOTT hiba üzenetét lecseréli egy
 * általános angol mondatra, tehát a vevő a pénztárban ugyanazt az angol
 * mentőszöveget olvasta volna, amit a kedvezménykódnál már lemértünk (#371).
 *
 * === AMIT EZ MÉR, ÉS AMIT NEM ===
 *
 * MÉRI, hogy a válasz üzenete jelenik meg, melyik, ÉS hogy sikertelen
 * beállításnál a kiválasztás visszaugrik az előzőre -- különben a felület
 * olyat mutatna kiválasztottnak, ami nem áll a kosárban.
 *
 * NEM MÉRI az élő pénztár-utat: valódi rendelést nem indítottam.
 *
 * === KALIBRÁCIÓ (2026-09-14, fej 2fffd47; minden körben 37 teszt futott le) ===
 *
 * A jóslat FÁJLBAN állt a futtatás előtt
 * (`agents/murena/scripts/joslat-penztar-hiba.md`).
 *
 *   a lépés megint a KIVÉTELBŐL dolgozik   3 piros, és mind a három ITT
 *
 * A harmadik piros a VISSZAUGRÁS szelete, és ez a lényeg: a rontás nem csak a
 * mondatot vitte el, hanem a visszaállítást is -- vagyis a kettő tényleg
 * ugyanabból az ágból jön, nem két véletlenül együtt álló dolog.
 */

function szallitasiMod(id: string, nev: string) {
  return {
    id,
    name: nev,
    price_type: "flat",
    amount: 1990,
    insufficient_inventory: false,
    service_zone: { fulfillment_set: { type: "shipping" } },
  } as unknown as HttpTypes.StoreCartShippingOption
}

function kosar(): HttpTypes.StoreCart {
  return {
    id: "cart-1",
    email: "proba@example.com",
    shipping_address: { id: "addr-1", country_code: "hu" },
    billing_address: { id: "addr-2", country_code: "hu" },
    shipping_methods: [],
    currency_code: "huf",
  } as unknown as HttpTypes.StoreCart
}

function lapotRajzol() {
  return render(
    <Shipping
      cart={kosar()}
      availableShippingMethods={[
        szallitasiMod("so-1", "Futár"),
        szallitasiMod("so-2", "Csomagpont"),
      ]}
    />,
  )
}

/**
 * A MÓDOK MIND UGYANAZT A JELÖLŐT VISELIK (`delivery-option-radio`), tehát
 * sorszám szerint választunk. Ezt kimondom, mert egy jelölő, ami többször
 * szerepel, csendben mást talál, mint amit az olvasó hisz.
 */
function modotValaszt(sorszam: number) {
  fireEvent.click(screen.getAllByTestId("delivery-option-radio")[sorszam])
}

describe("a szállítási mód hibaüzenete", () => {
  /**
   * ISMERT POZITÍV KONTROLL: a lépés nyitva van, és a módok ott vannak.
   * Enélkül minden lenti állítás egy üres fán futna.
   */
  it("a szállítási módok kirajzolódnak", () => {
    lapotRajzol()

    expect(screen.getByTestId("delivery-options-container")).toBeTruthy()
    expect(screen.getAllByTestId("delivery-option-radio")).toHaveLength(2)
  })

  it("siker esetén nem ír ki hibát", async () => {
    setShippingMethod.mockResolvedValue({ ok: true })
    lapotRajzol()

    modotValaszt(0)

    await waitFor(() => expect(setShippingMethod).toHaveBeenCalled())
    expect(
      screen.queryByTestId("delivery-option-error-message")?.textContent ?? "",
    ).toBe("")
  })

  it("a válasz üzenetét rajzolja ki, szó szerint", async () => {
    setShippingMethod.mockResolvedValue({
      ok: false,
      uzenet: SZALLITAS_ELUTASITVA,
    })
    lapotRajzol()

    modotValaszt(0)

    await waitFor(() =>
      expect(
        screen.getByTestId("delivery-option-error-message").textContent,
      ).toContain(SZALLITAS_ELUTASITVA),
    )
  })

  it("a másik mondatot is kiírja, nem egy beégetettet", async () => {
    setShippingMethod.mockResolvedValue({
      ok: false,
      uzenet: SZALLITAS_MOST_NEM_SIKERULT,
    })
    lapotRajzol()

    modotValaszt(0)

    await waitFor(() =>
      expect(
        screen.getByTestId("delivery-option-error-message").textContent,
      ).toContain(SZALLITAS_MOST_NEM_SIKERULT),
    )
  })

  /**
   * A KIVÁLASZTÁS VISSZAUGRIK, ha a beállítás nem ment át. Enélkül a felület
   * olyat mutatna kiválasztottnak, ami NEM áll a kosárban -- a vevő azt hinné,
   * megvan a szállítási módja, és a hibaüzenet fölött lépne tovább.
   *
   * A megfigyelhető jel az `aria-checked`; ezt megmértem, nem feltételeztem (a
   * Headless UI `Radio` ezt teszi ki, `role=radio` mellett).
   */
  it("sikertelen beállításnál a kiválasztás visszaugrik", async () => {
    setShippingMethod.mockResolvedValue({
      ok: false,
      uzenet: SZALLITAS_ELUTASITVA,
    })
    lapotRajzol()

    modotValaszt(0)

    await waitFor(() =>
      expect(
        screen.getByTestId("delivery-option-error-message").textContent,
      ).toContain(SZALLITAS_ELUTASITVA),
    )
    expect(
      screen
        .getAllByTestId("delivery-option-radio")[0]
        .getAttribute("aria-checked"),
    ).toBe("false")
  })

  /**
   * ISMERT POZITÍV KONTROLL A FENTIHEZ: sikeres beállításnál a kiválasztás
   * OTT MARAD. Enélkül a visszaugrást mérő állítást egy olyan változat is
   * kielégítené, amiben SOHA semmi nincs kiválasztva -- és akkor nem a
   * visszaállítást mérnénk, hanem azt, hogy a rádió nem működik.
   */
  it("sikeres beállításnál a kiválasztás ott marad", async () => {
    setShippingMethod.mockResolvedValue({ ok: true })
    lapotRajzol()

    modotValaszt(0)

    await waitFor(() =>
      expect(
        screen
          .getAllByTestId("delivery-option-radio")[0]
          .getAttribute("aria-checked"),
      ).toBe("true"),
    )
  })
})
