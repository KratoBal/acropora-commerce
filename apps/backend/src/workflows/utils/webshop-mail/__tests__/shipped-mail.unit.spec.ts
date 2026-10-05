import { renderShippedMail, type ShippedMailFacts } from "../shipped-mail"
import { foxpostLogoUrl, prepareShippedMail, shippedKey, type ShippedOrder } from "../shipped"
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
