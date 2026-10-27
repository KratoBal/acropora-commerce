import { unitPriceFromName } from "../unit-price"
import { toMerchantItem, type MerchantFeedProduct, type MerchantFeedVariant } from "../merchant-feed-item"
// The storefront's copy: the two apps cannot import each other at runtime, so
// this test is the contract between them.
import { egysegarNevbol } from "../../../../storefront/src/lib/util/egysegar"

/**
 * THE UNIT PRICE FROM THE NAME (audit P1/3). What must fail: a unit price
 * written from an unclear name (two quantities, a multiplier, a dose in mg, a
 * dimension); a wrong base conversion (grams read as kilograms, ml as litres);
 * the storefront and the backend computing different results for the same
 * name; the feed carrying a measure for a name that has none, or none for one
 * that has; a price of zero producing a unit price.
 */
describe("the unit price from the name", () => {
  it.each([
    ["Aquaforest Pro Bio F 25g", 1250, { base: "kg", price: 50000, pack: "25 g", feedMeasure: "25g" }],
    ["Dr. Bassleer Bio haltáp - Excel Flake 70g", 2100, { base: "kg", price: 30000, pack: "70 g", feedMeasure: "70g" }],
    ["MICROBE-LIFT SPECIAL BLEND BAKTÉRIUMKULTÚRA 3785ml", 18900, { base: "l", price: 4993, pack: "3785 ml", feedMeasure: "3785ml" }],
    ["Ocean Nutrition Prime Reef Flake - lemezes haleledel 156gr", 1560, { base: "kg", price: 10000, pack: "156 g", feedMeasure: "156g" }],
    ["Tengeri só 20 kg", 20000, { base: "kg", price: 1000, pack: "20 kg", feedMeasure: "20kg" }],
    ["Vízkondicionáló 1,5 l", 3000, { base: "l", price: 2000, pack: "1,5 l", feedMeasure: "1.5l" }],
    ["Tápoldat 250 ML", 1000, { base: "l", price: 4000, pack: "250 ml", feedMeasure: "250ml" }],
  ])("%s => the unit price", (name, price, expected) => {
    expect(unitPriceFromName(name, price)).toEqual(expected)
  })

  it.each([
    ["no quantity", "Jebao PP-4 keringető"],
    ["two quantities", "Tápoldat 250 ml / 1 l kiszerelésben"],
    ["a multiplier before", "Eledel 4x25g"],
    ["a multiplier with spaces", "Eledel 2 x 50 ml"],
    ["a multiplier after", "Eledel 25g x 4"],
    ["a dose in mg, not a pack", "Blue Life Flux RX 2000mg"],
    ["a dimension", "D-D Jumpguard Pro kiugrásgátló 180x90cm"],
    ["a length", "Red Sea átlátszó háló 90cm*4m"],
    ["a quantity inside a word", "A100g termék kód"],
    ["a zero quantity", "Valami 0 ml"],
    ["a flow rate", "Jebao DW-16 áramoltató 16000 l/h"],
    ["a flow rate without a space", "Resun Wave Maker HWM2000 600l/h"],
    ["a flow rate before a code", "Octo Pulse4 17000 l/h áramoltató OP-4"],
    ["a flow rate with a tilde", "AI - Nero 7 Submersible Pump áramoltató ~ 15142 l/h"],
    ["a flow rate in parentheses", "Ecotech Marine Vortech MP10QD prémium áramoltató (9500l/h)"],
    ["a thousands separator and a rate", "Ecotech Marine Vortech MP40QD prémium áramoltató (19.000 l/h)"],
    ["a range", "Ultra Reef Skimmer 190 lehabzó (300-900l)"],
    ["a range with spaces", "Ultra Reef Skimmer 190 lehabzó (100 - 400 l)"],
    ["a range with an en dash", "Ultra Reef Skimmer lehabzó (200–500l)"],
    ["a thousands separator with a dot", "Tápoldat 19.000 ml"],
    ["a thousands separator, 1.000 g", "Só 1.000 g"],
    ["a thousands separator with a space", "Medence víz 19 000 l"],
    ["an empty name", ""],
  ])("%s => no unit price", (_why, name) => {
    expect(unitPriceFromName(name, 1000)).toBeNull()
  })

  it("no price, a zero price or a missing name gives none", () => {
    for (const price of [0, -5, null, undefined, Number.NaN]) {
      expect(unitPriceFromName("Eledel 25g", price as number)).toBeNull()
    }
    expect(unitPriceFromName(null, 1000)).toBeNull()
  })

  it("a number finer than two decimals gives the unit price but no feed measure", () => {
    const result = unitPriceFromName("Tápoldat 0,125 l", 1000)
    expect(result?.price).toBe(8000)
    expect(result?.feedMeasure).toBeNull()
  })
})

