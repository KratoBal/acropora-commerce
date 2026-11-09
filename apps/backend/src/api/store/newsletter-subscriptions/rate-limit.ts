import { rateLimitStore } from "../../../modules/rate-limit/store"

/**
 * A SLIDING-WINDOW LIMIT. The newsletter route is the shop's first public write
 * that needs no cart and no account, so it gets one (acrobot 36614).
 *
 * WHERE IT COUNTS (card d707cf5f, item 5): a NAMED limit counts in the shared
 * store the rate-limit module sets when the backend has Redis
 * (`modules/rate-limit`), so every instance sees one count and a restart is
 * not a fresh allowance. Without that store (unit tests, a local run), or when
 * Redis fails on a try, it counts in this process's memory, which only loosens
 * the limit. A limit without a name always counts in memory.
 *
 * `allow` records the hit only when it is allowed: a refused caller does not
 * push its own window further out by retrying.
 */
export type RateLimiter = {
  allow(key: string, now?: number): Promise<boolean>
}

type MemoryRateLimiter = { allow(key: string, now?: number): boolean }

type LimitOptions = {
  max: number
  windowMs: number
  /** Above this many keys the expired ones are swept (a flood of addresses). */
  sweepAbove?: number
  /**
   * A hard cap on the keys held. Sweeping drops only EXPIRED keys, so a flood
   * of invented keys inside one window would still grow the map; above this
   * count the oldest-inserted keys go (their callers start a fresh allowance,
   * which loosens the limit for them and keeps the memory bounded).
   */
  maxKeys?: number
}

/** One warning line per limit per ten minutes when the shared store fails, however many tries hit it. */
const failedAt = new Map<string, number>()
const warnStoreFailed = (name: string, error: unknown, now: number) => {
  const last = failedAt.get(name)
  if (last !== undefined && now - last < 10 * 60 * 1000) return
  failedAt.set(name, now)
  console.warn(
    `[rate-limit] the shared store failed for "${name}" (${error instanceof Error ? error.message : String(error)}); this try is counted in memory`
  )
}

export function createRateLimiter(opts: LimitOptions & { name?: string }): RateLimiter {
  const memory = createMemoryRateLimiter(opts)
  return {
    async allow(key, now) {
      const store = opts.name ? rateLimitStore() : null
      if (!store || !opts.name) return memory.allow(key, now ?? Date.now())
      try {
        // without `now` the store keeps its own clock (Redis TIME): one clock for every instance
        return await store.hit({ name: opts.name, key, max: opts.max, windowMs: opts.windowMs, now })
      } catch (error) {
        const local = now ?? Date.now()
        warnStoreFailed(opts.name, error, local)
        return memory.allow(key, local)
      }
    },
  }
}

function createMemoryRateLimiter(opts: LimitOptions): MemoryRateLimiter {
  const hits = new Map<string, number[]>()
  const sweepAbove = opts.sweepAbove ?? 10_000
  const maxKeys = opts.maxKeys ?? 50_000

  return {
    allow(key, now = Date.now()) {
      const since = now - opts.windowMs
      if (hits.size > sweepAbove)
        for (const [k, list] of hits)
          if (list[list.length - 1]! <= since) hits.delete(k)
      if (hits.size > maxKeys) {
        let excess = hits.size - maxKeys
        for (const k of hits.keys()) {
          if (excess-- <= 0) break
          hits.delete(k)
        }
      }
      const recent = (hits.get(key) ?? []).filter((t) => t > since)
      if (recent.length >= opts.max) {
        hits.set(key, recent)
        return false
      }
      recent.push(now)
      hits.delete(key)
      hits.set(key, recent)
      return true
    },
  }
}
