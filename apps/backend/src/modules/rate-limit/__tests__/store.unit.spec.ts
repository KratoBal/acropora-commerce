import Redis from "ioredis"

import { createRateLimiter } from "../../../api/store/newsletter-subscriptions/rate-limit"
import { createRedisRateLimitStore, redisKeyOf, setRateLimitStore, type RateLimitStore } from "../store"

/**
 * THE SHARED COUNT (card d707cf5f, item 5). What must fail: a named limit that ignores the shared store; a limit
 * without a name that uses it; a failing store that refuses or lets every try through instead of counting in memory;
 * one warning per failed try instead of one per window.
 */
afterEach(() => setRateLimitStore(null))

const recordingStore = () => {
  const calls: { name: string; key: string; max: number; windowMs: number; now: number }[] = []
  const store: RateLimitStore = {
    async hit(opts) {
      calls.push(opts)
      return calls.length <= 1
    },
  }
  return { store, calls }
}

describe("a limit and the shared store", () => {
  it("RL-STORE: a named limit counts in the shared store, with its name, max and window", async () => {
    const { store, calls } = recordingStore()
    setRateLimitStore(store)
    const limit = createRateLimiter({ name: "proba", max: 3, windowMs: 1000 })
    expect(await limit.allow("a@b.hu", 50)).toBe(true)
    expect(await limit.allow("a@b.hu", 60)).toBe(false)
    expect(calls).toEqual([
      { name: "proba", key: "a@b.hu", max: 3, windowMs: 1000, now: 50 },
      { name: "proba", key: "a@b.hu", max: 3, windowMs: 1000, now: 60 },
    ])
  })

  it("RL-UNNAMED: a limit without a name counts in its own memory, whatever store is set", async () => {
    const { store, calls } = recordingStore()
    setRateLimitStore(store)
    const limit = createRateLimiter({ max: 1, windowMs: 1000 })
    expect(await limit.allow("a", 0)).toBe(true)
    expect(await limit.allow("a", 1)).toBe(false)
    expect(calls).toHaveLength(0)
  })

  it("RL-FALLBACK: a failing store neither refuses nor waves through: the try is counted in memory, with one warning per window", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {})
    setRateLimitStore({
      async hit() {
        throw new Error("Stream isn't writeable and enableOfflineQueue options is false")
      },
    })
    const limit = createRateLimiter({ name: "proba-hiba", max: 2, windowMs: 60_000 })
    expect(await limit.allow("a", 0)).toBe(true)
    expect(await limit.allow("a", 1)).toBe(true)
    expect(await limit.allow("a", 2)).toBe(false)
    expect(await limit.allow("b", 3)).toBe(true)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0]![0])).toContain("proba-hiba")
    warn.mockRestore()
  })
})

/*
  AGAINST A REAL REDIS, when `RATE_LIMIT_REDIS_URL` names one (a local throw-away instance; the CI has no Redis, so
  there it is skipped, and the green there says nothing about this part). What must fail: the script not dropping old
  hits, recording a refused try, two instances keeping two counts, the address stored in clear text, a key without an
  expiry.
*/
const REDIS_URL = process.env.RATE_LIMIT_REDIS_URL
const withRedis = REDIS_URL ? describe : describe.skip

withRedis("the Redis store", () => {
  const clients: Redis[] = []
  const client = () => {
    const c = new Redis(REDIS_URL!, { lazyConnect: false, maxRetriesPerRequest: 1 })
    clients.push(c)
    return c
  }
  const name = `teszt-${process.pid}-${Date.now()}`

  afterAll(async () => {
    const c = clients[0]
    if (c) {
      const keys = await c.keys(`acr:rate-limit:${name}*`)
      if (keys.length) await c.del(...keys)
    }
    await Promise.all(clients.map((c) => c.quit()))
  })

  it("RL-REDIS: the same sliding window as in memory, and a refused retry does not extend it", async () => {
    const store = createRedisRateLimitStore(client())
    const hit = (key: string, now: number) => store.hit({ name, key, max: 2, windowMs: 1000, now })
    expect(await hit("a", 0)).toBe(true)
    expect(await hit("a", 100)).toBe(true)
    expect(await hit("a", 200)).toBe(false)
    expect(await hit("b", 200)).toBe(true)
    expect(await hit("a", 999)).toBe(false)
    expect(await hit("a", 1001)).toBe(true)
  })

  it("RL-REDIS-SHARED: two instances (two clients) share one count", async () => {
    const one = createRedisRateLimitStore(client())
    const two = createRedisRateLimitStore(client())
    const opts = { name, key: "kozos@pelda.hu", max: 2, windowMs: 60_000 }
    expect(await one.hit({ ...opts, now: 10 })).toBe(true)
    expect(await two.hit({ ...opts, now: 11 })).toBe(true)
    expect(await one.hit({ ...opts, now: 12 })).toBe(false)
    expect(await two.hit({ ...opts, now: 13 })).toBe(false)
  })

  it("RL-REDIS-KEY: the address is not stored in clear text, and the key expires with the window", async () => {
    const c = client()
    const store = createRedisRateLimitStore(c)
    await store.hit({ name, key: "titkos@pelda.hu", max: 5, windowMs: 30_000, now: Date.now() })
    const keys = await c.keys(`acr:rate-limit:${name}:*`)
    expect(keys.join(" ")).not.toContain("titkos")
    expect(keys).toContain(redisKeyOf(name, "titkos@pelda.hu"))
    const ttl = await c.pttl(redisKeyOf(name, "titkos@pelda.hu"))
    expect(ttl).toBeGreaterThan(0)
    expect(ttl).toBeLessThanOrEqual(30_000)
  })
})
