import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

import { consentVersion } from "../../../../modules/newsletter/defaults"
import {
  NEWSLETTER_CONFIRM_COOLDOWN_MS,
  NEWSLETTER_CONFIRM_TTL_MS,
  newsletterTokenHash,
} from "../../../../modules/newsletter/double-opt-in"
import { LIVESTOCK_ARRIVAL_MODULE } from "../../../../modules/livestock-arrival"
import { STOCK_ALERT_MODULE } from "../../../../modules/stock-alert"
import StockAlertModuleService from "../../../../modules/stock-alert/service"
import { STOCK_ALERT_CONSENT } from "../../../../modules/stock-alert/subject"
import { createRateLimiter } from "../../newsletter-subscriptions/rate-limit"
import { createStockAlertPost, createStockAlertTokenPost } from "../helpers"
import { StorePostStockAlert, StorePostStockAlertToken } from "../validators"

/*
  "SZÓLJ, HA JÖN HASONLÓ" (V2.4, card 0c1265d2), the newsletter's double opt-in. What turns these red: a sign-up
  taken with the switch off; a species or a consent text taken from the request; a species read from anything but
  the product's own title; an unpublished product signed up for; a second sign-up for the same species adding a row,
  or one for another species overwriting the first; an answer that differs for an address already on the list (and
  korall's "már feliratkoztál" sentence would be exactly that); the reply waiting for the mail; a link that works
  twice, after its seven days, or after leaving; leaving that needs the switch; the cooldown counted per row, so one
  address signed up for every species gets a mail for each (barracuda, #701 review).
*/

const PRODUCTS = [
  { id: "prod_sold", title: "Acropora abrolhosensis ULTRA", status: "published" },
  { id: "prod_other", title: "Acropora tenuis kék", status: "published" },
  { id: "prod_draft", title: "Acropora loripes", status: "draft" },
  { id: "prod_nospecies", title: "Red Sea Reef Foundation A", status: "published" },
]

const body = (over: Record<string, unknown> = {}) => ({
  product_id: "prod_sold",
  email: "Teszt@Pelda.HU ",
  consent: true,
  ...over,
})
const valid = (b: unknown) => StorePostStockAlert.safeParse(b)

describe("StorePostStockAlert", () => {
  it("SA-BODY: a product, an address and the ticked box; species by default; the address trimmed and lowercased", () => {
    const parsed = valid(body())
    expect(parsed.success && parsed.data).toEqual({ product_id: "prod_sold", kind: "species", email: "teszt@pelda.hu", consent: true })
    expect(valid(body({ kind: "product" })).success).toBe(true)
    expect(valid(body({ kind: "category" })).success).toBe(false)
    expect(valid(body({ consent: false })).success).toBe(false)
    expect(valid(body({ consent: undefined })).success).toBe(false)
    expect(valid(body({ email: "nem-cim" })).success).toBe(false)
    expect(valid(body({ product_id: " " })).success).toBe(false)
    // neither the species nor the consent text is the caller's to send
    expect(valid(body({ subject_key: "acropora tenuis" })).success).toBe(false)
    expect(valid(body({ consent_text: "Saját szöveg" })).success).toBe(false)
    // the form's language: hu or en, optional
    expect(valid(body({ locale: "en" })).success).toBe(true)
    expect(valid(body({ locale: "de" })).success).toBe(false)
    expect(valid(body({ locale: "en-hu" })).success).toBe(false)
  })

  it("SA-BODY-ARRIVAL: from the arrivals page an arrival_id instead of a product, exactly one of the two, and only for its species", () => {
    expect(valid(body({ product_id: undefined, arrival_id: "lvarr_species" })).success).toBe(true)
    expect(valid(body({ arrival_id: "lvarr_species" })).success).toBe(false)
    expect(valid(body({ product_id: undefined })).success).toBe(false)
    expect(valid(body({ product_id: undefined, arrival_id: "lvarr_species", kind: "product" })).success).toBe(false)
  })

  it("SA-BODY-TOKEN: a link's token is the 43 characters a token has", () => {
    expect(StorePostStockAlertToken.safeParse({ token: "a".repeat(43) }).success).toBe(true)
    expect(StorePostStockAlertToken.safeParse({ token: "a".repeat(42) }).success).toBe(false)
    expect(StorePostStockAlertToken.safeParse({ token: `${"a".repeat(42)}.` }).success).toBe(false)
  })
})

type Row = Record<string, unknown> & { id: string }

