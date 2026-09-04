import {
  describeFileBackendUrlProblem,
  verifyFileBackendUrl,
} from "../workflows/utils/verify-file-backend-url"

/**
 * IS THE PUBLIC IMAGE PREFIX SET? THE CHECK, AT THE ONLY POINT THAT HELPS.
 *
 * === WHY A SCRIPT AND NOT THE CONFIG ===
 *
 * `medusa-config.ts` is loaded by `medusa build` too (Dockerfile), and that
 * build runs without runtime environment. A throw there would break the IMAGE
 * BUILD for everyone, in every environment, including ones that would never
 * serve a customer. The failure we want belongs to the DEPLOY, not to the
 * build.
 *
 * === AND WHY NOT A MODULE LOADER ===
 *
 * Because this repo already paid for that answer. The shipping-id check sat in
 * a module loader, never ran once in any environment, and said so on every
 * start - `runLoaders` hands a module loader the MODULE's container. This check
 * needs nothing from any container, but the entrypoint is where a refusal is
 * already visible to whoever reads the container log, and one place for
 * "reasons the shop refuses to start" is worth more than a second mechanism.
 *
 * === IT RUNS BEFORE THE MIGRATION, AND THAT IS DELIBERATE ===
 *
 * It needs no database and no application: it reads one variable. Putting the
 * cheapest check first means a misconfigured deploy fails in a second rather
 * than after a migration run.
 *
 * NO `medusa exec` HERE, for the same reason: booting the whole application to
 * read one environment variable would make the fastest check the slowest.
 */
const check = verifyFileBackendUrl(process.env.MEDUSA_FILE_BACKEND_URL)

if (!check.ok) {
  console.error(`HIBA: ${check.message}`)
  process.exit(1)
}

/**
 * THE SUCCESS LINE IS NOT DECORATION: without it a passing check is
 * indistinguishable from a check that never ran - which is exactly how the
 * shipping-id check spent its whole life here.
 */
console.log(
  `docker-entrypoint: a képek nyilvános előtagja rendben (${check.value}).`,
)
