import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

const requestGuestInvoice = vi.fn()
vi.mock("@lib/data/guest-invoice", () => ({
  requestGuestInvoice: (...args: unknown[]) => requestGuestInvoice(...args),
}))

import type { GuestOrder } from "@lib/util/guest-order"

import GuestInvoice from "./guest-invoice"

afterEach(() => {
  cleanup()
  requestGuestInvoice.mockReset()
})

/*
  WHAT TURNS THIS RED (V1.1, the invoice button). The shop asked before the click; the order's OWN number and the address not
  used; an invoice answered with no link; a link the page cannot trust (a scheme that is not http or https) drawn; "no invoice
  yet" shown as an error, or an error shown as "no invoice yet"; a document with no number drawn with "null".
*/
const order = { display_id: 1043 } as GuestOrder
const link =
  "https://api.example.test/api/integrations/webshop-invoice/download/abc.def"

describe("GuestInvoice", () => {
  it("does not ask the shop before the click", () => {
    render(<GuestInvoice order={order} email="vevo@example.hu" />)
    expect(requestGuestInvoice).not.toHaveBeenCalled()
    expect(screen.getByTestId("invoice-open-1043")).toBeTruthy()
  })

  it("asks with the order's own number and the address, and draws a link per document", async () => {
    requestGuestInvoice.mockResolvedValue({
      ok: true,
      documents: [
        {
          invoice_number: "SZ/2026-1",
          document_type: "INVOICE",
          issue_date: null,
          url: link,
        },
        {
          invoice_number: null,
          document_type: "ADVANCE_INVOICE",
          issue_date: null,
          url: `${link}2`,
        },
        {
          invoice_number: "SZ/2026-2",
          document_type: "CORRECTION",
          issue_date: null,
          url: `${link}3`,
        },
      ],
    })
    render(<GuestInvoice order={order} email="vevo@example.hu" />)
    fireEvent.click(screen.getByTestId("invoice-open-1043"))
    const links = await screen.findByTestId("invoice-links-1043")
    expect(requestGuestInvoice).toHaveBeenCalledWith({
      orderNumber: "1043",
      email: "vevo@example.hu",
    })
    const anchors = links.querySelectorAll("a")
    expect(anchors).toHaveLength(3)
    expect(anchors[0]!.getAttribute("href")).toBe(link)
    expect(anchors[0]!.textContent).toContain("SZ/2026-1")
    expect(anchors[1]!.textContent).not.toContain("null")
    expect(anchors[1]!.textContent).toContain("Előlegszámla")
    expect(anchors[2]!.textContent).toContain("Helyesbítő számla")
  })

  it("none yet is one plain sentence, not an error", async () => {
    requestGuestInvoice.mockResolvedValue({ ok: true, documents: [] })
    render(<GuestInvoice order={order} email="vevo@example.hu" />)
    fireEvent.click(screen.getByTestId("invoice-open-1043"))
    await screen.findByTestId("invoice-none-1043")
    expect(screen.queryByTestId("invoice-error-1043")).toBeNull()
  })

  it("a failure is the error sentence, not 'none yet'", async () => {
    requestGuestInvoice.mockResolvedValue({ ok: false })
    render(<GuestInvoice order={order} email="vevo@example.hu" />)
    fireEvent.click(screen.getByTestId("invoice-open-1043"))
    await screen.findByTestId("invoice-error-1043")
    expect(screen.queryByTestId("invoice-none-1043")).toBeNull()
  })

  it("never draws a link whose scheme is not http or https", async () => {
    requestGuestInvoice.mockResolvedValue({
      ok: true,
      documents: [
        {
          invoice_number: "SZ/1",
          document_type: "INVOICE",
          issue_date: null,
          url: "javascript:alert(1)",
        },
        {
          invoice_number: "SZ/2",
          document_type: "INVOICE",
          issue_date: null,
          url: link,
        },
      ],
    })
    render(<GuestInvoice order={order} email="vevo@example.hu" />)
    fireEvent.click(screen.getByTestId("invoice-open-1043"))
    const links = await screen.findByTestId("invoice-links-1043")
    await waitFor(() => expect(links.querySelectorAll("a")).toHaveLength(1))
    expect(links.textContent).not.toContain("SZ/1")
  })
})
