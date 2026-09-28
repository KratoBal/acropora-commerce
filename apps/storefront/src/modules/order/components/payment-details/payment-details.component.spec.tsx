import { HttpTypes } from "@medusajs/types"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import PaymentDetails from "./index"

/**
 * A RENDELES VISSZAIGAZOLO LAPJA A PD-002 SZERINT NEVEZI A FIZETESI MODOT
 * (Balazs, 2026-09-28).
 *
 * Eddig a bolti fizetesnel a Medusa-sablon angol "Manual Payment" szovege
 * allt itt, az utanvet pedig hianyzott a terkepbol, es a `.title` olvasasa
 * hibat dobott volna a lapon.
 *
 * MI PIROSIT: a sablon-szoveg visszatérése; az utanvet bejegyzesenek hianya;
 * es egy ismeretlen szolgaltato, ami a lapot ledontene.
 */

const order = (providerId: string) =>
  ({
    currency_code: "huf",
    payment_collections: [
      {
        payments: [
          {
            provider_id: providerId,
            amount: 12900,
            created_at: "2026-09-28T10:00:00Z",
            data: {},
          },
        ],
      },
    ],
  }) as unknown as HttpTypes.StoreOrder

const modFelirata = () => screen.getByTestId("payment-method").textContent

describe("PaymentDetails: a fizetesi mod felirata", () => {
  afterEach(cleanup)

  it("bolti fizetes: 'Fizetés átvételkor', nem 'Manual Payment'", () => {
    render(<PaymentDetails order={order("pp_system_default")} />)
    expect(modFelirata()).toBe("Fizetés átvételkor")
    expect(screen.queryByText("Manual Payment")).toBeNull()
  })

  it("utanvet: 'Utánvét'", () => {
    render(<PaymentDetails order={order("pp_acropora_cod")} />)
    expect(modFelirata()).toBe("Utánvét")
  })

  it("ismeretlen szolgaltato: az azonosito all a helyen, es a lap nem dol le", () => {
    render(<PaymentDetails order={order("pp_ismeretlen_proba")} />)
    expect(modFelirata()).toBe("pp_ismeretlen_proba")
  })
})
