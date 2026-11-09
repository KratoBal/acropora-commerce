import type { ArrivalCandidate } from "../../../modules/stock-alert/arrival"
import { type ArrivalOperations, type WaitingRow, buyableProducts, runStockAlertArrivals } from "../stock-alert-arrivals"

/*
  WHAT TURNS THIS RED ("Szólj, ha jön hasonló", V2.4, card 0c1265d2). A row marked told when its mail failed (it would
  never be told), or not marked when the mail was sent or queued (it would be told every ten minutes); the seen set not
  written on the first sweep; a subject read once per row instead of once per sweep; one unreadable subject stopping
  the others; a "buyable" that is not the storefront's rule (a stock-managed variant with no stock counted, a
  backorderable or unmanaged one not counted); a product of another sales channel, or a title whose binomial is
  another species, counted.
*/
const SIGNED_UP = new Date("2026-11-09T12:00:00.000Z")
const NOW = new Date("2026-11-09T19:00:00.000Z")
const waiting = (id: string, over: Partial<WaitingRow> = {}): WaitingRow => ({
  id,
  email: `${id}@pelda.hu`,
  subject_kind: "species",
  subject_key: "acropora tenuis",
  subject_label: "Acropora tenuis",
  source_product_id: "prod_sold",
  consent_language: "hu",
  consented_at: SIGNED_UP,
  confirmed_at: SIGNED_UP,
  unsubscribe_token: "u".repeat(43),
  known_available: null,
  ...over,
})
const piece = (id: string, created_at: Date | string): ArrivalCandidate => ({ id, title: id, handle: id, created_at })

const ops = (rows: WaitingRow[], buyable: Record<string, ArrivalCandidate[] | Error>, sent: Record<string, unknown> = {}) => {
  const saved: [string, Record<string, unknown>][] = []
  const told: [string, string][] = []
  const warnings: string[] = []
  const reads: string[] = []
  const o: ArrivalOperations = {
    waiting: async () => rows,
    buyable: async (kind, key) => {
      reads.push(`${kind}:${key}`)
      const found = buyable[key]
      if (found instanceof Error) throw found
      return found ?? []
    },
    save: async (id, changes) => void saved.push([id, changes]),
    notify: async (row, product) => {
      told.push([row.id, product.id])
      return (sent[row.id] as never) ?? { sent: true }
    },
    warn: (m) => void warnings.push(m),
    now: () => NOW,
  }
  return { o, saved, told, warnings, reads }
}

describe("runStockAlertArrivals", () => {
  it("SA-SWEEP: an arrival is told once and marked; a row with none keeps its seen set; the subject is read once", async () => {
    const h = ops([waiting("a"), waiting("b", { known_available: ["prod_old"] })], {
      "acropora tenuis": [piece("prod_old", "2026-11-01T00:00:00.000Z")],
    })
    // "a" took prod_old as seen at its first sweep; "b" saw it too: nobody is told
    expect(await runStockAlertArrivals(h.o)).toEqual({ rows: 2, told: 0, failed: 0 })
    expect(h.told).toEqual([])
    expect(h.saved).toEqual([["a", { known_available: ["prod_old"] }]])
    expect(h.reads).toEqual(["species:acropora tenuis"])
  })

  it("SA-SWEEP-TELL: a new piece is told and the row marked with the time and the product", async () => {
    const h = ops([waiting("a")], { "acropora tenuis": [piece("prod_new", "2026-11-09T18:00:00.000Z")] })
    expect(await runStockAlertArrivals(h.o)).toEqual({ rows: 1, told: 1, failed: 0 })
    expect(h.told).toEqual([["a", "prod_new"]])
    expect(h.saved).toEqual([["a", { known_available: [], notified_at: NOW, notified_product_id: "prod_new" }]])
  })

  it("SA-SWEEP-QUEUED: a queued mail counts as handed over; a failed one leaves the row waiting for the next sweep", async () => {
    const h = ops(
      [waiting("q"), waiting("f")],
      { "acropora tenuis": [piece("prod_new", "2026-11-09T18:00:00.000Z")] },
      { q: { sent: false, reason: "queued" }, f: { sent: false, reason: "failed" } }
    )
    expect(await runStockAlertArrivals(h.o)).toEqual({ rows: 2, told: 1, failed: 1 })
    expect(h.saved.map(([id, c]) => [id, "notified_at" in c])).toEqual([
      ["q", true],
      ["f", false],
    ])
    // the failed row's seen set is written (its first sweep), the arrival is not in it
    expect(h.saved[1]).toEqual(["f", { known_available: [] }])
  })

  it("SA-SWEEP-BROKEN: an unreadable subject is skipped with a log line; the others go on", async () => {
    const h = ops([waiting("x", { subject_key: "acropora bad" }), waiting("a")], {
      "acropora bad": new TypeError("boom"),
      "acropora tenuis": [piece("prod_new", "2026-11-09T18:00:00.000Z")],
    })
    expect(await runStockAlertArrivals(h.o)).toEqual({ rows: 2, told: 1, failed: 0 })
    expect(h.warnings).toHaveLength(1)
    expect(h.warnings[0]).toContain("acropora bad")
    expect(h.saved.map(([id]) => id)).toEqual(["a"])
  })

  it("SA-SWEEP-INCOMPLETE: a row without its leaving token or confirmation time is not touched", async () => {
    const h = ops([waiting("a", { unsubscribe_token: null }), waiting("b", { confirmed_at: null })], {
      "acropora tenuis": [piece("prod_new", "2026-11-09T18:00:00.000Z")],
    })
    await runStockAlertArrivals(h.o)
    expect([h.told, h.saved, h.reads]).toEqual([[], [], []])
  })
})

