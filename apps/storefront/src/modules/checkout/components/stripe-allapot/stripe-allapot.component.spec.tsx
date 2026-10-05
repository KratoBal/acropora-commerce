import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { stripeGombFelirat, stripeHibaFajta } from "@lib/util/stripe-allapot"
import StripeAllapotPanel from "./index"

afterEach(cleanup)

/**
 * A STRIPE-ALLAPOTOK SZOVEGE ES DONTESE (a prompt 7-12. pontja). MI PIROSIT:
 * egy CTA-felirat elter a kerettol; a validacios hiba a mi uzenetunkkent is
 * kiirodna; a bank elutasitasa nem a rogzitett mondattal jelenik meg; a
 * feldolgozas panelje nem mondja ki, hogy ne zarja be az oldalt, es hogy a
 * bank hitelesitest kerhet.
 */
describe("a Stripe-fizetés állapotai", () => {
  it("a gomb felirata állapotonként a keret szerint", () => {
    expect(stripeGombFelirat("alap")).toBe("Rendelés leadása")
    expect(stripeGombFelirat("feldolgozas")).toBe("Feldolgozás…")
    expect(stripeGombFelirat("elutasitva")).toBe("Próbáld újra")
    expect(stripeGombFelirat("ellenorzes")).toBe("Ellenőrzés…")
  })

  it("a hiba fajtája: validáció, elutasítás, egyéb", () => {
    expect(stripeHibaFajta({ type: "validation_error" })).toBe("validacio")
    expect(stripeHibaFajta({ type: "card_error" })).toBe("elutasitas")
    expect(stripeHibaFajta({ type: "api_error" })).toBe("egyeb")
    expect(stripeHibaFajta(undefined)).toBe("egyeb")
  })

  it("feldolgozás: a két mondat és a 3DS-jelzés", () => {
    render(<StripeAllapotPanel allapot="feldolgozas" />)
    expect(screen.getByRole("status")).toHaveTextContent(
      "Fizetés feldolgozása…",
    )
    expect(screen.getByText("Ne zárd be az oldalt.")).toBeInTheDocument()
    expect(screen.getByTestId("stripe-3ds-jelzes")).toHaveTextContent(
      "A fizetés addig nincs befejezve.",
    )
  })

  it("elutasítva: a rögzített mondat, figyelmeztetésként", () => {
    render(<StripeAllapotPanel allapot="elutasitva" />)
    expect(screen.getByRole("alert")).toHaveTextContent(
      "A kártyás fizetés nem sikerült. Próbáld újra vagy válassz másik fizetési módot.",
    )
  })

  it("alapállapotban nincs panel", () => {
    const { container } = render(<StripeAllapotPanel allapot="alap" />)
    expect(container).toBeEmptyDOMElement()
  })
})
