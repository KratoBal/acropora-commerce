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
const retrieveOwnWithdrawalState = vi.fn()
vi.mock("@lib/data/own-withdrawal", () => ({
  submitOwnWithdrawal: (...args: unknown[]) => submitOwnWithdrawal(...args),
  retrieveOwnWithdrawalState: (...args: unknown[]) =>
    retrieveOwnWithdrawalState(...args),
}))

import RendelesElallas from "."

afterEach(() => {
  cleanup()
  submitOwnWithdrawal.mockReset()
  retrieveOwnWithdrawalState.mockReset()
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
const renderBlock = (
  liveAnimal = false,
  initialWithdrawals: {
    id: string
    created_at: string
    item_ids: string[]
  }[] = [],
) =>
  render(
    <RendelesElallas
      orderId="order_01"
      orderNumber="1043"
      items={items}
      liveAnimal={liveAnimal}
      initialWithdrawals={initialWithdrawals}
    />,
  )

describe("the signed-in withdrawal block", () => {
  it("offers the button on an ordinary order", () => {
    renderBlock()
    expect(screen.getByTestId("rendeles-elallas-nyito")).toBeTruthy()
    expect(screen.queryByTestId("rendeles-elallas-elo-allat")).toBeNull()
  })

  it("lists the declarations the shop already holds, and does not offer their lines again", () => {
    renderBlock(false, [
      {
        id: "ordwd_old",
        created_at: "2026-11-08T10:00:00.000Z",
        item_ids: ["item_1"],
      },
    ])
    expect(screen.getByTestId("withdrawals-1043").textContent).toContain(
      "ordwd_old",
    )
    fireEvent.click(screen.getByTestId("rendeles-elallas-nyito"))
    expect(screen.queryByLabelText(/Korall A/)).toBeNull()
    expect(screen.getByLabelText(/Korall B/)).toBeTruthy()
  })

  it("draws no button when every line already has a declaration", () => {
    renderBlock(false, [
      {
        id: "ordwd_old",
        created_at: "2026-11-08T10:00:00.000Z",
        item_ids: ["item_1", "item_2"],
      },
    ])
    expect(screen.queryByTestId("rendeles-elallas-nyito")).toBeNull()
  })

  it("draws the legal placeholder and no button for an order that holds a live animal", () => {
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

  /*
    AFTER AN "ALREADY DECLARED" REFUSAL (barracuda's review of #710: two tabs, or a declaration made as a guest
    meanwhile). The refusal carries no list, so the block must read the shop's state again and take the declarations from
    it; otherwise the line stays offered and the customer gets the same refusal again.
  */
  it("after an already declared refusal reads the shop's state again: the line drops out of the offer and the list shows it", async () => {
    submitOwnWithdrawal.mockResolvedValue({ ok: false, failure: "duplicate" })
    retrieveOwnWithdrawalState.mockResolvedValue({
      liveAnimal: false,
      withdrawals: [
        {
          id: "ordwd_other_tab",
          created_at: "2026-11-09T12:00:00.000Z",
          item_ids: ["item_1"],
        },
      ],
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
    await waitFor(() =>
      expect(retrieveOwnWithdrawalState).toHaveBeenCalledWith("order_01"),
    )
    await waitFor(() => screen.getByTestId("withdrawals-1043"))
    expect(screen.getByTestId("withdrawals-1043").textContent).toContain(
      "ordwd_other_tab",
    )
    expect(screen.queryByLabelText(/Korall A/)).toBeNull()
    expect(screen.getByLabelText(/Korall B/)).toBeTruthy()
  })

  it("after an answer that did not come back reads the shop's state again: a declaration that stands is listed", async () => {
    submitOwnWithdrawal.mockResolvedValue({ ok: false, failure: "unavailable" })
    retrieveOwnWithdrawalState.mockResolvedValue({
      liveAnimal: false,
      withdrawals: [
        {
          id: "ordwd_landed",
          created_at: "2026-11-09T12:00:00.000Z",
          item_ids: ["item_1"],
        },
      ],
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
    await waitFor(() => screen.getByTestId("withdrawals-1043"))
    expect(screen.getByTestId("withdrawals-1043").textContent).toContain(
      "ordwd_landed",
    )
    expect(screen.getByTestId("withdrawal-failure").textContent).toContain(
      "nem tudjuk, megérkezett-e",
    )
  })

  it("keeps what it has when the state cannot be read again after the refusal", async () => {
    submitOwnWithdrawal.mockResolvedValue({ ok: false, failure: "duplicate" })
    retrieveOwnWithdrawalState.mockResolvedValue(null)
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
    await waitFor(() => expect(retrieveOwnWithdrawalState).toHaveBeenCalled())
    expect(screen.getByLabelText(/Korall A/)).toBeTruthy()
    expect(screen.queryByTestId("withdrawals-1043")).toBeNull()
  })
})
