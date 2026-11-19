import { Migration20261118220000 } from "../../../modules/commerce-settings/migrations/Migration20261118220000"

const ROWS_INSERTED_HERE = Migration20261118220000.ROWS_INSERTED_HERE
import { SHIPPING_OPTION_ROLES } from "../shipping-eligibility"
import {
  SHIPPING_PAYMENT_RULE_READ_LIMIT,
  SHIPPING_PAYMENT_RULE_SEED,
  loadShippingRolePayments,
  toShippingRolePayments,
  type ShippingPaymentRuleRow,
} from "../shipping-payment-rules"

describe("the starting matrix (card e0e2378b: the table took over from the code matrix)", () => {
  it("the migration inserted exactly the recorded rows", () => {
    expect([...ROWS_INSERTED_HERE]).toEqual(SHIPPING_PAYMENT_RULE_SEED)
  })

  it("reproduces the matrix the checkout used before the switch, so the switch changes no behaviour", () => {
    // the code matrix as it stood on main 6a26eb38, written out: the table must start from the same answer
    expect(toShippingRolePayments(SHIPPING_PAYMENT_RULE_SEED)).toEqual({
      PICKUP: ["ONLINE_CARD", "PAY_AT_STORE", "BANK_TRANSFER"],
      GLS_NORMAL: ["ONLINE_CARD", "COD", "BANK_TRANSFER"],
      GLS_HEAVY: ["ONLINE_CARD", "COD", "BANK_TRANSFER"],
      FOXPOST: ["ONLINE_CARD", "COD", "BANK_TRANSFER"],
    })
  })

  it("the migration writes only into an empty table: every recorded pair, guarded by NOT EXISTS on the live rows", async () => {
    const sql: string[] = []
    const migration = Object.create(Migration20261118220000.prototype) as Migration20261118220000
    ;(migration as unknown as { addSql: (text: string) => void }).addSql = (text) => sql.push(text)
    await migration.up()
    expect(sql).toHaveLength(1)
    for (const row of ROWS_INSERTED_HERE) {
      expect(sql[0]).toContain(`('${row.shipping_role}', '${row.payment_role}', ${row.position})`)
    }
    expect(sql[0]).toContain(
      'where not exists (select 1 from "shipping_payment_rule" where "deleted_at" is null)'
    )
  })

  it("covers every shipping role", () => {
    const seeded = new Set(
      SHIPPING_PAYMENT_RULE_SEED.map((row) => row.shipping_role),
    )

    for (const role of SHIPPING_OPTION_ROLES) {
      expect(seeded.has(role)).toBe(true)
    }
  })
})

describe("reading the matrix from the table", () => {
  it("asks for more rows than the matrix can hold: the default page of 15 would drop the sixteenth pair", async () => {
    const calls: { take: number }[] = []
    const result = await loadShippingRolePayments({
      listShippingPaymentRules: async (_filters, config) => {
        calls.push(config)
        return [
          { shipping_role: "FOXPOST", payment_role: "COD", position: 2 },
          { shipping_role: "FOXPOST", payment_role: "ONLINE_CARD", position: 1 },
        ]
      },
    })
    expect(calls).toEqual([{ take: SHIPPING_PAYMENT_RULE_READ_LIMIT }])
    expect(SHIPPING_PAYMENT_RULE_READ_LIMIT).toBeGreaterThanOrEqual(16)
    expect(result.FOXPOST).toEqual(["ONLINE_CARD", "COD"])
    expect(result.PICKUP).toEqual([])
  })
})

describe("turning stored rows into the eligibility map", () => {
  it("orders each list by position, not by the order rows arrive in", () => {
    const rows: ShippingPaymentRuleRow[] = [
      { shipping_role: "GLS_NORMAL", payment_role: "COD", position: 2 },
      { shipping_role: "GLS_NORMAL", payment_role: "ONLINE_CARD", position: 1 },
    ]

    expect(toShippingRolePayments(rows).GLS_NORMAL).toEqual([
      "ONLINE_CARD",
      "COD",
    ])

    const reversed: ShippingPaymentRuleRow[] = [
      { shipping_role: "GLS_NORMAL", payment_role: "COD", position: 1 },
      { shipping_role: "GLS_NORMAL", payment_role: "ONLINE_CARD", position: 2 },
    ]

    expect(toShippingRolePayments(reversed).GLS_NORMAL).toEqual([
      "COD",
      "ONLINE_CARD",
    ])
  })

  it("gives every shipping role a list, so an unconfigured one is empty and not undefined", () => {
    const result = toShippingRolePayments([])

    expect(result.PICKUP).toEqual([])
    expect(result.GLS_NORMAL).toEqual([])
    expect(result.GLS_HEAVY).toEqual([])
    expect(result.FOXPOST).toEqual([])
  })

  it("skips an unknown role instead of throwing, and keeps the rest of the list", () => {
    const rows: ShippingPaymentRuleRow[] = [
      { shipping_role: "GLS_NORMAL", payment_role: "ONLINE_CARD", position: 1 },
      {
        shipping_role: "GLS_NORMAL",
        payment_role: "VOUCHER",
        position: 2,
      },
      { shipping_role: "GLS_EXPRESS", payment_role: "COD", position: 1 },
    ]

    const result = toShippingRolePayments(rows)

    expect(result.GLS_NORMAL).toEqual(["ONLINE_CARD"])
    expect(Object.keys(result).sort()).toEqual(
      ["FOXPOST", "GLS_HEAVY", "GLS_NORMAL", "PICKUP"].sort(),
    )
  })

  it("does not list the same payment method twice for one shipping method", () => {
    const rows: ShippingPaymentRuleRow[] = [
      { shipping_role: "PICKUP", payment_role: "ONLINE_CARD", position: 1 },
      { shipping_role: "PICKUP", payment_role: "ONLINE_CARD", position: 2 },
    ]

    expect(toShippingRolePayments(rows).PICKUP).toEqual(["ONLINE_CARD"])
  })
})
