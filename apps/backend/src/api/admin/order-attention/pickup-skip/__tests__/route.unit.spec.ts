const mark = jest.fn()
jest.mock("../../../../../workflows/utils/pickup-retry-skip", () => ({
  setPickupRetrySkip: (...a: unknown[]) => mark(...a),
}))

import { POST } from "../route"
import { AdminPostPickupSkip } from "../validators"

const call = async (body: unknown, actor: string | undefined = "user_1") => {
  const res = { json: jest.fn(), status: jest.fn().mockReturnThis() }
  await POST({ scope: {}, validatedBody: body, auth_context: { actor_id: actor } } as never, res as never)
  return res
}

describe("POST /admin/order-attention/pickup-skip", () => {
  it("passes the admin as the actor and answers the marker", async () => {
    mark.mockResolvedValue({ status: "saved", skipped: true, marker: { at: "t", reason: "r", by: "user_1" } })
    const res = await call({ parent_cart_id: "cart_s", skip: true, reason: "customer cancelled" })
    expect(mark).toHaveBeenCalledWith({}, "cart_s", { skip: true, reason: "customer cancelled", by: "user_1" })
    expect(res.json).toHaveBeenCalledWith({
      parent_cart_id: "cart_s",
      skipped: true,
      marker: { at: "t", reason: "r", by: "user_1" },
    })
  })

  it("404 for an unknown cart, 409 for a cart that is not the shipped half", async () => {
    mark.mockResolvedValueOnce({ status: "not_found" })
    expect((await call({ parent_cart_id: "x", skip: true, reason: "abc" })).status).toHaveBeenCalledWith(404)
    mark.mockResolvedValueOnce({ status: "not_a_mixed_cart" })
    expect((await call({ parent_cart_id: "x", skip: true, reason: "abc" })).status).toHaveBeenCalledWith(409)
  })
})

describe("the pickup-skip body", () => {
  it("needs a reason to mark, not to clear; skip defaults to marking", () => {
    expect(AdminPostPickupSkip.safeParse({ parent_cart_id: "c" }).success).toBe(false)
    expect(AdminPostPickupSkip.safeParse({ parent_cart_id: "c", reason: "  " }).success).toBe(false)
    expect(AdminPostPickupSkip.safeParse({ parent_cart_id: "c", reason: "customer cancelled" }).success).toBe(true)
    expect(AdminPostPickupSkip.safeParse({ parent_cart_id: "c", skip: false }).success).toBe(true)
  })

  it("refuses a body that tries to send the time or the actor", () => {
    expect(
      AdminPostPickupSkip.safeParse({ parent_cart_id: "c", skip: false, by: "someone", at: "t" }).success
    ).toBe(false)
  })
})
