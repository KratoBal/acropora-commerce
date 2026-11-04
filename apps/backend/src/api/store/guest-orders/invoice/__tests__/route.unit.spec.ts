const findGuestOrderId = jest.fn()
jest.mock("../../../../../workflows/utils/guest-order/lookup", () => ({
  findGuestOrderId: (...args: unknown[]) => findGuestOrderId(...args),
}))
jest.mock("../../../../../workflows/utils/guest-order/operations", () => ({
  guestOrderOperations: () => ({ marker: "deps" }),
}))
const requestInvoiceLinks = jest.fn()
jest.mock("../../../../../workflows/utils/guest-order/invoice-link", () => ({
  invoiceLinkConfig: () => ({ secret: "x".repeat(40), url: "https://os.test/link" }),
  requestInvoiceLinks: (...args: unknown[]) => requestInvoiceLinks(...args),
}))

import middlewares from "../../../../middlewares"
import { guestInvoiceAddressAttempts, guestInvoiceNumberAttempts } from "../../../../attempt-limits"
import { POST } from "../route"
import { StorePostGuestInvoice } from "../validators"

/*
  WHAT TURNS THIS RED (V1.1). A miss answered with anything but the one 404 text (and the OS asked at all for a miss); the OS
  asked for any id but the one the pair named; the OS's own failure reaching the caller instead of the one 503 sentence; the
  route registered WITHOUT the attempt limits, or with them after the validation; a body with an extra key or a bad address
  accepted; the order id appearing in the answer.
*/
const run = async (body: { order_number: string; email: string }) => {
  const json = jest.fn()
  const status = jest.fn().mockReturnValue({ json })
  await POST({ validatedBody: body, scope: {} } as never, { json, status } as never)
  return { json, status }
}

afterEach(() => {
  findGuestOrderId.mockReset()
  requestInvoiceLinks.mockReset()
})

describe("POST /store/guest-orders/invoice", () => {
  it("a miss is the one 404 text, and the OS is not asked", async () => {
    findGuestOrderId.mockResolvedValue(null)
    const { json, status } = await run({ order_number: "1042", email: "vevo@example.hu" })
    expect(status).toHaveBeenCalledWith(404)
    expect(json).toHaveBeenCalledWith({ message: "Nem találtuk a rendelést." })
    expect(requestInvoiceLinks).not.toHaveBeenCalled()
  })

  it("asks the OS for the identified order only, and answers the documents without the order id", async () => {
    findGuestOrderId.mockResolvedValue("order_1042")
    requestInvoiceLinks.mockResolvedValue({
      kind: "ok",
      documents: [{ invoice_number: "SZ/1", document_type: "INVOICE", issue_date: null, url: "https://os.test/d/x" }],
    })
    const { json, status } = await run({ order_number: "#01042", email: "vevo@example.hu" })
    expect(findGuestOrderId).toHaveBeenCalledWith({ displayId: 1042, email: "vevo@example.hu" }, expect.anything())
    expect(requestInvoiceLinks.mock.calls[0]![0]).toBe("order_1042")
    expect(status).not.toHaveBeenCalled()
    const answer = json.mock.calls[0]![0]
    expect(Object.keys(answer)).toEqual(["documents"])
    expect(JSON.stringify(answer)).not.toContain("order_1042")
  })

  it("an unavailable OS is one 503 sentence", async () => {
    findGuestOrderId.mockResolvedValue("order_1042")
    requestInvoiceLinks.mockResolvedValue({ kind: "unavailable" })
    const { json, status } = await run({ order_number: "1042", email: "vevo@example.hu" })
    expect(status).toHaveBeenCalledWith(503)
    expect(json).toHaveBeenCalledWith({ message: "A számla letöltése most nem érhető el." })
  })

  it("is registered with the attempt limits BEFORE the validation", () => {
    const entry = (middlewares.routes ?? []).find((r) => r.matcher === "/store/guest-orders/invoice")
    expect(entry).toBeDefined()
    const list = entry?.middlewares ?? []
    expect(list.slice(0, 2)).toEqual([guestInvoiceAddressAttempts, guestInvoiceNumberAttempts])
    expect(list).toHaveLength(3)
  })

  it("the validator is strict and checks the pair's shape", () => {
    expect(StorePostGuestInvoice.safeParse({ order_number: "#1042", email: "vevo@example.hu" }).success).toBe(true)
    expect(StorePostGuestInvoice.safeParse({ order_number: "1042", email: "vevo@example.hu", extra: 1 }).success).toBe(false)
    expect(StorePostGuestInvoice.safeParse({ order_number: "10x", email: "vevo@example.hu" }).success).toBe(false)
    expect(StorePostGuestInvoice.safeParse({ order_number: "1042", email: "nem-cim" }).success).toBe(false)
  })
})
