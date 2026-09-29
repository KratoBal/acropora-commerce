import { randomBytes } from "crypto"

import { isValidSimplePaySignature, signSimplePay } from "./signature"

/** Base URLs (L439, L462); the service name is appended (L440-442, L463). */
export const SIMPLEPAY_BASE_URLS = {
  sandbox: "https://sandbox.simplepay.hu/payment/v2/",
  live: "https://secure.simplepay.hu/payment/v2/",
} as const

export const SIMPLEPAY_SDK_VERSION = "acropora-commerce-medusa:1"

export type SimplePayConfig = {
  merchant: string
  secretKey: string
  sandbox: boolean
}

export type SimplePayEndpoint = "start" | "query" | "refund" | "transactioncancel"

type Fetcher = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string }
) => Promise<{
  ok: boolean
  status: number
  text: () => Promise<string>
  headers: { get: (name: string) => string | null }
}>

/** A call SimplePay refused, with its error codes (section 3.9, L926-932). */
export class SimplePayError extends Error {
  constructor(
    message: string,
    readonly codes: number[] = []
  ) {
    super(message)
  }
}

/**
 * THE SIMPLEPAY v2 CALL (section 3.1): POST, JSON body, UTF-8, the signature in
 * the "Signature" header. Every request carries a fresh 32-character `salt`
 * (L570-572), our `merchant` and our `sdkVersion`.
 *
 * The answer is verified on its raw bytes before it is believed. An answer
 * with `errorCodes` is a refusal, reported with its codes; it carries no data
 * to trust, so it is not required to be signed.
 */
export class SimplePayClient {
  constructor(
    private readonly config: SimplePayConfig,
    private readonly fetcher: Fetcher = fetch as unknown as Fetcher,
    private readonly salt: () => string = () => randomBytes(16).toString("hex")
  ) {}

  async call<T>(endpoint: SimplePayEndpoint, payload: Record<string, unknown>): Promise<T> {
    const body = JSON.stringify({
      salt: this.salt(),
      merchant: this.config.merchant,
      ...payload,
      sdkVersion: SIMPLEPAY_SDK_VERSION,
    })
    const base = this.config.sandbox ? SIMPLEPAY_BASE_URLS.sandbox : SIMPLEPAY_BASE_URLS.live

    const response = await this.fetcher(base + endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Signature: signSimplePay(body, this.config.secretKey),
      },
      body,
    })
    const text = await response.text()

    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(text)
    } catch {
      throw new SimplePayError(`SimplePay ${endpoint}: not a JSON answer (HTTP ${response.status})`)
    }

    if (Array.isArray(parsed.errorCodes) && parsed.errorCodes.length) {
      throw new SimplePayError(
        `SimplePay ${endpoint} refused: ${parsed.errorCodes.join(", ")}`,
        parsed.errorCodes.map(Number)
      )
    }

    if (!isValidSimplePaySignature(text, response.headers.get("signature"), this.config.secretKey)) {
      throw new SimplePayError(`SimplePay ${endpoint}: the answer's signature does not verify`)
    }

    return parsed as T
  }
}
