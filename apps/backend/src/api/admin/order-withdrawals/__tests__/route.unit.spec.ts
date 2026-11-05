const listWithdrawalsForOs = jest.fn()
const markWithdrawalPulled = jest.fn()
jest.mock("../../../../workflows/utils/withdrawal/withdrawal", () => ({
  listWithdrawalsForOs: (...args: unknown[]) => listWithdrawalsForOs(...args),
  markWithdrawalPulled: (...args: unknown[]) => markWithdrawalPulled(...args),
}))

import { GET, ListQuery } from "../route"
import { POST as pulled } from "../[id]/pulled/route"

/*
  WHAT TURNS THIS RED (V0.3, the OS side). A list query with an unknown key or a status the module does not know
  reaching the module; the default not being `new` (the OS would re-pull what it has); a limit over 100; a
  second `pulled` answering differently from the first; an unknown declaration not being a 404.
*/
const call = async (handler: (req: never, res: never) => Promise<void>, req: Record<string, unknown>) => {
  const json = jest.fn()
  const status = jest.fn().mockReturnValue({ json })
  await handler({ scope: {}, ...req } as never, { json, status } as never)
  return { json, status }
}

afterEach(() => {
  listWithdrawalsForOs.mockReset()
  markWithdrawalPulled.mockReset()
})

describe("the list query", () => {
  it("defaults to the new declarations, fifty at a time", () => {
    expect(ListQuery.parse({})).toEqual({ status: "new", limit: 50 })
    expect(ListQuery.parse({ limit: "7" })).toEqual({ status: "new", limit: 7 })
  })

  it("refuses an unknown status, a limit out of range and an extra key", () => {
    for (const bad of [{ status: "deleted" }, { limit: "0" }, { limit: "101" }, { limit: "x" }, { extra: "1" }])
      expect(ListQuery.safeParse(bad).success).toBe(false)
  })
})

describe("GET /admin/order-withdrawals", () => {
  it("answers the declarations for the parsed query", async () => {
    listWithdrawalsForOs.mockResolvedValue([{ id: "ordwdr_1" }])
    const { json } = await call(GET as never, { query: { status: "pulled", limit: "3" } })
    expect(listWithdrawalsForOs).toHaveBeenCalledWith({}, { status: "pulled", limit: 3 })
    expect(json).toHaveBeenCalledWith({ withdrawals: [{ id: "ordwdr_1" }] })
  })

  it("a bad query is a 400 and the module is not asked", async () => {
    const { status } = await call(GET as never, { query: { status: "deleted" } })
    expect(status).toHaveBeenCalledWith(400)
    expect(listWithdrawalsForOs).not.toHaveBeenCalled()
  })
})

describe("POST /admin/order-withdrawals/:id/pulled", () => {
  it("answers pulled, the same on every call", async () => {
    markWithdrawalPulled.mockResolvedValue("pulled")
    const first = await call(pulled as never, { params: { id: "ordwdr_1" } })
    const second = await call(pulled as never, { params: { id: "ordwdr_1" } })
    expect(first.json).toHaveBeenCalledWith({ status: "pulled" })
    expect(second.json).toHaveBeenCalledWith({ status: "pulled" })
  })

  it("an unknown declaration is a 404", async () => {
    markWithdrawalPulled.mockResolvedValue("not_found")
    const { status } = await call(pulled as never, { params: { id: "ordwdr_x" } })
    expect(status).toHaveBeenCalledWith(404)
  })
})
