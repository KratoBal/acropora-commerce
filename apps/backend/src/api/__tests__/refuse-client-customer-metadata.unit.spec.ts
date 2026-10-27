import middlewares from "../middlewares"
import {
  refuseCustomerAszfRecord,
  refuseCustomerMetadataUpdate,
} from "../refuse-client-customer-metadata"

const call = (guard: typeof refuseCustomerAszfRecord, body: unknown) => {
  const res = {
    statusCode: 0,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json: jest.fn(),
  }
  const next = jest.fn()
  guard({ body } as never, res as never, next)
  return { res, next }
}

const route = (matcher: string) =>
  middlewares.routes?.find(
    (r) => r.matcher === matcher && ((r as { methods?: string[] }).methods ?? []).includes("POST")
  )

/**
 * THE REGISTRATION'S ÁSZF RECORD CANNOT BE WRITTEN BY THE CLIENT (audit A4,
 * customer twin). What must fail: a forged `aszf_elfogadas` getting through
 * the customer creation; any `metadata` (even `{}` or null, which a replace
 * would turn into a wipe) getting through the customer update; an ordinary
 * registration or profile update refused; either route left without its guard.
 */
describe("the customer creation", () => {
  it.each([
    { email: "a@b.hu", metadata: { aszf_elfogadas: { idopont: "2020-01-01T00:00:00.000Z", verzio: "hamis" } } },
    { metadata: { aszf_elfogadas: null } },
    { metadata: { other: 1, aszf_elfogadas: {} } },
  ])("refuses %j", (body) => {
    const { res, next } = call(refuseCustomerAszfRecord, body)
    expect(res.statusCode).toBe(400)
    expect(next).not.toHaveBeenCalled()
  })

  it.each([
    undefined,
    {},
    { email: "a@b.hu", first_name: "A" },
    { metadata: undefined },
    { metadata: {} },
    { metadata: null },
    { metadata: { other: 1 } },
  ])("lets %j through", (body) => {
    const { res, next } = call(refuseCustomerAszfRecord, body)
    expect(next).toHaveBeenCalledTimes(1)
    expect(res.statusCode).toBe(0)
  })

  it("guards POST /store/customers", () => {
    expect(route("/store/customers")?.middlewares).toContain(refuseCustomerAszfRecord)
  })
})

describe("the customer update", () => {
  it.each([
    { metadata: { aszf_elfogadas: { verzio: "hamis" } } },
    { metadata: { anything: 1 } },
    { metadata: {} },
    { metadata: null },
    { first_name: "A", metadata: {} },
  ])("refuses %j", (body) => {
    const { res, next } = call(refuseCustomerMetadataUpdate, body)
    expect(res.statusCode).toBe(400)
    expect(next).not.toHaveBeenCalled()
  })

  it.each([undefined, {}, { first_name: "A", last_name: "B", phone: null }, { metadata: undefined, first_name: "A" }])(
    "lets %j through",
    (body) => {
      const { res, next } = call(refuseCustomerMetadataUpdate, body)
      expect(next).toHaveBeenCalledTimes(1)
      expect(res.statusCode).toBe(0)
    }
  )

  it("guards POST /store/customers/me", () => {
    expect(route("/store/customers/me")?.middlewares).toContain(refuseCustomerMetadataUpdate)
  })
})
