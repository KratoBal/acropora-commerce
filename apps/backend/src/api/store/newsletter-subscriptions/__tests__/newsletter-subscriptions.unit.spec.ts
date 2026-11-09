import { MedusaError } from "@medusajs/framework/utils"

import { HOMEPAGE_CONTENT_MODULE } from "../../../../modules/homepage-content"
import { NEWSLETTER_MODULE } from "../../../../modules/newsletter"
import {
  DEFAULT_CONSENT_TEXT_EN,
  DEFAULT_NEWSLETTER,
  consentVersion,
} from "../../../../modules/newsletter/defaults"
import {
  NEWSLETTER_CONFIRM_COOLDOWN_MS,
  NEWSLETTER_CONFIRM_TTL_MS,
  newsletterTokenHash,
} from "../../../../modules/newsletter/double-opt-in"
import NewsletterModuleService from "../../../../modules/newsletter/service"
import { AdminPutHomepageContent } from "../../../admin/homepage-content/validators"
import { createNewsletterPost, createNewsletterTokenPost } from "../helpers"
import { createRateLimiter } from "../rate-limit"
import { StorePostNewsletterSubscription, StorePostNewsletterToken } from "../validators"

/*
  THE FOOTER'S NEWSLETTER SIGN-UP (kirakat-lablec-kep, acrobot 36614). What
  turns these red: a sign-up without the ticked consent or with a malformed
  address; the consent text taken from the request instead of the shop's; a
  second sign-up adding a row or answering differently; a row the OS turned
  off still taking sign-ups; the limit not refusing the sixth call from one
  address, or a refused call pushing its own window out.

  THE DOUBLE OPT-IN (card d707cf5f): a sign-up that is not pending until its
  link is opened; the token kept in the row instead of its hash; a second
  sign-up leaving the first mail's link working; a sign-up rewriting a
  confirmed row, or answering differently for it; the reply waiting for the
  mail; a link that works twice, after its seven days, or after the address
  left; leaving that needs more than the link, or records a second time.
*/

const body = (over: Record<string, unknown> = {}) => ({
  name: "Teszt Elek",
  email: "Teszt@Pelda.HU ",
  consent: true,
  ...over,
})
const valid = (b: unknown) => StorePostNewsletterSubscription.safeParse(b)

describe("StorePostNewsletterSubscription", () => {
  it("NL-BODY: takes a name, an address and the ticked box; the address trimmed and lowercased", () => {
    const parsed = valid(body())
    expect(parsed.success && parsed.data.email).toBe("teszt@pelda.hu")
    expect(valid(body({ consent: false })).success).toBe(false)
    expect(valid(body({ consent: undefined })).success).toBe(false)
    expect(valid(body({ email: "nem-cim" })).success).toBe(false)
    expect(valid(body({ name: "  " })).success).toBe(false)
    // the consent text is the shop's to record, not the caller's to send
    expect(valid(body({ consent_text: "Saját szöveg" })).success).toBe(false)
  })

  it("NL-BODY-LANG: the form's language is hu or en, optional; anything else is refused", () => {
    expect(valid(body()).success).toBe(true)
    expect(valid(body({ locale: "hu" })).success).toBe(true)
    expect(valid(body({ locale: "en" })).success).toBe(true)
    expect(valid(body({ locale: "de" })).success).toBe(false)
    expect(valid(body({ locale: "en-hu" })).success).toBe(false)
  })
})

describe("AdminPutHomepageContent: the newsletter row", () => {
  const record = (newsletter: unknown) => ({
    texts: {},
    slides: null,
    newsletter,
  })
  const ok = (b: unknown) => AdminPutHomepageContent.safeParse(b).success

  it("NL-HPC: absent, null, or the whole row; the consent text and the button cannot be empty", () => {
    expect(ok({ texts: {}, slides: null })).toBe(true)
    expect(ok(record(null))).toBe(true)
    expect(ok(record({ ...DEFAULT_NEWSLETTER, enabled: false }))).toBe(true)
    expect(ok(record({ ...DEFAULT_NEWSLETTER, consent_text: " " }))).toBe(false)
    expect(ok(record({ ...DEFAULT_NEWSLETTER, button: "" }))).toBe(false)
    expect(ok(record({ ...DEFAULT_NEWSLETTER, extra: 1 }))).toBe(false)
    const { title: _t, ...noTitle } = DEFAULT_NEWSLETTER
    expect(ok(record(noTitle))).toBe(false)
  })
})

