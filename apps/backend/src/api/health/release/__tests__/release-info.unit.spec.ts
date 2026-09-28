import { currentReleaseInfo } from "../release-info";

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
 *    the full 40 - reading the wrong one would look plausible and be wrong;
 *  - an implementation that reads only one of the two variables fails the
 *    precedence cases below: the Coolify stage sets ONLY `SOURCE_COMMIT`, the
 *    deploy script sets a valid `APP_GIT_SHA`, and each must win in its case.
 */

const VALID = "cf8472e1a2b3c4d5e6f708192a3b4c5d6e7f8091";
const OTHER = "0123456789abcdef0123456789abcdef01234567";

describe("currentReleaseInfo", () => {
  it("reports a well-formed full SHA, and derives the short form from it", () => {
    expect(currentReleaseInfo({ APP_GIT_SHA: VALID })).toEqual({
      commit: VALID,
      short: "cf8472e1a2b3",
      source: "APP_GIT_SHA",
      reported: VALID,
      reported_runtime: null,
    });
  });

  it("reports nothing at all when the variable is absent", () => {
    expect(currentReleaseInfo({})).toEqual({
      commit: null,
      short: null,
      source: null,
      reported: null,
      reported_runtime: null,
    });
  });

  it("keeps the Dockerfile's 'unknown' default visible without treating it as a commit", () => {
    expect(currentReleaseInfo({ APP_GIT_SHA: "unknown" })).toEqual({
      commit: null,
      short: null,
      source: null,
      reported: "unknown",
      reported_runtime: null,
    });
  });

  it("rejects a short SHA, since the image tag is short and the variable is not", () => {
    expect(
      currentReleaseInfo({ APP_GIT_SHA: "cf8472e1a2b3" }).commit,
    ).toBeNull();
  });

  it("rejects uppercase and non-hex values, but still shows what it found", () => {
    expect(currentReleaseInfo({ APP_GIT_SHA: VALID.toUpperCase() })).toEqual({
      commit: null,
      short: null,
      source: null,
      reported: VALID.toUpperCase(),
      reported_runtime: null,
    });

    expect(currentReleaseInfo({ APP_GIT_SHA: "not-a-sha" }).reported).toBe(
      "not-a-sha",
    );
  });

  it("treats a whitespace-only value as absent rather than as an empty answer", () => {
    expect(currentReleaseInfo({ APP_GIT_SHA: "   " }).reported).toBeNull();
  });

  it("accepts a value the build padded with whitespace", () => {
    expect(currentReleaseInfo({ APP_GIT_SHA: `  ${VALID}\n` }).commit).toBe(
      VALID,
    );
  });

  it("always answers with all five keys, whatever it knows", () => {
    for (const env of [
      {},
      { APP_GIT_SHA: "unknown" },
      { APP_GIT_SHA: VALID },
      { SOURCE_COMMIT: VALID },
    ]) {
      expect(Object.keys(currentReleaseInfo(env)).sort()).toEqual([
        "commit",
        "reported",
        "reported_runtime",
        "short",
        "source",
      ]);
    }
  });

  /**
   * THE STAGE CASE, as measured on 2026-09-28: Coolify builds the image without
   * `GIT_SHA`, so the image carries "unknown", and sets `SOURCE_COMMIT` at
   * runtime. Before this change the answer was `commit: null`.
   */
  it("falls back to the platform's runtime SOURCE_COMMIT when the image says 'unknown'", () => {
    expect(
      currentReleaseInfo({ APP_GIT_SHA: "unknown", SOURCE_COMMIT: VALID }),
    ).toEqual({
      commit: VALID,
      short: "cf8472e1a2b3",
      source: "SOURCE_COMMIT",
      reported: "unknown",
      reported_runtime: VALID,
    });
  });

  /**
   * THE DEPLOY-SCRIPT CASE: the baked value was checked against the commit by
   * `infra/deploy-stage.sh`, so it wins over a runtime value. Two DIFFERENT
   * SHAs, so a test that only checks "some valid SHA came back" cannot pass.
   */
  it("prefers a valid baked APP_GIT_SHA over SOURCE_COMMIT", () => {
    const info = currentReleaseInfo({
      APP_GIT_SHA: VALID,
      SOURCE_COMMIT: OTHER,
    });
    expect(info.commit).toBe(VALID);
    expect(info.source).toBe("APP_GIT_SHA");
    expect(info.reported_runtime).toBe(OTHER);
  });

  /**
   * Coolify writes "unknown" into SOURCE_COMMIT when it has no commit, so the
   * runtime value gets the same validation as the baked one.
   */
  it("does not accept a malformed SOURCE_COMMIT, but still shows it", () => {
    expect(
      currentReleaseInfo({ APP_GIT_SHA: "unknown", SOURCE_COMMIT: "unknown" }),
    ).toEqual({
      commit: null,
      short: null,
      source: null,
      reported: "unknown",
      reported_runtime: "unknown",
    });
  });
});
