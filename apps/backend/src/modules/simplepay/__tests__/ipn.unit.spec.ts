import {
  formatReceiveDate,
  readSimplePayIpn,
  sessionIdOfOrderRef,
  simplePayIpnAnswer,
} from "../ipn"
import { signSimplePay } from "../signature"

const KEY = "teszt-kulcs-nem-valodi"
const CONFIG = { merchant: "PUBLICTESTHUF", secretKey: KEY, sandbox: true }

// The document's IPN example (L1179-1188), compact, as SimplePay sends it (L560-562).
const DOC_IPN =
  '{"salt":"223G0O18VAqdLhQYbJz73adT36YzLtak","orderRef":"101010515680292482600","method":"CARD","merchant":"PUBLICTESTHUF","finishDate":"2019-09-09T14:46:18+0200","paymentDate":"2019-09-09T14:41:13+0200","transactionId":99844942,"status":"FINISHED"}'

/**
 * THE IPN (P4-3b). What must fail: an IPN believed without its signature or
 * for another merchant; the answer not echoing the fields, not carrying
 * `receiveDate`, or not signed over what is sent.
 */
describe("reading an IPN", () => {
  it("accepts the document's example, signed with our key", () => {
    const reading = readSimplePayIpn(Buffer.from(DOC_IPN), signSimplePay(DOC_IPN, KEY), CONFIG)
    expect(reading).toMatchObject({
      ok: true,
      ipn: { orderRef: "101010515680292482600", transactionId: 99844942, status: "FINISHED" },
    })
  })

  it("refuses a bad signature, an unconfigured shop, an empty or non-JSON body, another merchant, missing fields", () => {
    expect(readSimplePayIpn(Buffer.from(DOC_IPN), "rossz", CONFIG)).toMatchObject({ ok: false, status: 401 })
    expect(readSimplePayIpn(Buffer.from(DOC_IPN), signSimplePay(DOC_IPN, KEY), null)).toMatchObject({ ok: false, status: 503 })
    expect(readSimplePayIpn(undefined, "x", CONFIG)).toMatchObject({ ok: false, status: 400 })
    expect(readSimplePayIpn(Buffer.from("nem json"), signSimplePay("nem json", KEY), CONFIG)).toMatchObject({ ok: false, status: 400 })
    const masik = DOC_IPN.replace("PUBLICTESTHUF", "MASIKBOLT")
    expect(readSimplePayIpn(Buffer.from(masik), signSimplePay(masik, KEY), CONFIG)).toMatchObject({ ok: false, status: 400 })
    const hianyos = '{"merchant":"PUBLICTESTHUF","status":"FINISHED"}'
    expect(readSimplePayIpn(Buffer.from(hianyos), signSimplePay(hianyos, KEY), CONFIG)).toMatchObject({ ok: false, status: 400 })
  })

  it("the signature is checked on the raw bytes, not on a re-serialized body", () => {
    const pretty = JSON.stringify(JSON.parse(DOC_IPN), null, 1)
    expect(readSimplePayIpn(Buffer.from(pretty), signSimplePay(DOC_IPN, KEY), CONFIG)).toMatchObject({ ok: false, status: 401 })
  })
})

describe("the IPN answer", () => {
  it("echoes the fields, adds receiveDate last, and signs exactly what is sent", () => {
    const reading = readSimplePayIpn(Buffer.from(DOC_IPN), signSimplePay(DOC_IPN, KEY), CONFIG)
    if (!reading.ok) throw new Error("olvasas")
    const answer = simplePayIpnAnswer(reading.ipn, KEY, new Date("2019-09-09T12:46:20.123Z"))

    expect(answer.body).toBe(DOC_IPN.slice(0, -1) + ',"receiveDate":"2019-09-09T12:46:20+0000"}')
    expect(answer.signature).toBe(signSimplePay(answer.body, KEY))
  })

  it("the receive date has the document's form", () => {
    expect(formatReceiveDate(new Date("2026-09-29T18:30:05.999Z"))).toBe("2026-09-29T18:30:05+0000")
  })
})

describe("the payment session behind an orderRef", () => {
  it("is everything before the last dash, and only ours", () => {
    expect(sessionIdOfOrderRef("payses_01ABC-lm3k9z")).toBe("payses_01ABC")
    expect(sessionIdOfOrderRef("101010515680292482600")).toBeNull()
    expect(sessionIdOfOrderRef("masvalami-x")).toBeNull()
  })
})
