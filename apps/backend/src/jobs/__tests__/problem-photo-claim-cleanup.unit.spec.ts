import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import job, { config } from "../problem-photo-claim-cleanup"

/*
  WHAT TURNS THIS RED. A cleanup that is not scheduled (a name or cron missing), that frees live claims (the limit is
  tested in problem-report.unit.spec.ts), or that logs on every empty run (the log would drown the one line that matters).
*/
const container = (rows: { id: string }[]) => {
  const info = jest.fn()
  const bindings: unknown[][] = []
  const resolve = (key: string) =>
    key === ContainerRegistrationKeys.LOGGER
      ? { info }
      : { raw: async (_sql: string, b: unknown[]) => (bindings.push(b), { rows }) }
  return { container: { resolve } as never, info, bindings }
}

describe("problem-photo-claim-cleanup job", () => {
  it("runs every quarter of an hour under its own name", () => {
    expect(config).toEqual({ name: "problem-photo-claim-cleanup", schedule: "*/15 * * * *" })
  })

  it("logs one line with the count when it freed photos, and nothing on an empty run", async () => {
    const some = container([{ id: "a" }, { id: "b" }])
    await job(some.container)
    expect(some.info).toHaveBeenCalledTimes(1)
    expect(some.info.mock.calls[0][0]).toContain("2")
    const none = container([])
    await job(none.container)
    expect(none.info).not.toHaveBeenCalled()
  })

  it("asks with a cutoff an hour before now", async () => {
    const { container: c, bindings } = container([])
    const before = Date.now()
    await job(c)
    const cutoff = (bindings[0]![0] as Date).getTime()
    expect(cutoff).toBeGreaterThanOrEqual(before - 60 * 60 * 1000 - 1000)
    expect(cutoff).toBeLessThanOrEqual(Date.now() - 60 * 60 * 1000 + 1000)
  })
})
