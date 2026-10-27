import middlewares from "../middlewares"
import { refuseClientCartMetadata } from "../refuse-client-cart-metadata"

const call = (body: unknown) => {
  const res = {
    statusCode: 0,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json: jest.fn(),
  }
  const next = jest.fn()
  refuseClientCartMetadata({ body } as never, res as never, next)
  return { res, next }
}

/**
 * THE CLIENT WRITES NO CART OR LINE METADATA (audit A4). What must fail: a
 * forged `aszf_elfogadas`, split key or fee marker getting through any of the
 * four stock writes; an empty object or null (a replace wipes the shop's keys)
 * passing; an item's metadata at cart creation passing; an ordinary body
 * refused; one of the four routes left without the guard.
 */
describe("the stock cart writes' metadata", () => {
  it.each([
    { metadata: { aszf_elfogadas: { idopont: "2020-01-01T00:00:00.000Z", verzio: "hamis" } } },
    { metadata: { acropora_pickup_cart_id: "cart_x" } },
    { metadata: { acropora_line_item_kind: "fee" } },
    { metadata: {} },
    { metadata: null },
    { region_id: "reg_1", metadata: { a: 1 } },
    { items: [{ variant_id: "v1", quantity: 1, metadata: { acropora_line_item_kind: "fee" } }] },
    { items: [{ variant_id: "v1", quantity: 1 }, { variant_id: "v2", quantity: 1, metadata: {} }] },
  ])("refuses %j", (body) => {
    const { res, next } = call(body)
    expect(res.statusCode).toBe(400)
    expect(next).not.toHaveBeenCalled()
  })

  it.each([
    undefined,
    {},
    { region_id: "reg_1", email: "a@b.hu" },
    { variant_id: "v1", quantity: 2 },
    { quantity: 0 },
    { metadata: undefined, email: "a@b.hu" },
    { items: [{ variant_id: "v1", quantity: 1 }] },
    { items: "nem tömb" },
  ])("lets %j through", (body) => {
    const { res, next } = call(body)
    expect(next).toHaveBeenCalledTimes(1)
    expect(res.statusCode).toBe(0)
  })

  it.each([
    "/store/carts",
    "/store/carts/:id",
    "/store/carts/:id/line-items",
    "/store/carts/:id/line-items/:line_id",
  ])("guards POST %s", (matcher) => {
    const route = middlewares.routes?.find(
      (r) => r.matcher === matcher && ((r as { methods?: string[] }).methods ?? []).includes("POST")
    )
    expect(route?.middlewares).toContain(refuseClientCartMetadata)
  })
})
