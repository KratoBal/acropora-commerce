/**
 * WHICH CODE THE STOREFRONT IS SERVING.
 *
 * The same answer the backend gives at `/health/release`
 * (`apps/backend/src/api/health/release/release-info.ts`), with the same two
 * sources and the same precedence:
 *
 *   APP_GIT_SHA    baked in by the Dockerfile's `GIT_SHA` build argument
 *   SOURCE_COMMIT  set at RUNTIME by Coolify, on every deployment
 *
 * The stage storefront is a Coolify application (measured 2026-09-28), and
 * Coolify does not pass `GIT_SHA`, so without the runtime fallback this would
 * answer "unknown" there, exactly as the backend did.
 *
 * WHY A COPY AND NOT A SHARED PACKAGE: the two apps share no workspace package
 * today, and one small pure function is not worth introducing one. The
 * behaviour is pinned by a spec on each side, with the same cases, so a drift
 * shows up as a red test rather than as two endpoints that disagree.
 */

const FULL_COMMIT_SHA_PATTERN = /^[0-9a-f]{40}$/

export type ReleaseSource = "APP_GIT_SHA" | "SOURCE_COMMIT"

export type ReleaseInfo = {
  /** The validated full commit SHA, or `null` when it cannot be trusted. */
  commit: string | null
  /** First 12 characters of `commit`, or `null`. */
  short: string | null
  /** The variable `commit` was read from, or `null` when neither was valid. */
  source: ReleaseSource | null
  /** The raw `APP_GIT_SHA` the image carries ("unknown" is the Dockerfile default). */
  reported: string | null
  /** The raw `SOURCE_COMMIT` the platform set at runtime. */
  reported_runtime: string | null
}

const rawValue = (value: string | undefined): string | null => {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

const isFullSha = (value: string | null): value is string =>
  !!value && FULL_COMMIT_SHA_PATTERN.test(value)

export function currentReleaseInfo(
  env: Record<string, string | undefined> = process.env,
): ReleaseInfo {
  const reported = rawValue(env.APP_GIT_SHA)
  const reported_runtime = rawValue(env.SOURCE_COMMIT)

  const [commit, source]: [string | null, ReleaseSource | null] = isFullSha(
    reported,
  )
    ? [reported, "APP_GIT_SHA"]
    : isFullSha(reported_runtime)
      ? [reported_runtime, "SOURCE_COMMIT"]
      : [null, null]

  return {
    commit,
    short: commit ? commit.slice(0, 12) : null,
    source,
    reported,
    reported_runtime,
  }
}
