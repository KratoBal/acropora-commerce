import { createHmac, timingSafeEqual } from "crypto"

/**
 * SIMPLEPAY v2 SIGNATURE (API v2 description, 2026-09-01, section 3.2):
 * HMAC-SHA384 over the exact body bytes, with the account's SECRET_KEY, the raw
 * digest base64-encoded (L590-599, L2568). Requests and responses carry it in
 * the "Signature" header.
 *
 * It is always computed over the RAW bytes. A parsed and re-serialized body is
 * a different string (spacing, key order, escaped slashes), so a response or an
 * IPN must be verified on exactly what arrived.
 */
export const signSimplePay = (body: string | Buffer, secretKey: string) =>
  createHmac("sha384", secretKey).update(body).digest("base64")

export const isValidSimplePaySignature = (
  body: string | Buffer,
  signature: string | null | undefined,
  secretKey: string
): boolean => {
  if (!signature) return false
  const expected = Buffer.from(signSimplePay(body, secretKey))
  const received = Buffer.from(signature)
  return expected.length === received.length && timingSafeEqual(expected, received)
}

/** The fields of the back redirect's `r` (L1006-1010). */
export type SimplePayBackResult = {
  /** Response code: 0, or the error code of an unsuccessful payment. */
  r: number
  /** SimplePay transaction id. */
  t: number
  /** Event: SUCCESS, FAIL, CANCEL or TIMEOUT. Not the transaction status. */
  e: string
  /** Merchant account. */
  m: string
  /** Our orderRef. */
  o: string
}

/**
 * THE BACK REDIRECT (section 3.12): `r` is base64 JSON, `s` its signature.
 * Measured against the document's own example: `s` is the HMAC of the DECODED
 * JSON bytes, not of the base64 string. Both arrive URL-decoded here (the
 * framework decodes the query string).
 *
 * The event is NOT proof of payment (L1011-1012): the order is fulfilled on
 * the IPN or a query saying FINISHED. This only tells the page what to say.
 */
export const readSimplePayBack = (
  r: string,
  s: string,
  secretKey: string
): SimplePayBackResult | null => {
  const json = Buffer.from(r, "base64")
  if (!isValidSimplePaySignature(json, s, secretKey)) return null
  try {
    return JSON.parse(json.toString("utf8")) as SimplePayBackResult
  } catch {
    return null
  }
}
