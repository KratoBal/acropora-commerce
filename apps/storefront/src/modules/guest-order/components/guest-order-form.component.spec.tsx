import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const lookupGuestOrder = vi.fn()
vi.mock("@lib/data/guest-order", () => ({
  lookupGuestOrder: (...args: unknown[]) => lookupGuestOrder(...args),
}))
const submitProblemReport = vi.fn()
vi.mock("@lib/data/problem-report", () => ({
  uploadProblemPhoto: vi.fn(),
  submitProblemReport: (...args: unknown[]) => submitProblemReport(...args),
}))

import GuestOrderForm from "./guest-order-form"

afterEach(() => {
  cleanup()
  lookupGuestOrder.mockReset()
  submitProblemReport.mockReset()
})

/*
  WHAT TURNS THIS RED (V1.1, the form). A malformed number or address leaving the browser (the server is
  not asked); an error shown without its field; the answer for one customer staying on screen while the
  next search runs; a failure of one kind shown with another kind's message (a lockout as "not found");
  the address or the number written into the page's address bar.
*/
const order = {
  display_id: 1042,
  created_at: null,
  total: 1000,
  currency_code: "huf",
  payment_status: null,
  business_status: null,
  items: [],
  shipping: { method_name: "GLS", pickup_point: null, store_pickup: false },
  tracking: null,
}

const fill = (number: string, email: string) => {
  fireEvent.change(screen.getByLabelText("Rendelésszám"), {
    target: { value: number },
  })
  fireEvent.change(screen.getByLabelText("E-mail cím"), {
    target: { value: email },
  })
}
const submit = async () => {
  await act(async () => {
    fireEvent.submit(screen.getByTestId("guest-order-form"))
  })
}

beforeEach(() =>
  lookupGuestOrder.mockResolvedValue({ ok: true, orders: [order] }),
)

describe("the guest order form", () => {
  it("does not ask the server for an empty or malformed input, and says which field is wrong", async () => {
    render(<GuestOrderForm />)
    fill("", "")
    await submit()
    expect(lookupGuestOrder).not.toHaveBeenCalled()
    expect(screen.getByTestId("guest-order-number-error").textContent).toBe(
      "Kérjük, töltsd ki ezt a mezőt.",
    )
    expect(screen.getByTestId("guest-order-email-error").textContent).toBe(
      "Kérjük, töltsd ki ezt a mezőt.",
    )
    fill("12ab", "nem-cim")
    await submit()
    expect(lookupGuestOrder).not.toHaveBeenCalled()
    expect(
      screen.getByTestId("guest-order-number-error").textContent,
    ).toContain("csak számjegyekből")
    expect(screen.getByTestId("guest-order-email-error").textContent).toContain(
      "Ellenőrizd az e-mail címet",
    )
  })

  it("sends the trimmed values and shows the answer below the form", async () => {
    render(<GuestOrderForm />)
    fill(" 1042 ", " vevo@example.hu ")
    await submit()
    await waitFor(() =>
      expect(screen.getByTestId("guest-order-view")).toBeTruthy(),
    )
    expect(lookupGuestOrder).toHaveBeenCalledWith({
      orderNumber: "1042",
      email: "vevo@example.hu",
    })
    expect(screen.getByTestId("guest-order-1042")).toBeTruthy()
  })

  it("a new search clears the old answer while it runs, and a failure replaces it", async () => {
    render(<GuestOrderForm />)
    fill("1042", "vevo@example.hu")
    await submit()
    await waitFor(() =>
      expect(screen.getByTestId("guest-order-view")).toBeTruthy(),
    )
    lookupGuestOrder.mockResolvedValue({ ok: false, kind: "not_found" })
    fill("1043", "vevo@example.hu")
    await submit()
    await waitFor(() =>
      expect(screen.getByTestId("guest-order-failure")).toBeTruthy(),
    )
    expect(screen.queryByTestId("guest-order-view")).toBeNull()
  })

  it.each([
    ["not_found", "Nem találtuk a rendelést ezekkel az adatokkal."],
    ["too_many", "Túl sok sikertelen próbálkozás történt."],
    ["unavailable", "Most nem tudjuk megmutatni a rendelést."],
  ])("a %s failure shows its own message", async (kind, text) => {
    lookupGuestOrder.mockResolvedValue({ ok: false, kind })
    render(<GuestOrderForm />)
    fill("1042", "vevo@example.hu")
    await submit()
    await waitFor(() =>
      expect(screen.getByTestId("guest-order-failure").textContent).toContain(
        text,
      ),
    )
  })

  it("the address and the number never reach the address bar", async () => {
    window.history.replaceState({}, "", "/hu-hu/rendeles-megtekintese")
    render(<GuestOrderForm />)
    fill("1042", "vevo@example.hu")
    await submit()
    await waitFor(() => expect(lookupGuestOrder).toHaveBeenCalled())
    expect(window.location.href).not.toContain("vevo")
    expect(window.location.href).not.toContain("1042")
  })
  it("keeps the address the order was found with for an open problem form, even if the field is edited afterwards", async () => {
    lookupGuestOrder.mockResolvedValue({
      ok: true,
      orders: [
        {
          ...order,
          items: [{ id: "item_1", title: "Korall A", quantity: 1, total: 500 }],
        },
      ],
    })
    submitProblemReport.mockResolvedValue({
      ok: true,
      reportId: "ordprb_01",
      createdAt: "2026-11-04T10:00:00.000Z",
    })
    render(<GuestOrderForm />)
    fill("1042", "vevo@example.hu")
    await submit()
    await waitFor(() =>
      expect(screen.getByTestId("guest-order-view")).toBeTruthy(),
    )
    fireEvent.click(
      screen.getByRole("button", { name: /Probléma a szállítmánnyal/ }),
    )
    // the customer starts typing another address into the lookup field
    fireEvent.change(screen.getByLabelText("E-mail cím"), {
      target: { value: "mas@example.hu" },
    })
    fireEvent.click(screen.getByLabelText(/Korall A/))
    fireEvent.change(screen.getByLabelText("Mi a probléma?"), {
      target: { value: "item_damaged" },
    })
    fireEvent.change(screen.getByLabelText("Mi történt pontosan?"), {
      target: { value: "Törött a láb" },
    })
    await act(async () => {
      fireEvent.submit(screen.getByTestId("problem-form-1042"))
    })
    await waitFor(() => expect(submitProblemReport).toHaveBeenCalledTimes(1))
    expect(submitProblemReport.mock.calls[0][0]).toMatchObject({
      orderNumber: "1042",
      email: "vevo@example.hu",
    })
  })
})
