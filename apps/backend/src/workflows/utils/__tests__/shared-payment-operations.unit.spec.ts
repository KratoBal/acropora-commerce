import { simplePayPayerOf, toSplitCart } from "../split-completion-operations"

/**
 * THE CART AS THE SHARED PAYMENT READS IT (P4-3c2b). What must fail: a split
 * paid together not recognised (its completion would move lines and restart
 * the payment); the payer taken from anywhere but the cart.
 */
describe("the cart's shared payment and payer", () => {
  const withSession = (data: unknown) => ({ id: "c", items: [], payment_collection: { payment_sessions: [{ provider_id: "pp_simplepay_simplepay", data }] } })

  it("a session sharing its transaction marks the cart; a single one does not", () => {
    expect(toSplitCart(withSession({ simplepay: { transactionId: 1, total: 13450, own: 4950 } })).shared_payment).toBe(true)
    expect(toSplitCart(withSession({ simplepay: { transactionId: 1, total: 13450, own: 8500, joined: true } })).shared_payment).toBe(true)
    expect(toSplitCart(withSession({ simplepay: { transactionId: 1, total: 4950, own: 4950 } })).shared_payment).toBe(false)
    expect(toSplitCart(withSession({})).shared_payment).toBe(false)
  })

  it("the payer is the cart's email and billing address", () => {
    expect(
      simplePayPayerOf({
        email: "vevo@example.hu",
        billing_address: { first_name: "Teszt", last_name: "Elek", city: "Budapest", postal_code: "1111", address_1: "Minta utca 1.", country_code: "hu" },
      })
    ).toEqual({
      customer_email: "vevo@example.hu",
      invoice: { name: "Teszt Elek", country: "hu", city: "Budapest", zip: "1111", address: "Minta utca 1." },
    })
  })
})
