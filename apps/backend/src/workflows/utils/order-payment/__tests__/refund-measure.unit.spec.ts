import { applyRefusal, decodeInput, inputArgument, isStripeTestKey, planRefund } from "../refund-measure"
import { orderReadout } from "../readout"

const b64 = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64")

const order = (payments: any[]) =>
  orderReadout({ id: "order_01A", total: 10000, payment_collections: [{ id: "paycol_1", status: "completed", payments }] })

const stripePayment = (over: any = {}) => ({
  id: "pay_01A",
  provider_id: "pp_stripe_stripe",
  amount: 10000,
  captures: [{ amount: 10000 }],
  refunds: [],
  ...over,
})

describe("inputArgument and decodeInput", () => {
  it("takes the value after --input, in both spellings, and nothing without it", () => {
    expect(inputArgument(["--input", "abc"])).toBe("abc")
    expect(inputArgument(["x", "--input=abc"])).toBe("abc")
    expect(inputArgument([])).toBeNull()
    expect(inputArgument(["--input"])).toBeNull()
    expect(() => decodeInput([])).toThrow("no input in the command")
  })

  it("takes the ONE positional word, the form `medusa exec` really passes (it refuses --input as an unknown argument), and not two words", () => {
    expect(inputArgument(["abc"])).toBe("abc")
    expect(inputArgument(["abc", "def"])).toBeNull()
    expect(decodeInput([b64({ mode: "list" })])).toEqual({ mode: "list", limit: 5 })
    expect(() => decodeInput([b64({ mode: "list" }), "extra"])).toThrow("no input in the command")
  })

  it("decodes a list, a plan and an apply input and fills the defaults", () => {
    expect(decodeInput(["--input", b64({ mode: "list" })])).toEqual({ mode: "list", limit: 5 })
    expect(decodeInput(["--input", b64({ order_id: "order_01A", amount: 500 })])).toEqual({
      mode: "plan",
      order_id: "order_01A",
      amount: 500,
      payment_id: null,
      note: "measurement (card 04b6010e)",
      confirm_order_id: null,
    })
    const apply = decodeInput(["--input", b64({ mode: "apply", order_id: "order_01A", amount: 500, confirm_order_id: "order_01A", payment_id: "pay_01A" })])
    expect(apply).toMatchObject({ mode: "apply", confirm_order_id: "order_01A", payment_id: "pay_01A" })
  })

  it("names what is wrong, and never echoes the input: bad base64/JSON, mode, order id, a fractional or zero amount, a limit out of range", () => {
    expect(() => decodeInput(["--input", "###"])).toThrow("valid JSON")
    expect(() => decodeInput(["--input", b64([1])])).toThrow("JSON object")
    expect(() => decodeInput(["--input", b64({ mode: "delete" })])).toThrow("mode must be")
    expect(() => decodeInput(["--input", b64({ order_id: "ord", amount: 5 })])).toThrow("order_id")
    expect(() => decodeInput(["--input", b64({ order_id: "order_01A", amount: 5.5 })])).toThrow("whole number")
    expect(() => decodeInput(["--input", b64({ order_id: "order_01A", amount: 0 })])).toThrow("at least 1")
    expect(() => decodeInput(["--input", b64({ mode: "list", limit: 21 })])).toThrow("1 to 20")
    expect(() => decodeInput(["--input", b64({ order_id: "order_01A", amount: 5, payment_id: "x" })])).toThrow("payment_id")
  })
})

describe("isStripeTestKey", () => {
  it("accepts a test secret key and refuses a live key, a restricted live key, an empty value and a missing one", () => {
    expect(isStripeTestKey("sk_test_abc123")).toBe(true)
    expect(isStripeTestKey(" sk_test_abc123 ")).toBe(true)
    for (const key of ["sk_live_abc123", "rk_live_abc123", "pk_test_abc123", "", undefined, null]) expect(isStripeTestKey(key as any)).toBe(false)
  })
})

