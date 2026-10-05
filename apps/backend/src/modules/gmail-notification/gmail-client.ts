/**
 * THE ONE FILE THAT KNOWS ABOUT GMAIL. The notification provider sees `send`.
 *
 * The authentication is the OS's, not a new one (`acropora-os`
 * `gmail-mail.sender.ts`, in use for ticket@ and info@): a refresh token is
 * exchanged for an access token at Google's token endpoint, cached until a
 * minute before it expires, and the message goes to
 * `POST {api}/users/me/messages/send` with `{ raw }` (base64url RFC 822).
 * Google's references: OAuth 2.0 for web server apps, "Refreshing an access
 * token"; Gmail API v1, `users.messages.send`.
 */

const REQUEST_TIMEOUT_MS = 15_000

export const DEFAULT_GMAIL_API_URL = "https://gmail.googleapis.com/gmail/v1"
export const DEFAULT_TOKEN_URL = "https://oauth2.googleapis.com/token"

export type GmailClientConfig = {
  clientId: string
  clientSecret: string
  refreshToken: string
  apiUrl: string
  tokenUrl: string
}

/**
 * THE CODE NAMES WHAT WE KNOW ABOUT THE MAIL, not only that it failed:
 *
 *   the request never left                   WEBSHOP_MAIL_TOKEN_FAILED / _TOKEN_INVALID
 *   it left, and Gmail answered "no"         WEBSHOP_MAIL_SEND_FAILED_<status>
 *   it left, and no answer came              WEBSHOP_MAIL_SEND_INDETERMINATE
 *
 * The third is not "failed": Gmail may have taken the mail. A retry there can
 * send it twice, and whoever retries must know that.
 */
export class WebshopMailError extends Error {
  // The real reason (timeout or a cut connection) is kept here; the backend's
  // TypeScript target has no `Error(message, { cause })`.
  readonly cause?: unknown

  constructor(
    readonly code: string,
    options?: { cause?: unknown }
  ) {
    super(code)
    this.name = "WebshopMailError"
    this.cause = options?.cause
  }
}

export class GmailClient {
  private accessToken: { value: string; expiresAt: number } | null = null

  constructor(
    private readonly config: GmailClientConfig,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly now: () => number = Date.now
  ) {}

  /** Sends one raw (base64url) message; the answer is Gmail's message id. */
  async send(raw: string): Promise<{ id?: string }> {
    const token = await this.token()

    let response: Response
    try {
      response = await this.request(`${this.config.apiUrl}/users/me/messages/send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw }),
      })
    } catch (cause) {
      throw new WebshopMailError("WEBSHOP_MAIL_SEND_INDETERMINATE", { cause })
    }

    // The body is not passed on: a Google error can quote the recipient.
    if (!response.ok) {
      throw new WebshopMailError(`WEBSHOP_MAIL_SEND_FAILED_${response.status}`)
    }

    const body = (await response.json().catch(() => ({}))) as { id?: string }
    return { id: body.id }
  }

  private async token(): Promise<string> {
    if (this.accessToken && this.accessToken.expiresAt > this.now() + 60_000) {
      return this.accessToken.value
    }
    let response: Response
    try {
      response = await this.request(this.config.tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          refresh_token: this.config.refreshToken,
          grant_type: "refresh_token",
        }),
      })
    } catch (cause) {
      // The token request failing means the send never started.
      throw new WebshopMailError("WEBSHOP_MAIL_TOKEN_FAILED", { cause })
    }
    if (!response.ok) throw new WebshopMailError("WEBSHOP_MAIL_TOKEN_FAILED")
    const body = (await response.json().catch(() => ({}))) as {
      access_token?: string
      expires_in?: number
    }
    if (!body.access_token) throw new WebshopMailError("WEBSHOP_MAIL_TOKEN_INVALID")
    this.accessToken = {
      value: body.access_token,
      expiresAt: this.now() + Math.max(60, body.expires_in ?? 3600) * 1000,
    }
    return body.access_token
  }

  private async request(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    try {
      return await this.fetchImpl(url, { ...init, signal: controller.signal })
    } finally {
      clearTimeout(timer)
    }
  }
}
