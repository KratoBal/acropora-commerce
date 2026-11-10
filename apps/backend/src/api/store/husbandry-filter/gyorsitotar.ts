/**
 * A KEYED, SHORT-LIVED CACHE FOR THE HUSBANDRY FILTER (barracuda, #730, before live): the route is public (the
 * publishable key is), and a build reads up to a thousand products with their metadata. `feedCache`
 * (`services/merchant-feed-cache.ts`) holds one value; here there is one per key (a category and its channels), with
 * the same rules: a value is served for `ttlMs`, concurrent callers share the build in flight, a failed build is not
 * cached. Per process.
 *
 * THE KEYS ARE BOUNDED BY WHAT REACHES THE CACHE: only an active, public category does (the route answers 404 before),
 * so a caller cannot grow the map with invented ids. `MAX` is a second fence all the same: over it the expired entries
 * go first, then the oldest.
 */
export const MAX = 2000

export function kulcsosCache<T>(ttlMs: number, now: () => number = Date.now) {
  const kesz = new Map<string, { at: number; ertek: T }>()
  const folyamatban = new Map<string, Promise<T>>()
  const helyetCsinal = () => {
    if (kesz.size < MAX) return
    for (const [k, v] of kesz) if (now() - v.at >= ttlMs) kesz.delete(k)
    while (kesz.size >= MAX) kesz.delete(kesz.keys().next().value as string)
  }
  return async (kulcs: string, build: () => Promise<T>): Promise<T> => {
    const meglevo = kesz.get(kulcs)
    if (meglevo && now() - meglevo.at < ttlMs) return meglevo.ertek
    let futo = folyamatban.get(kulcs)
    if (!futo) {
      futo = build()
        .then((ertek) => {
          kesz.delete(kulcs)
          helyetCsinal()
          kesz.set(kulcs, { at: now(), ertek })
          return ertek
        })
        .finally(() => folyamatban.delete(kulcs))
      folyamatban.set(kulcs, futo)
    }
    return futo
  }
}
