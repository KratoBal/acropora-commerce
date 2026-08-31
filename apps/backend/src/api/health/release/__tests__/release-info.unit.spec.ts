import { currentReleaseInfo } from "../release-info"

/**
 * WHAT WOULD MAKE THESE TESTS FAIL, stated up front, because a test that cannot
 * fail proves nothing:
 *
 *  - an implementation that echoes whatever it finds as `commit` fails on the
 *    `"unknown"` case, which is the Dockerfile's own default and therefore the
 *    single most likely real-world value;
 *  - an implementation that returns `""` instead of `null`, or omits keys when
 *    nothing is known, fails the "all keys always present" case;
 *  - an implementation that accepts a short SHA fails the 12-character case,
 *    which matters because the image TAG is 12 characters while the variable is
 *    the full 40 - reading the wrong one would look plausible and be wrong.
 */

const VALID = "cf8472e1a2b3c4d5e6f708192a3b4c5d6e7f8091"

describe("currentReleaseInfo", () => {
  it("reports a well-formed full SHA, and derives the short form from it", () => {
    expect(currentReleaseInfo({ APP_GIT_SHA: VALID })).toEqual({
      commit: VALID,
      short: "cf8472e1a2b3",
      reported: VALID,
    })
  })

  it("reports nothing at all when the variable is absent", () => {
    expect(currentReleaseInfo({})).toEqual({
      commit: null,
      short: null,
      reported: null,
    })
  })

  it("keeps the Dockerfile's 'unknown' default visible without treating it as a commit", () => {
    expect(currentReleaseInfo({ APP_GIT_SHA: "unknown" })).toEqual({
      commit: null,
      short: null,
      reported: "unknown",
    })
  })

  it("rejects a short SHA, since the image tag is short and the variable is not", () => {
    expect(currentReleaseInfo({ APP_GIT_SHA: "cf8472e1a2b3" }).commit).toBeNull()
  })

  it("rejects uppercase and non-hex values, but still shows what it found", () => {
    expect(currentReleaseInfo({ APP_GIT_SHA: VALID.toUpperCase() })).toEqual({
      commit: null,
      short: null,
      reported: VALID.toUpperCase(),
    })

    expect(currentReleaseInfo({ APP_GIT_SHA: "not-a-sha" }).reported).toBe(
      "not-a-sha"
    )
  })

  it("treats a whitespace-only value as absent rather than as an empty answer", () => {
    expect(currentReleaseInfo({ APP_GIT_SHA: "   " }).reported).toBeNull()
  })

  it("accepts a value the build padded with whitespace", () => {
    expect(currentReleaseInfo({ APP_GIT_SHA: `  ${VALID}\n` }).commit).toBe(
      VALID
    )
  })

  it("always answers with all three keys, whatever it knows", () => {
    for (const env of [
      {},
      { APP_GIT_SHA: "unknown" },
      { APP_GIT_SHA: VALID },
    ]) {
      expect(Object.keys(currentReleaseInfo(env)).sort()).toEqual([
        "commit",
        "reported",
        "short",
      ])
    }
  })
})
