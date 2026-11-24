import { GET } from "../../../api/admin/newsletter-diagnostics/route"
import { NEWSLETTER_MODULE } from "../../../modules/newsletter"
import { WEBSHOP_MAIL_OUTBOX_MODULE } from "../../../modules/webshop-mail-outbox"
import { maskAddress, newsletterDiagnostics } from "../newsletter-diagnostics"

/*
  WHAT TURNS THIS RED (task hirlevel-diagnose-20261124; measured on the test shop 2026-11-24: four sign-ups, no mail, no notification, no
  outbox row, and the OS list empty, which proved nothing): the read filtering the sign-ups, so a row with NO result (`null`, the answer)
  is not shown; a failed read turning into an empty answer; a full address, a token, a token hash or an environment VALUE in the answer;
  the four preconditions not following the environment of the answering process; the outbox rows of other templates mixed in; the
  limit not bounded.
*/
const ON = {
  ACROPORA_NEWSLETTER_CONFIRM_MAIL: "on",
  ACROPORA_WEBSHOP_MAIL: "on",
  GMAIL_WEBSHOP_CLIENT_ID: "secret-id-value",
  GMAIL_WEBSHOP_CLIENT_SECRET: "secret-value",
  GMAIL_WEBSHOP_REFRESH_TOKEN: "secret-refresh",
  ACROPORA_WEBSHOP_MAIL_RENDERER: "os",
  ACROPORA_STOREFRONT_URL: "https://kirakat.example.test",
} as NodeJS.ProcessEnv

const signUp = (over: Record<string, unknown> = {}) => ({
  id: "nlsub_1",
  email: "vevo@example.test",
  name: "Kiss Anna",
  status: "pending",
  created_at: new Date("2026-11-24T18:01:57.000Z"),
  confirmation_sent_at: new Date("2026-11-24T18:01:57.000Z"),
  confirmation_token_hash: "a".repeat(64),
  unsubscribe_token: "u".repeat(43),
  consent_text: "szöveg",
  confirmation_mail_result: null,
  confirmation_mail_result_at: null,
  ...over,
})
const outboxRow = (over: Record<string, unknown> = {}) => ({
  id: "wmout_1",
  template: "newsletter-confirm",
  resource_id: "nlsub_1",
  to: "vevo@example.test",
  facts: { confirm_url: "https://x/megerosites?token=TTT" },
  created_at: new Date("2026-11-24T18:01:58.000Z"),
  sent_at: null,
  attempts: 2,
  failure_kind: "transient",
  last_error: "OS 503",
  next_attempt_at: new Date("2026-11-24T18:09:58.000Z"),
  ...over,
})

const world = (opts: { signUps?: unknown[]; outbox?: unknown[]; fail?: "newsletter" | "outbox" } = {}) => {
  const listSignUps = jest.fn(async () => {
    if (opts.fail === "newsletter") throw new Error("column does not exist")
    return opts.signUps ?? []
  })
  const listOutbox = jest.fn(async (filters: Record<string, unknown>) => {
    if (opts.fail === "outbox") throw new Error("outbox down")
    return (opts.outbox ?? []).filter((row) => (row as { template: string }).template === filters.template)
  })
  const container = {
    resolve: (key: string) => {
      if (key === NEWSLETTER_MODULE) return { listNewsletterSubscribers: listSignUps }
      if (key === WEBSHOP_MAIL_OUTBOX_MODULE) return { listWebshopMailOutboxes: listOutbox }
      throw new Error(`unexpected ${key}`)
    },
  } as never
  return { container, listSignUps, listOutbox }
}

describe("maskAddress", () => {
  it("keeps the first letter and the domain, nothing else", () => {
    expect(maskAddress("vevo@example.test")).toBe("v***@example.test")
    expect(maskAddress("nem-cim")).toBe("***")
  })
})

