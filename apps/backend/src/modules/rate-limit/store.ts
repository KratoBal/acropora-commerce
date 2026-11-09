import { createHmac, randomUUID } from "node:crypto"

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
  /**
   * Counts a try against `name:key` and answers whether it is within `max` in the last `windowMs`. `now` only when the
   * caller fixes the clock (tests); without it the store takes its own clock (Redis `TIME`), one for every instance.
   */
  hit(opts: { name: string; key: string; max: number; windowMs: number; now?: number }): Promise<boolean>
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
if now < 0 then
  local t = redis.call("TIME")
  now = tonumber(t[1]) * 1000 + math.floor(tonumber(t[2]) / 1000)
end
local window = tonumber(ARGV[2])
local max = tonumber(ARGV[3])
redis.call("ZREMRANGEBYSCORE", key, "-inf", now - window)
if redis.call("ZCARD", key) >= max then
  return 0
end
redis.call("ZADD", key, now, now .. "-" .. ARGV[4])
redis.call("PEXPIRE", key, window)
return 1
`

/**
 * THE KEY IS AN HMAC WITH A SERVER SECRET (barracuda, #695 review): a limit is keyed by an e-mail address, an
 * account or a cart. A plain hash would keep the address out of Redis, but anyone who can read Redis could still
 * hash a KNOWN address and see whether someone tried it in the window. The secret is derived from the backend's
 * `COOKIE_SECRET` under its own label (acrobot 44934: no new secret; a secret change only resets these short-lived
 * counts). The name stays readable, so a key can still be told apart by limit.
 */
export const rateLimitKeySecret = (cookieSecret: string) =>
  createHmac("sha256", cookieSecret).update("acropora:rate-limit:v1").digest()

export const redisKeyOf = (secret: Buffer, name: string, key: string) =>
  `acr:rate-limit:${name}:${createHmac("sha256", secret).update(key).digest("hex")}`

export const createRedisRateLimitStore = (client: EvalClient, secret: Buffer): RateLimitStore => ({
  async hit({ name, key, max, windowMs, now }) {
    const answer = await client.eval(
      SLIDING_WINDOW_SCRIPT,
      1,
      redisKeyOf(secret, name, key),
      now ?? -1,
      windowMs,
      max,
      randomUUID()
    )
    return Number(answer) === 1
  },
})
