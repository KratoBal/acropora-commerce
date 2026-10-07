import { InventoryEvents } from "@medusajs/framework/utils"

import inventoryChangedRevalidate, {
  config as inventoryConfig,
} from "../../../subscribers/inventory-changed-revalidate"
import priceChangedRevalidate, { config } from "../../../subscribers/price-changed-revalidate"
import {
  INVENTORY_CHANGE_EVENTS,
  PRICE_CHANGE_EVENTS,
  revalidateCoalescer,
  sendStorefrontRevalidate,
  storefrontRevalidateConfig,
} from "../storefront-revalidate"

/*
  THE STOREFRONT CACHE ON A PRICE CHANGE (card 2d22116c). WHAT TURNS THIS RED:
  - the subscriber listens to anything but the pricing module's price events;
  - it calls without the secret, with another tag, or without both settings;
  - a projection run of hundreds of price writes makes hundreds of calls;
  - a failed call throws (a price write would fail on a cache).
*/
const logger = () => ({ info: jest.fn(), warn: jest.fn() })

describe("the storefront revalidate settings", () => {
  it("needs both the address and the secret, and builds the route", () => {
    expect(
      storefrontRevalidateConfig({
        ACROPORA_STOREFRONT_URL: "https://commerce-stage.example.test/",
        STOREFRONT_REVALIDATE_SECRET: " titok ",
      } as never)
    ).toEqual({ url: "https://commerce-stage.example.test/api/revalidate", secret: "titok" })
    expect(storefrontRevalidateConfig({ ACROPORA_STOREFRONT_URL: "https://x.test" } as never)).toBeNull()
    expect(storefrontRevalidateConfig({ STOREFRONT_REVALIDATE_SECRET: "t" } as never)).toBeNull()
  })
})

describe("sending the revalidate", () => {
  const cfg = { url: "https://x.test/api/revalidate", secret: "titok" }

  it("posts the products tag with the secret", async () => {
    const fetchImpl = jest.fn(async () => ({ ok: true, status: 200 }))
    expect(await sendStorefrontRevalidate(cfg, logger(), fetchImpl as never)).toBe(true)
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe(cfg.url)
    expect(init.method).toBe("POST")
    expect((init.headers as Record<string, string>)["x-revalidate-secret"]).toBe("titok")
    expect(JSON.parse(String(init.body))).toEqual({ tags: ["products"] })
  })

  it("a refusal or a network error is logged, never thrown", async () => {
    const log = logger()
    expect(
      await sendStorefrontRevalidate(cfg, log, (async () => ({ ok: false, status: 401 })) as never)
    ).toBe(false)
    expect(
      await sendStorefrontRevalidate(cfg, log, (async () => {
        throw new Error("ECONNREFUSED")
      }) as never)
    ).toBe(false)
    expect(log.warn).toHaveBeenCalledTimes(2)
  })
})

describe("one call per window", () => {
  it("many events in a window make one call, and the next window another", () => {
    const timers: (() => void)[] = []
    const send = jest.fn(async () => true)
    const coalescer = revalidateCoalescer(send, 3000, (run) => timers.push(run))
    for (let i = 0; i < 300; i++) coalescer.request()
    expect(timers).toHaveLength(1)
    timers[0]!()
    expect(send).toHaveBeenCalledTimes(1)
    coalescer.request()
    expect(timers).toHaveLength(2)
  })
})

describe("the subscriber", () => {
  it("listens to the pricing module's price events, and does nothing without the settings", async () => {
    expect(config.event).toEqual([...PRICE_CHANGE_EVENTS])
    expect(PRICE_CHANGE_EVENTS).toEqual([
      "pricing.price.created",
      "pricing.price.updated",
      "pricing.price.deleted",
    ])
    const resolve = jest.fn()
    const saved = { ...process.env }
    delete process.env.ACROPORA_STOREFRONT_URL
    delete process.env.STOREFRONT_REVALIDATE_SECRET
    try {
      await priceChangedRevalidate({ container: { resolve }, event: { data: { id: "p" } } } as never)
      expect(resolve).not.toHaveBeenCalled()
    } finally {
      process.env = saved
    }
  })
})

/*
  THE STOREFRONT CACHE ON A STOCK CHANGE (FE-7 part 3). WHAT TURNS THIS RED:
  the subscriber listens to anything but the inventory module's level events
  (a reservation or a stock projection would leave a cached page "in stock"),
  the names drift from Medusa's own builder, or it calls without the settings.
*/
describe("the inventory subscriber", () => {
  it("listens to the inventory module's level events, named as Medusa builds them", async () => {
    expect(inventoryConfig.event).toEqual([...INVENTORY_CHANGE_EVENTS])
    expect(INVENTORY_CHANGE_EVENTS).toEqual([
      InventoryEvents.INVENTORY_LEVEL_CREATED,
      InventoryEvents.INVENTORY_LEVEL_UPDATED,
      InventoryEvents.INVENTORY_LEVEL_DELETED,
    ])
  })

  it("does nothing without the settings", async () => {
    const resolve = jest.fn()
    const saved = { ...process.env }
    delete process.env.ACROPORA_STOREFRONT_URL
    delete process.env.STOREFRONT_REVALIDATE_SECRET
    try {
      await inventoryChangedRevalidate({ container: { resolve }, event: { data: { id: "il" } } } as never)
      expect(resolve).not.toHaveBeenCalled()
    } finally {
      process.env = saved
    }
  })
})
