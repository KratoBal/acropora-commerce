/**
 * THE RAW MESSAGE, AS A PURE FUNCTION, so the safety claims (header injection,
 * encoding) are measurable without a network. Modelled on the OS sender
 * (`acropora-os` `apps/api/src/notifications/mail/mime.ts`), cut down to what
 * a shop notification needs: one recipient, a subject, text and/or HTML. No
 * attachments yet; the first mails (order confirmation, refund) carry none.
 */

export class MailBuildError extends Error {
  constructor(readonly code: string) {
    super(code)
    this.name = "MailBuildError"
  }
}

/** A line break in a header value would open a new header (To:, Bcc:...). */
export const hasHeaderInjection = (value: string): boolean => /[\r\n]/.test(value)

/**
 * A Hungarian subject cannot go raw into a header: RFC 2047 encoded word.
 * Pure ASCII stays as it is.
 */
export const encodeHeaderWord = (value: string): string =>
  // eslint-disable-next-line no-control-regex
  /^[\x20-\x7E]*$/.test(value)
    ? value
    : `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`

/**
 * `"display-name" <addr-spec>` (RFC 5322). Only the NAME is encoded, never the
 * address: an encoded address could not be read as one.
 */
export const formatMailFrom = (name: string, address: string): string => {
  const trimmed = name.trim()
  if (!trimmed) return address
  // eslint-disable-next-line no-control-regex
  const label = /^[\x20-\x7E]*$/.test(trimmed)
    ? `"${trimmed.replace(/(["\\])/g, "\\$1")}"`
    : encodeHeaderWord(trimmed)
  return `${label} <${address}>`
}

/** Gmail's `raw`: base64url, no padding. */
export const base64Url = (value: string): string =>
  Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")

export type OutgoingMail = {
  to: string
  subject: string
  text?: string
  html?: string
}

const part = (contentType: string, body: string) => [
  `Content-Type: ${contentType}; charset="UTF-8"`,
  "Content-Transfer-Encoding: base64",
  "",
  Buffer.from(body, "utf8").toString("base64").replace(/.{76}/g, "$&\r\n"),
]

const boundaryOf = () =>
  `----=_AcroporaShop_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`

/**
 * THIS LAYER THROWS, IT DOES NOT CLEAN. By the time a header reaches it, the
 * intent is unknown; a silently cleaned header would hide that someone passed
 * bad data.
 */
export const buildMimeMessage = (
  mail: OutgoingMail,
  from: string,
  boundary: string = boundaryOf()
): string => {
  for (const [name, value] of [
    ["to", mail.to],
    ["subject", mail.subject],
    ["from", from],
  ] as const) {
    if (hasHeaderInjection(value)) {
      throw new MailBuildError(`MAIL_HEADER_INJECTION_${name.toUpperCase()}`)
    }
  }
  if (!mail.to.trim()) throw new MailBuildError("MAIL_NO_RECIPIENT")
  if (!mail.text && !mail.html) throw new MailBuildError("MAIL_NO_BODY")

  const headers = [
    `From: ${from}`,
    `To: ${mail.to}`,
    `Subject: ${encodeHeaderWord(mail.subject)}`,
    "MIME-Version: 1.0",
  ]

  if (mail.text && mail.html) {
    return [
      ...headers,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      "",
      `--${boundary}`,
      ...part("text/plain", mail.text),
      `--${boundary}`,
      ...part("text/html", mail.html),
      `--${boundary}--`,
      "",
    ].join("\r\n")
  }

  return [
    ...headers,
    ...(mail.html ? part("text/html", mail.html) : part("text/plain", mail.text!)),
    "",
  ].join("\r\n")
}