describe("createRateLimiter", () => {
  it("NL-LIMIT: the max-th call passes, the next is refused, a refused retry does not extend the window", async () => {
    const limit = createRateLimiter({ max: 2, windowMs: 1000 })
    expect(await limit.allow("a", 0)).toBe(true)
    expect(await limit.allow("a", 100)).toBe(true)
    expect(await limit.allow("a", 200)).toBe(false)
    expect(await limit.allow("b", 200)).toBe(true)
    expect(await limit.allow("a", 999)).toBe(false)
    // the first hit (t=0) left the window; the refused ones were never counted
    expect(await limit.allow("a", 1001)).toBe(true)
  })

  it("NL-LIMIT-KEYS: a flood of invented keys inside one window stays under the key cap (the oldest go first)", async () => {
    const limit = createRateLimiter({ max: 1, windowMs: 1_000_000, sweepAbove: 5, maxKeys: 10 })
    for (let i = 0; i < 200; i++) await limit.allow(`k${i}`, i)
    // the newest keys are still counted: a second try on the latest is refused
    expect(await limit.allow("k199", 300)).toBe(false)
    // the oldest were dropped to bound the memory: they start a fresh allowance
    expect(await limit.allow("k0", 301)).toBe(true)
  })
})

type Row = Record<string, unknown> & { id: string; email: string }

/** The service's own methods over an in-memory table: the rules are the real ones, only the storage is not. */
const fakeService = () => {
  const rows: Row[] = []
  const matches = (row: Row, filters: Record<string, unknown>) =>
    Object.entries(filters).every(([k, v]) => row[k] === v)
  const store = {
    listNewsletterSubscribers: jest.fn(async (filters: Record<string, unknown>) =>
      rows.filter((r) => matches(r, filters)).map((r) => ({ ...r }))
    ),
    createNewsletterSubscribers: jest.fn(async (data: Record<string, unknown>[]) =>
      data.map((d) => {
        const row = { status: "pending", ...d, id: `nlsub_${rows.length + 1}` } as Row
        rows.push(row)
        return { ...row }
      })
    ),
    updateNewsletterSubscribers: jest.fn(async (data: (Record<string, unknown> & { id: string })[]) =>
      data.map((d) => {
        const row = rows.find((r) => r.id === d.id)!
        Object.assign(row, d)
        return { ...row }
      })
    ),
  }
  const proto = NewsletterModuleService.prototype
  const service = Object.assign(store, {
    signUpByEmail: proto.signUpByEmail,
    confirmByToken: proto.confirmByToken,
    unsubscribeByToken: proto.unsubscribeByToken,
  }) as unknown as NewsletterModuleService & typeof store
  return { rows, service }
}

const harness = (newsletter: unknown) => {
  const { rows, service } = fakeService()
  const sendConfirm = jest.fn(async (..._args: unknown[]) => ({ sent: true }))
  const homepage = {
    retrieveMainHomepageContent: jest.fn(async () =>
      newsletter === undefined ? null : { newsletter }
    ),
  }
  const scope = {
    resolve: (name: string) =>
      name === NEWSLETTER_MODULE
        ? service
        : name === HOMEPAGE_CONTENT_MODULE
          ? homepage
          : undefined,
  }
  const reply = () => ({
    statusCode: 0,
    payload: undefined as unknown,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(p: unknown) {
      this.payload = p
      return this
    },
  })
  const call = async (
    post: ReturnType<typeof createNewsletterPost>,
    over: Record<string, unknown> = {},
    ip = "203.0.113.5"
  ) => {
    const parsed = StorePostNewsletterSubscription.parse(body(over))
    const res = reply()
    await post({ ip, scope, validatedBody: parsed } as never, res as never)
    return res
  }
  const callToken = async (post: ReturnType<typeof createNewsletterTokenPost>, token: string) => {
    const res = reply()
    await post({ scope, validatedBody: { token } } as never, res as never)
    return res
  }
  /** The tokens the latest confirmation mail would carry. */
  const lastMail = () => {
    const call = sendConfirm.mock.calls[sendConfirm.mock.calls.length - 1]!
    return call[1] as { id: string; confirmation_token: string; unsubscribe_token: string }
  }
  return { rows, service, subscribers: service, sendConfirm, call, callToken, lastMail }
}

