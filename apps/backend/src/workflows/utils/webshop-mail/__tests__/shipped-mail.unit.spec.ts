import { renderShippedMail, type ShippedMailFacts } from "../shipped-mail"
import {
  categoryChains,
  foxpostLogoUrl,
  inFallbackScope,
  prepareShippedMail,
  shippedKey,
  usageExcerpt,
  USAGE_GUIDE_LIMITS,
  type ProductGuideSource,
  type ShippedOrder,
} from "../shipped"
import { AdminOrderShippingNotice } from "../../../../api/admin/order-shipping-notice/validators"
import middlewares from "../../../../api/middlewares"

/**
 * THE "FELADTUK" MAIL (Foxpost brief point 12; Figma 488:109 / 488:131 /
 * 488:150). MI PIROSÍT: ha a levél követési szám nélkül, vagy kikapcsolt
 * csatornán menne; ha ugyanarra a csomagra kétszer; ha utánvétnél nem a pontos
 * összeg állna; ha a kezelési díj tételként szerepelne; ha gombot kapna
 * követési cím nélkül; ha kézbesítési napot ígérne; ha a FOXPOST logó nem
 * https címről jönne.
 */
const NBSP = " "
const ON = {
  ACROPORA_WEBSHOP_MAIL: "on",
  GMAIL_WEBSHOP_CLIENT_ID: "a",
  GMAIL_WEBSHOP_CLIENT_SECRET: "b",
  GMAIL_WEBSHOP_REFRESH_TOKEN: "c",
  ACROPORA_WEBSHOP_URL: "https://shop-staging.acropora.hu",
}

const rendeles = (over: Partial<ShippedOrder> = {}): ShippedOrder => ({
  id: "order_42",
  display_id: 42,
  email: "vevo@example.test",
  total: 12100,
  cash_on_delivery: true,
  items: [
    { title: "Hanna HI780-25", quantity: 1, fee: false },
    { title: "Utánvét kezelési díj", quantity: 1, fee: true },
  ],
  method_name: "Foxpost csomagpont",
  foxpost_point: { name: "FOXPOST A-BOX Bp. 02. ker. Budagyöngye", address: "1026 Budapest, Szilágyi E. fasor 121." },
  gls_point: null,
  shipping_address: "1111 Budapest, Teszt utca 1.",
  ...over,
})

const deps = (order: ShippedOrder | null, sent = false) => ({
  loadOrder: jest.fn(async () => order),
  alreadySent: jest.fn(async () => sent),
})

