import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

const submitOwnWithdrawal = vi.fn()
vi.mock("@lib/data/own-withdrawal", () => ({
  submitOwnWithdrawal: (...args: unknown[]) => submitOwnWithdrawal(...args),
}))

import RendelesElallas from "."

afterEach(() => {
  cleanup()
  submitOwnWithdrawal.mockReset()
})

/*
  WHAT TURNS THIS RED (V0.3, the signed-in customer's order page). The button missing from an ordinary order; the
  button drawn for the live animal half of a mixed cart instead of the legal placeholder; the declaration sent without
  the order's id (it would reach no order) or with a customer id of the page's own; the declarations made on the page
  not listed with their reference, or the lines they name offered again; the block drawn for an order with no lines.
*/
const items = [
  { id: "item_1", title: "Korall A", quantity: 1 },
  { id: "item_2", title: "Korall B", quantity: 2 },
]
const renderBlock = (liveAnimal = false) =>
  render(
    <RendelesElallas
      orderId="order_01"
      orderNumber="1043"
      items={items}
      liveAnimal={liveAnimal}
    />,
  )

describe("the signed-in withdrawal block", () => {
  it("offers the button on an ordinary order", () => {
    renderBlock()
    expect(screen.getByTestId("rendeles-elallas-nyito")).toBeTruthy()
    expect(screen.queryByTestId("rendeles-elallas-elo-allat")).toBeNull()
  })

  it("draws the legal placeholder and no button for the live animal half of a mixed cart", () => {
    renderBlock(true)
    expect(screen.queryByTestId("rendeles-elallas-nyito")).toBeNull()
    expect(
      screen.getByTestId("rendeles-elallas-elo-allat").textContent,
    ).toContain("[KITÖLTENDŐ: jogi szöveg élő állatra]")
  })

  it("draws nothing for an order with no lines", () => {
    render(
      <RendelesElallas
        orderId="order_01"
        orderNumber="1043"
        items={[]}
        liveAnimal={false}
      />,
    )
    expect(screen.queryByTestId("rendeles-elallas")).toBeNull()
  })

  it("sends the declaration for the order's id, lists it, and does not offer its lines again", async () => {
    submitOwnWithdrawal.mockResolvedValue({
      ok: true,
      withdrawalId: "ordwd_new",
      createdAt: "2026-11-09T12:00:00.000Z",
      withdrawals: [
        {
          id: "ordwd_new",
          created_at: "2026-11-09T12:00:00.000Z",
          item_ids: ["item_1"],
        },
      ],
      alreadyDeclaredItemIds: [],
    })
    renderBlock()
    fireEvent.click(screen.getByTestId("rendeles-elallas-nyito"))
    fireEvent.click(screen.getByLabelText(/Korall A/))
    fireEvent.change(screen.getByLabelText("A neved"), {
      target: { value: "Kiss Anna" },
    })
    await act(async () => {
      fireEvent.submit(screen.getByTestId("withdrawal-form-1043"))
    })
    await act(async () => {
      fireEvent.click(screen.getByTestId("withdrawal-send"))
    })
    await waitFor(() => screen.getByTestId("withdrawal-done"))
    expect(submitOwnWithdrawal).toHaveBeenCalledWith({
      orderId: "order_01",
      customerName: "Kiss Anna",
      itemIds: ["item_1"],
    })
    expect(screen.getByTestId("withdrawals-1043").textContent).toContain(
      "ordwd_new",
    )
    fireEvent.click(screen.getByText("Bezárás"))
    fireEvent.click(screen.getByTestId("rendeles-elallas-nyito"))
    expect(screen.queryByLabelText(/Korall A/)).toBeNull()
    expect(screen.getByLabelText(/Korall B/)).toBeTruthy()
  })
})
