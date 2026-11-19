import inventoryChangedRevalidate from "../../../subscribers/inventory-changed-revalidate"
import priceChangedRevalidate from "../../../subscribers/price-changed-revalidate"
import productChangedRevalidate from "../../../subscribers/product-changed-revalidate"
import {
  noteRevalidateRequest,
  resetRevalidateMemory,
  sendStorefrontRevalidate,
  storefrontRevalidateStatus,
} from "../storefront-revalidate"

/*
  THE REVALIDATION MADE MEASURABLE (card 54bb3779, A4). WHAT TURNS THIS RED: the status leaks the secret, a path or credentials of the
  address; it calls a configured address unconfigured (or the reverse); the address' source is named wrongly; an attempt is not
  recorded, or without its HTTP status, its error, its cause code or the trigger; a secret inside an error text goes out; a
  subscriber does not note that an event reached it (so "no event" and "the call failed" cannot be told apart); the first
  request is lost when a second one comes.
*/
const logger = () => ({ info: jest.fn(), warn: jest.fn() })
const cfg = { url: "http://storefront-internal:8000/api/revalidate", secret: "titok-123" }

beforeEach(() => resetRevalidateMemory())

describe("the status", () => {
  it("unconfigured: nothing named, nothing recorded", () => {
    expect(storefrontRevalidateStatus({} as never)).toEqual({
      configured: false,
      url_source: null,
      target_host: null,
      secret_set: false,
      last_request: null,
      last_attempt: null,
    })
  })

  it("names the variable that gave the address, and only the host of it", () => {
    const status = storefrontRevalidateStatus({
      STOREFRONT_REVALIDATE_URL: "http://user:hunter2@storefront-internal:8000/some/path?x=1",
      ACROPORA_STOREFRONT_URL: "https://shop.example.test",
      STOREFRONT_REVALIDATE_SECRET: "titok-123",
    } as never)
    expect(status).toMatchObject({
      configured: true,
      url_source: "STOREFRONT_REVALIDATE_URL",
      target_host: "storefront-internal:8000",
      secret_set: true,
    })
    const text = JSON.stringify(status)
    for (const secret of ["titok-123", "hunter2", "/some/path", "x=1"]) expect(text).not.toContain(secret)
  })

  it("falls back to the public address, and a blank own address does not count", () => {
    expect(
      storefrontRevalidateStatus({
        STOREFRONT_REVALIDATE_URL: "  ",
        ACROPORA_STOREFRONT_URL: "https://shop.example.test",
        STOREFRONT_REVALIDATE_SECRET: "t",
      } as never)
    ).toMatchObject({ configured: true, url_source: "ACROPORA_STOREFRONT_URL", target_host: "shop.example.test" })
  })

  it("an address and no secret, or a secret and no address, is not configured; an unparsable address has no host", () => {
    expect(storefrontRevalidateStatus({ ACROPORA_STOREFRONT_URL: "https://x.test" } as never)).toMatchObject({
      configured: false,
      secret_set: false,
      target_host: "x.test",
    })
    expect(storefrontRevalidateStatus({ STOREFRONT_REVALIDATE_SECRET: "t" } as never)).toMatchObject({
      configured: false,
      secret_set: true,
      url_source: null,
    })
    expect(
      storefrontRevalidateStatus({ STOREFRONT_REVALIDATE_URL: "nem url", STOREFRONT_REVALIDATE_SECRET: "t" } as never)
    ).toMatchObject({ configured: true, target_host: null })
  })
})

