import { createHash } from "node:crypto"

import Redis from "ioredis"

import { createRateLimiter } from "../../../api/store/newsletter-subscriptions/rate-limit"
import {
  createRedisRateLimitStore,
  rateLimitKeySecret,
  redisKeyOf,
  setRateLimitStore,
  type RateLimitStore,
} from "../store"

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

describe("the Redis store's arguments", () => {
  /*
    RL-CLOCK: without a fixed time the store sends -1, so the script stamps the try with Redis TIME; with one, it sends
    that. Against a local Redis the two clocks are the same machine's, so only the argument tells them apart.
  */
  it("RL-CLOCK: no time from the caller means Redis's clock (-1 to the script); a fixed time goes through", async () => {
    const calls: (string | number)[][] = []
    const store = createRedisRateLimitStore(
      {
        async eval(_script, _keys, ...args) {
          calls.push(args)
          return 1
        },
      },
      rateLimitKeySecret("x")
    )
    await store.hit({ name: "n", key: "k", max: 1, windowMs: 10 })
    await store.hit({ name: "n", key: "k", max: 1, windowMs: 10, now: 1234 })
    expect(calls.map((a) => a[1])).toEqual([-1, 1234])
  })

  it("RL-CLOCK-LIMIT: a limit called without a time does not fix one for the store", async () => {
    const seen: (number | undefined)[] = []
    setRateLimitStore({
      async hit(opts) {
        seen.push(opts.now)
        return true
      },
    })
    await createRateLimiter({ name: "ora", max: 1, windowMs: 10 }).allow("k")
    expect(seen).toEqual([undefined])
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
  const secret = rateLimitKeySecret("proba-titok")

  afterAll(async () => {
    const c = clients[0]
    if (c) {
      const keys = await c.keys(`acr:rate-limit:${name}*`)
      if (keys.length) await c.del(...keys)
    }
    await Promise.all(clients.map((c) => c.quit()))
  })

  it("RL-REDIS: the same sliding window as in memory, and a refused retry does not extend it", async () => {
    const store = createRedisRateLimitStore(client(), secret)
    const hit = (key: string, now: number) => store.hit({ name, key, max: 2, windowMs: 1000, now })
    expect(await hit("a", 0)).toBe(true)
    expect(await hit("a", 100)).toBe(true)
    expect(await hit("a", 200)).toBe(false)
    expect(await hit("b", 200)).toBe(true)
    expect(await hit("a", 999)).toBe(false)
    expect(await hit("a", 1001)).toBe(true)
  })

  it("RL-REDIS-SHARED: two instances (two clients) share one count", async () => {
    const one = createRedisRateLimitStore(client(), secret)
    const two = createRedisRateLimitStore(client(), secret)
    const opts = { name, key: "kozos@pelda.hu", max: 2, windowMs: 60_000 }
    expect(await one.hit({ ...opts, now: 10 })).toBe(true)
    expect(await two.hit({ ...opts, now: 11 })).toBe(true)
    expect(await one.hit({ ...opts, now: 12 })).toBe(false)
    expect(await two.hit({ ...opts, now: 13 })).toBe(false)
  })

  it("RL-REDIS-KEY: the address is not stored in clear text, and the key expires with the window", async () => {
    const c = client()
    const store = createRedisRateLimitStore(c, secret)
    await store.hit({ name, key: "titkos@pelda.hu", max: 5, windowMs: 30_000, now: Date.now() })
    const keys = await c.keys(`acr:rate-limit:${name}:*`)
    expect(keys.join(" ")).not.toContain("titkos")
    expect(keys).toContain(redisKeyOf(secret, name, "titkos@pelda.hu"))
    const ttl = await c.pttl(redisKeyOf(secret, name, "titkos@pelda.hu"))
    expect(ttl).toBeGreaterThan(0)
    expect(ttl).toBeLessThanOrEqual(30_000)
  })

  /*
    THE KEY IS AN HMAC WITH THE SERVER'S SECRET (barracuda, #695 review): a known address, hashed plainly, must not
    find its key, and another secret gives another key.
  */
  it("RL-REDIS-HMAC: a known address hashed without the secret does not find its key", async () => {
    const c = client()
    await createRedisRateLimitStore(c, secret).hit({ name, key: "ismert@pelda.hu", max: 5, windowMs: 30_000 })
    const plain = createHash("sha256").update("ismert@pelda.hu").digest("hex")
    expect(await c.exists(`acr:rate-limit:${name}:${plain}`)).toBe(0)
    expect(await c.exists(redisKeyOf(secret, name, "ismert@pelda.hu"))).toBe(1)
    expect(redisKeyOf(rateLimitKeySecret("masik-titok"), name, "ismert@pelda.hu")).not.toBe(
      redisKeyOf(secret, name, "ismert@pelda.hu")
    )
  })

  /*
    ONE CLOCK FOR EVERY INSTANCE (barracuda, #695 review): without a fixed `now` the window is counted on Redis's
    own clock, not on the calling process's.
  */
  it("RL-REDIS-TIME: without a fixed time the try is stamped with Redis's own clock", async () => {
    const c = client()
    await createRedisRateLimitStore(c, secret).hit({ name, key: "ora@pelda.hu", max: 5, windowMs: 30_000 })
    const [seconds, micros] = await c.time()
    const redisNow = Number(seconds) * 1000 + Math.floor(Number(micros) / 1000)
    const scores = await c.zrange(redisKeyOf(secret, name, "ora@pelda.hu"), 0, -1, "WITHSCORES")
    expect(scores).toHaveLength(2)
    expect(Math.abs(Number(scores[1]) - redisNow)).toBeLessThan(2000)
  })
})