describe("buyableProducts", () => {
  const variant = (id: string, over: Record<string, unknown> = {}) => ({
    id,
    manage_inventory: true,
    allow_backorder: false,
    ...over,
  })
  const product = (id: string, title: string, variants: unknown[], channel = "sc_shop") => ({
    id,
    title,
    handle: `h-${id}`,
    created_at: "2026-11-09T18:00:00.000Z",
    sales_channels: [{ id: channel }],
    variants,
  })
  const fakeQuery = (products: unknown[]) => {
    const calls: { entity: string; filters?: unknown }[] = []
    const query = {
      graph: async (args: { entity: string; filters?: unknown; pagination?: { skip: number } }) => {
        calls.push({ entity: args.entity, filters: args.filters })
        if (args.entity === "store") return { data: [{ default_sales_channel_id: "sc_shop" }] }
        return { data: (args.pagination?.skip ?? 0) === 0 ? products : [] }
      },
    }
    return { query: query as never, calls }
  }

  it("SA-BUY: the storefront's rule: stock in the channel, a backorder, or no stock kept; the shop's channel and the exact species only", async () => {
    const { query, calls } = fakeQuery([
      product("in", "Acropora tenuis kék", [variant("v_in")]),
      product("empty", "Acropora tenuis zöld", [variant("v_empty")]),
      product("backorder", "Acropora tenuis sárga", [variant("v_bo", { allow_backorder: true })]),
      product("unmanaged", "  Acropora  tenuis", [variant("v_un", { manage_inventory: false })]),
      product("pos", "Acropora tenuis piros", [variant("v_pos")], "sc_pos"),
      product("other", "Acropora tenuisx", [variant("v_other")]),
      product("later", "Frag Acropora tenuis", [variant("v_later")]),
    ])
    const asked: string[][] = []
    const result = await buyableProducts(query, "species", "acropora tenuis", async (ids, channel) => {
      asked.push([channel, ...ids])
      return { v_in: 2, v_empty: 0, v_pos: 5, v_other: 5, v_later: 5 }
    })
    expect(result.map((p) => p.id)).toEqual(["in", "backorder", "unmanaged"])
    // only the counted variants of the kept products are asked about, in the shop's channel
    expect(asked).toEqual([["sc_shop", "v_in", "v_empty"]])
    expect(calls.find((c) => c.entity === "product")?.filters).toEqual({
      status: "published",
      title: { $ilike: "%acropora%tenuis%" },
    })
    expect(result[0]).toEqual({ id: "in", title: "Acropora tenuis kék", handle: "h-in", created_at: "2026-11-09T18:00:00.000Z" })
  })

  it("SA-BUY-PRODUCT: a product sign-up reads its product by id; an unknown kind reads nothing", async () => {
    const { query, calls } = fakeQuery([product("prod_x", "KZ Amino", [variant("v_x")])])
    expect((await buyableProducts(query, "product", "prod_x", async () => ({ v_x: 1 }))).map((p) => p.id)).toEqual([
      "prod_x",
    ])
    expect(calls.find((c) => c.entity === "product")?.filters).toEqual({ status: "published", id: "prod_x" })
    expect(await buyableProducts(fakeQuery([]).query, "genus", "acropora", async () => ({}))).toEqual([])
  })
})
