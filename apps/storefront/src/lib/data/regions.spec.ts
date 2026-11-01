// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"

/**
 * THE REGION OF A PATH SEGMENT (Balázs 2026-11-01: the shop's second language). The first path segment is `hu` or `en-hu`; Medusa knows
 * countries, not languages. MI PIROSIT: `getRegion("en-hu")` finds no region (the English shop would 404 every page), or `getRegion("hu")`
 * changes; an unknown country in English (`en-de`) is treated as a known one.
 */
const fetchMock = vi.fn(async () => ({
  regions: [{ id: "reg_hu", name: "HU", countries: [{ iso_2: "hu" }] }],
}))

vi.mock("@lib/config", () => ({
  sdk: {
    client: {
      fetch: (...a: unknown[]) =>
        (fetchMock as unknown as (...b: unknown[]) => unknown)(...a),
    },
  },
}))
vi.mock("./cookies", () => ({ getPublicCacheOptions: async () => ({}) }))

beforeEach(() => {
  vi.resetModules()
  fetchMock.mockClear()
})

describe("getRegion", () => {
  it("the Hungarian segment and the English one are the same region", async () => {
    const { getRegion } = await import("./regions")
    expect((await getRegion("hu"))?.id).toBe("reg_hu")
    expect((await getRegion("en-hu"))?.id).toBe("reg_hu")
    expect((await getRegion("EN-HU"))?.id).toBe("reg_hu")
  })

  it("an unknown country has no region, in either language", async () => {
    const { getRegion } = await import("./regions")
    expect(await getRegion("de")).toBeUndefined()
    expect(await getRegion("en-de")).toBeUndefined()
  })

  it("one lookup of the regions serves both segments", async () => {
    const { getRegion } = await import("./regions")
    await getRegion("en-hu")
    await getRegion("hu")
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
