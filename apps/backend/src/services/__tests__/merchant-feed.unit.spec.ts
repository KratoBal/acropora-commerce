import {
  availabilityOf,
  toMerchantItem,
  validGtin,
  variantGtin,
  type MerchantFeedContext,
  type MerchantFeedProduct,
  type MerchantFeedVariant,
} from "../merchant-feed-item"
import {
  MerchantFeedConfigError,
  loadMerchantItems,
} from "../merchant-feed-loader"
import { feedCache } from "../merchant-feed-cache"
import { escapeXml, merchantFeedXml } from "../merchant-feed-xml"

/*
  THE MERCHANT FEED (SEO P1-13). What turns these red: a feed item claiming
  more than the product page (a price or availability the page does not show,
  a GTIN with a bad check digit, a used item as new); an item Google would
  reject going out (no image, no id, no price); a product outside the shop's
  sales channel or not published in the feed; an XML that breaks on a
  character in a product name.
*/

const variant = (over: Partial<MerchantFeedVariant> = {}): MerchantFeedVariant => ({
  id: "variant_1",
  sku: "KZ-AMINO-100",
  ean: null,
  upc: null,
  weight: null,
  manage_inventory: true,
  allow_backorder: false,
  options: [],
  calculated_price: {
    calculated_amount: 12990,
    original_amount: 12990,
    currency_code: "huf",
  },
  ...over,
})

const product = (over: Partial<MerchantFeedProduct> = {}): MerchantFeedProduct => ({
  id: "prod_1",
  handle: "kz-amino-acid-high-concentrate-100-ml",
  title: "KZ Amino Acid High Concentrate 100 ml",
  description: "<p>Aminosav &amp; vitamin</p>",
  thumbnail: "https://cdn.example/kz-1.jpg",
  images: [{ url: "https://cdn.example/kz-1.jpg" }, { url: "https://cdn.example/kz-2.jpg" }],
  collection: { title: "Korallen-Zucht" },
  categories: [{ id: "cat_child" }],
  metadata: null,
  variants: [variant()],
  ...over,
})

const context = (over: Partial<MerchantFeedContext> = {}): MerchantFeedContext => ({
  storefrontUrl: "https://teszt.acropora.example",
  availability: { variant_1: 3 },
  brands: {},
  categories: {
    cat_root: { name: "Vegyszerek", parentId: null },
    cat_child: { name: "Nyomelemek", parentId: "cat_root" },
    cat_used: { name: "Használt eszközök", parentId: null },
    cat_used_pumps: { name: "Szivattyúk", parentId: "cat_used" },
    cat_used_pumps_dc: { name: "DC szivattyúk", parentId: "cat_used_pumps" },
  },
  ...over,
})

