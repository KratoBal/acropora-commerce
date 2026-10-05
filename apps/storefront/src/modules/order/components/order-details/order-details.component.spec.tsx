import { HttpTypes } from "@medusajs/types"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import OrderDetails from "./index"

afterEach(() => cleanup())

const rendeles = {
  id: "order_1",
  display_id: 42,
  email: "vevo@example.test",
  created_at: "2026-10-05T10:00:00Z",
  status: "pending",
  fulfillment_status: "not_fulfilled",
  payment_status: "authorized",
} as unknown as HttpTypes.StoreOrder

/**
 * A VISSZAIGAZOLO LAP NEM ALLIT LEVELET (Balazs, 2026-10-05). MI PIROSIT: ha a
 * lap ujra azt mondja, hogy a visszaigazolast elkuldtuk, mikozben a commerce
 * hatter vevoi levelet nem kuld; ha a vevo nem latja, melyik cimet adta meg.
 */
describe("a rendelés részletei", () => {
  it("megnevezi a megadott e-mail-címet, és nem állítja, hogy levelet küldtünk", () => {
    render(<OrderDetails order={rendeles} />)
    expect(screen.getByTestId("order-email")).toHaveTextContent(
      "vevo@example.test",
    )
    expect(
      screen.getByText(/A rendeléshez megadott e-mail-cím/),
    ).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/elküldtük|elkuldtuk/i)
  })
})