/** The service's own methods over an in-memory table: the rules are the real ones, only the storage is not. */
const fakeService = () => {
  const rows: Row[] = []
  const matches = (row: Row, filters: Record<string, unknown>) => Object.entries(filters).every(([k, v]) => row[k] === v)
  const store = {
    listStockAlertSubscriptions: jest.fn(async (filters: Record<string, unknown>) =>
      rows.filter((r) => matches(r, filters)).map((r) => ({ ...r }))
    ),
    createStockAlertSubscriptions: jest.fn(async (data: Record<string, unknown>[]) =>
      data.map((d) => {
        const row = { status: "pending", ...d, id: `stkal_${rows.length + 1}` } as Row
        rows.push(row)
        return { ...row }
      })
    ),
    updateStockAlertSubscriptions: jest.fn(async (data: Row[]) =>
      data.map((d) => {
        const row = rows.find((r) => r.id === d.id)!
        Object.assign(row, d)
        return { ...row }
      })
    ),
  }
  const proto = StockAlertModuleService.prototype
  const service = Object.assign(store, {
    signUp: proto.signUp,
    confirmByToken: proto.confirmByToken,
    unsubscribeByToken: proto.unsubscribeByToken,
  }) as unknown as StockAlertModuleService & typeof store
  return { rows, service }
}

const ON = { ACROPORA_STOCK_ALERT: "on" } as NodeJS.ProcessEnv

/** Every row's confirmation as if mailed before the cooldown: the next sign-up may mail again. */
const cooled = (rows: Row[]) => {
  for (const row of rows) row.confirmation_sent_at = new Date(Date.now() - NEWSLETTER_CONFIRM_COOLDOWN_MS - 1)
}

