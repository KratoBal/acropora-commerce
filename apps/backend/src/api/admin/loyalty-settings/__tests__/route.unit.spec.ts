import { GET } from "../route"

/*
  WHAT TURNS THIS RED (card dfb79916): the OS read answering the stored row or the definition's default instead of what the
  checkout uses; a field's source named wrongly (row, env, default); a key missing from `keys`, so the OS writes to a wrong one.
*/
const call = async (rows: { key: string; value: unknown }[] | Error) => {
  const json = jest.fn()
  const status = jest.fn().mockReturnValue({ json })
  const scope = {
    resolve: (key: string) => {
      if (key !== "commerce_settings") throw new Error(`no ${key}`)
      return { listCommerceSettings: async () => (rows instanceof Error ? Promise.reject(rows) : rows) }
    },
  }
  await GET({ scope } as never, { status, json } as never)
  return { status, body: json.mock.calls[0]![0] }
}

describe("GET /admin/loyalty-settings", () => {
  const before = { ...process.env }
  afterEach(() => {
    process.env = { ...before }
  })

  it("answers what the checkout uses, with where each value comes from", async () => {
    delete process.env.LOYALTY_MIN_POINTS
    process.env.LOYALTY_REDEMPTION_ENABLED = "true"
    const { status, body } = await call([{ key: "loyalty_max_percent", value: "40" }])
    expect(status).toHaveBeenCalledWith(200)
    expect(body.settings).toEqual({ enabled: true, value: 1, minOrder: 30_000, minPoints: 100, maxPercent: 40 })
    expect(body.sources).toEqual({ enabled: "env", value: "default", minOrder: "default", minPoints: "default", maxPercent: "row" })
  })

  it("names the commerce-setting key behind each field, with its description", async () => {
    const { body } = await call([])
    expect(Object.keys(body.keys)).toEqual([
      "loyalty_redemption_enabled",
      "loyalty_point_value_huf",
      "loyalty_min_order_huf",
      "loyalty_min_points",
      "loyalty_max_percent",
    ])
    for (const entry of Object.values(body.keys) as { description: string }[]) expect(entry.description.length).toBeGreaterThan(10)
  })

  it("a failing read still answers (the environment and the defaults)", async () => {
    delete process.env.LOYALTY_REDEMPTION_ENABLED
    const { body } = await call(new Error("db down"))
    expect(body.settings.enabled).toBe(false)
    expect(Object.values(body.sources)).toEqual(["default", "default", "default", "default", "default"])
  })
})
