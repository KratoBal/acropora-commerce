import { orderViewUrl } from "../order-view-url"

/*
  WHAT TURNS THIS RED (the guest order page's address in the mails, acrobot 43870). A link to a page that is not the
  guest order page; the English mail linking to the Hungarian page (or the reverse); an http, malformed or empty
  storefront address producing a link; a path, query or credentials of the variable ending up in the link; a link
  carrying anything of the order.
*/
describe("orderViewUrl", () => {
  const SHOP = "https://shop-staging.acropora.hu"

  it("is the guest order page of the storefront in the mail's language", () => {
    expect(orderViewUrl({ ACROPORA_STOREFRONT_URL: SHOP }, "hu")).toBe(`${SHOP}/hu/rendeles-megtekintese`)
    expect(orderViewUrl({ ACROPORA_STOREFRONT_URL: SHOP }, "en")).toBe(`${SHOP}/en-hu/rendeles-megtekintese`)
  })

  it("keeps only the ORIGIN of the variable: a path, a query, a fragment and credentials are dropped", () => {
    for (const raw of [
      `${SHOP}/`,
      `${SHOP}/hu/store?x=1#top`,
      "https://user:secret@shop-staging.acropora.hu/",
      `  ${SHOP}  `,
    ])
      expect(orderViewUrl({ ACROPORA_STOREFRONT_URL: raw }, "hu")).toBe(`${SHOP}/hu/rendeles-megtekintese`)
  })

  it("is null without a usable https address", () => {
    for (const raw of [undefined, "", "   ", "http://shop-staging.acropora.hu", "nem url", "ftp://x.hu", "//shop.hu"])
      expect(orderViewUrl({ ACROPORA_STOREFRONT_URL: raw }, "hu")).toBeNull()
  })

  it("carries nothing of the order", () => {
    expect(orderViewUrl({ ACROPORA_STOREFRONT_URL: SHOP }, "hu")).not.toMatch(/[?#=&]/)
  })
})
