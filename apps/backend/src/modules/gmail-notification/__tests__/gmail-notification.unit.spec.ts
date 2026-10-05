import { GmailClient, WebshopMailError } from "../gmail-client"
import { MailBuildError, buildMimeMessage, formatMailFrom } from "../mime"
import GmailNotificationService from "../service"
import {
  webshopMailModules,
  webshopMailProviders,
  webshopMailState,
} from "../../../workflows/utils/webshop-mail-config"

/**
 * THE SHOP'S MAIL CHANNEL, A SKELETON (acrobot 26254/26255).
 *
 * What must fail: the channel existing while the switch is off, or switched
 * on without keys; the sender anything but "Acropora tengeri akvarisztika"
 * <webshop@acropora.hu>; a caller's own `from` getting through; a line break
 * in a header passing; a Hungarian subject raw in the header; a mail with no
 * written content sent; an unanswered send reported as a plain failure.
 */
const KEYS = {
  ACROPORA_WEBSHOP_MAIL: "on",
  GMAIL_WEBSHOP_CLIENT_ID: "client",
  GMAIL_WEBSHOP_CLIENT_SECRET: "secret",
  GMAIL_WEBSHOP_REFRESH_TOKEN: "refresh",
}

const decode = (raw: string) =>
  Buffer.from(raw.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")

const fakeFetch = (send: () => Promise<Response> | Response) => {
  const calls: { url: string; init: RequestInit }[] = []
  const impl = (async (url: string, init: RequestInit) => {
    calls.push({ url, init })
    if (url.endsWith("/token")) {
      return new Response(JSON.stringify({ access_token: "at_1", expires_in: 3600 }), { status: 200 })
    }
    return send()
  }) as unknown as typeof fetch
  return { impl, calls }
}

describe("the switch", () => {
  it("off by default: no provider, no notification module entry", () => {
    expect(webshopMailState({})).toBe("off")
    expect(webshopMailProviders({})).toEqual([])
    expect(webshopMailModules({})).toEqual([])
    // the keys alone do not switch it on
    const { ACROPORA_WEBSHOP_MAIL: _, ...keysOnly } = KEYS
    expect(webshopMailModules(keysOnly)).toEqual([])
    expect(webshopMailModules({ ...KEYS, ACROPORA_WEBSHOP_MAIL: "true" })).toEqual([])
  })

  it("on without keys is named, and still absent", () => {
    const env = { ACROPORA_WEBSHOP_MAIL: "on", GMAIL_WEBSHOP_CLIENT_ID: "client" }
    expect(webshopMailState(env)).toBe("on_without_keys")
    expect(webshopMailModules(env)).toEqual([])
  })

  it("on with keys: the email channel, sender webshop@ with the shop's name", () => {
    expect(webshopMailState(KEYS)).toBe("on")
    const [entry] = webshopMailModules(KEYS)
    expect(entry.resolve).toBe("@medusajs/medusa/notification")
    const provider = entry.options.providers.find((p) => p.id === "gmail")!
    expect(provider.resolve).toBe("./src/modules/gmail-notification")
    expect(provider.options).toMatchObject({
      user: "webshop@acropora.hu",
      userName: "Acropora tengeri akvarisztika",
      channels: ["email"],
    })
  })
})

describe("the raw message", () => {
  const mail = { to: "vevo@example.test", subject: "Rendelésed visszaigazolása", text: "Köszönjük!" }

  it("names the sender, encodes the Hungarian subject, keeps the body UTF-8", () => {
    const from = formatMailFrom("Acropora tengeri akvarisztika", "webshop@acropora.hu")
    expect(from).toBe('"Acropora tengeri akvarisztika" <webshop@acropora.hu>')
    const raw = buildMimeMessage(mail, from)
    expect(raw).toContain('From: "Acropora tengeri akvarisztika" <webshop@acropora.hu>')
    expect(raw).toContain(`Subject: =?UTF-8?B?${Buffer.from(mail.subject).toString("base64")}?=`)
    expect(raw).not.toContain("Rendelésed")
    const body = raw.split("\r\n\r\n")[1].replace(/\r\n/g, "")
    expect(Buffer.from(body, "base64").toString("utf8")).toBe("Köszönjük!")
  })

  it("text and html together: multipart/alternative", () => {
    const raw = buildMimeMessage({ ...mail, html: "<p>Köszönjük!</p>" }, "a@b.c", "HATAR")
    expect(raw).toContain('multipart/alternative; boundary="HATAR"')
    expect(raw).toContain("text/plain")
    expect(raw).toContain("text/html")
    expect(raw.trimEnd().endsWith("--HATAR--")).toBe(true)
  })

  // MI PIROSÍT: egy sortörés a fejlécben új fejlécet (Bcc:) nyitna
  it("a line break in any header throws, it is not cleaned", () => {
    for (const [over, from, code] of [
      [{ to: "vevo@example.test\r\nBcc: x@y.z" }, "a@b.c", "MAIL_HEADER_INJECTION_TO"],
      [{ subject: "Szia\nBcc: x@y.z" }, "a@b.c", "MAIL_HEADER_INJECTION_SUBJECT"],
      [{}, "a@b.c\r\nBcc: x@y.z", "MAIL_HEADER_INJECTION_FROM"],
    ] as const) {
      expect(() => buildMimeMessage({ ...mail, ...over }, from)).toThrow(new MailBuildError(code))
    }
  })

  it("no recipient or no body throws", () => {
    expect(() => buildMimeMessage({ ...mail, to: " " }, "a@b.c")).toThrow("MAIL_NO_RECIPIENT")
    expect(() => buildMimeMessage({ to: "x@y.z", subject: "s" }, "a@b.c")).toThrow("MAIL_NO_BODY")
  })
})

describe("the Gmail client", () => {
  const config = {
    clientId: "client",
    clientSecret: "secret",
    refreshToken: "refresh",
    apiUrl: "https://gmail.test/gmail/v1",
    tokenUrl: "https://oauth.test/token",
  }

  it("exchanges the refresh token once, then sends { raw } with the bearer token", async () => {
    const { impl, calls } = fakeFetch(() => new Response(JSON.stringify({ id: "msg_1" }), { status: 200 }))
    const client = new GmailClient(config, impl)
    expect(await client.send("UkFX")).toEqual({ id: "msg_1" })
    await client.send("UkFX")
    expect(calls.map((c) => c.url)).toEqual([
      "https://oauth.test/token",
      "https://gmail.test/gmail/v1/users/me/messages/send",
      "https://gmail.test/gmail/v1/users/me/messages/send",
    ])
    expect(String(calls[0].init.body)).toContain("grant_type=refresh_token")
    expect((calls[1].init.headers as Record<string, string>).Authorization).toBe("Bearer at_1")
    expect(JSON.parse(String(calls[1].init.body))).toEqual({ raw: "UkFX" })
  })

  it("a refusal names its status; no answer is INDETERMINATE, not failed", async () => {
    const refused = new GmailClient(config, fakeFetch(() => new Response("{}", { status: 403 })).impl)
    await expect(refused.send("x")).rejects.toThrow(new WebshopMailError("WEBSHOP_MAIL_SEND_FAILED_403"))
    const silent = new GmailClient(
      config,
      fakeFetch(() => {
        throw new Error("socket hang up")
      }).impl
    )
    await expect(silent.send("x")).rejects.toThrow("WEBSHOP_MAIL_SEND_INDETERMINATE")
  })

  it("a failed token exchange stops before the send", async () => {
    const calls: string[] = []
    const impl = (async (url: string) => {
      calls.push(url)
      return new Response("{}", { status: 400 })
    }) as unknown as typeof fetch
    await expect(new GmailClient(config, impl).send("x")).rejects.toThrow("WEBSHOP_MAIL_TOKEN_FAILED")
    expect(calls).toEqual(["https://oauth.test/token"])
  })
})

describe("the notification provider", () => {
  const options = webshopMailProviders(KEYS)[0].options

  it("sends the written content as our sender, whatever `from` the notification names", async () => {
    const { impl, calls } = fakeFetch(() => new Response(JSON.stringify({ id: "msg_2" }), { status: 200 }))
    const service = new GmailNotificationService({ fetch: impl }, options)
    const result = await service.send({
      to: "vevo@example.test",
      from: "valaki@masik.test",
      channel: "email",
      template: "order-placed",
      content: { subject: "Rendelésed", text: "Köszönjük!" },
    })
    expect(result).toEqual({ id: "msg_2" })
    const raw = decode(JSON.parse(String(calls[1].init.body)).raw)
    expect(raw).toContain('From: "Acropora tengeri akvarisztika" <webshop@acropora.hu>')
    expect(raw).not.toContain("masik.test")
    expect(raw).toContain("To: vevo@example.test")
  })

  it("no written subject or body: refused, nothing is sent", async () => {
    const { impl, calls } = fakeFetch(() => new Response("{}", { status: 200 }))
    const service = new GmailNotificationService({ fetch: impl }, options)
    for (const content of [undefined, { subject: "Tárgy" }, { text: "Szöveg" }]) {
      await expect(
        service.send({ to: "vevo@example.test", channel: "email", template: "order-placed", content })
      ).rejects.toThrow("no written subject and body")
    }
    expect(calls).toEqual([])
  })

  it("refuses to start without its keys", () => {
    expect(() => GmailNotificationService.validateOptions({ ...options, refreshToken: "" })).toThrow(
      "refreshToken"
    )
    expect(() => GmailNotificationService.validateOptions(options)).not.toThrow()
  })
})