describe("planRefund", () => {
  const base = { amount: 1000, paymentId: null, testKey: true, intentLive: false as boolean | null }

  it("allows a refund of what is captured and not yet refunded, and says what is refundable", () => {
    const plan = planRefund({ ...base, readout: order([stripePayment({ refunds: [{ amount: 2000 }] })]) })
    expect(plan).toEqual({ ok: true, problems: [], payment_id: "pay_01A", refundable: 8000 })
  })

  it("CONTROL: refuses a live key, a live intent, a refund above what is refundable, and says each reason", () => {
    const readout = order([stripePayment()])
    expect(planRefund({ ...base, readout, testKey: false }).problems.join()).toContain("TEST key")
    expect(planRefund({ ...base, readout, intentLive: true }).problems.join()).toContain("LIVE")
    const over = planRefund({ ...base, readout, amount: 10001 })
    expect(over.ok).toBe(false)
    expect(over.problems.join()).toContain("more than what is refundable (10000")
  })

  it("CONTROL: refuses an order with no usable Stripe payment, one that is canceled, one of another provider, and a wrong payment_id", () => {
    expect(planRefund({ ...base, readout: order([]) }).ok).toBe(false)
    expect(planRefund({ ...base, readout: order([stripePayment({ canceled_at: "2026-11-01" })]) }).ok).toBe(false)
    expect(planRefund({ ...base, readout: order([stripePayment({ provider_id: "pp_system_default" })]) }).ok).toBe(false)
    const wrong = planRefund({ ...base, readout: order([stripePayment()]), paymentId: "pay_other" })
    expect(wrong.problems.join()).toContain("pay_other")
  })

  it("two Stripe payments need a payment_id; with it the chosen one is judged", () => {
    const readout = order([stripePayment({ id: "pay_A" }), stripePayment({ id: "pay_B", captures: [{ amount: 500 }] })])
    const ambiguous = planRefund({ ...base, readout })
    expect(ambiguous.ok).toBe(false)
    expect(ambiguous.problems.join()).toContain("pay_A, pay_B")
    expect(planRefund({ ...base, readout, paymentId: "pay_B", amount: 500 })).toMatchObject({ ok: true, payment_id: "pay_B", refundable: 500 })
    expect(planRefund({ ...base, readout, paymentId: "pay_B", amount: 501 }).ok).toBe(false)
  })

  it("a refund amount that is not a number (a BigNumber-like object) blocks the plan instead of counting NaN, and a payment with nothing captured has nothing to refund", () => {
    const nan = planRefund({ ...base, readout: order([stripePayment({ refunds: [{ amount: { value: "100" } }] })]) })
    expect(nan.ok).toBe(false)
    expect(nan.refundable).toBeNull()
    expect(planRefund({ ...base, readout: order([stripePayment({ captures: [] })]) }).ok).toBe(false)
  })
})

describe("applyRefusal", () => {
  const okPlan = { ok: true, problems: [], payment_id: "pay_01A", refundable: 10000 }
  const apply = (over: object = {}) =>
    decodeInput(["--input", b64({ mode: "apply", order_id: "order_01A", amount: 100, confirm_order_id: "order_01A", ...over })])

  it("lets a confirmed apply with a clean plan through", () => {
    expect(applyRefusal(apply(), okPlan)).toBeNull()
  })

  it("CONTROL: refuses a plan mode, a missing or different confirmation, and a plan with a problem", () => {
    const plan = decodeInput(["--input", b64({ mode: "plan", order_id: "order_01A", amount: 100 })])
    expect(applyRefusal(plan, okPlan)).toContain("not apply")
    expect(applyRefusal(apply({ confirm_order_id: undefined }), okPlan)).toContain("confirm_order_id")
    expect(applyRefusal(apply({ confirm_order_id: "order_01B" }), okPlan)).toContain("confirm_order_id")
    const bad = { ok: false, problems: ["amount 100 is more than refundable"], payment_id: "pay_01A", refundable: 50 }
    expect(applyRefusal(apply(), bad)).toContain("more than refundable")
    expect(applyRefusal(apply(), { ok: true, problems: [], payment_id: null, refundable: null })).toContain("refused")
  })
})