describe("newsletterDiagnostics", () => {
  it("shows every sign-up, and a row with NO result shows as null (the absence is the answer)", async () => {
    const w = world({ signUps: [signUp(), signUp({ id: "nlsub_2", confirmation_mail_result: "sent", confirmation_mail_result_at: new Date("2026-11-24T18:02:00.000Z") })] })
    const out = await newsletterDiagnostics(w.container, 20, ON)
    expect(out.sign_ups.map((row) => [row.id, row.confirmation_mail_result])).toEqual([
      ["nlsub_1", null],
      ["nlsub_2", "sent"],
    ])
    expect(out.sign_ups[1]!.confirmation_mail_result_at).toBe("2026-11-24T18:02:00.000Z")
    // no filter: it asks for the newest, whatever their state
    expect(w.listSignUps).toHaveBeenCalledWith({}, expect.objectContaining({ take: 20, order: { created_at: "DESC" } }))
  })

  it("lists only the newsletter's rows of the outbox, with what became of them", async () => {
    const w = world({ outbox: [outboxRow(), outboxRow({ id: "wmout_2", template: "order-placed" })] })
    const out = await newsletterDiagnostics(w.container, 20, ON)
    expect(out.outbox).toEqual([
      {
        id: "wmout_1",
        resource_id: "nlsub_1",
        created_at: "2026-11-24T18:01:58.000Z",
        sent_at: null,
        attempts: 2,
        failure_kind: "transient",
        last_error: "OS 503",
        next_attempt_at: "2026-11-24T18:09:58.000Z",
      },
    ])
  })

  it("carries no full address, no token, no token hash and no environment value", async () => {
    const w = world({ signUps: [signUp()], outbox: [outboxRow()] })
    const text = JSON.stringify(await newsletterDiagnostics(w.container, 20, ON))
    for (const secret of ["vevo@example.test", "TTT", "a".repeat(64), "u".repeat(43), "secret-id-value", "secret-value", "secret-refresh", "kirakat.example.test", "Kiss Anna", "szöveg"])
      expect([secret, text.includes(secret)]).toEqual([secret, false])
    expect(text).toContain("v***@example.test")
  })

  it("reports the four preconditions as booleans from the environment of the answering process", async () => {
    const w = world()
    expect((await newsletterDiagnostics(w.container, 20, ON)).preconditions).toEqual({
      switch_on: true,
      mail_on: true,
      renderer_os: true,
      storefront_https_url: true,
    })
    const off = { ...ON, ACROPORA_NEWSLETTER_CONFIRM_MAIL: "", ACROPORA_STOREFRONT_URL: "http://nem-https.test", ACROPORA_WEBSHOP_MAIL_RENDERER: "" } as NodeJS.ProcessEnv
    expect((await newsletterDiagnostics(w.container, 20, off)).preconditions).toEqual({
      switch_on: false,
      mail_on: true,
      renderer_os: false,
      storefront_https_url: false,
    })
    const dark = { ...ON, ACROPORA_WEBSHOP_MAIL: "" } as NodeJS.ProcessEnv
    expect((await newsletterDiagnostics(w.container, 20, dark)).preconditions.mail_on).toBe(false)
  })

  it("a failed read is the answer: it rejects, it does not become an empty list", async () => {
    await expect(newsletterDiagnostics(world({ fail: "newsletter" }).container, 20, ON)).rejects.toThrow("column does not exist")
    await expect(newsletterDiagnostics(world({ fail: "outbox" }).container, 20, ON)).rejects.toThrow("outbox down")
  })
})

describe("GET /admin/newsletter-diagnostics", () => {
  const call = async (query: Record<string, unknown> | undefined) => {
    const w = world({ signUps: [signUp()] })
    const res = { json: jest.fn() }
    await GET({ scope: w.container, query } as never, res as never)
    return { w, res }
  }

  it("answers the diagnostics, 20 rows by default", async () => {
    const { w, res } = await call(undefined)
    expect(w.listSignUps).toHaveBeenCalledWith({}, expect.objectContaining({ take: 20 }))
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ sign_ups: expect.any(Array), preconditions: expect.any(Object) }))
  })

  it("bounds the limit to 1..100 and falls back to 20 for anything else", async () => {
    for (const [asked, taken] of [["5", 5], ["100", 100], ["101", 20], ["0", 20], ["abc", 20], ["2.5", 20]] as const) {
      const { w } = await call({ limit: asked })
      expect([asked, w.listSignUps.mock.calls[0]![1]]).toEqual([asked, expect.objectContaining({ take: taken })])
    }
  })
})
