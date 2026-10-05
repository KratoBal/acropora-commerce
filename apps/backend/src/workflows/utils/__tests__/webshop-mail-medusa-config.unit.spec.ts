/**
 * THE SWITCH REACHES THE REAL CONFIG, AND TAKES NOTHING AWAY. What must fail:
 * `medusa-config.ts` not spreading `webshopMailModules()` (the switch would do
 * nothing); the switch, off, changing Medusa's default notification module;
 * the switch, on, dropping the default's local `feed` provider (the admin
 * feed), which a declared entry replaces.
 */
import { MEDUSA_DEFAULT_FEED_PROVIDER } from "../webshop-mail-config"

const KEYS = {
  ACROPORA_WEBSHOP_MAIL: "on",
  GMAIL_WEBSHOP_CLIENT_ID: "client",
  GMAIL_WEBSHOP_CLIENT_SECRET: "secret",
  GMAIL_WEBSHOP_REFRESH_TOKEN: "refresh",
}

const notificationEntries = (env: Record<string, string>) => {
  const saved = { ...process.env }
  Object.assign(process.env, env)
  try {
    let config: any
    jest.isolateModules(() => {
      config = require("../../../../medusa-config")
    })
    const modules = config.modules
    const list = Array.isArray(modules) ? modules : Object.values(modules ?? {})
    return list.filter((m: any) => m?.resolve === "@medusajs/medusa/notification")
  } finally {
    for (const key of Object.keys(env)) delete process.env[key]
    Object.assign(process.env, saved)
  }
}

describe("medusa-config and the webshop mail switch", () => {
  it("off: Medusa's default stands, the local feed provider alone", () => {
    const entries = notificationEntries({ ACROPORA_WEBSHOP_MAIL: "off" })
    expect(entries).toHaveLength(1)
    expect(entries[0].options.providers).toEqual([MEDUSA_DEFAULT_FEED_PROVIDER])
  })

  it("on with keys: one notification module, the feed provider kept, Gmail on email", () => {
    const entries = notificationEntries(KEYS)
    expect(entries).toHaveLength(1)
    expect(entries[0].options.providers.map((p: any) => [p.resolve, p.options.channels])).toEqual([
      ["@medusajs/medusa/notification-local", ["feed"]],
      ["./src/modules/gmail-notification", ["email"]],
    ])
  })
})
