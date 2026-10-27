import { POST } from "../../../api/store/customers/me/aszf-elfogadas/route"
import middlewares from "../../../api/middlewares"
import { StorePostAszfElfogadas } from "../../../api/store/carts/[id]/aszf-elfogadas/validators"
import { ASZF_FORRAS_MAI_BOLT, ASZF_VERZIO_MAI_BOLT } from "../aszf-record"
import { saveCustomerAszfAcceptance } from "../customer-aszf-record"

/**
 * THE REGISTRATION'S ÁSZF RECORD IS THE SERVER'S (audit A4, customer twin).
 * What must fail: the time, version or document coming from the request; the
 * customer's other metadata lost in the write; a second call moving the first
 * acceptance to a later time; an unknown customer written to; the route taking
 * more than the customer's word, answering without a customer-bound token, or
 * left without its validator.
 */
const NOW = new Date("2026-10-27T18:00:00.000Z")

const fake = (customer: unknown) => {
  const updates: unknown[][] = []
  const container = {
    resolve: () => ({
      retrieveCustomer: async () => {
        if (!customer) throw new Error("not found")
        return customer
      },
      updateCustomers: async (...args: unknown[]) => void updates.push(args),
    }),
  }
  return { container: container as never, updates }
}

afterEach(() => {
  delete process.env.FOGYASZTOBARAT_ENABLED
})

describe("saveCustomerAszfAcceptance", () => {
  it("writes the server's clock, version and document and keeps the other keys", async () => {
    const { container, updates } = fake({ id: "cus_1", metadata: { other: "kept" } })
    const result = await saveCustomerAszfAcceptance(container, "cus_1", NOW)
    const record = { idopont: NOW.toISOString(), verzio: ASZF_VERZIO_MAI_BOLT, dokumentum: ASZF_FORRAS_MAI_BOLT }
    expect(result).toEqual({ status: "saved", record })
    expect(updates).toEqual([["cus_1", { metadata: { other: "kept", aszf_elfogadas: record } }]])
  })

  it("writes on a customer with no metadata at all", async () => {
    const { container, updates } = fake({ id: "cus_1", metadata: null })
    expect((await saveCustomerAszfAcceptance(container, "cus_1", NOW)).status).toBe("saved")
    expect(updates).toHaveLength(1)
  })

  it("a second call returns the first record and writes nothing", async () => {
    const first = { idopont: "2026-10-01T08:00:00.000Z", verzio: "v", dokumentum: "d" }
    const { container, updates } = fake({ id: "cus_1", metadata: { aszf_elfogadas: first } })
    expect(await saveCustomerAszfAcceptance(container, "cus_1", NOW)).toEqual({ status: "already", record: first })
    expect(updates).toEqual([])
  })

  it("an unknown customer: not_found, nothing written", async () => {
    const { container, updates } = fake(null)
    expect(await saveCustomerAszfAcceptance(container, "cus_x", NOW)).toEqual({ status: "not_found" })
    expect(updates).toEqual([])
  })

  it("with the Fogyasztóbarát switch on it refuses to record a document the backend cannot describe", async () => {
    process.env.FOGYASZTOBARAT_ENABLED = "true"
    const { container, updates } = fake({ id: "cus_1", metadata: {} })
    expect(await saveCustomerAszfAcceptance(container, "cus_1", NOW)).toEqual({ status: "unsupported_document" })
    expect(updates).toEqual([])
  })
})

describe("POST /store/customers/me/aszf-elfogadas", () => {
  const call = async (actorId: string | undefined, customer: unknown) => {
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() }
    await POST({ scope: fake(customer).container, auth_context: { actor_id: actorId } } as never, res as never)
    return res
  }

  it("401 without a customer-bound token, and nothing is looked up", async () => {
    const res = await call(undefined, { id: "cus_1", metadata: {} })
    expect(res.status).toHaveBeenCalledWith(401)
  })

  it("answers the record it saved, for the token's own customer", async () => {
    const res = await call("cus_1", { id: "cus_1", metadata: {} })
    const body = res.json.mock.calls[0][0]
    expect(body.aszf_elfogadas.verzio).toBe(ASZF_VERZIO_MAI_BOLT)
  })

  it("404 for a customer that does not exist, 501 with the switch on", async () => {
    expect((await call("cus_x", null)).status).toHaveBeenCalledWith(404)
    process.env.FOGYASZTOBARAT_ENABLED = "true"
    expect((await call("cus_1", { id: "cus_1", metadata: {} })).status).toHaveBeenCalledWith(501)
  })

  it("takes the customer's word and nothing else: the body is strict and the route has its validator", () => {
    expect(StorePostAszfElfogadas.safeParse({ elfogadom: true }).success).toBe(true)
    for (const body of [{}, { elfogadom: false }, { elfogadom: true, idopont: "2020-01-01", verzio: "x" }])
      expect(StorePostAszfElfogadas.safeParse(body).success).toBe(false)
    const guarded = middlewares.routes?.find(
      (r) =>
        r.matcher === "/store/customers/me/aszf-elfogadas" &&
        ((r as { methods?: string[] }).methods ?? []).includes("POST")
    )
    expect(guarded?.middlewares?.length).toBe(1)
  })
})
