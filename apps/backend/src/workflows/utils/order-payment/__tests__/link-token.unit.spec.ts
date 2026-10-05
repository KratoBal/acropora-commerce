import { paymentLinkConfig, paymentLinkUrl, requirePaymentLinkConfig } from "../link-config"
import { signPaymentLink, verifyPaymentLink } from "../link-token"

/**
 * THE LINK'S TOKEN AND ITS SETTINGS. What must fail: a forged or altered token
 * accepted (another order, another amount, a later deadline); a token signed
 * with another secret accepted; a link sent with an empty or short secret, or
 * pointing nowhere.
 */
const SECRET = "teszt-titok-legalabb-harminckettő-karakter"
const payload = { order_id: "order_1", collection_id: "pay_col_1", amount: 11650, expires_at: 1760000000000 }

describe("payment link token", () => {
  it("round-trips what it signed", () => {
    expect(verifyPaymentLink(signPaymentLink(payload, SECRET), SECRET)).toEqual(payload)
  })

  it("refuses a token altered in any field, re-signed with another secret, or cut", () => {
    const token = signPaymentLink(payload, SECRET)
    const [, signature] = token.split(".")
    for (const changed of [
      { ...payload, order_id: "order_2" },
      { ...payload, collection_id: "pay_col_2" },
      { ...payload, amount: 1 },
      { ...payload, expires_at: payload.expires_at + 1 },
    ]) {
      const [body] = signPaymentLink(changed, SECRET).split(".")
      expect(verifyPaymentLink(`${body}.${signature}`, SECRET)).toBeNull()
    }
    expect(verifyPaymentLink(token, `${SECRET}x`)).toBeNull()
    expect(verifyPaymentLink(token.split(".")[0], SECRET)).toBeNull()
    expect(verifyPaymentLink(`${token}.x`, SECRET)).toBeNull()
    expect(verifyPaymentLink("", SECRET)).toBeNull()
  })

  it("refuses a correctly signed body that is not a payload", () => {
    const { createHmac } = require("node:crypto")
    const body = Buffer.from(JSON.stringify({ o: "order_1" })).toString("base64url")
    const signature = createHmac("sha256", SECRET).update(body).digest().toString("base64url")
    expect(verifyPaymentLink(`${body}.${signature}`, SECRET)).toBeNull()
  })
})

describe("payment link settings", () => {
  const env = { ACROPORA_PAYMENT_LINK_SECRET: SECRET, ACROPORA_STOREFRONT_URL: "https://shop.example.test/" }

  it("needs a secret of 32+ characters and an http(s) storefront address", () => {
    expect(paymentLinkConfig(env)).toEqual({ secret: SECRET, storefrontUrl: "https://shop.example.test" })
    expect(paymentLinkConfig({ ...env, ACROPORA_PAYMENT_LINK_SECRET: "rovid" })).toBeNull()
    expect(paymentLinkConfig({ ...env, ACROPORA_STOREFRONT_URL: "shop.example.test" })).toBeNull()
    expect(paymentLinkConfig({})).toBeNull()
    expect(() => requirePaymentLinkConfig({})).toThrow(/nincs beállítva/)
  })

  it("points at the storefront's payment page", () => {
    expect(paymentLinkUrl({ secret: SECRET, storefrontUrl: "https://shop.example.test" }, "t.s")).toBe(
      "https://shop.example.test/hu/rendeles-fizetese/t.s"
    )
  })
})
