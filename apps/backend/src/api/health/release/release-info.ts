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
 *
 * TWO SOURCES, because there are two ways this image gets built (2026-09-28):
 *
 *   APP_GIT_SHA    baked in by `infra/deploy-stage.sh` (`--build-arg GIT_SHA`)
 *   SOURCE_COMMIT  set at RUNTIME by Coolify, on every deployment
 *
 * Coolify does not pass `GIT_SHA`, so an image it builds carries the
 * Dockerfile's "unknown" - which is exactly what the stage answered until this
 * change (`"commit":null,"reported":"unknown"`). Coolify can pass the commit
 * at BUILD time too, but only behind its `include_source_commit_in_build`
 * setting, which its own source calls a Docker cache breaker. At runtime it
 * sets `SOURCE_COMMIT` unconditionally (coollabsio/coolify,
 * `app/Jobs/ApplicationDeploymentJob.php`, measured on 2026-09-28), so the
 * runtime value needs no setting and costs no cache.
 *
 * The baked value wins when it is valid: it was checked against the commit by
 * the deploy script, and it travels with the image.
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

/** Which variable the reported `commit` came from. */
export type ReleaseSource = "APP_GIT_SHA" | "SOURCE_COMMIT"

export type ReleaseInfo = {
  /** The validated full commit SHA, or `null` when it cannot be trusted. */
  commit: string | null
  /** First 12 characters of `commit`, or `null`. Derived, never trusted separately. */
  short: string | null
  /** The variable `commit` was read from, or `null` when neither was valid. */
  source: ReleaseSource | null
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
  /**
   * The raw `SOURCE_COMMIT` the platform set at runtime, or `null` when absent.
   *
   * Kept next to `reported` for the same reason `reported` exists: Coolify
   * writes "unknown" here when it has no commit, and a malformed value must be
   * visible rather than swallowed.
   */
  reported_runtime: string | null
}

const rawValue = (value: string | undefined): string | null => {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

const isFullSha = (value: string | null): value is string =>
  !!value && FULL_COMMIT_SHA_PATTERN.test(value)

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
  const reported = rawValue(env.APP_GIT_SHA)
  const reported_runtime = rawValue(env.SOURCE_COMMIT)

  const [commit, source]: [string | null, ReleaseSource | null] = isFullSha(
    reported
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
