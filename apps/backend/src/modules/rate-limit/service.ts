import { rateLimitStore } from "./store"

/**
 * The module's service: it only says which store the limits use. The counting itself goes through the store the
 * loader set (`store.ts`), because the limits are wired statically, before any request brings a container.
 */
export default class RateLimitModuleService {
  storeKind(): "redis" | "memory" {
    return rateLimitStore() ? "redis" : "memory"
  }
}
