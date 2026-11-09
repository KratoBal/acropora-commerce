import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const submitWithdrawal = vi.fn()

import type { GuestOrder } from "@lib/util/guest-order"
import { withdrawableItems } from "@lib/util/withdrawal"

import WithdrawalForm from "./withdrawal-form"

afterEach(() => {
  cleanup()
  submitWithdrawal.mockReset()
})

/*
  WHAT TURNS THIS RED (V0.3, the form). The server asked before the customer confirmed (the first step must send
  nothing); the confirmation screen not repeating the name and lines that will be sent; the name not cleaned before it
  is sent; a line already declared offered again; the typed text lost on a failure (the page says it is
  kept); a lockout shown as the generic error; an already declared refusal not asking the page to read the orders
  again; a success without the reference, or a partly taken request not naming the lines that were not recorded.
*/
const order: GuestOrder = {
  display_id: 1043,
  created_at: null,
  total: 1000,
  currency_code: "huf",
  payment_status: null,
  business_status: null,
  items: [
    { id: "item_1", title: "Korall A", quantity: 1, total: 500 },
    { id: "item_2", title: "Korall B", quantity: 2, total: 500 },
    { id: "item_3", title: "Korall C", quantity: 1, total: 500 },
  ],
  shipping: { method_name: "GLS", pickup_point: null, store_pickup: false },
  tracking: null,
  withdrawals: [
    {
      id: "ordwd_old",
      created_at: "2026-11-08T10:00:00.000Z",
      item_ids: ["item_3"],
    },
  ],
}

const renderForm = (onClose = vi.fn(), onFiled = vi.fn()) =>
  render(
    <WithdrawalForm
      orderNumber={String(order.display_id)}
      items={withdrawableItems(order)}
      submit={(declaration) => submitWithdrawal(declaration)}
      onClose={onClose}
      onFiled={onFiled}
    />,
  )

const fillValid = () => {
  fireEvent.click(screen.getByLabelText(/Korall A/))
  fireEvent.change(screen.getByLabelText("A neved"), {
    target: { value: "  Kiss   Anna " },
  })
}
const goOn = async () => {
  await act(async () => {
    fireEvent.submit(screen.getByTestId("withdrawal-form-1043"))
  })
}
const send = async () => {
  await act(async () => {
    fireEvent.click(screen.getByTestId("withdrawal-send"))
  })
}

beforeEach(() => {
  submitWithdrawal.mockResolvedValue({
    ok: true,
    withdrawalId: "ordwd_new",
    createdAt: "2026-11-09T12:00:00.000Z",
    withdrawals: [],
    alreadyDeclaredItemIds: [],
  })
})

