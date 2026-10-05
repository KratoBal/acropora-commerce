import { stripeProviders } from "../stripe-config"

/**
 * THE STRIPE PROVIDER IS REGISTERED ONLY WITH A KEY. What must fail: an entry
 * without `apiKey` (its validateOptions would throw and stop the payment
 * module, cash on delivery with it); an automatic capture.
 */
describe("stripeProviders", () => {
  it("no key, or only whitespace: nothing is registered", () => {
    expect(stripeProviders({} as NodeJS.ProcessEnv)).toEqual([])
    expect(stripeProviders({ STRIPE_API_KEY: "  " } as NodeJS.ProcessEnv)).toEqual([])
  })

  it("with a key: our capture subclass of Medusa's provider, manual capture, the secret only if set", () => {
    expect(
      stripeProviders({ STRIPE_API_KEY: " kulcs " } as NodeJS.ProcessEnv)
    ).toEqual([
      {
        resolve: "./src/modules/stripe-capture",
        id: "stripe",
        options: { apiKey: "kulcs", capture: false },
      },
    ])
    expect(
      stripeProviders({
        STRIPE_API_KEY: "kulcs",
        STRIPE_WEBHOOK_SECRET: "titok",
      } as NodeJS.ProcessEnv)[0].options
    ).toEqual({ apiKey: "kulcs", webhookSecret: "titok", capture: false })
  })
})