const harness = () => {
  const { rows, service } = fakeService()
  const sendConfirm = jest.fn(async (..._args: unknown[]) => ({ sent: true }))
  const query = {
    graph: jest.fn(async ({ filters }: { filters: { id: string; status: string } }) => ({
      data: PRODUCTS.filter((p) => p.id === filters.id && p.status === filters.status).map(({ id, title }) => ({ id, title })),
    })),
  }
  // the "Érkező állatok" page's rows (V2.6 S4a): a species, a group, and a bound piece
  const ARRIVALS = [
    { id: "lvarr_species", label: "Amphiprion ocellaris", medusa_product_id: null },
    { id: "lvarr_group", label: "Zoanthus", medusa_product_id: null },
  ]
  const arrivals = {
    listLivestockArrivals: jest.fn(async (filters: { id: string }) => ARRIVALS.filter((a) => a.id === filters.id)),
  }
  const scope = {
    resolve: (name: string) =>
      name === STOCK_ALERT_MODULE
        ? service
        : name === LIVESTOCK_ARRIVAL_MODULE
          ? arrivals
          : name === ContainerRegistrationKeys.QUERY
            ? query
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
  const call = async (post: ReturnType<typeof createStockAlertPost>, over: Record<string, unknown> = {}) => {
    const res = reply()
    await post({ scope, validatedBody: StorePostStockAlert.parse(body(over)) } as never, res as never)
    return res
  }
  const callToken = async (post: ReturnType<typeof createStockAlertTokenPost>, token: string) => {
    const res = reply()
    await post({ scope, validatedBody: { token } } as never, res as never)
    return res
  }
  const lastMail = () =>
    sendConfirm.mock.calls[sendConfirm.mock.calls.length - 1]![1] as {
      id: string
      subject_label: string
      confirmation_token: string
      unsubscribe_token: string
    }
  return { rows, service, query, sendConfirm, call, callToken, lastMail }
}

const loose = () => ({
  perAddress: createRateLimiter({ max: 100, windowMs: 60_000 }),
  overall: createRateLimiter({ max: 100, windowMs: 60_000 }),
})

describe("POST /store/stock-alerts", () => {
  it("SA-POST-ARRIVAL: an arrival's sign-up waits for the species of the ROW's name, with no source product; a group or a missing row is refused", async () => {
    const h = harness()
    const res = await h.call(createStockAlertPost(loose(), h.sendConfirm, ON), { product_id: undefined, arrival_id: "lvarr_species" })
    expect(res.statusCode).toBe(200)
    expect(h.rows).toHaveLength(1)
    expect(h.rows[0]).toMatchObject({
      subject_kind: "species",
      subject_key: "amphiprion ocellaris",
      subject_label: "Amphiprion ocellaris",
      source_product_id: null,
      source: "arrival",
    })
    expect(h.query.graph).not.toHaveBeenCalled()
    await expect(
      h.call(createStockAlertPost(loose(), h.sendConfirm, ON), { product_id: undefined, arrival_id: "lvarr_group" })
    ).rejects.toMatchObject({ type: "invalid_data" })
    await expect(
      h.call(createStockAlertPost(loose(), h.sendConfirm, ON), { product_id: undefined, arrival_id: "lvarr_nincs" })
    ).rejects.toMatchObject({ type: "not_found" })
    expect(h.rows).toHaveLength(1)
  })

  it("SA-POST: the species from the product's title, the shop's consent sentence and its version, pending; the mail gets the subject", async () => {
    const h = harness()
    const res = await h.call(createStockAlertPost(loose(), h.sendConfirm, ON))
    expect(res.statusCode).toBe(200)
    expect(res.payload).toEqual({ subscribed: true })
    expect(h.rows).toHaveLength(1)
    expect(h.rows[0]).toMatchObject({
      email: "teszt@pelda.hu",
      subject_kind: "species",
      subject_key: "acropora abrolhosensis",
      subject_label: "Acropora abrolhosensis",
      source_product_id: "prod_sold",
      consent_text: STOCK_ALERT_CONSENT.hu.species,
      consent_version: consentVersion(STOCK_ALERT_CONSENT.hu.species),
      consent_language: "hu",
      source: "sold_piece",
      status: "pending",
    })
    expect(h.rows[0]!.consented_at).toBeInstanceOf(Date)
    expect(h.sendConfirm).toHaveBeenCalledTimes(1)
    expect(h.sendConfirm.mock.calls[0]![2]).toBe("teszt@pelda.hu")
    expect(h.lastMail().subject_label).toBe("Acropora abrolhosensis")
    // only a published product is looked up
    expect(h.query.graph.mock.calls[0]![0]).toMatchObject({ entity: "product", filters: { id: "prod_sold", status: "published" } })
  })

  it("SA-POST-PRODUCT: kind product waits for the product itself, under the product sentence", async () => {
    const h = harness()
    await h.call(createStockAlertPost(loose(), h.sendConfirm, ON), { kind: "product", product_id: "prod_nospecies" })
    expect(h.rows[0]).toMatchObject({
      subject_kind: "product",
      subject_key: "prod_nospecies",
      subject_label: "Red Sea Reef Foundation A",
      consent_text: STOCK_ALERT_CONSENT.hu.product,
      consent_version: consentVersion(STOCK_ALERT_CONSENT.hu.product),
    })
  })

  it("SA-POST-LANG: the English form records the English sentence under its own version and language, and the mail gets the language", async () => {
    const h = harness()
    await h.call(createStockAlertPost(loose(), h.sendConfirm, ON), { locale: "en" })
    expect(h.rows[0]).toMatchObject({
      consent_text: STOCK_ALERT_CONSENT.en.species,
      consent_version: consentVersion(STOCK_ALERT_CONSENT.en.species),
      consent_language: "en",
    })
    expect(consentVersion(STOCK_ALERT_CONSENT.en.species)).not.toBe(consentVersion(STOCK_ALERT_CONSENT.hu.species))
    expect((h.lastMail() as unknown as { language: string }).language).toBe("en")
  })

  it("SA-POST-ROWS: the same species again (after the cooldown) updates its row and answers the same; another species is another row", async () => {
    const h = harness()
    const post = createStockAlertPost(loose(), h.sendConfirm, ON)
    const first = await h.call(post)
    cooled(h.rows)
    const again = await h.call(post)
    cooled(h.rows)
    await h.call(post, { product_id: "prod_other" })
    expect(again.payload).toEqual(first.payload)
    expect(h.rows.map((r) => r.subject_key)).toEqual(["acropora abrolhosensis", "acropora tenuis"])
    expect(h.sendConfirm).toHaveBeenCalledTimes(3)
  })

  it("SA-POST-SAME: an address already confirmed, or pending inside the cooldown, gets the same answer, no new token and no mail", async () => {
    const h = harness()
    const post = createStockAlertPost(loose(), h.sendConfirm, ON)
    await h.call(post)
    const hash = h.rows[0]!.confirmation_token_hash
    const cooling = await h.call(post)
    expect(cooling.payload).toEqual({ subscribed: true })
    expect(h.rows[0]!.confirmation_token_hash).toBe(hash)
    h.rows[0]!.status = "confirmed"
    h.rows[0]!.confirmation_sent_at = new Date(0)
    const confirmed = await h.call(post)
    expect(confirmed.payload).toEqual({ subscribed: true })
    expect(h.rows[0]!.status).toBe("confirmed")
    expect(h.sendConfirm).toHaveBeenCalledTimes(1)
  })

  it("SA-POST-TOLD: a confirmed row already told of an arrival is a new wait: pending, a new link, the arrival forgotten", async () => {
    const h = harness()
    const post = createStockAlertPost(loose(), h.sendConfirm, ON)
    await h.call(post)
    const leave = h.rows[0]!.unsubscribe_token
    Object.assign(h.rows[0]!, {
      status: "confirmed",
      confirmation_sent_at: new Date(0),
      confirmation_token_hash: null,
      known_available: ["prod_seen"],
      notified_at: new Date("2026-11-09T18:00:00.000Z"),
      notified_product_id: "prod_new",
    })
    const again = await h.call(post)
    expect(again.payload).toEqual({ subscribed: true })
    expect(h.sendConfirm).toHaveBeenCalledTimes(2)
    expect(h.rows).toHaveLength(1)
    expect(h.rows[0]).toMatchObject({
      status: "pending",
      unsubscribe_token: leave,
      known_available: null,
      notified_at: null,
      notified_product_id: null,
    })
    expect(h.rows[0]!.confirmation_token_hash).toEqual(expect.any(String))
  })

  it("SA-COOL-ADDRESS: inside the cooldown a second species from the same address makes no row and no mail, and answers the same (barracuda, #701)", async () => {
    const h = harness()
    const post = createStockAlertPost(loose(), h.sendConfirm, ON)
    const first = await h.call(post)
    const second = await h.call(post, { product_id: "prod_other" })
    expect(second.payload).toEqual(first.payload)
    expect(h.sendConfirm).toHaveBeenCalledTimes(1)
    expect(h.rows.map((r) => r.subject_key)).toEqual(["acropora abrolhosensis"])
    // another address is not held by this one's cooldown
    await h.call(post, { email: "masik@pelda.hu", product_id: "prod_other" })
    expect(h.sendConfirm).toHaveBeenCalledTimes(2)
    // a confirmed row's recent mail holds the address too: the cooldown counts mails, not states
    h.rows[0]!.status = "confirmed"
    await h.call(post, { product_id: "prod_other" })
    expect(h.sendConfirm).toHaveBeenCalledTimes(2)
    // after the cooldown the second species gets its row and its mail
    cooled(h.rows)
    await h.call(post, { product_id: "prod_other" })
    expect(h.sendConfirm).toHaveBeenCalledTimes(3)
    expect(h.rows.filter((r) => r.email === "teszt@pelda.hu").map((r) => r.subject_key)).toEqual([
      "acropora abrolhosensis",
      "acropora tenuis",
    ])
  })

  it("SA-POST-OFF: with the switch off nothing is read, written or sent (403, FORBIDDEN)", async () => {
    for (const env of [{}, { ACROPORA_STOCK_ALERT: "yes" }, { ACROPORA_NEWSLETTER_CONFIRM_MAIL: "on" }]) {
      const h = harness()
      await expect(h.call(createStockAlertPost(loose(), h.sendConfirm, env as NodeJS.ProcessEnv))).rejects.toMatchObject({
        type: MedusaError.Types.FORBIDDEN,
        message: "The stock alert sign-up is off",
      })
      expect(h.query.graph).not.toHaveBeenCalled()
      expect(h.service.createStockAlertSubscriptions).not.toHaveBeenCalled()
      expect(h.sendConfirm).not.toHaveBeenCalled()
    }
  })

  it("SA-POST-PRODUCT-GONE: an unpublished or unknown product is a 404, a title with no species a 400; nothing written", async () => {
    const h = harness()
    const post = createStockAlertPost(loose(), h.sendConfirm, ON)
    for (const product_id of ["prod_draft", "prod_nope"])
      await expect(h.call(post, { product_id })).rejects.toMatchObject({ type: MedusaError.Types.NOT_FOUND })
    await expect(h.call(post, { product_id: "prod_nospecies" })).rejects.toMatchObject({
      type: MedusaError.Types.INVALID_DATA,
      message: "This product names no species",
    })
    expect(h.rows).toHaveLength(0)
    expect(h.sendConfirm).not.toHaveBeenCalled()
  })

  it("SA-POST-429: the per-address limit refuses before anything is read; another address passes; the overall cap refuses all", async () => {
    const h = harness()
    const post = createStockAlertPost(
      {
        perAddress: createRateLimiter({ max: 1, windowMs: 60_000 }),
        overall: createRateLimiter({ max: 2, windowMs: 60_000 }),
      },
      h.sendConfirm,
      ON
    )
    expect((await h.call(post)).statusCode).toBe(200)
    expect((await h.call(post, { product_id: "prod_other" })).statusCode).toBe(429)
    expect(h.query.graph).toHaveBeenCalledTimes(1)
    expect((await h.call(post, { email: "masik@pelda.hu" })).statusCode).toBe(200)
    expect((await h.call(post, { email: "harmadik@pelda.hu" })).statusCode).toBe(429)
  })

  it("SA-POST-NOWAIT: the reply does not wait for the mail, and a mail that throws does not fail the sign-up", async () => {
    const h = harness()
    let release: () => void = () => undefined
    const slow = jest.fn(() => new Promise<unknown>((resolve) => (release = () => resolve({ sent: true }))))
    const res = await h.call(createStockAlertPost(loose(), slow, ON))
    expect(res.statusCode).toBe(200)
    release()
    const failing = jest.fn(async () => {
      throw new Error("down")
    })
    expect((await h.call(createStockAlertPost(loose(), failing, ON), { email: "b@pelda.hu" })).statusCode).toBe(200)
  })
})

describe("the stock alert's double opt-in", () => {
  const confirm = (h: ReturnType<typeof harness>, token: string, now?: Date) =>
    h.callToken(createStockAlertTokenPost((service, t) => service.confirmByToken(t, now)), token)
  const leave = (h: ReturnType<typeof harness>, token: string, now?: Date) =>
    h.callToken(createStockAlertTokenPost((service, t) => service.unsubscribeByToken(t, now)), token)

  it("SA-PENDING: the row keeps only the confirmation token's hash; the mail gets both tokens", async () => {
    const h = harness()
    await h.call(createStockAlertPost(loose(), h.sendConfirm, ON))
    const mail = h.lastMail()
    expect(h.rows[0]).toMatchObject({
      confirmation_token_hash: newsletterTokenHash(mail.confirmation_token),
      unsubscribe_token: mail.unsubscribe_token,
    })
    expect(Object.values(h.rows[0]!)).not.toContain(mail.confirmation_token)
  })

  it("SA-CONFIRM: the link confirms once; a used, an unknown and a stale link do not", async () => {
    const h = harness()
    const post = createStockAlertPost(loose(), h.sendConfirm, ON)
    await h.call(post)
    const token = h.lastMail().confirmation_token
    expect((await confirm(h, token)).payload).toEqual({ result: "confirmed" })
    expect(h.rows[0]).toMatchObject({ status: "confirmed", confirmation_token_hash: null })
    expect(h.rows[0]!.confirmed_at).toBeInstanceOf(Date)
    expect((await confirm(h, token)).payload).toEqual({ result: "invalid" })
    expect((await confirm(h, "z".repeat(43))).payload).toEqual({ result: "invalid" })

    cooled(h.rows)
    await h.call(post, { product_id: "prod_other" })
    const late = new Date(Date.now() + NEWSLETTER_CONFIRM_TTL_MS + 60_000)
    expect((await confirm(h, h.lastMail().confirmation_token, late)).payload).toEqual({ result: "expired" })
    expect(h.rows[1]!.status).toBe("pending")
  })

  it("SA-RESIGN: a new sign-up after the cooldown makes the old link dead and keeps the leaving link", async () => {
    const h = harness()
    const post = createStockAlertPost(loose(), h.sendConfirm, ON)
    await h.call(post)
    const first = h.lastMail()
    cooled(h.rows)
    await h.call(post)
    const second = h.lastMail()
    expect(second.unsubscribe_token).toBe(first.unsubscribe_token)
    expect((await confirm(h, first.confirmation_token)).payload).toEqual({ result: "invalid" })
    expect((await confirm(h, second.confirmation_token)).payload).toEqual({ result: "confirmed" })
  })

  it("SA-LEAVE: one link, recorded once, and an old confirmation link cannot bring the row back; works with the switch off", async () => {
    const h = harness()
    await h.call(createStockAlertPost(loose(), h.sendConfirm, ON))
    const mail = h.lastMail()
    const at = new Date("2026-11-09T18:00:00.000Z")
    // the token routes never look at the switch: the harness's process env has none
    expect((await leave(h, mail.unsubscribe_token, at)).payload).toEqual({ result: "unsubscribed" })
    expect((await leave(h, mail.unsubscribe_token, new Date())).payload).toEqual({ result: "unsubscribed" })
    expect(h.rows[0]).toMatchObject({ status: "unsubscribed", unsubscribed_at: at, confirmation_token_hash: null })
    expect((await confirm(h, mail.confirmation_token)).payload).toEqual({ result: "invalid" })
    expect((await leave(h, "z".repeat(43))).payload).toEqual({ result: "invalid" })
  })
})