const loose = () => ({
  perAddress: createRateLimiter({ max: 100, windowMs: 60_000 }),
  overall: createRateLimiter({ max: 100, windowMs: 60_000 }),
})

describe("POST /store/newsletter-subscriptions", () => {
  it("NL-POST: records the shop's consent text and its version; a second sign-up (after the cooldown) updates, and answers the same", async () => {
    const h = harness(undefined)
    const post = createNewsletterPost(loose(), h.sendConfirm)
    const first = await h.call(post)
    h.rows[0]!.confirmation_sent_at = new Date(Date.now() - NEWSLETTER_CONFIRM_COOLDOWN_MS - 1)
    const second = await h.call(post, { name: "Teszt Elek Második" })

    expect(first.statusCode).toBe(200)
    expect(second.payload).toEqual(first.payload)
    expect(first.payload).toEqual({ subscribed: true })
    expect(h.rows).toHaveLength(1)
    expect(h.rows[0]).toMatchObject({
      email: "teszt@pelda.hu",
      name: "Teszt Elek Második",
      consent_text: DEFAULT_NEWSLETTER.consent_text,
      consent_version: consentVersion(DEFAULT_NEWSLETTER.consent_text),
      source: "footer",
    })
    expect(h.rows[0]!.consented_at).toBeInstanceOf(Date)
  })

  it("NL-POST-OS: the OS's consent text is what is recorded, under its own version", async () => {
    const os = { ...DEFAULT_NEWSLETTER, consent_text: "Elfogadom a feltételeket." }
    const h = harness(os)
    await h.call(createNewsletterPost(loose(), h.sendConfirm))
    expect(h.rows[0]).toMatchObject({
      consent_text: "Elfogadom a feltételeket.",
      consent_version: consentVersion("Elfogadom a feltételeket."),
    })
    expect(consentVersion("Elfogadom a feltételeket.")).not.toBe(
      consentVersion(DEFAULT_NEWSLETTER.consent_text)
    )
  })

  it("NL-POST-LANG: the English form records the English consent sentence under its own version and language; no language is Hungarian", async () => {
    const h = harness(undefined)
    const post = createNewsletterPost(loose(), h.sendConfirm)
    await h.call(post, { email: "angol@pelda.hu", locale: "en" })
    await h.call(post, { email: "regi@pelda.hu" })
    const [angol, regi] = h.rows
    expect(angol).toMatchObject({
      consent_text: DEFAULT_CONSENT_TEXT_EN,
      consent_version: consentVersion(DEFAULT_CONSENT_TEXT_EN),
      consent_language: "en",
    })
    expect(regi).toMatchObject({
      consent_text: DEFAULT_NEWSLETTER.consent_text,
      consent_version: consentVersion(DEFAULT_NEWSLETTER.consent_text),
      consent_language: "hu",
    })
    expect(angol!.consent_version).not.toBe(regi!.consent_version)
  })

  it("NL-POST-LANG-OS: a consent text written in the OS is recorded as written, whatever the form's language", async () => {
    const os = { ...DEFAULT_NEWSLETTER, consent_text: "Elfogadom a feltételeket." }
    const h = harness(os)
    await h.call(createNewsletterPost(loose(), h.sendConfirm), { locale: "en" })
    expect(h.rows[0]).toMatchObject({
      consent_text: "Elfogadom a feltételeket.",
      consent_language: "en",
    })
  })

  it("NL-POST-LANG-ROW: an OS row that still holds the Hungarian default gets the English sentence on the English form", async () => {
    const h = harness({ ...DEFAULT_NEWSLETTER })
    await h.call(createNewsletterPost(loose(), h.sendConfirm), { locale: "en" })
    expect(h.rows[0]).toMatchObject({ consent_text: DEFAULT_CONSENT_TEXT_EN })
  })

  it("NL-POST-OFF: a row the OS turned off takes no sign-up, as a 403 (FORBIDDEN, not NOT_ALLOWED's 400)", async () => {
    const h = harness({ ...DEFAULT_NEWSLETTER, enabled: false })
    await expect(h.call(createNewsletterPost(loose(), h.sendConfirm))).rejects.toMatchObject({
      type: MedusaError.Types.FORBIDDEN,
      message: "The newsletter sign-up is off",
    })
    expect(h.subscribers.createNewsletterSubscribers).not.toHaveBeenCalled()
    expect(h.sendConfirm).not.toHaveBeenCalled()
  })

  it("NL-POST-429: the per-address limit refuses before anything is read or written; another address is not affected, whatever the caller's IP", async () => {
    const h = harness(undefined)
    const post = createNewsletterPost({
      perAddress: createRateLimiter({ max: 1, windowMs: 60_000 }),
      overall: createRateLimiter({ max: 100, windowMs: 60_000 }),
    }, h.sendConfirm)
    expect((await h.call(post)).statusCode).toBe(200)
    // the same address from another IP: still the same address
    const refused = await h.call(post, {}, "198.51.100.7")
    expect(refused.statusCode).toBe(429)
    expect(h.sendConfirm).toHaveBeenCalledTimes(1)
    // the storefront's one IP for every visitor: another address passes
    expect((await h.call(post, { email: "masik@pelda.hu" })).statusCode).toBe(200)
  })

  it("NL-POST-ALL: the overall cap refuses every address once it is reached", async () => {
    const h = harness(undefined)
    const post = createNewsletterPost({
      perAddress: createRateLimiter({ max: 100, windowMs: 60_000 }),
      overall: createRateLimiter({ max: 2, windowMs: 60_000 }),
    }, h.sendConfirm)
    await h.call(post, { email: "a@pelda.hu" })
    await h.call(post, { email: "b@pelda.hu" })
    expect((await h.call(post, { email: "c@pelda.hu" })).statusCode).toBe(429)
  })
})

