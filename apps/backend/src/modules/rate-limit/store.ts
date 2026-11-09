import { createHash, randomUUID } from "node:crypto"

/**
 * WHERE THE ATTEMPT COUNTS LIVE (card d707cf5f, item 5: "elesre Redis-alapu kell").
 *
 * The limits themselves are created once, statically, where the middlewares are wired (`attempt-limits.ts`, the
 * newsletter route), and they ask THIS slot for a shared store on every try. The rate-limit module's loader fills it
 * when the backend has `REDIS_URL`; without it (unit tests, a local run without Redis) the slot stays empty and each
 * limit counts in its own memory, as before. With Redis, every backend instance sees the same count, and a restart
 * does not hand every caller a fresh allowance.
 */
export type RateLimitStore = {
  /** Counts a try against `name:key` and answers whether it is within `max` in the last `windowMs`. */
  hit(opts: { name: string; key: string; max: number; windowMs: number; now: number }): Promise<boolean>
}

let shared: RateLimitStore | null = null

export const setRateLimitStore = (store: RateLimitStore | null) => {
  shared = store
}

export const rateLimitStore = (): RateLimitStore | null => shared

/** The minimum of a client the store needs: ioredis's `eval`. */
export type EvalClient = {
  eval(script: string, numKeys: number, ...args: (string | number)[]): Promise<unknown>
}

/**
 * THE SLIDING WINDOW IN ONE ATOMIC STEP, the same rule as the memory limit: hits older than the window are dropped, a
 * try past `max` is refused WITHOUT being recorded (a refused caller does not push its own window further out), an
 * allowed one is recorded and the key expires with the window. One script, so two instances cannot both read "two of
 * three" and both let the third through.
 */
export const SLIDING_WINDOW_SCRIPT = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local max = tonumber(ARGV[3])
redis.call("ZREMRANGEBYSCORE", key, "-inf", now - window)
if redis.call("ZCARD", key) >= max then
  return 0
end
redis.call("ZADD", key, now, ARGV[4])
redis.call("PEXPIRE", key, window)
return 1
`

/**
 * THE KEY IS HASHED: a limit is keyed by an e-mail address, an account or a cart, and the address should not sit in
 * Redis in clear text (readable by anyone with the Redis password). The name stays readable, so a key can still be
 * told apart by limit.
 */
export const redisKeyOf = (name: string, key: string) =>
  `acr:rate-limit:${name}:${createHash("sha256").update(key).digest("hex")}`

export const createRedisRateLimitStore = (client: EvalClient): RateLimitStore => ({
  async hit({ name, key, max, windowMs, now }) {
    const answer = await client.eval(
      SLIDING_WINDOW_SCRIPT,
      1,
      redisKeyOf(name, key),
      now,
      windowMs,
      max,
      `${now}-${randomUUID()}`
    )
    return Number(answer) === 1
  },
})
