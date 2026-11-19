import { buyerCompanyOf, buyerCompanyOfOrder, buyerCompanySentence } from "../buyer-company"

/*
  THE COMPANY OF A COMPANY PURCHASE (card aba7120c, A15). WHAT TURNS THIS RED: a private address (no company) gets a company; the
  company loses its trim, or a blank one counts; the tax number comes from another metadata key, or a blank one counts; a failed
  read rejects (it must send the mail without the line); the sentence differs from the OS's (the two renderers must agree).
*/
describe("buyerCompanyOf", () => {
  it("the company name and the tax number, trimmed", () => {
    expect(buyerCompanyOf({ company: "  Teszt Kft. ", metadata: { tax_id: " 12345676-2-13 " } })).toEqual({
      name: "Teszt Kft.",
      tax_number: "12345676-2-13",
    })
  })
  it("no company: null, whatever the metadata says", () => {
    expect(buyerCompanyOf({ company: null, metadata: { tax_id: "12345676-2-13" } })).toBeNull()
    expect(buyerCompanyOf({ company: "   ", metadata: null })).toBeNull()
    expect(buyerCompanyOf(null)).toBeNull()
    expect(buyerCompanyOf(undefined)).toBeNull()
  })
  it("a company without a usable tax number keeps the name alone", () => {
    for (const metadata of [null, {}, { tax_id: null }, { tax_id: "  " }, { tax_id: 12345676 }, { adoszam: "12345676-2-13" }])
      expect(buyerCompanyOf({ company: "Teszt Kft.", metadata })).toEqual({ name: "Teszt Kft.", tax_number: null })
  })
})

describe("buyerCompanySentence", () => {
  it("names the company and the tax number, or the company alone", () => {
    expect(buyerCompanySentence({ name: "Teszt Kft.", tax_number: "12345676-2-13" })).toBe(
      "Számlázási adatok: Teszt Kft., adószám: 12345676-2-13."
    )
    expect(buyerCompanySentence({ name: "Teszt Kft.", tax_number: null })).toBe("Számlázási adatok: Teszt Kft.")
    // a name without a closing full stop gets one
    expect(buyerCompanySentence({ name: "Teszt Bt", tax_number: null })).toBe("Számlázási adatok: Teszt Bt.")
  })
})

describe("buyerCompanyOfOrder", () => {
  const container = (graph: () => Promise<unknown>, warn = jest.fn()) =>
    ({
      resolve: (key: string) => (key === "query" ? { graph } : { warn }),
    }) as never

  it("reads the order's billing address", async () => {
    const graph = jest.fn(async () => ({ data: [{ billing_address: { company: "Teszt Kft.", metadata: { tax_id: "12345676-2-13" } } }] }))
    expect(await buyerCompanyOfOrder(container(graph), "order_1")).toEqual({ name: "Teszt Kft.", tax_number: "12345676-2-13" })
    expect(graph).toHaveBeenCalledWith(
      expect.objectContaining({ entity: "order", filters: { id: "order_1" }, fields: ["id", "billing_address.company", "billing_address.metadata"] })
    )
  })
  it("a failed read is null and logged, never a rejection", async () => {
    const warn = jest.fn()
    expect(await buyerCompanyOfOrder(container(async () => { throw new Error("db down") }, warn), "order_1")).toBeNull()
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("db down"))
  })
  it("an order with no billing address is null", async () => {
    expect(await buyerCompanyOfOrder(container(async () => ({ data: [{}] })), "order_1")).toBeNull()
    expect(await buyerCompanyOfOrder(container(async () => ({ data: [] })), "order_1")).toBeNull()
  })
})
