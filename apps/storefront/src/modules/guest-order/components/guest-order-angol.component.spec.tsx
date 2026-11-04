import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "en-hu" }),
  usePathname: () => "/en-hu/rendeles-megtekintese",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}))

import type { GuestOrder } from "@lib/util/guest-order"

import GuestOrderView from "./guest-order-view"

afterEach(cleanup)

const MAGYAR_BETU = /[áéíóöőúüűÁÉÍÓÖŐÚÜŰ]/

/*
  The English page: every sentence the page writes is English (the shop's own item and shipping
  names come from the order and stay as stored).
*/
const order: GuestOrder = {
  display_id: 1042,
  created_at: "2026-11-03T10:00:00.000Z",
  total: 15900,
  currency_code: "huf",
  payment_status: "not_paid",
  business_status: {
    status: "stocking",
    label: "Készletezés alatt",
    updated_at: "2026-11-04T08:00:00.000Z",
    history: [],
  },
  items: [],
  shipping: { method_name: "GLS", pickup_point: null, store_pickup: false },
  tracking: null,
}

describe("the guest order view in English", () => {
  it("status, payment and tracking sentences are English", () => {
    render(<GuestOrderView orders={[order]} />)
    expect(screen.getByTestId("guest-order-status").textContent).toContain(
      "Being prepared",
    )
    expect(screen.getByTestId("guest-order-payment").textContent).toContain(
      "Awaiting payment",
    )
    for (const id of [
      "guest-order-status",
      "guest-order-payment",
      "guest-order-tracking",
    ])
      expect(screen.getByTestId(id).textContent ?? "", id).not.toMatch(
        MAGYAR_BETU,
      )
    expect(screen.getByTestId("guest-order-tracking").textContent).toContain(
      "The tracking number appears",
    )
    expect(screen.getByTestId("guest-order-1042").textContent).toContain(
      "Order #1042",
    )
    expect(screen.getByTestId("guest-order-1042").textContent).toContain(
      "Placed on: 3 Nov 2026",
    )
  })
})
