import { SimplePayConfig } from "./client"
import { isValidSimplePaySignature, signSimplePay } from "./signature"

/**
 * THE SIMPLEPAY IPN (API v2 description, section 3.14): SimplePay POSTs the
 * transaction's end state, signed; we must answer with the SAME data plus
 * `receiveDate`, signed over the answer (L1189-1193). A wrong or missing answer
 * is retried for days (L1157-1173).
 */
export type SimplePayIpn = {
  salt?: string
  orderRef: string
  method?: string
  merchant: string
  finishDate?: string
  paymentDate?: string
  transactionId: number
  status: string
  [field: string]: unknown
}

export type IpnReading =
  | { ok: true; ipn: SimplePayIpn }
  | { ok: false; status: number; message: string }

/**
 * Checked on the RAW bytes as they arrived (a re-serialized body would not
 * verify), then that it is ours: our merchant, a transaction and an orderRef.
 */
export const readSimplePayIpn = (
  rawBody: Buffer | string | undefined,
  signature: string | undefined,
  config: SimplePayConfig | null
): IpnReading => {
  if (!config) return { ok: false, status: 503, message: "SimplePay is not configured" }
  if (!rawBody || !rawBody.length) return { ok: false, status: 400, message: "Empty IPN body" }
  if (!isValidSimplePaySignature(rawBody, signature, config.secretKey)) {
    return { ok: false, status: 401, message: "The IPN signature does not verify" }
  }

  let ipn: SimplePayIpn
  try {
    ipn = JSON.parse(Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : rawBody)
  } catch {
    return { ok: false, status: 400, message: "The IPN body is not JSON" }
  }

  if (ipn.merchant !== config.merchant) {
    return { ok: false, status: 400, message: "The IPN is for another merchant" }
  }
  if (typeof ipn.orderRef !== "string" || !ipn.transactionId || typeof ipn.status !== "string") {
    return { ok: false, status: 400, message: "The IPN lacks orderRef, transactionId or status" }
  }

  return { ok: true, ipn }
}

/**
 * "2019-09-09T14:46:20+0200": the form of the document's IPN example
 * (L1194-1204), in UTC.
 */
export const formatReceiveDate = (date: Date) =>
  date.toISOString().replace(/\.\d{3}Z$/, "+0000")

/** The answer: the received fields, `receiveDate` last, signed over this string. */
export const simplePayIpnAnswer = (
  ipn: SimplePayIpn,
  secretKey: string,
  now: Date = new Date()
): { body: string; signature: string } => {
  const body = JSON.stringify({ ...ipn, receiveDate: formatReceiveDate(now) })
  return { body, signature: signSimplePay(body, secretKey) }
}

/**
 * Our orderRef is `<payment session id>-<suffix>` (`initiatePayment`), so the
 * session is everything before the last dash. `null` if it is not ours.
 */
export const sessionIdOfOrderRef = (orderRef: string): string | null => {
  const cut = orderRef.lastIndexOf("-")
  const sessionId = cut > 0 ? orderRef.slice(0, cut) : ""
  return sessionId.startsWith("payses_") ? sessionId : null
}
