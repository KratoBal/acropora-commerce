/**
 * THE MEDUSA CLOUD PLUGIN IS NOT LOADED (2026-11-23). Since 2.22.7 `defineConfig` adds @medusajs/cloud to every project, and that plugin makes the
 * server fetch https://api.prod.medusajs.cloud/v1/announcements for the admin's "What's new" list: a call to a third party. What must fail: the
 * `plugins` entry with `disabled: true` leaving `medusa-config.ts` (the plugin is back in the resolved list), or a framework update that stops
 * honouring the option (the list then still holds it). The draft-order plugin, the other default, must stay: the entry takes nothing else away.
 */
const resolvedPlugins = () => {
  let config: any
  jest.isolateModules(() => {
    config = require("../../../../medusa-config")
  })
  return (config.plugins ?? []).map((plugin: any) => (typeof plugin === "string" ? plugin : plugin.resolve))
}

describe("medusa-config and the Medusa Cloud plugin", () => {
  it("the resolved plugin list does not hold @medusajs/cloud", () => {
    expect(resolvedPlugins()).not.toContain("@medusajs/cloud")
  })

  it("the other default plugin stays: the draft-order plugin", () => {
    expect(resolvedPlugins()).toContain("@medusajs/draft-order")
  })
})
