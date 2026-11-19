import { orderMailOperations } from "../operations"

/*
  THE COMPANY READ IS WIRED INTO THE ORDER MAIL'S OPERATIONS (card aba7120c, A15). WHAT TURNS THIS RED: `orderMailOperations` has no
  `buyerCompany` (the confirmation is then always the private one, whatever the order says, and no other test would notice: they
  hand the dependency in by hand); it reads another order or other fields.
*/
describe("orderMailOperations.buyerCompany", () => {
  it("reads the order's billing address through the query graph", async () => {
    const graph = jest.fn(async () => ({
      data: [{ billing_address: { company: "Teszt Kft.", metadata: { tax_id: "12345676-2-13" } } }],
    }))
    const container = { resolve: (key: string) => (key === "query" ? { graph } : { warn: jest.fn() }) } as never
    const operations = orderMailOperations(container)
    expect(typeof operations.buyerCompany).toBe("function")
    expect(await operations.buyerCompany!("order_7")).toEqual({ name: "Teszt Kft.", tax_number: "12345676-2-13" })
    expect(graph).toHaveBeenCalledWith(
      expect.objectContaining({ entity: "order", filters: { id: "order_7" }, fields: expect.arrayContaining(["billing_address.company", "billing_address.metadata"]) })
    )
  })
})