describe("when the shipping mail goes", () => {
  it("FOXPOST, cash on delivery: the point, the barcode, the exact amount, the fee not as an item", async () => {
    const result = await prepareShippedMail("order_42", { carrier: "foxpost", tracking_number: "CLFOX123456789" }, deps(rendeles()), ON)
    expect(result.status).toBe("send")
    const mail = (result as { mail: { idempotency_key: string; template: string; content: { subject: string; text: string; html: string } } }).mail
    expect(mail.template).toBe("order-shipped")
    expect(mail.idempotency_key).toBe(shippedKey("order_42", "CLFOX123456789"))
    expect(mail.content.subject).toBe("Feladtuk a csomagodat (#42)")
    expect(mail.content.text).toContain("FOXPOST – Packeta Group")
    expect(mail.content.text).toContain("FOXPOST A-BOX Bp. 02. ker. Budagyöngye · 1026 Budapest, Szilágyi E. fasor 121.")
    expect(mail.content.text).toContain("Követési szám: CLFOX123456789")
    expect(mail.content.text).toContain(`ÁTVÉTELKOR FIZETENDŐ: 12${NBSP}100 Ft`)
    expect(mail.content.text).toContain("- Hanna HI780-25 × 1")
    expect(mail.content.text).not.toContain("kezelési díj ×")
    expect(mail.content.html).toContain('src="https://shop-staging.acropora.hu/images/foxpost-packeta-group.png"')
  })

  it("no tracking address: no button, the number alone; no delivery day promised", async () => {
    const result = await prepareShippedMail("order_42", { carrier: "foxpost", tracking_number: "CLFOX1" }, deps(rendeles()), ON)
    const { text, html } = (result as { mail: { content: { text: string; html: string } } }).mail.content
    expect(html).not.toContain("Csomag követése")
    expect(text).not.toMatch(/holnap|munkanap|napon belül|kézbesítjük|érkezik/i)
    const withUrl = await prepareShippedMail(
      "order_42",
      { carrier: "foxpost", tracking_number: "CLFOX1", tracking_url: "https://example.test/k/CLFOX1" },
      deps(rendeles()),
      ON
    )
    expect((withUrl as { mail: { content: { html: string } } }).mail.content.html).toContain(
      'href="https://example.test/k/CLFOX1"'
    )
  })

  it("GLS: a point by its name, home by the address; card payment has no amount due", async () => {
    const pont = await prepareShippedMail(
      "order_42",
      { carrier: "gls", tracking_number: "GLS1" },
      deps(rendeles({ cash_on_delivery: false, foxpost_point: null, gls_point: { name: "GLS ParcelShop Teszt", address: "1111 Budapest, X u. 1." } })),
      ON
    )
    const ptext = (pont as { mail: { content: { text: string } } }).mail.content.text
    expect(ptext).toContain("GLS csomagpont")
    expect(ptext).toContain("GLS ParcelShop Teszt")
    expect(ptext).not.toContain("ÁTVÉTELKOR")
    const haz = await prepareShippedMail(
      "order_42",
      { carrier: "gls", tracking_number: "GLS2" },
      deps(rendeles({ foxpost_point: null, method_name: "GLS házhozszállítás" })),
      ON
    )
    const htext = (haz as { mail: { content: { text: string } } }).mail.content.text
    expect(htext).toContain("GLS házhozszállítás")
    expect(htext).toContain("1111 Budapest, Teszt utca 1.")
  })

  /**
   * THE GLS BRANDING (the GLS prompt, point 12; Figma 508:594, 508:613): the
   * point's own kind's logo, the general GLS logo at home, from the
   * storefront's images; no image without the storefront's address.
   */
  it("GLS: the logo of the point's kind, the general one at home, none without the storefront", async () => {
    const html = async (order: Parameters<typeof rendeles>[0], env = ON) =>
      ((await prepareShippedMail("order_42", { carrier: "gls", tracking_number: "GLS9" }, deps(rendeles(order)), env)) as {
        mail: { content: { html: string } }
      }).mail.content.html
    const pont = (type: string | null) => ({
      foxpost_point: null,
      gls_point: { name: "Pont", address: "1111 Budapest, X u. 1.", type },
    })
    const base = new URL(ON.ACROPORA_WEBSHOP_URL!).origin
    expect(await html(pont("parcel-locker"))).toContain(`<img src="${base}/images/gls-automata.png" alt="GLS Automata"`)
    expect(await html(pont("parcel-shop"))).toContain(`<img src="${base}/images/gls-csomagpont.png" alt="GLS Csomagpont"`)
    // an order saved before the kind was stored: the Csomagpont logo
    expect(await html(pont(null))).toContain("/images/gls-csomagpont.png")
    expect(await html({ foxpost_point: null, method_name: "GLS házhozszállítás" })).toContain(
      `<img src="${base}/images/gls.png" alt="GLS"`
    )
    const { ACROPORA_WEBSHOP_URL: _ignored, ...withoutStorefront } = ON
    expect(await html(pont("parcel-locker"), withoutStorefront as typeof ON)).not.toContain("<img")
    // a Foxpost parcel never gets a GLS logo
    const fox = (await prepareShippedMail("order_42", { carrier: "foxpost", tracking_number: "F1" }, deps(rendeles()), ON)) as {
      mail: { content: { html: string } }
    }
    expect(fox.mail.content.html).not.toContain("/images/gls")
  })

  it("the OS renders from the same facts as the built-in text, the GLS logo and the point's kind included", async () => {
    const result = (await prepareShippedMail(
      "order_42",
      { carrier: "gls", tracking_number: "GLS9" },
      deps(rendeles({ foxpost_point: null, gls_point: { name: "Pont", address: "1111 Budapest, X u. 1.", type: "parcel-locker" } })),
      ON
    )) as { mail: { render: { template: string; facts: { shipped: Record<string, unknown> } } } }
    const base = new URL(ON.ACROPORA_WEBSHOP_URL!).origin
    expect(result.mail.render.template).toBe("order-shipped")
    expect(result.mail.render.facts.shipped).toMatchObject({
      carrier: "gls",
      gls_point: true,
      gls_logo_url: `${base}/images/gls-automata.png`,
      gls_point_type: "parcel-locker",
    })
  })

  it("not sent: unknown order, switched off, no address, already sent for this parcel", async () => {
    expect(await prepareShippedMail("x", { carrier: "foxpost", tracking_number: "1" }, deps(null), ON)).toEqual({ status: "not_found" })
    expect(await prepareShippedMail("x", { carrier: "foxpost", tracking_number: "1" }, deps(rendeles()), {})).toEqual({
      status: "skip",
      reason: "mail_off",
    })
    expect(await prepareShippedMail("x", { carrier: "foxpost", tracking_number: "1" }, deps(rendeles({ email: " " })), ON)).toEqual({
      status: "skip",
      reason: "no_email",
    })
    const d = deps(rendeles(), true)
    expect(await prepareShippedMail("order_42", { carrier: "foxpost", tracking_number: "1" }, d, ON)).toEqual({
      status: "skip",
      reason: "already_sent",
    })
    expect(d.alreadySent).toHaveBeenCalledWith("order-shipped:order_42:1")
  })

  // MI PIROSÍT: ha az OS álszolgáltatójának STUB- száma levélbe kerülne (nautilus 26359)
  it("a STUB- parcel number never goes into a mail, whatever the case or the channel", async () => {
    for (const tracking_number of ["STUB-FOXPOST-1A2B3C4D5E6F", " stub-gls-0001 "]) {
      const d = deps(rendeles())
      expect(await prepareShippedMail("order_42", { carrier: "foxpost", tracking_number }, d, ON)).toEqual({
        status: "skip",
        reason: "stub_parcel",
      })
      expect(d.alreadySent).not.toHaveBeenCalled()
      expect(await prepareShippedMail("order_42", { carrier: "gls", tracking_number }, deps(rendeles()), {})).toEqual({
        status: "skip",
        reason: "stub_parcel",
      })
    }
    // KONTROLL: egy valódi szám, ami csak tartalmazza a szót, megy
    const real = await prepareShippedMail("order_42", { carrier: "foxpost", tracking_number: "CLFOXSTUB0001" }, deps(rendeles()), ON)
    expect(real.status).toBe("send")
  })

  it("the logo only from an https storefront address", () => {
    expect(foxpostLogoUrl({})).toBeNull()
    expect(foxpostLogoUrl({ ACROPORA_WEBSHOP_URL: "http://shop.test" })).toBeNull()
    expect(foxpostLogoUrl({ ACROPORA_WEBSHOP_URL: "https://shop.test/hu" })).toBe("https://shop.test/images/foxpost-packeta-group.png")
  })

  it("escapes the point name in the HTML", () => {
    const facts: ShippedMailFacts = {
      display_id: 1,
      carrier: "foxpost",
      destination_title: "<b>pont</b>",
      destination_address: "",
      gls_point: false,
      tracking_number: "X",
      tracking_url: null,
      items: [],
      cod_amount: null,
      foxpost_logo_url: null,
    }
    expect(renderShippedMail(facts).html).not.toContain("<b>pont</b>")
  })
})

