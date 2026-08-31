/**
 * WHICH CODE IS RUNNING - the question `/health` cannot answer.
 *
 * Medusa's built-in `/health` is a static `res.status(200).send("OK")`
 * registered in `medusa start`. A 200 from it proves the HTTP server is alive
 * and nothing else: the same "OK" comes back from a three-week-old image.
 * Twice on 2026-08-31 a review stalled on exactly this - "how current is the
 * instance behind commerce-stage.acropora.hu" had no answer reachable over
 * HTTP.
 *
 * The commit is ALREADY baked into the image (`APP_GIT_SHA`, plus the
 * `org.opencontainers.image.revision` label - see the Dockerfile). What was
 * missing is a way to read it without shell access to the production host:
 * before this file, nothing in `src/` referenced `APP_GIT_SHA` at all.
 *
 * The value is deliberately NOT derived from `.git` at runtime: the runtime
 * image ships no `.git` directory, and an on-disk one would describe the
 * checkout rather than the build.
 */

/**
 * `infra/deploy-stage.sh` passes `GIT_SHA=$HEAD_SHA`, where `HEAD_SHA` is
 * `git rev-parse --verify --quiet HEAD` - the FULL 40-character SHA - and the
 * script then fails the deploy unless the baked `APP_GIT_SHA` equals it
 * exactly. The 12-character `SHORT_SHA` is used only for the image tag, never
 * for this variable. So a full-SHA pattern is what this deployment actually
 * produces; it is measured from the deploy script, not assumed.
 */
const FULL_COMMIT_SHA_PATTERN = /^[0-9a-f]{40}$/

export type ReleaseInfo = {
  /** The validated full commit SHA, or `null` when it cannot be trusted. */
  commit: string | null
  /** First 12 characters of `commit`, or `null`. Derived, never trusted separately. */
  short: string | null
  /**
   * The raw value the image actually carries, or `null` when the variable is
   * absent entirely.
   *
   * This exists to keep two different situations apart, because they must lead
   * to different actions. `"unknown"` is the Dockerfile's deliberate default
   * and means "this image was not built by the deploy script". `null` means
   * the variable is not set at all, which is what an image built before this
   * field existed looks like. Collapsing both into one empty answer would
   * recreate the very ambiguity this endpoint is meant to remove.
   */
  reported: string | null
}

/**
 * Reads the running build's identity from the environment.
 *
 * A malformed value is treated exactly like a missing one: `commit` is `null`.
 * A wrong-length or non-hex value is not evidence of anything, and reporting it
 * as a commit would be more misleading than reporting nothing - the reader
 * would act on it. `reported` still carries it, so the malformed value is
 * visible rather than swallowed.
 */
export function currentReleaseInfo(
  env: NodeJS.ProcessEnv = process.env
): ReleaseInfo {
  const raw = env.APP_GIT_SHA?.trim()
  const reported = raw ? raw : null

  if (!reported || !FULL_COMMIT_SHA_PATTERN.test(reported)) {
    return { commit: null, short: null, reported }
  }

  return { commit: reported, short: reported.slice(0, 12), reported }
}