describe("toMerchantItem", () => {
  it("MF-ITEM: one variant, the page's link, price, images and path", () => {
    const item = toMerchantItem(product(), variant(), context())
    expect(item).toEqual({
      id: "KZ-AMINO-100",
      title: "KZ Amino Acid High Concentrate 100 ml",
      description: "Aminosav & vitamin",
      link: "https://teszt.acropora.example/hu/termek/kz-amino-acid-high-concentrate-100-ml",
      image_link: "https://cdn.example/kz-1.jpg",
      additional_image_link: ["https://cdn.example/kz-2.jpg"],
      price: "12990.00 HUF",
      availability: "in_stock",
      condition: "new",
      brand: "Korallen-Zucht",
      identifier_exists: "no",
      product_type: "Vegyszerek > Nyomelemek",
    })
  })

  it("MF-SALE: a lower calculated price is the sale price, the original the price", () => {
    const item = toMerchantItem(
      product(),
      variant({
        calculated_price: {
          calculated_amount: 9990,
          original_amount: 12990,
          currency_code: "huf",
        },
      }),
      context()
    )
    expect(item?.price).toBe("12990.00 HUF")
    expect(item?.sale_price).toBe("9990.00 HUF")
  })

  it("MF-SKIP: no sku, no image or no price leaves the variant out", () => {
    expect(toMerchantItem(product(), variant({ sku: " " }), context())).toBeNull()
    expect(
      toMerchantItem(product({ thumbnail: null, images: [] }), variant(), context())
    ).toBeNull()
    expect(
      toMerchantItem(product(), variant({ calculated_price: null }), context())
    ).toBeNull()
  })

  it("MF-GROUP: a multi-variant product groups by handle and names the option", () => {
    const second = variant({ id: "variant_2", sku: "KZ-AMINO-250", options: [{ value: "250 ml" }] })
    const item = toMerchantItem(
      product({ variants: [variant(), second] }),
      second,
      context({ availability: { variant_2: 1 } })
    )
    expect(item?.item_group_id).toBe("kz-amino-acid-high-concentrate-100-ml")
    expect(item?.title).toBe("KZ Amino Acid High Concentrate 100 ml (250 ml)")
    expect(toMerchantItem(product(), variant(), context())?.item_group_id).toBeUndefined()
  })

  it("MF-BRAND: the brand module wins over the collection", () => {
    const item = toMerchantItem(product(), variant(), context({ brands: { prod_1: "KZ" } }))
    expect(item?.brand).toBe("KZ")
    expect(
      toMerchantItem(product({ collection: null }), variant(), context())?.brand
    ).toBeUndefined()
  })

  it("MF-GTIN: a valid ean or upc is the gtin; a bad one is no identifier", () => {
    const withEan = toMerchantItem(product(), variant({ ean: "4006381333931" }), context())
    expect(withEan?.gtin).toBe("4006381333931")
    expect(withEan?.identifier_exists).toBeUndefined()
    const badEan = toMerchantItem(product(), variant({ ean: "4006381333932" }), context())
    expect(badEan?.gtin).toBeUndefined()
    expect(badEan?.identifier_exists).toBe("no")
    expect(variantGtin({ ean: "4006381333932", upc: "036000291452" })).toBe("036000291452")
  })

  it("MF-USED: a product under a used category is used", () => {
    const item = toMerchantItem(
      product({ categories: [{ id: "cat_used" }] }),
      variant(),
      context()
    )
    expect(item?.condition).toBe("used")
  })

  it("MF-LONGEST: the storefront's path, the longest chain, not the primary category", () => {
    // the page's breadcrumb (`besorolasUt`) takes the longest chain, so a
    // shorter used category does not make the item used here either
    const shorterUsed = toMerchantItem(
      product({
        categories: [{ id: "cat_used" }, { id: "cat_child" }],
        metadata: { primary_category_id: "cat_used" },
      }),
      variant(),
      context()
    )
    expect(shorterUsed?.product_type).toBe("Vegyszerek > Nyomelemek")
    expect(shorterUsed?.condition).toBe("new")
    const longerUsed = toMerchantItem(
      product({ categories: [{ id: "cat_child" }, { id: "cat_used_pumps_dc" }] }),
      variant(),
      context()
    )
    expect(longerUsed?.product_type).toBe("Használt eszközök > Szivattyúk > DC szivattyúk")
    expect(longerUsed?.condition).toBe("used")
  })

  it("MF-HIDDEN: a category missing from the tree (internal, inactive) is no path", () => {
    expect(
      toMerchantItem(product({ categories: [{ id: "cat_internal" }] }), variant(), context())
        ?.product_type
    ).toBeUndefined()
  })

  it("MF-WEIGHT: a weight in grams is the shipping weight", () => {
    expect(
      toMerchantItem(product(), variant({ weight: 250 }), context())?.shipping_weight
    ).toBe("250 g")
  })
})

describe("availabilityOf", () => {
  it("MF-AVAIL: the storefront's inStock rule, the backorder named", () => {
    expect(availabilityOf({ manage_inventory: true, allow_backorder: false }, 2)).toBe("in_stock")
    expect(availabilityOf({ manage_inventory: false, allow_backorder: false }, 0)).toBe("in_stock")
    expect(availabilityOf({ manage_inventory: true, allow_backorder: true }, 0)).toBe("backorder")
    expect(availabilityOf({ manage_inventory: true, allow_backorder: false }, 0)).toBe("out_of_stock")
  })
})

describe("validGtin", () => {
  it("MF-CHECKDIGIT: the GS1 check digit on 8, 12, 13 and 14 digits", () => {
    for (const code of ["96385074", "036000291452", "4006381333931", "10012345678902"])
      expect(validGtin(code)).toBe(true)
    for (const code of ["96385075", "4006381333932", "123", "40063813339a1"])
      expect(validGtin(code)).toBe(false)
  })
})

