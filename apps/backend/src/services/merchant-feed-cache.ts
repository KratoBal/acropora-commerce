/**
 * THE FEED'S SERVER-SIDE CACHE (barracuda, #539): the route is public and
 * every build reads the whole catalogue with prices and availability, so a
 * caller must not be able to trigger that at will. One built feed is served
 * for `ttlMs`; a failed build is not cached. Per process, which is enough: a
 * second instance builds once more, not once per request.
 */
export function feedCache(ttlMs: number, now: () => number = Date.now) {
  let cached: { at: number; body: string } | null = null
  let pending: Promise<string> | null = null
  return async (build: () => Promise<string>): Promise<string> => {
    if (cached && now() - cached.at < ttlMs) return cached.body
    if (!pending)
      pending = build()
        .then((body) => {
          cached = { at: now(), body }
          return body
        })
        .finally(() => {
          pending = null
        })
    return pending
  }
}
