import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@lib/data/withdrawal", () => ({ submitWithdrawal: vi.fn() }))
vi.mock("@lib/data/problem-report", () => ({ submitProblemReport: vi.fn() }))
vi.mock("@lib/util/problem-photo-upload", () => ({
  uploadProblemPhoto: vi.fn(),
}))
vi.mock("@lib/data/guest-invoice", () => ({ requestGuestInvoice: vi.fn() }))

import type { GuestOrder } from "@lib/util/guest-order"

import GuestOrderView from "./guest-order-view"

afterEach(cleanup)

/*
  WHAT TURNS THIS RED (V0.3, the order block). The withdrawal button missing from a shipped order, or drawn without
  the address (a display with no way to file); the button drawn for an order that holds a live animal instead of
  the legal placeholder, or withheld from an ordinary store pickup order; the list of declarations not shown with the line titles and the reference; the button still
  drawn when every line already has a declaration.
*/
const base: GuestOrder = {
  display_id: 1042,
  created_at: "2026-11-03T10:00:00.000Z",
  total: 1000,
  currency_code: "huf",
  payment_status: null,
  business_status: null,
  items: [{ id: "item_1", title: "Reef Pump", quantity: 1, total: 1000 }],
  shipping: { method_name: "GLS", pickup_point: null, store_pickup: false },
  tracking: null,
  live_animal: false,
}

describe("the withdrawal in the order block", () => {
  it("offers the button on a shipped order and opens the form", () => {
    render(<GuestOrderView orders={[base]} email="vevo@example.hu" />)
    fireEvent.click(screen.getByTestId("withdrawal-open-1042"))
    expect(screen.getByTestId("withdrawal-form-1042")).toBeTruthy()
    expect(screen.queryByTestId("withdrawal-open-1042")).toBeNull()
  })

  it("draws nothing without the address the customer opened the order with", () => {
    render(<GuestOrderView orders={[base]} />)
    expect(screen.queryByTestId("withdrawal-open-1042")).toBeNull()
  })

  it("draws the legal placeholder and no button for an order that holds a live animal", () => {
    render(
      <GuestOrderView
        orders={[{ ...base, live_animal: true }]}
        email="vevo@example.hu"
      />,
    )
    expect(screen.queryByTestId("withdrawal-open-1042")).toBeNull()
    expect(screen.getByTestId("withdrawal-live-1042").textContent).toContain(
      "[KITÖLTENDŐ: jogi szöveg élő állatra]",
    )
  })

  it("keeps the button on an ordinary store pickup order (the pickup is offered for every cart)", () => {
    const pickup = {
      ...base,
      shipping: {
        method_name: "Bolti átvétel",
        pickup_point: null,
        store_pickup: true,
      },
    }
    render(<GuestOrderView orders={[pickup]} email="vevo@example.hu" />)
    expect(screen.getByTestId("withdrawal-open-1042")).toBeTruthy()
    expect(screen.queryByTestId("withdrawal-live-1042")).toBeNull()
  })

  it("lists the declarations with the line titles and the reference, and no button once every line has one", () => {
    const declared = {
      ...base,
      withdrawals: [
        {
          id: "ordwd_1",
          created_at: "2026-11-09T10:00:00.000Z",
          item_ids: ["item_1"],
        },
      ],
    }
    render(<GuestOrderView orders={[declared]} email="vevo@example.hu" />)
    const list = screen.getByTestId("withdrawals-1042")
    expect(list.textContent).toContain("Reef Pump")
    expect(list.textContent).toContain("ordwd_1")
    expect(screen.queryByTestId("withdrawal-open-1042")).toBeNull()
  })
})
