import { SHIPPING_PAYMENT_RULE_SEED } from "../../../../workflows/utils/shipping-payment-rules"
import { GET, PUT } from "../route"
import { matrixToRows } from "../rules"
import { AdminPutShippingPaymentRules } from "../validators"

/*
  THE PAYMENT MATRIX'S ADMIN ENDPOINT (card e0e2378b). WHAT TURNS THIS RED: a shipping method left without payment, a
  duplicate, or an impossible pair (cash on delivery with pickup, paying in the shop with a courier) getting through; the
  positions not following the list order; a partial matrix accepted by the schema; the route writing without validating, or
  answering with something other than the stored state.
*/

const SEED = {
  PICKUP: ["ONLINE_CARD", "PAY_AT_STORE", "BANK_TRANSFER"],
  GLS_NORMAL: ["ONLINE_CARD", "COD", "BANK_TRANSFER"],
  GLS_HEAVY: ["ONLINE_CARD", "COD", "BANK_TRANSFER"],
  FOXPOST: ["ONLINE_CARD", "COD", "BANK_TRANSFER"],
} as const
const matrix = (over: Partial<Record<keyof typeof SEED, string[]>> = {}) =>
  ({ ...SEED, ...over }) as unknown as Parameters<typeof matrixToRows>[0]

describe("matrixToRows", () => {
  it("turns today's matrix into exactly the recorded rows, positions from 1 in list order", () => {
    expect(matrixToRows(matrix())).toEqual(SHIPPING_PAYMENT_RULE_SEED)
  })

  it("follows a new order: the position is the place in the list", () => {
    const rows = matrixToRows(matrix({ FOXPOST: ["BANK_TRANSFER", "ONLINE_CARD"] }))
    expect(rows.filter((r) => r.shipping_role === "FOXPOST")).toEqual([
      { shipping_role: "FOXPOST", payment_role: "BANK_TRANSFER", position: 1 },
      { shipping_role: "FOXPOST", payment_role: "ONLINE_CARD", position: 2 },
    ])
  })

  it("refuses a shipping method with no payment method, and one that lists a method twice", () => {
    expect(() => matrixToRows(matrix({ GLS_HEAVY: [] }))).toThrow(/legalább egy fizetési mód/)
    expect(() => matrixToRows(matrix({ FOXPOST: ["COD", "COD"] }))).toThrow(/kétszer/)
  })

  it("refuses the impossible pairs, and only those", () => {
    expect(() => matrixToRows(matrix({ PICKUP: ["ONLINE_CARD", "COD"] }))).toThrow(/Személyes átvételnél nincs utánvét/)
    expect(() => matrixToRows(matrix({ GLS_NORMAL: ["PAY_AT_STORE"] }))).toThrow(/nincs fizetés az üzletben/)
    expect(() => matrixToRows(matrix({ FOXPOST: ["PAY_AT_STORE", "COD"] }))).toThrow(/nincs fizetés az üzletben/)
    // the nearest allowed neighbours go through: pickup with transfer only, a courier with transfer only
    expect(() => matrixToRows(matrix({ PICKUP: ["BANK_TRANSFER"], GLS_HEAVY: ["BANK_TRANSFER"] }))).not.toThrow()
  })
})

describe("the request schema", () => {
  it("takes the whole matrix, and refuses a partial one, an unknown role or an extra key", () => {
    expect(AdminPutShippingPaymentRules.safeParse({ matrix: SEED }).success).toBe(true)
    const { FOXPOST: _left, ...partial } = SEED
    expect(AdminPutShippingPaymentRules.safeParse({ matrix: partial }).success).toBe(false)
    expect(AdminPutShippingPaymentRules.safeParse({ matrix: { ...SEED, FOXPOST: ["VOUCHER"] } }).success).toBe(false)
    expect(AdminPutShippingPaymentRules.safeParse({ matrix: { ...SEED, DPD: ["COD"] } }).success).toBe(false)
    expect(AdminPutShippingPaymentRules.safeParse({ matrix: SEED, extra: 1 }).success).toBe(false)
  })
})

describe("the route", () => {
  const fakeService = (stored: { shipping_role: string; payment_role: string; position: number }[]) => {
    const calls: { take: unknown }[] = []
    const replaced: unknown[] = []
    return {
      calls,
      replaced,
      svc: {
        listShippingPaymentRules: async (_f: unknown, config: { take: unknown }) => {
          calls.push(config)
          return stored
        },
        replaceShippingPaymentRules: async (rows: typeof stored) => {
          replaced.push(rows)
          stored.splice(0, stored.length, ...rows)
        },
      },
    }
  }
  const reqWith = (svc: unknown, body?: unknown) =>
    ({ scope: { resolve: () => svc }, validatedBody: body }) as never
  const resWith = () => {
    const out: { body?: unknown } = {}
    return { out, res: { json: (body: unknown) => (out.body = body) } as never }
  }

  it("GET reads every row (take null) and answers the matrix with the role lists", async () => {
    const f = fakeService([...SHIPPING_PAYMENT_RULE_SEED])
    const { out, res } = resWith()
    await GET(reqWith(f.svc), res)
    expect(f.calls).toEqual([{ take: null }])
    expect((out.body as { matrix: unknown }).matrix).toEqual(SEED)
    expect((out.body as { payment_roles: string[] }).payment_roles).toContain("BANK_TRANSFER")
  })

  it("PUT validates before it writes, and answers what is stored afterwards", async () => {
    const f = fakeService([...SHIPPING_PAYMENT_RULE_SEED])
    await expect(PUT(reqWith(f.svc, { matrix: matrix({ PICKUP: ["COD"] }) }), resWith().res)).rejects.toThrow()
    expect(f.replaced).toHaveLength(0)

    const { out, res } = resWith()
    await PUT(reqWith(f.svc, { matrix: matrix({ FOXPOST: ["BANK_TRANSFER", "ONLINE_CARD"] }) }), res)
    expect(f.replaced).toHaveLength(1)
    expect((out.body as { matrix: Record<string, string[]> }).matrix.FOXPOST).toEqual(["BANK_TRANSFER", "ONLINE_CARD"])
  })
})
