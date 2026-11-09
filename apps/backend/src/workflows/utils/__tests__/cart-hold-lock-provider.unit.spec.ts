import { readFileSync } from "fs"
import { dirname, join } from "path"

import { isLockTimeout } from "../cart-hold"

/**
 * THE LOCK TIMEOUT, MEASURED ON MEDUSA'S OWN PROVIDERS (barracuda's review of #705). `isLockTimeout` matches the
 * providers' message text; the wiring tests feed it a hand-made error. If a Medusa upgrade rewrites the text, the busy
 * refusal would silently fall back to failing open. What must fail here: the real in-memory provider's timeout not
 * recognised, or the Redis provider no longer rejecting with the text the matcher knows.
 *
 * The providers are not our dependencies; they are resolved the way `@medusajs/medusa` resolves them (the
 * `customer-aszf-record` spec does the same), so a move in the package layout fails here loudly too.
 */
const medusa = dirname(require.resolve("@medusajs/medusa/package.json"))
const { InMemoryLockingProvider } = require(
  require.resolve("@medusajs/locking/dist/providers/in-memory", { paths: [medusa] })
)

describe("the lock providers' timeout", () => {
  it("CHL-IN-MEMORY: a real wait past the timeout is recognised, and the job behind it does not run", async () => {
    const provider = new InMemoryLockingProvider()
    let release!: () => void
    const holding = provider.execute("cart_hold:variant:v_piece", () => new Promise<void>((done) => (release = done)), {
      timeout: 5,
    })
    await new Promise((resolve) => setImmediate(resolve))
    let ran = false
    const error = await provider
      .execute(
        "cart_hold:variant:v_piece",
        async () => {
          ran = true
        },
        { timeout: 1 }
      )
      .catch((caught: unknown) => caught)
    release()
    await holding
    expect(ran).toBe(false)
    expect(error).toBeInstanceOf(Error)
    expect(isLockTimeout(error)).toBe(true)
  }, 10_000)

  it("CHL-REDIS: the Redis provider still rejects a timed-out wait with the text the matcher knows", () => {
    const redis = dirname(require.resolve("@medusajs/locking-redis/package.json", { paths: [medusa] }))
    const source = readFileSync(join(redis, "dist/services/redis-lock.js"), "utf8")
    const messages = [...source.matchAll(/MedusaError\.Types\.CONFLICT,\s*"([^"]+)"/g)].map((match) => match[1])
    expect(messages.length).toBeGreaterThan(0)
    for (const message of messages) expect(isLockTimeout(new Error(message))).toBe(true)
  })
})