describe("the withdrawal form", () => {
  it("does not offer a line a declaration already names", () => {
    renderForm()
    expect(screen.queryByLabelText(/Korall C/)).toBeNull()
    expect(screen.getByLabelText(/Korall A/)).toBeTruthy()
    expect(screen.getByLabelText(/Korall B/)).toBeTruthy()
  })

  it("sends nothing for an incomplete form and names every missing part", async () => {
    renderForm()
    await goOn()
    expect(screen.getByTestId("withdrawal-items-error").textContent).toBe(
      "Jelölj meg legalább egy terméket.",
    )
    expect(screen.getByTestId("withdrawal-name-error").textContent).toBe(
      "Add meg a nevedet.",
    )
    expect(submitWithdrawal).not.toHaveBeenCalled()
  })

  it("sends nothing at the first step: only the confirmation's own button sends, with what it showed", async () => {
    renderForm()
    fillValid()
    await goOn()
    expect(submitWithdrawal).not.toHaveBeenCalled()
    const confirm = screen.getByTestId("withdrawal-confirm-1043")
    expect(confirm.textContent).toContain("1043 számú rendelés")
    expect(confirm.textContent).toContain("Korall A × 1")
    expect(confirm.textContent).not.toContain("Korall B")
    expect(confirm.textContent).toContain("Kiss Anna")
    await send()
    await waitFor(() => expect(submitWithdrawal).toHaveBeenCalledTimes(1))
    expect(submitWithdrawal).toHaveBeenCalledWith({
      customerName: "Kiss Anna",
      itemIds: ["item_1"],
    })
  })

  /*
    AFTER A REFUSAL THE SCREEN AND THE SENT DECLARATION ARE ONE SET (barracuda's review of #709): the page reads the
    orders again, a line that has a declaration now drops out of the offer, but its id used to stay in the marked ids.
    Mi pirosit: a confirmation that shows one line while the declaration carries another; a "Tovább" through with only a
    dropped line marked (an empty confirmation, then a second refusal).
  */
  it("sends only the marked lines that are still offered, the same ones the confirmation shows", async () => {
    const view = renderForm()
    fireEvent.click(screen.getByLabelText(/Korall A/))
    fireEvent.click(screen.getByLabelText(/Korall B/))
    fireEvent.change(screen.getByLabelText("A neved"), {
      target: { value: "Kiss Anna" },
    })
    // the page read the orders again: Korall A has a declaration now
    view.rerender(
      <WithdrawalForm
        orderNumber={String(order.display_id)}
        items={withdrawableItems({
          ...order,
          withdrawals: [
            ...(order.withdrawals ?? []),
            {
              id: "ordwd_new",
              created_at: "2026-11-09T11:00:00.000Z",
              item_ids: ["item_1"],
            },
          ],
        })}
        submit={(declaration) => submitWithdrawal(declaration)}
        onClose={vi.fn()}
        onFiled={vi.fn()}
      />,
    )
    await goOn()
    const confirm = screen.getByTestId("withdrawal-confirm-1043")
    expect(confirm.textContent).toContain("Korall B")
    expect(confirm.textContent).not.toContain("Korall A")
    await send()
    await waitFor(() => expect(submitWithdrawal).toHaveBeenCalledTimes(1))
    expect(submitWithdrawal.mock.calls[0][0].itemIds).toEqual(["item_2"])
  })

  it("does not go on to the confirmation when the only marked line dropped out of the offer", async () => {
    const view = renderForm()
    fillValid()
    view.rerender(
      <WithdrawalForm
        orderNumber={String(order.display_id)}
        items={withdrawableItems({
          ...order,
          withdrawals: [
            ...(order.withdrawals ?? []),
            {
              id: "ordwd_new",
              created_at: "2026-11-09T11:00:00.000Z",
              item_ids: ["item_1"],
            },
          ],
        })}
        submit={(declaration) => submitWithdrawal(declaration)}
        onClose={vi.fn()}
        onFiled={vi.fn()}
      />,
    )
    await goOn()
    expect(screen.getByTestId("withdrawal-items-error")).toBeTruthy()
    expect(screen.queryByTestId("withdrawal-confirm-1043")).toBeNull()
    expect(submitWithdrawal).not.toHaveBeenCalled()
  })

  it("goes back to the form with the typed text kept", async () => {
    renderForm()
    fillValid()
    await goOn()
    fireEvent.click(screen.getByTestId("withdrawal-back"))
    expect((screen.getByLabelText("A neved") as HTMLInputElement).value).toBe(
      "  Kiss   Anna ",
    )
    expect(
      (screen.getByLabelText(/Korall A/) as HTMLInputElement).checked,
    ).toBe(true)
    expect(submitWithdrawal).not.toHaveBeenCalled()
  })

  it("shows the reference on success and tells the page the list changed", async () => {
    const onFiled = vi.fn()
    const list = [
      {
        id: "ordwd_new",
        created_at: "2026-11-09T12:00:00.000Z",
        item_ids: ["item_1"],
      },
    ]
    submitWithdrawal.mockResolvedValue({
      ok: true,
      withdrawalId: "ordwd_new",
      createdAt: "2026-11-09T12:00:00.000Z",
      withdrawals: list,
      alreadyDeclaredItemIds: [],
    })
    renderForm(vi.fn(), onFiled)
    fillValid()
    await goOn()
    await send()
    await waitFor(() => screen.getByTestId("withdrawal-done"))
    expect(screen.getByTestId("withdrawal-done").textContent).toContain(
      "ordwd_new",
    )
    expect(screen.queryByTestId("withdrawal-done-partial")).toBeNull()
    expect(onFiled).toHaveBeenCalledWith(list)
  })

  it("names the lines a partly taken request did not record", async () => {
    submitWithdrawal.mockResolvedValue({
      ok: true,
      withdrawalId: "ordwd_new",
      createdAt: "2026-11-09T12:00:00.000Z",
      alreadyDeclaredItemIds: ["item_2"],
    })
    renderForm()
    fillValid()
    await goOn()
    await send()
    await waitFor(() => screen.getByTestId("withdrawal-done-partial"))
    expect(screen.getByTestId("withdrawal-done-partial").textContent).toContain(
      "Korall B",
    )
  })

  it("keeps what was typed on a failure, and asks the page to read the orders again after an already declared refusal", async () => {
    const onFiled = vi.fn()
    submitWithdrawal.mockResolvedValue({ ok: false, failure: "duplicate" })
    renderForm(vi.fn(), onFiled)
    fillValid()
    await goOn()
    await send()
    await waitFor(() => screen.getByTestId("withdrawal-failure"))
    expect(screen.getByTestId("withdrawal-failure").textContent).toContain(
      "már van elállási nyilatkozatod",
    )
    expect(onFiled).toHaveBeenCalledWith()
    expect((screen.getByLabelText("A neved") as HTMLInputElement).value).toBe(
      "  Kiss   Anna ",
    )
  })

  it("shows a lockout as the lockout, not as the generic error", async () => {
    submitWithdrawal.mockResolvedValue({ ok: false, failure: "too_many" })
    renderForm()
    fillValid()
    await goOn()
    await send()
    await waitFor(() => screen.getByTestId("withdrawal-failure"))
    expect(screen.getByTestId("withdrawal-failure").textContent).toContain(
      "Túl sok",
    )
  })
})
