import { MedusaError } from "@medusajs/framework/utils"

import { POST as COMPLETE } from "../[token]/complete/route"
import { POST as SESSION } from "../[token]/session/route"
import { completeLinkPayment, startLinkSession } from "../../../../workflows/utils/order-payment/pay-by-link"

jest.mock("../../../../workflows/utils/order-payment/link-config", () => ({
  requirePaymentLinkConfig: () => ({ secret: "s" }),
}))
jest.mock("../../../../workflows/utils/order-payment/operations", () => ({ payByLinkOperations: () => "ops" }))
jest.mock("../../../../workflows/utils/order-payment/pay-by-link", () => ({
  startLinkSession: jest.fn(),
  completeLinkPayment: jest.fn(),
}))

/**
 * THE PAYMENT PAGE SHOWS THE CUSTOMER THE 4xx MESSAGE AS IT IS (storefront
 * `linkHibaUzenet`). What must fail: a paid, expired or replaced link (a
 * CONFLICT) reaching the customer as Medusa's fixed English line instead of
 * our Hungarian sentence; an unknown link no longer going to the handler.
 */
const respond = () => {
  const sent: unknown[] = []
  const statuses: number[] = []
  const res = {
    json: (body: unknown) => void sent.push(body),
    status: (code: number) => {
      statuses.push(code)
      return res
    },
  }
  return { sent, statuses, res }
}

const call = async (route: typeof SESSION) => {
  const { sent, statuses, res } = respond()
  await route({ params: { token: "t" }, scope: "scope" } as never, res as never)
  return { status: statuses[0], body: sent[0] }
}

beforeEach(() => jest.clearAllMocks())

describe.each([
  ["session", SESSION, startLinkSession],
  ["complete", COMPLETE, completeLinkPayment],
])("POST /store/order-payment/:token/%s", (_name, route, util) => {
  const sentence = "Ez a fizetési link lejárt. Írj nekünk, és segítünk."

  it("a refused link is a 409 with the customer's sentence", async () => {
    ;(util as jest.Mock).mockRejectedValue(new MedusaError(MedusaError.Types.CONFLICT, sentence))
    expect(await call(route)).toEqual({ status: 409, body: { type: "conflict", code: "refused", message: sentence } })
  })

  it("an answer goes as it was", async () => {
    ;(util as jest.Mock).mockResolvedValue({ ok: 1 })
    expect(await call(route)).toEqual({ status: undefined, body: { ok: 1 } })
  })

  it("an unknown link still goes to the error handler", async () => {
    ;(util as jest.Mock).mockRejectedValue(new MedusaError(MedusaError.Types.NOT_FOUND, "A fizetési link nem található."))
    await expect(call(route)).rejects.toMatchObject({ type: MedusaError.Types.NOT_FOUND })
  })
})