describe("the attempts", () => {
  const last = () => storefrontRevalidateStatus({} as never).last_attempt

  it("a success is recorded with its status, the tags and the trigger", async () => {
    const fetchImpl = jest.fn(async () => ({ ok: true, status: 200 }))
    await sendStorefrontRevalidate(cfg, logger(), fetchImpl as never, ["products", "brands"], "manual")
    expect(last()).toMatchObject({ trigger: "manual", tags: ["products", "brands"], ok: true, http_status: 200, error: null })
    expect(Date.parse(String(last()?.at))).not.toBeNaN()
  })

  it("a refusal keeps its HTTP status", async () => {
    await sendStorefrontRevalidate(cfg, logger(), (async () => ({ ok: false, status: 401 })) as never, undefined, "price-changed")
    expect(last()).toMatchObject({ trigger: "price-changed", ok: false, http_status: 401, error: null })
  })

  it("a network error keeps its text AND its cause code (a name that does not resolve is ENOTFOUND)", async () => {
    const error = Object.assign(new Error("fetch failed"), { cause: { code: "ENOTFOUND" } })
    await sendStorefrontRevalidate(cfg, logger(), (async () => { throw error }) as never)
    expect(last()).toMatchObject({ trigger: "unknown", ok: false, http_status: null })
    expect(last()?.error).toBe("fetch failed (ENOTFOUND)")
  })

  it("a secret inside an error text never goes out", async () => {
    await sendStorefrontRevalidate(cfg, logger(), (async () => { throw new Error(`bad header titok-123 here`) }) as never)
    expect(last()?.error).toBe("bad header *** here")
    expect(JSON.stringify(storefrontRevalidateStatus({} as never))).not.toContain("titok-123")
  })

  // barracuda #820: the REAL fetch (undici) refuses an address with credentials and names the whole address in its TypeError
  it("an address with credentials: the real fetch's error text, cut to the host, carries no user or password anywhere", async () => {
    const log = logger()
    await sendStorefrontRevalidate(
      { url: "http://user:hunter2@storefront-internal:8000/api/revalidate?x=1", secret: "titok-123" },
      log,
      fetch
    )
    const error = String(last()?.error)
    expect(error).toContain("http://storefront-internal:8000")
    for (const leak of ["hunter2", "user:", "user@", "/api/revalidate", "x=1"]) expect(error).not.toContain(leak)
    for (const call of log.warn.mock.calls) for (const leak of ["hunter2", "user:"]) expect(String(call[0])).not.toContain(leak)
    expect(JSON.stringify(storefrontRevalidateStatus({} as never))).not.toContain("hunter2")
  })

  it("every address inside an error text is cut to scheme and host, and the rest of the text stays", async () => {
    await sendStorefrontRevalidate(
      cfg,
      logger(),
      (async () => {
        throw new Error("connect failed: https://a:b@h1.test:9/p?q#f and http://h2.test/x")
      }) as never
    )
    expect(last()?.error).toBe("connect failed: https://h1.test:9 and http://h2.test")
  })

  it("the next attempt replaces the last one", async () => {
    await sendStorefrontRevalidate(cfg, logger(), (async () => ({ ok: false, status: 500 })) as never)
    await sendStorefrontRevalidate(cfg, logger(), (async () => ({ ok: true, status: 200 })) as never)
    expect(last()).toMatchObject({ ok: true, http_status: 200 })
  })
})

describe("the requests", () => {
  it("noteRevalidateRequest records the source and whether it was configured", () => {
    noteRevalidateRequest("price-changed", {} as never, new Date("2026-11-19T03:10:00.000Z"))
    expect(storefrontRevalidateStatus({} as never).last_request).toEqual({
      at: "2026-11-19T03:10:00.000Z",
      source: "price-changed",
      configured: false,
    })
    noteRevalidateRequest("product-changed", { ACROPORA_STOREFRONT_URL: "https://x.test", STOREFRONT_REVALIDATE_SECRET: "t" } as never)
    expect(storefrontRevalidateStatus({} as never).last_request).toMatchObject({ source: "product-changed", configured: true })
  })

  it("each subscriber notes the event that reached it, also when nothing is configured", async () => {
    const saved = { ...process.env }
    delete process.env.ACROPORA_STOREFRONT_URL
    delete process.env.STOREFRONT_REVALIDATE_URL
    delete process.env.STOREFRONT_REVALIDATE_SECRET
    try {
      const args = { container: { resolve: jest.fn() }, event: { data: { id: "x" } } } as never
      for (const [subscriber, source] of [
        [priceChangedRevalidate, "price-changed"],
        [productChangedRevalidate, "product-changed"],
        [inventoryChangedRevalidate, "inventory-changed"],
      ] as const) {
        resetRevalidateMemory()
        await subscriber(args)
        expect(storefrontRevalidateStatus({} as never).last_request).toMatchObject({ source, configured: false })
      }
    } finally {
      process.env = saved
    }
  })

  it("a configured price event makes ONE call, and its attempt carries the subscriber's trigger", async () => {
    jest.useFakeTimers()
    const saved = { ...process.env }
    process.env.STOREFRONT_REVALIDATE_URL = "http://storefront-internal:8000"
    process.env.STOREFRONT_REVALIDATE_SECRET = "titok-123"
    const fetchSpy = jest.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true, status: 200 } as never)
    try {
      const args = { container: { resolve: () => logger() }, event: { data: { id: "x" } } } as never
      await priceChangedRevalidate(args)
      await priceChangedRevalidate(args)
      await jest.advanceTimersByTimeAsync(3_000)
      expect(fetchSpy).toHaveBeenCalledTimes(1)
      expect(storefrontRevalidateStatus({} as never).last_attempt).toMatchObject({
        trigger: "price-changed",
        tags: ["products"],
        ok: true,
        http_status: 200,
      })
    } finally {
      fetchSpy.mockRestore()
      jest.useRealTimers()
      process.env = saved
    }
  })
})
