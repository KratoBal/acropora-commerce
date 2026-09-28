import { describe, expect, it } from "vitest"

import { currentReleaseInfo } from "./release-info"

/**
 * THE SAME CASES AS THE BACKEND'S SPEC
 * (`apps/backend/src/api/health/release/__tests__/release-info.unit.spec.ts`),
 * because the two functions are copies and must not drift apart.
 */

const VALID = "cf8472e1a2b3c4d5e6f708192a3b4c5d6e7f8091"
const OTHER = "0123456789abcdef0123456789abcdef01234567"

describe("currentReleaseInfo (storefront)", () => {
  it("reports a valid baked APP_GIT_SHA", () => {
    expect(currentReleaseInfo({ APP_GIT_SHA: VALID })).toEqual({
      commit: VALID,
      short: "cf8472e1a2b3",
      source: "APP_GIT_SHA",
      reported: VALID,
      reported_runtime: null,
    })
  })

  it("reports nothing at all when both variables are absent", () => {
    expect(currentReleaseInfo({})).toEqual({
      commit: null,
      short: null,
      source: null,
      reported: null,
      reported_runtime: null,
    })
  })

  it("falls back to SOURCE_COMMIT when the image says 'unknown' (the Coolify stage)", () => {
    expect(
      currentReleaseInfo({ APP_GIT_SHA: "unknown", SOURCE_COMMIT: VALID }),
    ).toEqual({
      commit: VALID,
      short: "cf8472e1a2b3",
      source: "SOURCE_COMMIT",
      reported: "unknown",
      reported_runtime: VALID,
    })
  })

  it("prefers a valid APP_GIT_SHA over SOURCE_COMMIT", () => {
    const info = currentReleaseInfo({
      APP_GIT_SHA: VALID,
      SOURCE_COMMIT: OTHER,
    })
    expect(info.commit).toBe(VALID)
    expect(info.source).toBe("APP_GIT_SHA")
  })

  it("rejects short, uppercase or 'unknown' values in either variable, but shows them", () => {
    expect(
      currentReleaseInfo({
        APP_GIT_SHA: "cf8472e1a2b3",
        SOURCE_COMMIT: VALID.toUpperCase(),
      }),
    ).toEqual({
      commit: null,
      short: null,
      source: null,
      reported: "cf8472e1a2b3",
      reported_runtime: VALID.toUpperCase(),
    })
  })
})
