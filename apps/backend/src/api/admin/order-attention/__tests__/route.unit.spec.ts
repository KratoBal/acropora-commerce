const compute = jest.fn()
jest.mock("../../../../workflows/utils/order-attention", () => ({
  attentionOperations: () => ({ ops: true }),
  computeAttention: (...a: unknown[]) => compute(...a),
}))

import { GET } from "../route"

describe("GET /admin/order-attention", () => {
  it("answers the computed list with its count and a timestamp", async () => {
    compute.mockResolvedValue([{ kind: "transfer_overdue", order_id: "order_9" }])
    const res = { json: jest.fn() }
    await GET({ scope: {} } as never, res as never)
    const body = res.json.mock.calls[0][0]
    expect(body.count).toBe(1)
    expect(body.items).toEqual([{ kind: "transfer_overdue", order_id: "order_9" }])
    expect(typeof body.generated_at).toBe("string")
    expect(Number.isNaN(Date.parse(body.generated_at))).toBe(false)
  })
})
