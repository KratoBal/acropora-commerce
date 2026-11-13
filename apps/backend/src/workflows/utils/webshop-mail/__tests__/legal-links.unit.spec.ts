import { FOGYASZTOBARAT_SWITCH, legalUrls } from "../legal-links"

/*
  WHAT TURNS THIS RED (the ASZF and privacy pages' addresses in the order confirmation, acrobot 50140). A link without the switch
  (the mail pointing at documents the shop does not serve yet); the switch read as on for anything but exactly `true`; one
  address without the other; the English mail linking the Hungarian pages (or the reverse); an http, malformed or empty
  storefront address producing a link; a path, query or credentials of the variable ending up in a link.
*/
describe("legalUrls", () => {
  const SHOP = "https://shop-staging.acropora.hu"
  const on = (extra: NodeJS.ProcessEnv = {}) => ({ ACROPORA_STOREFRONT_URL: SHOP, [FOGYASZTOBARAT_SWITCH]: "true", ...extra })

  it("is the two pages of the storefront in the mail's language", () => {
    expect(legalUrls(on(), "hu")).toEqual({ aszf: `${SHOP}/hu/jogi/aszf`, adatkezeles: `${SHOP}/hu/jogi/adatkezeles` })
    expect(legalUrls(on(), "en")).toEqual({
      aszf: `${SHOP}/en-hu/jogi/aszf`,
      adatkezeles: `${SHOP}/en-hu/jogi/adatkezeles`,
    })
  })

  it("is null unless the switch is exactly `true` (spaces around it are allowed)", () => {
    for (const value of [undefined, "", "false", "TRUE", "1", "yes", "on"])
      expect(legalUrls(on({ [FOGYASZTOBARAT_SWITCH]: value }), "hu")).toBeNull()
    expect(legalUrls(on({ [FOGYASZTOBARAT_SWITCH]: " true " }), "hu")).not.toBeNull()
  })

  it("is null without a usable https storefront address, and keeps only its origin", () => {
    for (const raw of [undefined, "", "   ", "http://shop-staging.acropora.hu", "nem url", "//shop.hu"])
      expect(legalUrls(on({ ACROPORA_STOREFRONT_URL: raw }), "hu")).toBeNull()
    expect(legalUrls(on({ ACROPORA_STOREFRONT_URL: `${SHOP}/hu/store?x=1#top` }), "hu")?.aszf).toBe(`${SHOP}/hu/jogi/aszf`)
    expect(legalUrls(on({ ACROPORA_STOREFRONT_URL: "https://user:secret@shop-staging.acropora.hu/" }), "hu")?.aszf).toBe(
      `${SHOP}/hu/jogi/aszf`
    )
  })

  it("carries nothing of an order", () => {
    const urls = legalUrls(on(), "hu")
    expect(`${urls?.aszf}${urls?.adatkezeles}`).not.toMatch(/[?#=&]/)
  })
})
