/**
 * A SLIDING-WINDOW LIMIT, IN MEMORY. The newsletter route is the shop's first
 * public write that needs no cart and no account, so it gets one (acrobot
 * 36614). In memory is enough for the test storefront's one backend process; a
 * second instance would keep its own count, which only loosens the limit.
 *
 * `allow` records the hit only when it is allowed: a refused caller does not
 * push its own window further out by retrying.
 */
export type RateLimiter = {
  allow(key: string, now?: number): boolean
}

export function createRateLimiter(opts: {
  max: number
  windowMs: number
  /** Above this many keys the expired ones are swept (a flood of addresses). */
  sweepAbove?: number
}): RateLimiter {
  const hits = new Map<string, number[]>()
  const sweepAbove = opts.sweepAbove ?? 10_000

  return {
    allow(key, now = Date.now()) {
      const since = now - opts.windowMs
      if (hits.size > sweepAbove)
        for (const [k, list] of hits)
          if (list[list.length - 1]! <= since) hits.delete(k)
      const recent = (hits.get(key) ?? []).filter((t) => t > since)
      if (recent.length >= opts.max) {
        hits.set(key, recent)
        return false
      }
      recent.push(now)
      hits.set(key, recent)
      return true
    },
  }
}
