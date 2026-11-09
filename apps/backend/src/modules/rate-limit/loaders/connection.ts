import type { LoaderOptions } from "@medusajs/framework/types"
import Redis from "ioredis"

import { createRedisRateLimitStore, rateLimitKeySecret, setRateLimitStore } from "../store"

/**
 * THE REDIS CLIENT OF THE ATTEMPT LIMITS. Without `redisUrl` nothing is set, and every limit keeps counting in its own
 * memory (a local run, the unit tests).
 *
 * THE CLIENT FAILS FAST, ON PURPOSE: no offline queue and one retry, so a Redis outage turns into an error on the
 * try, and the limit falls back to its own memory for that try (`rate-limit.ts`), instead of every sign-in waiting for
 * a queue to drain. The price, stated: during an outage each instance counts alone again, which only loosens the
 * limit; it never refuses everyone and never lets everyone through.
 */
export default async ({ logger, options }: LoaderOptions<{ redisUrl?: string; keySecret?: string }>) => {
  const log = logger ?? console
  const redisUrl = options?.redisUrl
  if (!redisUrl) {
    log.info("[rate-limit] no redisUrl: the attempt limits count in each process's memory")
    return
  }
  const client = new Redis(redisUrl, {
    connectionName: "acropora-rate-limit",
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    connectTimeout: 5000,
    commandTimeout: 1000,
  })
  client.on("error", (error: Error) => log.warn(`[rate-limit] Redis connection error: ${error.message}`))
  try {
    await client.connect()
  } catch (error) {
    log.warn(`[rate-limit] Redis did not connect (${(error as Error).message}); each try falls back to memory until it does`)
  }
  // Without COOKIE_SECRET (a local run) the HMAC falls back to Medusa's own "supersecret" default: the limits still
  // work, and the addresses are then as guessable as with a plain hash.
  setRateLimitStore(createRedisRateLimitStore(client, rateLimitKeySecret(options?.keySecret || "supersecret")))
  log.info("[rate-limit] the attempt limits count in Redis")
}
