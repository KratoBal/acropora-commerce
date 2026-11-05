import { createHmac } from "node:crypto"

/**
 * THE GUEST'S INVOICE LINK (V1.1; the OS side is `integrations/webshop-invoice`). The shop does not hold invoices: the OS does.
 * After the shop has identified the guest (the order number and the e-mail address, as the order page does), it asks the OS for
 * download links for THAT order, with a request signed by a secret only the two servers share. The OS answers one link per
 * issued customer invoice (HMAC token, one invoice, 14 minutes, single use) or an empty list.
 *
 * THE SIGNATURE (the same as the OS's `signLinkRequest`): key = HMAC-SHA256(secret, "webshop-invoice/link-v1"); signature =
 * base64url(HMAC-SHA256(key, "link-v1|<order id>|<unix seconds>")). The request carries the order id and the time, nothing else.
 *
 * WHAT THE GUEST NEVER GETS FROM HERE: the secret, the order id (the route answers links only), or any text of the OS's error.
 * Both configuration values empty or wrong: the feature is OFF (`null` config), never "open".
 */
export const INVOICE_SECRET_ENV = "WEBSHOP_INVOICE_SECRET"
export const INVOICE_URL_ENV = "ACROPORA_OS_INVOICE_URL"
export const SECRET_MIN_LENGTH = 32
const DOWNLOAD_SEGMENT = "download/"
const LINK_SEGMENT = "/link"
const DOCUMENT_TYPES = ["INVOICE", "ADVANCE_INVOICE", "FINAL_INVOICE", "CORRECTION"] as const

export type InvoiceLinkConfig = { secret: string; url: string }

export type GuestInvoiceDocument = {
  invoice_number: string | null
  document_type: (typeof DOCUMENT_TYPES)[number]
  issue_date: string | null
  url: string
}

export type InvoiceLinkOutcome = { kind: "ok"; documents: GuestInvoiceDocument[] } | { kind: "unavailable" }

export const invoiceLinkConfig = (env: Record<string, string | undefined> = process.env): InvoiceLinkConfig | null => {
  const secret = env[INVOICE_SECRET_ENV]?.trim()
  const url = env[INVOICE_URL_ENV]?.trim()
  if (!secret || secret.length < SECRET_MIN_LENGTH || !url) return null
  try {
    const parsed = new URL(url)
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? { secret, url: parsed.toString() } : null
  } catch {
    return null
  }
}

export const signLinkRequest = (secret: string, orderId: string, ts: number): string => {
  const key = createHmac("sha256", secret).update("webshop-invoice/link-v1").digest()
  return createHmac("sha256", key).update(`link-v1|${orderId}|${ts}`).digest("base64url")
}

/**
 * Where a download link of THIS OS must start: the origin of the link endpoint the shop is configured with, and the same path
 * prefix with `/download/` in place of `/link` (barracuda, #671 review: a link to another host with the right path would
 * otherwise pass). The OS gives its public API address for the links and the shop calls the same host, so the two origins agree.
 */
const downloadPrefixOf = (linkUrl: string): { origin: string; path: string } | null => {
  try {
    const url = new URL(linkUrl)
    const base = url.pathname.endsWith(LINK_SEGMENT) ? url.pathname.slice(0, -LINK_SEGMENT.length) : url.pathname
    return { origin: url.origin, path: `${base.replace(/\/+$/, "")}/${DOWNLOAD_SEGMENT}` }
  } catch {
    return null
  }
}

/** A document the OS gave, kept only if it is exactly the shape the page draws and its link is a download link of this OS. */
const documentOf = (value: unknown, allowed: { origin: string; path: string }): GuestInvoiceDocument | null => {
  if (typeof value !== "object" || value === null) return null
  const row = value as Record<string, unknown>
  if (typeof row.url !== "string" || !(DOCUMENT_TYPES as readonly unknown[]).includes(row.document_type)) return null
  try {
    const url = new URL(row.url)
    if (url.origin !== allowed.origin || !url.pathname.startsWith(allowed.path)) return null
  } catch {
    return null
  }
  return {
    invoice_number: typeof row.invoice_number === "string" ? row.invoice_number : null,
    document_type: row.document_type as GuestInvoiceDocument["document_type"],
    issue_date: typeof row.issue_date === "string" ? row.issue_date : null,
    url: row.url,
  }
}

export type InvoiceLinkDeps = {
  fetcher?: typeof fetch
  now?: () => number
  timeoutMs?: number
}

/** Asks the OS for the order's invoice links. Any failure (not configured, network, a non-200, a bad body) is `unavailable`. */
export const requestInvoiceLinks = async (
  orderId: string,
  config: InvoiceLinkConfig | null,
  deps: InvoiceLinkDeps = {},
): Promise<InvoiceLinkOutcome> => {
  if (!config) return { kind: "unavailable" }
  const ts = Math.floor((deps.now ?? Date.now)() / 1000)
  try {
    const response = await (deps.fetcher ?? fetch)(config.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ order_id: orderId, ts, sig: signLinkRequest(config.secret, orderId, ts) }),
      signal: AbortSignal.timeout(deps.timeoutMs ?? 8000),
    })
    if (response.status !== 200) return { kind: "unavailable" }
    const body = (await response.json()) as { documents?: unknown }
    if (!Array.isArray(body?.documents)) return { kind: "unavailable" }
    const allowed = downloadPrefixOf(config.url)
    if (!allowed) return { kind: "unavailable" }
    // A SILENT MISCONFIGURATION MADE VISIBLE (barracuda, #672 review): if the OS gives its links on another origin than the one the
    // shop calls (an internal address against the public one), EVERY answer is refused and the guest only reads "not available".
    // One log line with the two origins, never the token or the path, shows the setting is wrong.
    for (const row of body.documents) {
      const link = (row as { url?: unknown } | null)?.url
      if (typeof link !== "string") continue
      try {
        const linkOrigin = new URL(link).origin
        if (linkOrigin !== allowed.origin)
          console.warn(
            `Guest invoice: the OS gave a link on ${linkOrigin} but the link endpoint is on ${allowed.origin}; the answer is refused. Set ACROPORA_OS_INVOICE_URL and the OS's WEBSHOP_INVOICE_PUBLIC_BASE_URL to the same origin.`,
          )
      } catch {
        // an unparsable link is refused below, without a word about its content
      }
    }
    const documents = body.documents.map((document) => documentOf(document, allowed))
    // one malformed row is a malformed answer: the shop does not hand out a half-trusted list
    return documents.every((document) => document !== null)
      ? { kind: "ok", documents: documents as GuestInvoiceDocument[] }
      : { kind: "unavailable" }
  } catch {
    return { kind: "unavailable" }
  }
}