describe("the backend and the storefront agree", () => {
  it.each([
    "Aquaforest Pro Bio F 25g",
    "MICROBE-LIFT SPECIAL BLEND BAKTÉRIUMKULTÚRA 3785ml",
    "Vízkondicionáló 1,5 l",
    "Blue Life Flux RX 2000mg",
    "Eledel 4x25g",
    "Tápoldat 250 ml / 1 l kiszerelésben",
    "D-D Jumpguard Pro kiugrásgátló 180x90cm",
    "Tápoldat 0,125 l",
    "Jebao PP-4 keringető",
    "Jebao DW-16 áramoltató 16000 l/h",
    "Resun Wave Maker HWM2000 600l/h",
    "Octo Pulse4 17000 l/h áramoltató OP-4",
    "AI - Nero 7 Submersible Pump áramoltató ~ 15142 l/h",
    "Ecotech Marine Vortech MP10QD prémium áramoltató (9500l/h)",
    "Ecotech Marine Vortech MP40QD prémium áramoltató (19.000 l/h)",
    "Ultra Reef Skimmer 190 lehabzó (300-900l)",
    "Ultra Reef Skimmer 190 lehabzó (100 - 400 l)",
    "Ultra Reef Skimmer lehabzó (200–500l)",
    "Tápoldat 19.000 ml",
    "Só 1.000 g",
    "Medence víz 19 000 l",
  ])("%s", (name) => {
    const backend = unitPriceFromName(name, 4321)
    const storefront = egysegarNevbol(name, 4321)
    if (!backend) return expect(storefront).toBeNull()
    expect(storefront).toEqual({
      alap: backend.base,
      ar: backend.price,
      kiszereles: backend.pack,
      feedMertek: backend.feedMeasure,
    })
  })
})

describe("the feed item", () => {
  const variant = (over: Partial<MerchantFeedVariant> = {}): MerchantFeedVariant => ({
    id: "variant_1",
    sku: "AF-PRO-BIO-F",
    ean: null,
    upc: null,
    weight: null,
    manage_inventory: true,
    allow_backorder: false,
    options: [],
    calculated_price: { calculated_amount: 1250, original_amount: 1250, currency_code: "huf" },
    ...over,
  })
  const product = (title: string, over: Partial<MerchantFeedProduct> = {}): MerchantFeedProduct => ({
    id: "prod_1",
    handle: "x",
    title,
    description: "",
    thumbnail: "https://cdn.example/a.jpg",
    images: [{ url: "https://cdn.example/a.jpg" }],
    collection: null,
    variants: [variant()],
    ...over,
  })
  const context = { storefrontUrl: "https://shop.example", categories: {}, brands: {}, availability: { variant_1: 3 } }

  it("carries the measure where the name has exactly one clear quantity", () => {
    const item = toMerchantItem(product("Aquaforest Pro Bio F 25g"), variant(), context as never)
    expect(item?.unit_pricing_measure).toBe("25g")
  })

  it("carries none where the name is unclear", () => {
    for (const title of ["Jebao PP-4 keringető", "Eledel 4x25g", "Blue Life Flux RX 2000mg"]) {
      const item = toMerchantItem(product(title), variant(), context as never)
      expect(item).not.toBeNull()
      expect(item?.unit_pricing_measure).toBeUndefined()
    }
  })

  it("uses the whole title the feed sends: a variant option with a second quantity makes it unclear", () => {
    const second = variant({ id: "variant_2", sku: "X-250", options: [{ value: "250 ml" }] })
    const item = toMerchantItem(
      product("KZ Amino 100 ml", { variants: [variant(), second] }),
      second,
      context as never
    )
    expect(item?.title).toBe("KZ Amino 100 ml (250 ml)")
    expect(item?.unit_pricing_measure).toBeUndefined()
  })

  it("a variant whose option carries the only quantity gets the measure", () => {
    const second = variant({ id: "variant_2", sku: "X-250", options: [{ value: "250 ml" }] })
    const item = toMerchantItem(
      product("Tápoldat", { variants: [variant(), second] }),
      second,
      context as never
    )
    expect(item?.unit_pricing_measure).toBe("250ml")
  })
})
