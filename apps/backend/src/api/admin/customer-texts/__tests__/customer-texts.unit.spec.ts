import {
  CUSTOMER_TEXT_CATALOG,
  CUSTOMER_TEXT_GROUPS,
  customerTextRefusal,
  slotsOf,
} from "../../../../modules/customer-texts/catalog"
import { GET as storeGet } from "../../../store/customer-texts/route"
import { GET as adminGet, POST as adminPost } from "../route"
import { AdminPostCustomerText } from "../validators"

/*
  THE CUSTOMER TEXTS (card 7bfca4eb). What turns these red: a key outside the catalog written; a text that drops or invents a
  `{slot}` (the customer's case reference would vanish, or `{foo}` would show); an empty text stored instead of removing the
  override; a write not trimmed; `null` not removing; the store answering another language's texts or more than the overrides;
  the admin read without the catalog's journey order.
*/
const withSlot = CUSTOMER_TEXT_CATALOG.find((e) => slotsOf(e.hu).includes("{id}"))!
const plain = CUSTOMER_TEXT_CATALOG.find((e) => slotsOf(e.hu).length === 0 && slotsOf(e.en).length === 0)!

type Row = { id: string; key: string; locale: string; value: string; updated_at?: string }
const fakeService = (rows: Row[] = []) => {
  const calls: string[] = []
  return {
    calls,
    rows,
    listOverrides: async (locale?: string) => rows.filter((r) => !locale || r.locale === locale),
    setOverride: async (key: string, locale: string, value: string | null) => {
      calls.push(`${key}|${locale}|${value}`)
      return value === null ? null : { id: "ctxt_1", key, locale, value }
    },
  }
}
const scope = (service: unknown) => ({ resolve: () => service })
const response = () => {
  const res = { body: undefined as any, json: (b: unknown) => (res.body = b) }
  return res
}

describe("customer text rules", () => {
  it("the catalog is not empty and every group has texts", () => {
    expect(CUSTOMER_TEXT_CATALOG.length).toBeGreaterThan(100)
    for (const group of CUSTOMER_TEXT_GROUPS)
      expect(CUSTOMER_TEXT_CATALOG.some((e) => e.group === group)).toBe(true)
    expect(withSlot).toBeDefined()
    expect(plain).toBeDefined()
  })

  it("refuses an unknown key, an empty or too long text, and a text that does not keep the slots", () => {
    expect(customerTextRefusal("nincs.ilyen", "hu", "x")).toMatch(/Unknown customer text key/)
    expect(customerTextRefusal(plain.key, "hu", "   ")).toMatch(/empty/)
    expect(customerTextRefusal(plain.key, "hu", "x".repeat(4001))).toMatch(/longer than 4000/)
    expect(customerTextRefusal(withSlot.key, "hu", "Megkaptuk.")).toMatch(/must keep the slots/)
    expect(customerTextRefusal(withSlot.key, "hu", "Megkaptuk {id} {foo}.")).toMatch(/must keep the slots/)
    expect(customerTextRefusal(withSlot.key, "hu", "Megkaptuk: {id}.")).toBeNull()
    expect(customerTextRefusal(plain.key, "en", "A new text.")).toBeNull()
  })

  it("the body is one key, one known language, a text or null, nothing else", () => {
    expect(AdminPostCustomerText.safeParse({ key: plain.key, locale: "hu", value: "x" }).success).toBe(true)
    expect(AdminPostCustomerText.safeParse({ key: plain.key, locale: "hu", value: null }).success).toBe(true)
    expect(AdminPostCustomerText.safeParse({ key: plain.key, locale: "de", value: "x" }).success).toBe(false)
    expect(AdminPostCustomerText.safeParse({ key: plain.key, locale: "hu", value: "x", extra: 1 }).success).toBe(false)
  })
})

describe("admin and store routes", () => {
  it("POST writes the trimmed text, null removes it, and an unknown key or a lost slot is refused before the store", async () => {
    const service = fakeService()
    const res = response()
    await adminPost({ scope: scope(service), validatedBody: { key: plain.key, locale: "hu", value: "  Új szöveg.  " } } as never, res as never)
    expect(res.body.customer_text).toEqual({ key: plain.key, locale: "hu", value: "Új szöveg." })
    await adminPost({ scope: scope(service), validatedBody: { key: plain.key, locale: "hu", value: null } } as never, response() as never)
    await expect(
      adminPost({ scope: scope(service), validatedBody: { key: "nincs.ilyen", locale: "hu", value: null } } as never, response() as never)
    ).rejects.toThrow(/Unknown customer text key/)
    await expect(
      adminPost({ scope: scope(service), validatedBody: { key: withSlot.key, locale: "hu", value: "Nincs azonosító." } } as never, response() as never)
    ).rejects.toThrow(/must keep the slots/)
    expect(service.calls).toEqual([`${plain.key}|hu|Új szöveg.`, `${plain.key}|hu|null`])
  })

  it("GET gives the groups in journey order, the catalog and the overrides", async () => {
    const res = response()
    await adminGet({ scope: scope(fakeService([{ id: "ctxt_1", key: plain.key, locale: "hu", value: "Átírt", updated_at: "2026-11-24" }])) } as never, res as never)
    expect(res.body.groups).toEqual(["penztar", "rendeles-leadva", "rendeles-allapota", "elallas", "hibabejelentes", "fiok", "hirlevel", "suti"])
    expect(res.body.catalog).toBe(CUSTOMER_TEXT_CATALOG)
    expect(res.body.overrides).toEqual([{ key: plain.key, locale: "hu", value: "Átírt", updated_at: "2026-11-24" }])
  })

  it("the store gives only the asked language's overrides as a map; an unknown language is Hungarian", async () => {
    const rows = [
      { id: "1", key: plain.key, locale: "hu", value: "Magyar" },
      { id: "2", key: plain.key, locale: "en", value: "English" },
    ]
    const en = response()
    await storeGet({ scope: scope(fakeService(rows)), query: { locale: "en" } } as never, en as never)
    expect(en.body).toEqual({ customer_texts: { [plain.key]: "English" } })
    const other = response()
    await storeGet({ scope: scope(fakeService(rows)), query: { locale: "de" } } as never, other as never)
    expect(other.body).toEqual({ customer_texts: { [plain.key]: "Magyar" } })
  })
})