/*
  V3.3 (card 69b5f2ef, korall's spec): the parcel's usage guides in the facts. WHAT TURNS THIS RED: a guide for a fee line or a
  product twice; the parcel's order lost; case A without its dose, B without its excerpt, C without its link, D outside the
  treatments let through or inside dropped; a parcel of treatments in case D only sending the key; a link that is not the
  storefront's https product page; a failed lookup failing the mail; the key present with no guide (the facts would change for
  every parcel).
*/
describe("the parcel's usage guides", () => {
  const order = rendeles({
    items: [
      { title: "KZ Amino", quantity: 2, fee: false, product_id: "prod_a", product_handle: "kz-amino" },
      { title: "Hanna HI780-25", quantity: 1, fee: false, product_id: "prod_b", product_handle: "hanna-hi780" },
      { title: "KZ Amino", quantity: 1, fee: false, product_id: "prod_a", product_handle: "kz-amino" },
      { title: "Utánvét kezelési díj", quantity: 1, fee: true, product_id: "prod_fee", product_handle: null },
      { title: "Red Sea Kalcium", quantity: 1, fee: false, product_id: "prod_c", product_handle: "rs-ca" },
      { title: "NoPox", quantity: 1, fee: false, product_id: "prod_d", product_handle: "nopox" },
      { title: "Szivattyú", quantity: 1, fee: false, product_id: "prod_e", product_handle: "pumpa" },
    ],
  })
  const src = (s: Partial<ProductGuideSource>): ProductGuideSource => ({
    usage: null,
    dosing: null,
    categories: [],
    ...s,
  })
  const shippedFacts = async (
    guides: ((ids: string[]) => Promise<Map<string, ProductGuideSource>>) | undefined
  ) =>
    ((await prepareShippedMail(
      "order_42",
      { carrier: "foxpost", tracking_number: "CLFOX1" },
      { ...deps(order), ...(guides ? { usageGuides: jest.fn(guides) } : {}) },
      ON
    )) as { mail: { render: { facts: { shipped: Record<string, unknown> } } } }).mail.render.facts.shipped
  const treatment = [["Termékek", "Problémamegoldás", "Nitrátmegkötők"]]

  it("the four cases, each product once, in the parcel's order, with its product page", async () => {
    const lookup = jest.fn(async (ids: string[]) => {
      expect([...ids].sort()).toEqual(["prod_a", "prod_b", "prod_c", "prod_d", "prod_e"])
      return new Map([
        ["prod_a", src({ usage: "Mire való: aminosav-pótlás.\n\n1. Rázd fel.", dosing: "1 drop/100 L/day" })],
        ["prod_b", src({ usage: "Rázd fel.\nMérd ki.\n\nHa kétséges, kevesebbel kezdj." })],
        ["prod_c", src({ dosing: "5 ml/100 L/day", categories: [["Termékek", "Nyomelemek"]] })],
        ["prod_d", src({ categories: treatment })],
        ["prod_e", src({ categories: [["Termékek", "Áramoltatás"]] })],
      ])
    })
    const shipped = await shippedFacts(lookup)
    const page = (h: string) => `https://shop-staging.acropora.hu/hu/termek/${h}`
    expect(shipped.usage_guides).toEqual([
      { title: "KZ Amino", excerpt: "aminosav-pótlás.", dosing: ["1 drop/100 L/day"], url: page("kz-amino") },
      { title: "Hanna HI780-25", excerpt: "Rázd fel. Mérd ki.", url: page("hanna-hi780") },
      {
        title: "Red Sea Kalcium",
        excerpt: "",
        dosing: ["5 ml/100 L/day"],
        fallback_scope: true,
        url: page("rs-ca"),
      },
      { title: "NoPox", excerpt: "", fallback_scope: true, url: page("nopox") },
    ])
  })

  it("only treatments with neither excerpt nor dose, no lookup, or a failed lookup: no key, the mail goes as today", async () => {
    expect(await shippedFacts(async () => new Map([["prod_d", src({ categories: treatment })]]))).not.toHaveProperty(
      "usage_guides"
    )
    expect(await shippedFacts(async () => new Map())).not.toHaveProperty("usage_guides")
    expect(await shippedFacts(undefined)).not.toHaveProperty("usage_guides")
    expect(
      await shippedFacts(async () => {
        throw new Error("module down")
      })
    ).not.toHaveProperty("usage_guides")
  })

  it("a text with a placeholder gives no excerpt, so it never goes out", async () => {
    const shipped = await shippedFacts(
      async () => new Map([["prod_a", src({ usage: "Mire való: aminosav.\nForrás: [KITÖLTENDŐ: hivatkozás]" })]])
    )
    expect(shipped).not.toHaveProperty("usage_guides")
  })

  /*
    THE EXCERPT (spec point 3 and 6). WHAT TURNS THIS RED: the label kept in the excerpt; the next label's text pulled in; the
    first paragraph not used without the label; a long text cut in the middle of a sentence or over the limit; a first sentence
    over the limit not cut on a word.
  */
  it("the excerpt is the Mire való part up to the next label, else the first paragraph, cut after a whole sentence", () => {
    expect(
      usageExcerpt("Mire való: nitrifikáló baktériumok\nkeveréke.\nAdagolás (a gyártó szerint): 1 ml / 100 liter.")
    ).toBe("nitrifikáló baktériumok keveréke.")
    expect(usageExcerpt("Bevezető.\n\nMIRE VALÓ. Kalciumot pótol.\n\nHogyan: rázd fel.")).toBe("Kalciumot pótol.")
    expect(usageExcerpt("\n\n  Első  sor\nmásodik.\n\nMásik bekezdés.")).toBe("Első sor második.")
    const sentence = "Ez egy hosszabb mondat a korallok táplálásáról és a víz minőségéről."
    const long = usageExcerpt(`Mire való: ${Array.from({ length: 10 }, () => sentence).join(" ")}`)
    expect(long.length).toBeLessThanOrEqual(USAGE_GUIDE_LIMITS.excerpt)
    expect(long).toMatch(/minőségéről\.$/)
    // as many whole sentences as fit: one more would go over the limit
    expect(long.length + 1 + sentence.length).toBeGreaterThan(USAGE_GUIDE_LIMITS.excerpt)
    const word = usageExcerpt("szó ".repeat(200))
    expect(word.length).toBeLessThanOrEqual(USAGE_GUIDE_LIMITS.excerpt + 1)
    expect(word).toMatch(/szó…$/)
  })

  /*
    THE FALLBACK SCOPE (spec points 4 and 8). WHAT TURNS THIS RED: a product under a treatment category (at any depth) not in
    scope; equipment in scope; a looping or broken parent link hanging or throwing.
  */
  it("the fallback scope follows the category chain, at any depth", () => {
    const tree = new Map([
      ["c_root", { name: "Termékek", parentId: null }],
      ["c_viz", { name: "Vízkezelés", parentId: "c_root" }],
      ["c_fosz", { name: "Foszfátmegkötők - Vízkezelés", parentId: "c_viz" }],
      ["c_rowa", { name: "Rowa", parentId: "c_fosz" }],
      ["c_pumpa", { name: "Áramoltatás", parentId: "c_root" }],
      ["c_loop1", { name: "Egy", parentId: "c_loop2" }],
      ["c_loop2", { name: "Kettő", parentId: "c_loop1" }],
    ])
    expect(categoryChains(["c_rowa"], tree)).toEqual([["Termékek", "Vízkezelés", "Foszfátmegkötők - Vízkezelés", "Rowa"]])
    expect(inFallbackScope(categoryChains(["c_rowa"], tree))).toBe(true)
    expect(inFallbackScope(categoryChains(["c_pumpa"], tree))).toBe(false)
    expect(inFallbackScope(categoryChains(["c_pumpa", "c_rowa"], tree))).toBe(true)
    expect(categoryChains(["c_loop1", "c_missing"], tree)).toEqual([["Kettő", "Egy"]])
  })
})

describe("the shipping notice body", () => {
  it("strict: known carriers, a barcode, https tracking only, nothing else", () => {
    expect(AdminOrderShippingNotice.safeParse({ carrier: "foxpost", tracking_number: "CLFOX1" }).success).toBe(true)
    expect(AdminOrderShippingNotice.safeParse({ carrier: "dhl", tracking_number: "1" }).success).toBe(false)
    expect(AdminOrderShippingNotice.safeParse({ carrier: "gls", tracking_number: "" }).success).toBe(false)
    expect(
      AdminOrderShippingNotice.safeParse({ carrier: "gls", tracking_number: "1", tracking_url: "http://x.test" }).success
    ).toBe(false)
    expect(AdminOrderShippingNotice.safeParse({ carrier: "gls", tracking_number: "1", extra: 1 }).success).toBe(false)
  })

  it("the route validates its body", () => {
    const route = (middlewares.routes ?? []).find((r) => r.matcher === "/admin/order-shipping-notice/:order_id")
    expect(route?.middlewares?.length).toBe(1)
  })
})
