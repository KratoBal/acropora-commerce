import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { currentReleaseInfo } from "./release-info"

/**
 * Which build is serving this instance.
 *
 * WHY THIS IS A SEPARATE ROUTE AND NOT AN EXTENSION OF `/health`:
 * `medusa start` registers `/health` itself as a static `send("OK")`, and the
 * container's HEALTHCHECK in the Dockerfile curls exactly that path. Taking the
 * path over would put our own code on the container's liveness path: a throw in
 * this handler would mark the container unhealthy and restart it, turning an
 * observability endpoint into an outage source. The nesting keeps the two
 * related without coupling them.
 *
 * WHY IT NEEDS NO AUTH DECLARATION: the framework applies its auth, CORS and
 * publishable-key middleware by path prefix - `/admin` and `/store` only (see
 * ApiLoader in @medusajs/framework). A route outside both prefixes is reachable
 * unauthenticated, which is the point: the question "which code is running" has
 * to be answerable from outside, by whoever is checking the deployment. This
 * matches the Acropora OS API, where `/health` carries `@Public()`.
 *
 * WHAT IT DISCLOSES, stated rather than glossed over: the exact commit of the
 * running build is public. That does narrow what an attacker has to guess. It is
 * the same trade the OS API already makes, and the alternative - an identifier
 * only readable with shell access to the production host - is what left two
 * review questions unanswerable in the first place.
 */
export const GET = async (_req: MedusaRequest, res: MedusaResponse) => {
  /**
   * `release` and all three of its keys are ALWAYS present, including when
   * nothing is known. A missing field is indistinguishable from an old
   * deployment that never had the field, and telling those two apart is the
   * whole reason this endpoint exists.
   */
  res.json({ status: "ok", release: currentReleaseInfo() })
}
