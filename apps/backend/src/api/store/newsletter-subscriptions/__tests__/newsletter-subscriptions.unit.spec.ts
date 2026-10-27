import { HOMEPAGE_CONTENT_MODULE } from "../../../../modules/homepage-content"
import { NEWSLETTER_MODULE } from "../../../../modules/newsletter"
import {
  DEFAULT_NEWSLETTER,
  consentVersion,
} from "../../../../modules/newsletter/defaults"
import { AdminPutHomepageContent } from "../../../admin/homepage-content/validators"
import { createNewsletterPost } from "../helpers"
import { createRateLimiter } from "../rate-limit"
import { StorePostNewsletterSubscription } from "../validators"

/*
  THE FOOTER'S NEWSLETTER SIGN-UP (kirakat-lablec-kep, acrobot 36614). What
  turns these red: a sign-up without the ticked consent or with a malformed
  address; the consent text taken from the request instead of the shop's; a
  second sign-up adding a row or answering differently; a row the OS turned
  off still taking sign-ups; the limit not refusing the sixth call from one
  address, or a refused call pushing its own window out.
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
  it("NL-LIMIT: the max-th call passes, the next is refused, a refused retry does not extend the window", () => {
    const limit = createRateLimiter({ max: 2, windowMs: 1000 })
    expect(limit.allow("a", 0)).toBe(true)
    expect(limit.allow("a", 100)).toBe(true)
    expect(limit.allow("a", 200)).toBe(false)
    expect(limit.allow("b", 200)).toBe(true)
    expect(limit.allow("a", 999)).toBe(false)
    // the first hit (t=0) left the window; the refused ones were never counted
    expect(limit.allow("a", 1001)).toBe(true)
  })
})

type Row = Record<string, unknown> & { email: string }

const harness = (newsletter: unknown) => {
  const rows: Row[] = []
  const subscribers = {
    upsertSubscriberByEmail: jest.fn(async (input: Row) => {
      const i = rows.findIndex((r) => r.email === input.email)
      if (i >= 0) rows[i] = { ...rows[i], ...input }
      else rows.push({ ...input })
    }),
  }
  const homepage = {
    retrieveMainHomepageContent: jest.fn(async () =>
      newsletter === undefined ? null : { newsletter }
    ),
  }
  const scope = {
    resolve: (name: string) =>
      name === NEWSLETTER_MODULE
        ? subscribers
        : name === HOMEPAGE_CONTENT_MODULE
          ? homepage
          : undefined,
  }
  const call = async (
    post: ReturnType<typeof createNewsletterPost>,
    over: Record<string, unknown> = {},
    ip = "203.0.113.5"
  ) => {
    const parsed = StorePostNewsletterSubscription.parse(body(over))
    const res = {
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
    }
    await post({ ip, scope, validatedBody: parsed } as never, res as never)
    return res
  }
  return { rows, subscribers, call }
}

const loose = () => ({
  perClient: createRateLimiter({ max: 100, windowMs: 60_000 }),
  overall: createRateLimiter({ max: 100, windowMs: 60_000 }),
})

describe("POST /store/newsletter-subscriptions", () => {
  it("NL-POST: records the shop's consent text and its version; a second sign-up updates, and answers the same", async () => {
    const h = harness(undefined)
    const post = createNewsletterPost(loose())
    const first = await h.call(post)
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
    await h.call(createNewsletterPost(loose()))
    expect(h.rows[0]).toMatchObject({
      consent_text: "Elfogadom a feltételeket.",
      consent_version: consentVersion("Elfogadom a feltételeket."),
    })
    expect(consentVersion("Elfogadom a feltételeket.")).not.toBe(
      consentVersion(DEFAULT_NEWSLETTER.consent_text)
    )
  })

  it("NL-POST-OFF: a row the OS turned off takes no sign-up", async () => {
    const h = harness({ ...DEFAULT_NEWSLETTER, enabled: false })
    await expect(h.call(createNewsletterPost(loose()))).rejects.toThrow(
      "The newsletter sign-up is off"
    )
    expect(h.subscribers.upsertSubscriberByEmail).not.toHaveBeenCalled()
  })

  it("NL-POST-429: the limit refuses before anything is read or written", async () => {
    const h = harness(undefined)
    const post = createNewsletterPost({
      perClient: createRateLimiter({ max: 1, windowMs: 60_000 }),
      overall: createRateLimiter({ max: 100, windowMs: 60_000 }),
    })
    expect((await h.call(post)).statusCode).toBe(200)
    const refused = await h.call(post, { email: "masik@pelda.hu" })
    expect(refused.statusCode).toBe(429)
    expect(h.subscribers.upsertSubscriberByEmail).toHaveBeenCalledTimes(1)
    // another caller is not affected
    expect((await h.call(post, {}, "198.51.100.7")).statusCode).toBe(200)
  })
})