describe("the double opt-in (card d707cf5f)", () => {
  const confirm = (h: ReturnType<typeof harness>, token: string, now?: Date) =>
    h.callToken(
      createNewsletterTokenPost((service, t) => service.confirmByToken(t, now)),
      token
    )
  const leave = (h: ReturnType<typeof harness>, token: string, now?: Date) =>
    h.callToken(
      createNewsletterTokenPost((service, t) => service.unsubscribeByToken(t, now)),
      token
    )

  it("NL-PENDING: a sign-up is pending, keeps only the confirmation token's hash, and hands the mail both tokens", async () => {
    const h = harness(undefined)
    await h.call(createNewsletterPost(loose(), h.sendConfirm))
    const mail = h.lastMail()
    expect(h.rows[0]).toMatchObject({
      status: "pending",
      confirmation_token_hash: newsletterTokenHash(mail.confirmation_token),
      unsubscribe_token: mail.unsubscribe_token,
    })
    expect(h.rows[0]!.confirmation_sent_at).toBeInstanceOf(Date)
    expect(Object.values(h.rows[0]!)).not.toContain(mail.confirmation_token)
    expect(mail.confirmation_token).toMatch(/^[A-Za-z0-9_-]{43}$/)
    // the mail goes to the address signed up, with the name typed and the form's language
    expect(h.sendConfirm.mock.calls[0]![1]).toMatchObject({ id: h.rows[0]!.id, name: "Teszt Elek", language: "hu" })
    expect(h.sendConfirm.mock.calls[0]![2]).toBe("teszt@pelda.hu")
  })

  it("NL-COOLDOWN: inside thirty minutes a second sign-up for a pending address answers the same, mails nothing and keeps the link", async () => {
    const h = harness(undefined)
    const post = createNewsletterPost(loose(), h.sendConfirm)
    const first = await h.call(post)
    const hash = h.rows[0]!.confirmation_token_hash
    const again = await h.call(post, { name: "Valaki Más" })
    expect(again.statusCode).toBe(first.statusCode)
    expect(again.payload).toEqual(first.payload)
    expect(h.sendConfirm).toHaveBeenCalledTimes(1)
    expect(h.rows[0]).toMatchObject({ confirmation_token_hash: hash, name: "Teszt Elek" })
    expect((await confirm(h, h.lastMail().confirmation_token)).payload).toEqual({ result: "confirmed" })
  })

  it("NL-AGAIN: after the cooldown, signing up again mails a new link and the old one stops working; the leaving token stays", async () => {
    const h = harness(undefined)
    const post = createNewsletterPost(loose(), h.sendConfirm)
    await h.call(post)
    const first = h.lastMail()
    // the last mail left a millisecond more than thirty minutes ago
    h.rows[0]!.confirmation_sent_at = new Date(Date.now() - NEWSLETTER_CONFIRM_COOLDOWN_MS - 1)
    await h.call(post)
    expect(h.sendConfirm).toHaveBeenCalledTimes(2)
    const second = h.lastMail()
    expect(second.confirmation_token).not.toBe(first.confirmation_token)
    expect(second.unsubscribe_token).toBe(first.unsubscribe_token)
    expect((await confirm(h, first.confirmation_token)).payload).toEqual({ result: "invalid" })
    expect((await confirm(h, second.confirmation_token)).payload).toEqual({ result: "confirmed" })
  })

  it("NL-CONFIRMED: a confirmed address is not rewritten and gets no mail, and the answer is the same", async () => {
    const h = harness(undefined)
    const post = createNewsletterPost(loose(), h.sendConfirm)
    const fresh = await h.call(post)
    await confirm(h, h.lastMail().confirmation_token)
    const before = { ...h.rows[0] }
    const again = await h.call(post, { name: "Valaki Más" })
    expect(again.statusCode).toBe(fresh.statusCode)
    expect(again.payload).toEqual(fresh.payload)
    expect(h.sendConfirm).toHaveBeenCalledTimes(1)
    expect(h.rows[0]).toEqual(before)
  })

  it("NL-NOWAIT: the reply does not wait for the mail", async () => {
    const h = harness(undefined)
    h.sendConfirm.mockImplementation(() => new Promise(() => undefined))
    const res = await h.call(createNewsletterPost(loose(), h.sendConfirm))
    expect(res.statusCode).toBe(200)
    expect(h.sendConfirm).toHaveBeenCalledTimes(1)
  })

  it("NL-CONFIRM: the link confirms once; a second use and an unknown token are the same invalid", async () => {
    const h = harness(undefined)
    await h.call(createNewsletterPost(loose(), h.sendConfirm))
    const { confirmation_token } = h.lastMail()
    const at = new Date()
    expect((await confirm(h, confirmation_token, at)).payload).toEqual({ result: "confirmed" })
    expect(h.rows[0]).toMatchObject({ status: "confirmed", confirmed_at: at, confirmation_token_hash: null })
    expect((await confirm(h, confirmation_token)).payload).toEqual({ result: "invalid" })
    expect((await confirm(h, "x".repeat(43))).payload).toEqual({ result: "invalid" })
  })

  it("NL-EXPIRED: the link works for seven days to the millisecond, then answers expired and confirms nothing", async () => {
    const h = harness(undefined)
    await h.call(createNewsletterPost(loose(), h.sendConfirm))
    const sent = h.rows[0]!.confirmation_sent_at as Date
    const token = h.lastMail().confirmation_token
    const late = new Date(sent.getTime() + NEWSLETTER_CONFIRM_TTL_MS + 1)
    expect((await confirm(h, token, late)).payload).toEqual({ result: "expired" })
    expect(h.rows[0]!.status).toBe("pending")
    const last = new Date(sent.getTime() + NEWSLETTER_CONFIRM_TTL_MS)
    expect((await confirm(h, token, last)).payload).toEqual({ result: "confirmed" })
    expect(NEWSLETTER_CONFIRM_TTL_MS).toBe(7 * 24 * 60 * 60 * 1000)
  })

  it("NL-LEAVE: the leaving link needs nothing else, works once or twice the same, and records the first time", async () => {
    const h = harness(undefined)
    await h.call(createNewsletterPost(loose(), h.sendConfirm))
    const { confirmation_token, unsubscribe_token } = h.lastMail()
    await confirm(h, confirmation_token)
    const first = new Date("2026-11-09T10:00:00.000Z")
    expect((await leave(h, unsubscribe_token, first)).payload).toEqual({ result: "unsubscribed" })
    expect(h.rows[0]).toMatchObject({ status: "unsubscribed", unsubscribed_at: first })
    expect((await leave(h, unsubscribe_token, new Date())).payload).toEqual({ result: "unsubscribed" })
    expect(h.rows[0]!.unsubscribed_at).toEqual(first)
    expect((await leave(h, "x".repeat(43))).payload).toEqual({ result: "invalid" })
  })

  it("NL-LEAVE-PENDING: leaving before confirming kills the confirmation link, so it cannot put the address back", async () => {
    const h = harness(undefined)
    await h.call(createNewsletterPost(loose(), h.sendConfirm))
    const { confirmation_token, unsubscribe_token } = h.lastMail()
    await leave(h, unsubscribe_token)
    expect((await confirm(h, confirmation_token)).payload).toEqual({ result: "invalid" })
    expect(h.rows[0]!.status).toBe("unsubscribed")
  })

  it("NL-RETURN: an address that left can sign up again: pending, a new link, the same leaving token", async () => {
    const h = harness(undefined)
    const post = createNewsletterPost(loose(), h.sendConfirm)
    await h.call(post)
    const first = h.lastMail()
    await leave(h, first.unsubscribe_token)
    await h.call(post)
    expect(h.rows[0]!.status).toBe("pending")
    expect(h.lastMail().unsubscribe_token).toBe(first.unsubscribe_token)
    expect((await confirm(h, h.lastMail().confirmation_token)).payload).toEqual({ result: "confirmed" })
  })

  it("NL-NO-SHARED-CAP: a flood of junk tokens locks nobody out: a real link still confirms and leaves after it", async () => {
    const h = harness(undefined)
    await h.call(createNewsletterPost(loose(), h.sendConfirm))
    const { confirmation_token, unsubscribe_token } = h.lastMail()
    for (let i = 0; i < 250; i++) {
      expect((await confirm(h, `${i}`.padStart(43, "x"))).statusCode).toBe(200)
      expect((await leave(h, `${i}`.padStart(43, "y"))).statusCode).toBe(200)
    }
    expect((await confirm(h, confirmation_token)).payload).toEqual({ result: "confirmed" })
    expect((await leave(h, unsubscribe_token)).payload).toEqual({ result: "unsubscribed" })
  })
})

describe("StorePostNewsletterToken", () => {
  it("NL-TOKEN-BODY: exactly a token's 43 base64url characters, and nothing else in the body", () => {
    const ok = (b: unknown) => StorePostNewsletterToken.safeParse(b).success
    expect(ok({ token: "A".repeat(42) + "_" })).toBe(true)
    expect(ok({ token: "A".repeat(42) })).toBe(false)
    expect(ok({ token: "A".repeat(44) })).toBe(false)
    expect(ok({ token: "A".repeat(42) + "." })).toBe(false)
    expect(ok({ token: "A".repeat(43), email: "a@b.hu" })).toBe(false)
    expect(ok({})).toBe(false)
  })
})
