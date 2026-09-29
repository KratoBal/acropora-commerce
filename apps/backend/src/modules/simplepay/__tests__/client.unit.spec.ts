import { SIMPLEPAY_BASE_URLS, SimplePayClient, SimplePayError } from "../client"
import { signSimplePay } from "../signature"

const KEY = "teszt-kulcs-nem-valodi"
const CONFIG = { merchant: "TESZTMERCHANT", secretKey: KEY, sandbox: true }

type Sent = { url: string; headers: Record<string, string>; body: string }

const fakeSimplePay = (answer: object | string, sign: "good" | "bad" | "none" = "good") => {
  const sent: Sent[] = []
  const fetcher = async (url: string, init: { headers: Record<string, string>; body: string }) => {
    sent.push({ url, headers: init.headers, body: init.body })
    const text = typeof answer === "string" ? answer : JSON.stringify(answer)
    const signature =
      sign === "good" ? signSimplePay(text, KEY) : sign === "bad" ? "rossz" : null
    return {
      ok: true,
      status: 200,
      text: async () => text,
      headers: { get: (name: string) => (name.toLowerCase() === "signature" ? signature : null) },
    }
  }
  return { sent, fetcher: fetcher as never }
}

/**
 * THE SIMPLEPAY CALL. What must fail: a request not signed over its exact
 * body; a missing salt, merchant or sdkVersion; an answer believed without its
 * signature; a refusal read as data; the live URL used without asking for it.
 */
describe("a SimplePay call", () => {
  it("signs the exact body it sends, with salt, merchant and sdkVersion", async () => {
    const { sent, fetcher } = fakeSimplePay({ transactionId: 1 })
    await new SimplePayClient(CONFIG, fetcher, () => "a".repeat(32)).call("start", { orderRef: "o1" })

    const [call] = sent
    expect(call.url).toBe(SIMPLEPAY_BASE_URLS.sandbox + "start")
    expect(call.headers["Content-Type"]).toBe("application/json")
    expect(call.headers.Signature).toBe(signSimplePay(call.body, KEY))
    expect(JSON.parse(call.body)).toMatchObject({
      salt: "a".repeat(32),
      merchant: "TESZTMERCHANT",
      orderRef: "o1",
      sdkVersion: "acropora-commerce-medusa:1",
    })
  })

  it("a fresh salt is 32 hex characters by default", async () => {
    const { sent, fetcher } = fakeSimplePay({ transactionId: 1 })
    await new SimplePayClient(CONFIG, fetcher).call("query", {})
    expect(JSON.parse(sent[0].body).salt).toMatch(/^[0-9a-f]{32}$/)
  })

  it("uses the live URL only when the sandbox is off", async () => {
    const { sent, fetcher } = fakeSimplePay({ ok: 1 })
    await new SimplePayClient({ ...CONFIG, sandbox: false }, fetcher).call("query", {})
    expect(sent[0].url).toBe(SIMPLEPAY_BASE_URLS.live + "query")
  })

  it("refuses an answer whose signature does not verify, or has none", async () => {
    for (const sign of ["bad", "none"] as const) {
      const { fetcher } = fakeSimplePay({ transactionId: 1 }, sign)
      await expect(new SimplePayClient(CONFIG, fetcher).call("start", {})).rejects.toThrow(
        "signature does not verify"
      )
    }
  })

  it("reports a refusal with its error codes", async () => {
    const { fetcher } = fakeSimplePay({ errorCodes: [5321, 5013] }, "none")
    const error = await new SimplePayClient(CONFIG, fetcher)
      .call("start", {})
      .catch((e: SimplePayError) => e)
    expect(error).toBeInstanceOf(SimplePayError)
    expect((error as SimplePayError).codes).toEqual([5321, 5013])
  })

  it("an answer that is not JSON is an error, not data", async () => {
    const { fetcher } = fakeSimplePay("<html>hiba</html>", "none")
    await expect(new SimplePayClient(CONFIG, fetcher).call("start", {})).rejects.toThrow(
      "not a JSON answer"
    )
  })
})
