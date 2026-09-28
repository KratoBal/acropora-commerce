import { afterEach, describe, expect, it, vi } from "vitest"

import { dynamic, GET } from "./route"

const VALID = "cf8472e1a2b3c4d5e6f708192a3b4c5d6e7f8091"

describe("GET /api/health/release", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  /**
   * WHAT WOULD MAKE THIS FAIL: dropping the export, or changing it to a static
   * mode. Either lets `next build` bake in the builder stage's answer, where
   * neither variable exists, and serve that answer forever.
   */
  it("is rendered per request, never at build time", () => {
    expect(dynamic).toBe("force-dynamic")
  })

  /**
   * Read at REQUEST time: the variable is set after the module was imported,
   * so a module-level read would miss it and this would answer null.
   */
  it("answers with the runtime SOURCE_COMMIT when the image says 'unknown'", async () => {
    vi.stubEnv("APP_GIT_SHA", "unknown")
    vi.stubEnv("SOURCE_COMMIT", VALID)

    const body = await GET().json()

    expect(body).toEqual({
      status: "ok",
      release: {
        commit: VALID,
        short: "cf8472e1a2b3",
        source: "SOURCE_COMMIT",
        reported: "unknown",
        reported_runtime: VALID,
      },
    })
  })
})