describe("merchantFeedXml", () => {
  it("MF-XML: RSS with the g: namespace, repeated images, escaped text", () => {
    const item = toMerchantItem(
      product({ title: 'Tunze <Turbelle> & "nano"' }),
      variant(),
      context()
    )!
    const xml = merchantFeedXml([item], {
      title: "Acropora",
      link: "https://teszt.acropora.example/hu",
      description: "Acropora termékek",
    })
    expect(xml).toContain('xmlns:g="http://base.google.com/ns/1.0"')
    expect(xml).toContain("<g:title>Tunze &lt;Turbelle&gt; &amp; &quot;nano&quot;</g:title>")
    expect(xml).toContain("<g:additional_image_link>https://cdn.example/kz-2.jpg</g:additional_image_link>")
    expect(xml).toContain("<g:price>12990.00 HUF</g:price>")
    expect(xml.match(/<item>/g)).toHaveLength(1)
  })

  it("MF-CONTROL: control characters that XML cannot carry are dropped", () => {
    expect(escapeXml("a\u0007b\tc")).toBe("ab\tc")
  })
})

describe("loadMerchantItems", () => {
  const fakeQuery = (products: unknown[]) => {
    const calls: { entity: string; filters?: unknown; pagination?: unknown }[] = []
    const query = {
      graph: async (args: { entity: string; filters?: unknown; pagination?: { skip: number } }) => {
        calls.push({ entity: args.entity, filters: args.filters, pagination: args.pagination })
        if (args.entity === "store")
          return { data: [{ default_region_id: "reg_hu", default_sales_channel_id: "sc_shop" }] }
        if (args.entity === "region") return { data: [{ id: "reg_hu", currency_code: "huf" }] }
        if (args.entity === "product_category")
          return { data: [{ id: "cat_child", name: "Nyomelemek", parent_category_id: null }] }
        if (args.entity === "product")
          return { data: (args.pagination?.skip ?? 0) === 0 ? products : [] }
        // getVariantAvailability's own reads: no inventory links, no locations
        return { data: [] }
      },
    }
    return { query, calls }
  }
  const brands = {
    listProductBrands: async () => [{ product_id: "prod_1", os_brand_id: "os_kz" }],
    listBrands: async () => [{ os_brand_id: "os_kz", name: "KZ" }],
  }

  it("MF-LOAD: only the default channel's products, priced, with the brand module's name", async () => {
    const { query, calls } = fakeQuery([
      { ...product(), sales_channels: [{ id: "sc_shop" }] },
      { ...product({ id: "prod_2", variants: [variant({ id: "variant_9", sku: "OTHER" })] }), sales_channels: [{ id: "sc_pos" }] },
    ])
    const items = await loadMerchantItems(
      { query: query as never, brands },
      { storefrontUrl: "https://teszt.acropora.example/" }
    )
    expect(items.map((i) => i.id)).toEqual(["KZ-AMINO-100"])
    expect(items[0].brand).toBe("KZ")
    expect(items[0].link.startsWith("https://teszt.acropora.example/hu/termek/")).toBe(true)
    expect(calls.find((c) => c.entity === "product")?.filters).toEqual({ status: "published" })
  })

  it("MF-ORDER: paging has a total order, the id breaking created_at ties", async () => {
    const { query, calls } = fakeQuery([])
    await loadMerchantItems(
      { query: query as never, brands },
      { storefrontUrl: "https://teszt.acropora.example" }
    )
    expect(calls.find((c) => c.entity === "product")?.pagination).toEqual({
      skip: 0,
      take: 200,
      order: { created_at: "ASC", id: "ASC" },
    })
  })

  it("MF-CATEGORIES: only active, public categories, as the Store API gives them", async () => {
    const { query, calls } = fakeQuery([])
    await loadMerchantItems(
      { query: query as never, brands },
      { storefrontUrl: "https://teszt.acropora.example" }
    )
    expect(calls.find((c) => c.entity === "product_category")?.filters).toEqual({
      is_active: true,
      is_internal: false,
    })
  })

  it("MF-NOURL: without a storefront URL the feed refuses instead of relative links", async () => {
    const { query } = fakeQuery([])
    await expect(
      loadMerchantItems({ query: query as never, brands }, { storefrontUrl: "" })
    ).rejects.toBeInstanceOf(MerchantFeedConfigError)
  })
})

describe("feedCache", () => {
  it("MF-CACHE: one build per window, shared while running, a failure not kept", async () => {
    let clock = 0
    let builds = 0
    const cached = feedCache(1000, () => clock)
    const build = async () => `feed-${++builds}`
    expect(await Promise.all([cached(build), cached(build)])).toEqual(["feed-1", "feed-1"])
    clock = 999
    expect(await cached(build)).toBe("feed-1")
    clock = 1000
    expect(await cached(build)).toBe("feed-2")
    clock = 5000
    await expect(cached(async () => Promise.reject(new Error("db down")))).rejects.toThrow("db down")
    expect(await cached(build)).toBe("feed-3")
  })
})
