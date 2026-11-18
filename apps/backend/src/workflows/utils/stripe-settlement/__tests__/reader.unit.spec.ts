import { MedusaError } from "@medusajs/framework/utils"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { createStripeReader, StripeReadRefusedError, stripeQueryString } from "../reader"

const KEY = "sk_test_ZZZZ_not_a_real_key"

const fakeFetch = () => {
  const calls: { url: string; init: RequestInit }[] = []
  const impl = (async (url: string, init: RequestInit) => {
    calls.push({ url, init })
    return { status: 200, text: async () => JSON.stringify({ data: [], has_more: false }) }
  }) as unknown as typeof fetch
  return { calls, impl }
}

/**
 * THE CONDITION (acrobot 56393): the feed may reach Stripe's READ calls only, with no path to a write.
 * What must fail: a request that is not a GET, a path outside `balance_transactions`, `payouts`, `payment_intents/<id>`,
 * the key in a URL, or a write verb appearing anywhere in the feed's own files.
 */
describe("the Stripe reader is read-only", () => {
  it.each([
    ["balance_transactions", { payout: "po_1", limit: 100, expand: ["data.source"] }],
    ["payouts", { limit: 50, created: { gte: 1 } }],
    ["payment_intents/pi_3UdFQkRizpJu2fi81GJnQSxI", undefined],
  ])("sends %s as a GET, with the key in the header only", async (path, query) => {
    const { calls, impl } = fakeFetch()
    await createStripeReader(KEY, impl)(path, query as never)
    expect(calls).toHaveLength(1)
    expect(calls[0].init.method).toBe("GET")
    expect(calls[0].init.body).toBeUndefined()
    expect(calls[0].url.startsWith(`https://api.stripe.com/v1/${path}`)).toBe(true)
    expect(calls[0].url).not.toContain(KEY)
    expect((calls[0].init.headers as Record<string, string>).authorization).toBe(`Bearer ${KEY}`)
  })

  it.each([
    "charges",
    "charges/ch_1",
    "refunds",
    "customers",
    "transfers",
    "payment_intents",
    "payment_intents/pi_1/capture",
    "payment_intents/pi_1/cancel",
    "payment_intents/pi_1/confirm",
    "payouts/po_1",
    "payouts/po_1/cancel",
    "payouts/po_1/reverse",
    "balance_transactions/txn_1",
    "balance",
    "../payouts",
    "payouts?x=1",
    "payouts/",
  ])("refuses %s before anything is sent", async (path) => {
    const { calls, impl } = fakeFetch()
    await expect(createStripeReader(KEY, impl)(path)).rejects.toBeInstanceOf(StripeReadRefusedError)
    expect(calls).toHaveLength(0)
  })

  it("gives every request a time limit", async () => {
    const { calls, impl } = fakeFetch()
    await createStripeReader(KEY, impl)("payouts")
    expect(calls[0].init.signal).toBeInstanceOf(AbortSignal)
  })

  it.each(["TimeoutError", "AbortError"])("a %s becomes an error that names the fact, not the URL or the key", async (name) => {
    const impl = (async () => {
      throw Object.assign(new Error(`The operation was aborted: https://api.stripe.com/v1/payouts ${KEY}`), { name })
    }) as unknown as typeof fetch
    const error = await createStripeReader(KEY, impl, 1000)("payouts").catch((e: Error) => e)
    expect(error).toBeInstanceOf(MedusaError)
    expect((error as Error).message).toBe("stripe did not answer payouts within 1 s")
  })

  it("any other network failure says only that Stripe could not be reached", async () => {
    const impl = (async () => {
      throw new Error(`getaddrinfo ENOTFOUND api.stripe.com ${KEY}`)
    }) as unknown as typeof fetch
    const error = await createStripeReader(KEY, impl)("payouts").catch((e: Error) => e)
    expect((error as Error).message).toBe("stripe could not be reached for payouts")
  })

  it("never puts the key into the refusal text", async () => {
    const { impl } = fakeFetch()
    const error = await createStripeReader(KEY, impl)("charges").catch((e: Error) => e)
    expect(String((error as Error).message)).not.toContain(KEY)
  })

  it("encodes Stripe's query shapes", () => {
    expect(stripeQueryString({ created: { gte: 5 }, expand: ["data.source"], payout: "po_1", skipped: undefined })).toBe(
      "created[gte]=5&expand[]=data.source&payout=po_1",
    )
    expect(stripeQueryString(undefined)).toBe("")
  })
})

/**
 * A scan of the feed's own files for a write. It is checked in both directions: the scan must see a planted write, or a
 * green result says nothing (the file contents below are a planted write, and the real files).
 */
const WRITE_PATTERNS = [
  /method:\s*["'`](POST|PUT|PATCH|DELETE)/i,
  /\.(capture|cancel|confirm|refunds\.create|paymentIntents\.create|payouts\.create)\s*\(/,
  /["'`/](refunds|charges|transfers|customers)\b/,
  /\bexport\s+(const|async function|function)\s+(POST|PUT|PATCH|DELETE)\b/,
]
const violations = (source: string) => WRITE_PATTERNS.filter((pattern) => pattern.test(source))

describe("no write verb anywhere in the feed", () => {
  it("the scan sees a planted write (calibration)", () => {
    expect(violations(`fetch(url, { method: "POST" })`)).not.toHaveLength(0)
    expect(violations(`await stripe.paymentIntents.capture(id)`)).not.toHaveLength(0)
    expect(violations(`export const POST = async () => {}`)).not.toHaveLength(0)
    expect(violations(`stripeGet(key, "refunds?limit=1")`)).not.toHaveLength(0)
  })

  const root = join(__dirname, "..", "..", "..", "..")
  const files = [
    "workflows/utils/stripe-settlement/reader.ts",
    "workflows/utils/stripe-settlement/feed.ts",
    "api/admin/stripe-settlement/payouts/route.ts",
    "api/admin/stripe-settlement/payouts/[payout_id]/transactions/route.ts",
  ]
  it.each(files)("%s has no write pattern", (file) => {
    const source = readFileSync(join(root, file), "utf8")
    // the comments name what is forbidden ("`charges`, `refunds`"); the scan reads the code only
    const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")
    expect(violations(code)).toEqual([])
  })

  it("the reader sends exactly one method, GET", () => {
    const code = readFileSync(join(root, "workflows/utils/stripe-settlement/reader.ts"), "utf8")
    expect(code.match(/method:/g)).toHaveLength(1)
    expect(code).toContain(`method: "GET"`)
  })
})
