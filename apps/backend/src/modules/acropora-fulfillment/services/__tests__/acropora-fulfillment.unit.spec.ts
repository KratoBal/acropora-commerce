import { CalculateShippingOptionPriceDTO } from "@medusajs/framework/types"
import { asFunction, asValue } from "@medusajs/framework/awilix"
import { createMedusaContainer } from "@medusajs/framework/utils"

import {
  ACROPORA_LINE_ITEM_KIND_METADATA_KEY,
  GoodsTotalLineItem,
} from "../../../../workflows/utils/goods-total"
import { ShippingOptionRole } from "../../../../workflows/utils/shipping-eligibility"
import { resolveShippingOptionRoleBindings } from "../../../../workflows/utils/shipping-option-roles"
import { SPLIT_LINE_IDS_CONTEXT_KEY } from "../../../../workflows/utils/split-pricing-context"
import { COMMERCE_SETTINGS_MODULE } from "../../../commerce-settings"
import { CommerceSettingsService } from "../../../commerce-settings/accessor"
import AcroporaFulfillmentService from "../../service"
import { FoxpostPickupPointsService } from "../../../../services/foxpost-pickup-points"
import { GlsPickupPointsService } from "../../../../services/gls-pickup-points"

const configuredSettings: Record<string, unknown> = {
  shipping_gls_normal_huf: 3_500,
  shipping_gls_heavy_huf: 4_500,
  shipping_foxpost_huf: 1_150,
  free_shipping_threshold_huf: 50_000,
}

const idFor = (role: ShippingOptionRole) =>
  resolveShippingOptionRoleBindings().find((binding) => binding.role === role)!
    .id

const serviceWith = (settings: Record<string, unknown>) => ({
  listCommerceSettings: async ({ key }: { key: string }) =>
    Object.prototype.hasOwnProperty.call(settings, key)
      ? [{ key, value: settings[key] }]
      : [],
})

const foxpostPickupPointsWith = (configured = true) =>
  new FoxpostPickupPointsService({
    env: configured
      ? {
          FOXPOST_API_USER: "foxpost-user",
          FOXPOST_API_PASSWORD: "foxpost-password",
          FOXPOST_API_KEY: "foxpost-key",
        }
      : {},
    fetcher: async () => ({
      ok: true,
      json: async () => [
        {
          operator_id: "HU1234",
          name: "FOXPOST A-BOX Test",
          address: "1111 Budapest, Teszt utca 1.",
          open: { hetfo: "00:00-24:00" },
          geolat: 47.5,
          geolng: 19.1,
          variant: "FOXPOST A-BOX",
          paymentOptions: ["card", "link"],
          service: ["pick up", "dispatch"],
        },
      ],
    }),
  })

/**
 * Mirrors Medusa's module loader: a fulfillment provider receives the
 * fulfillment module's isolated cradle, where each declared dependency is a
 * forwarding registration to the shared application container.
 */
const isolatedFulfillmentProviderCradle = (
  commerceSettings: CommerceSettingsService,
) => {
  const sharedContainer = createMedusaContainer()
  sharedContainer.register({
    [COMMERCE_SETTINGS_MODULE]: asValue(commerceSettings),
  })

  const fulfillmentContainer = createMedusaContainer()
  fulfillmentContainer.register({
    [COMMERCE_SETTINGS_MODULE]: asFunction(() =>
      sharedContainer.resolve(COMMERCE_SETTINGS_MODULE),
    ),
  })

  return fulfillmentContainer.cradle
}

const cradleWith = (
  settings: Record<string, unknown>,
  foxpostPickupPoints = foxpostPickupPointsWith(),
) => ({
  ...isolatedFulfillmentProviderCradle(serviceWith(settings)),
  foxpostPickupPoints,
})

const failingCradle = () =>
  isolatedFulfillmentProviderCradle({
    listCommerceSettings: async ({ key }: { key: string }) =>
      Promise.reject(new Error(`settings must not be read for ${key}`)),
  })

const contextWith = (
  items: GoodsTotalLineItem[],
): CalculateShippingOptionPriceDTO["context"] =>
  ({ id: "cart_test", items }) as CalculateShippingOptionPriceDTO["context"]

const calculate = async (
  role: ShippingOptionRole,
  goodsTotalHuf: number,
  settings = configuredSettings,
) => {
  const service = new AcroporaFulfillmentService(cradleWith(settings))

  return service.calculatePrice(
    { id: idFor(role) },
    {},
    contextWith([
      { unit_price: goodsTotalHuf, quantity: 1, is_tax_inclusive: true },
    ]),
  )
}

describe("Acropora calculated fulfillment provider", () => {
  it("publishes the configured option ids and accepts only calculated known options", async () => {
    const service = new AcroporaFulfillmentService(
      cradleWith(configuredSettings),
    )
    const options = await service.getFulfillmentOptions()

    expect(options.map(({ id }) => id)).toEqual(
      resolveShippingOptionRoleBindings().map(({ id }) => id),
    )
    expect(
      await service.canCalculate({
        id: idFor("GLS_NORMAL"),
        price_type: "calculated",
        data: { id: idFor("GLS_NORMAL") },
      } as any),
    ).toBe(true)
    expect(
      await service.canCalculate({
        id: idFor("GLS_NORMAL"),
        price_type: "flat",
        data: { id: idFor("GLS_NORMAL") },
      } as any),
    ).toBe(false)
    expect(
      await service.canCalculate({
        id: idFor("GLS_NORMAL"),
        price_type: "calculated",
        data: { id: "so_unknown" },
      } as any),
    ).toBe(false)
    expect(
      await service.canCalculate({
        id: idFor("GLS_NORMAL"),
        price_type: "calculated",
        data: { id: idFor("FOXPOST") },
      } as any),
    ).toBe(false)
  })

  // AZ ELSO ALLITAS AZ, AMI ELES FUTASON BUKOTT EL. A seed a szallitasi modot
  // ID ES DATA NELKUL adja at, mert mindketto csak a letrehozas UTAN letezik --
  // es a Medusa a szolgaltatot MEG A LETREHOZAS ELOTT kerdezi meg. A masodik
  // ket allitas azt rogziti, hogy ez nem szabad ajto: ami adatot a letrehozas
  // MEGIS hoz, annak ismert opciot kell neveznie.
  it("accepts a calculated option that is still being created, but not a wrong one", async () => {
    const service = new AcroporaFulfillmentService(
      cradleWith(configuredSettings),
    )

    expect(
      await service.canCalculate({
        price_type: "calculated",
      } as any),
    ).toBe(true)
    expect(
      await service.canCalculate({
        price_type: "calculated",
        data: {},
      } as any),
    ).toBe(true)
    expect(
      await service.canCalculate({
        price_type: "calculated",
        data: { id: "so_unknown" },
      } as any),
    ).toBe(false)
    expect(
      await service.canCalculate({
        price_type: "flat",
      } as any),
    ).toBe(false)
  })

  // A VISSZAIRAS AZ A LEPES, AMI AZ ONHIVATKOZAST ELOSZOR BEIRJA, es eles
  // futason `Cannot calcuate pricing for: []` alakban hasalt el. Az elso allitas
  // azonositoja SZANDEKOSAN olyan, ami egyetlen kornyezeti valtozoban sem
  // szerepel: pontosan ez a helyzet all fenn, amikor egy uj mod eloszor kapja
  // meg a sajat azonositojat, mert a valtozo ERTEKE lenne ez az azonosito.
  //
  // A masik harom azt rogziti, hogy ez nem szabad ajto: idegen, hianyzo es nem
  // szoveges ertek tovabbra sem megy at.
  it("accepts the self-reference write-back on an option no env var binds yet", async () => {
    const service = new AcroporaFulfillmentService(
      cradleWith(configuredSettings),
    )

    expect(
      await service.canCalculate({
        id: "so_frissen_letrehozott",
        price_type: "calculated",
        data: { id: "so_frissen_letrehozott" },
      } as any),
    ).toBe(true)
    expect(
      await service.canCalculate({
        id: "so_frissen_letrehozott",
        price_type: "calculated",
        data: { id: "so_masik" },
      } as any),
    ).toBe(false)
    expect(
      await service.canCalculate({
        id: "so_frissen_letrehozott",
        price_type: "calculated",
        data: {},
      } as any),
    ).toBe(false)
    expect(
      await service.canCalculate({
        id: "so_frissen_letrehozott",
        price_type: "calculated",
        data: { id: 42 },
      } as any),
    ).toBe(false)
  })

  it("does not expose Foxpost as a selectable fulfillment option when unavailable", async () => {
    const service = new AcroporaFulfillmentService(
      cradleWith(configuredSettings, foxpostPickupPointsWith(false)),
    )

    const options = await service.getFulfillmentOptions()

    expect(options.map(({ id }) => id)).not.toContain(idFor("FOXPOST"))
  })

  it("stores the server-resolved Foxpost pickup point on the fulfillment data", async () => {
    const service = new AcroporaFulfillmentService(
      cradleWith(configuredSettings),
    )

    await expect(
      service.validateFulfillmentData(
        { id: idFor("FOXPOST") },
        {
          foxpost_pickup_point: {
            id: "HU1234",
            address: "a buyer-provided address is never persisted",
          },
        },
        {},
      ),
    ).resolves.toEqual({
      foxpost_pickup_point: {
        id: "HU1234",
        name: "FOXPOST A-BOX Test",
        address: "1111 Budapest, Teszt utca 1.",
        // the type, from the directory: the order and the OS name it right
        variant: "FOXPOST A-BOX",
        payment_options: ["card", "link"],
        services: ["pick up", "dispatch"],
        // the rest of the record (the Foxpost prompt, point 19), from the directory too
        provider: "foxpost",
        zip: "",
        city: "",
        icon_url: null,
        opening_hours: { hetfo: "00:00-24:00" },
        // no picker named: the list (the official finder sends "finder")
        source: "fallback",
      },
    })
  })

  it("keeps which picker the point came from: the official finder or the list", async () => {
    const service = new AcroporaFulfillmentService(cradleWith(configuredSettings))
    const stored = (await service.validateFulfillmentData(
      { id: idFor("FOXPOST") },
      { foxpost_pickup_point: { id: "HU1234", source: "finder" } },
      {},
    )) as { foxpost_pickup_point: { source: string } }
    expect(stored.foxpost_pickup_point.source).toBe("finder")
    const odd = (await service.validateFulfillmentData(
      { id: idFor("FOXPOST") },
      { foxpost_pickup_point: { id: "HU1234", source: "<script>" } },
      {},
    )) as { foxpost_pickup_point: { source: string } }
    expect(odd.foxpost_pickup_point.source).toBe("fallback")
  })

  /**
   * A POINT NEWER THAN OUR COPY (the Foxpost prompt, point 6: no old copy as
   * the source of truth): the official finder shows Foxpost's live network,
   * our copy is up to a day old. The list is read again once; a point still
   * not there is refused as before.
   */
  it("reads the directory again once for a point missing from our copy", async () => {
    const point = (id: string) => ({
      operator_id: id,
      name: `FOXPOST A-BOX ${id}`,
      address: "1111 Budapest, Teszt utca 1.",
      open: {},
      geolat: 47.5,
      geolng: 19.1,
      variant: "FOXPOST A-BOX",
      paymentOptions: [],
      service: ["pick up"],
    })
    let reads = 0
    const directory = new FoxpostPickupPointsService({
      env: { FOXPOST_API_USER: "u", FOXPOST_API_PASSWORD: "p", FOXPOST_API_KEY: "k" },
      fetcher: async () => {
        reads++
        // the first read is yesterday's copy; the new point exists from the second
        const points = reads === 1 ? [point("HU1")] : [point("HU1"), point("HU_NEW")]
        return { ok: true, json: async () => points }
      },
    })
    const service = new AcroporaFulfillmentService(cradleWith(configuredSettings, directory))

    await service.validateFulfillmentData({ id: idFor("FOXPOST") }, { foxpost_pickup_point: { id: "HU1" } }, {})
    expect(reads).toBe(1)
    await expect(
      service.validateFulfillmentData({ id: idFor("FOXPOST") }, { foxpost_pickup_point: { id: "HU_NEW" } }, {}),
    ).resolves.toMatchObject({ foxpost_pickup_point: { id: "HU_NEW" } })
    expect(reads).toBe(2)

    // a point that does not exist is still refused, and does not make us read the list again and again
    await expect(
      service.validateFulfillmentData({ id: idFor("FOXPOST") }, { foxpost_pickup_point: { id: "HU_FAKE" } }, {}),
    ).rejects.toThrow("The selected Foxpost pickup point is unavailable")
    await expect(
      service.validateFulfillmentData({ id: idFor("FOXPOST") }, { foxpost_pickup_point: { id: "HU_FAKE2" } }, {}),
    ).rejects.toThrow("The selected Foxpost pickup point is unavailable")
    expect(reads).toBe(2)
  })

  it("keeps pickup at zero without reading carrier settings", async () => {
    const service = new AcroporaFulfillmentService(failingCradle())

    await expect(
      service.calculatePrice(
        { id: idFor("PICKUP") },
        {},
        contextWith([
          { unit_price: 10_000, quantity: 1, is_tax_inclusive: true },
        ]),
      ),
    ).resolves.toEqual({
      calculated_amount: 0,
      is_calculated_price_tax_inclusive: true,
    })
  })

  it.each([
    [49_999, 3_500],
    [50_000, 0],
    [50_001, 0],
  ])(
    "prices normal GLS at %i HUF goods total",
    async (goodsTotal, expected) => {
      await expect(calculate("GLS_NORMAL", goodsTotal)).resolves.toMatchObject({
        calculated_amount: expected,
      })
    },
  )

  it.each([
    [49_999, 1_150],
    [50_000, 0],
  ])("prices Foxpost at %i HUF goods total", async (goodsTotal, expected) => {
    await expect(calculate("FOXPOST", goodsTotal)).resolves.toMatchObject({
      calculated_amount: expected,
    })
  })

  it.each([49_999, 50_000, 100_000])(
    "keeps heavy GLS configured at %i HUF goods total",
    async (goodsTotal) => {
      await expect(calculate("GLS_HEAVY", goodsTotal)).resolves.toMatchObject({
        calculated_amount: 4_500,
      })
    },
  )

  /*
   * P4-2 (Balázs, 2026-09-29): a mixed cart's pickup lines become their own
   * order, and the free-shipping threshold counts the courier lines only. The
   * pricing hook passes the split-off line ids; without them (the control) the
   * same cart reaches the threshold.
   */
  it("prices the courier part without the lines split off into the pickup order", async () => {
    const service = new AcroporaFulfillmentService(
      cradleWith(configuredSettings),
    )
    const items = [
      { id: "l1", unit_price: 30_000, quantity: 1, is_tax_inclusive: true },
      { id: "l2", unit_price: 30_000, quantity: 1, is_tax_inclusive: true },
    ] as GoodsTotalLineItem[]

    const split = await service.calculatePrice({ id: idFor("GLS_NORMAL") }, {}, {
      ...contextWith(items),
      [SPLIT_LINE_IDS_CONTEXT_KEY]: ["l2"],
    } as CalculateShippingOptionPriceDTO["context"])
    const whole = await service.calculatePrice(
      { id: idFor("GLS_NORMAL") },
      {},
      contextWith(items),
    )

    expect(split.calculated_amount).toBe(3_500)
    expect(whole.calculated_amount).toBe(0)
  })

  it("excludes a marked COD fee from the runtime goods total", async () => {
    const service = new AcroporaFulfillmentService(
      cradleWith(configuredSettings),
    )

    const result = await service.calculatePrice(
      { id: idFor("GLS_NORMAL") },
      {},
      contextWith([
        { unit_price: 49_600, quantity: 1, is_tax_inclusive: true },
        {
          unit_price: 450,
          quantity: 1,
          metadata: { [ACROPORA_LINE_ITEM_KIND_METADATA_KEY]: "fee" },
        },
      ]),
    )

    expect(result.calculated_amount).toBe(3_500)
  })

  it("keeps free shipping at exactly the threshold when a COD fee is present", async () => {
    // The mirror of the case above, and the one the runtime actually meets.
    // There the fee must not GRANT free shipping to a cart below the
    // threshold; here it must not TAKE it away from a cart that reached it.
    // Both rules meet in this single cart, and the equivalent assertion on the
    // pure functions lives in cod-fee-reconciliation.unit.spec.ts. This one
    // pins it where it runs: on the provider that prices the live cart.
    const service = new AcroporaFulfillmentService(
      cradleWith(configuredSettings),
    )

    const result = await service.calculatePrice(
      { id: idFor("GLS_NORMAL") },
      {},
      contextWith([
        { unit_price: 50_000, quantity: 1, is_tax_inclusive: true },
        {
          unit_price: 450,
          quantity: 1,
          metadata: { [ACROPORA_LINE_ITEM_KIND_METADATA_KEY]: "fee" },
        },
      ]),
    )

    expect(result.calculated_amount).toBe(0)
  })

  it.each([
    [
      {
        shipping_gls_heavy_huf: 4_500,
        shipping_foxpost_huf: 1_150,
        free_shipping_threshold_huf: 50_000,
      },
      /shipping_gls_normal_huf must be configured/,
    ],
    [
      { ...configuredSettings, shipping_gls_normal_huf: "invalid" },
      /shipping_gls_normal_huf must be a number/,
    ],
  ])(
    "fails closed for missing or invalid carrier settings",
    async (settings, error) => {
      await expect(calculate("GLS_NORMAL", 49_999, settings)).rejects.toThrow(
        error,
      )
    },
  )

  it("fails closed for option data that cannot be mapped to a role", async () => {
    const service = new AcroporaFulfillmentService(
      cradleWith(configuredSettings),
    )

    await expect(
      service.calculatePrice(
        { id: "so_unknown" },
        {},
        contextWith([
          { unit_price: 50_000, quantity: 1, is_tax_inclusive: true },
        ]),
      ),
    ).rejects.toThrow(/Unknown Acropora shipping option id/)
  })

  describe("tax semantics at the shipping boundary", () => {
    it("prices normally when the cart states that its prices include tax", async () => {
      const service = new AcroporaFulfillmentService(
        cradleWith(configuredSettings),
      )

      await expect(
        service.calculatePrice(
          { id: idFor("GLS_NORMAL") },
          {},
          contextWith([
            { unit_price: 10_000, quantity: 1, is_tax_inclusive: true },
          ]),
        ),
      ).resolves.toMatchObject({ calculated_amount: 3_500 })
    })

    it("refuses to price rather than compare a net cart against a gross threshold", async () => {
      // This is a behaviour change at the shipping boundary, not only a type
      // change: before the invariant, a net price was silently added to a gross
      // sum and measured against a gross threshold.
      const service = new AcroporaFulfillmentService(
        cradleWith(configuredSettings),
      )

      await expect(
        service.calculatePrice(
          { id: idFor("GLS_NORMAL") },
          {},
          contextWith([
            { unit_price: 10_000, quantity: 1, is_tax_inclusive: false },
          ]),
        ),
      ).rejects.toThrow(/priced without tax/)
    })

    it("refuses when the cart does not state its tax semantics at all", async () => {
      const service = new AcroporaFulfillmentService(
        cradleWith(configuredSettings),
      )

      await expect(
        service.calculatePrice(
          { id: idFor("GLS_NORMAL") },
          {},
          contextWith([{ unit_price: 10_000, quantity: 1 }]),
        ),
      ).rejects.toThrow(/no known tax status/)
    })

    it("keeps pickup free without reading the cart at all", async () => {
      // Pickup returns before the goods total is computed, so an unstated tax
      // status cannot take store pickup away from a customer.
      const service = new AcroporaFulfillmentService(
        cradleWith(configuredSettings),
      )

      await expect(
        service.calculatePrice(
          { id: idFor("PICKUP") },
          {},
          contextWith([{ unit_price: 10_000, quantity: 1 }]),
        ),
      ).resolves.toMatchObject({ calculated_amount: 0 })
    })
  })
})

/**
 * A GLS PICKUP-POINT OPTION NEEDS A POINT (P4). What must fail: a GLS point
 * option accepted without a point; a point stored from the browser's words
 * instead of our list; a heavy parcel sent to a locker; home delivery made to
 * ask for a point.
 */
describe("GLS pickup-point shipping", () => {
  const glsFrom = (items: unknown[]) =>
    new GlsPickupPointsService({
      fetcher: async () => ({ ok: true, json: async () => ({ items }) }),
    })
  const pont = (id: string, type: string, extra: Record<string, unknown> = {}) => ({
    id,
    goldId: 42,
    name: `Pont ${id}`,
    contact: { postalCode: "1011", city: "Budapest", address: "Fő utca 1." },
    features: ["delivery"],
    type,
    ...extra,
  })
  const withGls = (items: unknown[]) =>
    new AcroporaFulfillmentService({
      ...cradleWith(configuredSettings),
      glsPickupPoints: glsFrom(items),
    } as never)
  const bindingId = (env: string) =>
    resolveShippingOptionRoleBindings().find((b) => b.env === env)!.id
  const POINT = bindingId("ACROPORA_SO_GLS_POINT")
  const HEAVY_POINT = bindingId("ACROPORA_SO_GLS_HEAVY_POINT")
  const HOME = bindingId("ACROPORA_SO_GLS_HOME")

  /*
    THE ORDER KEEPS THE POINT'S FULL RECORD (the GLS prompt, point 4). What
    must fail: the five keys the OS reads changed; the record (hours,
    features, load, door number) taken from the browser instead of our list;
    a `source` other than the two pickers stored as sent.
  */
  it("stores the point from our list, with both GLS ids, whatever the browser sent", async () => {
    const stored = await withGls([
      pont("SHOP1", "parcel-shop", {
        hours: [[1, "08:00", "17:30"]],
        features: ["acceptsCash", "delivery"],
        hasWheelchairAccess: true,
        externalId: "",
      }),
    ]).validateFulfillmentData(
      { id: POINT },
      {
        gls_pickup_point: {
          id: "SHOP1",
          name: "Kitalált név",
          features: ["kitalalt"],
          locker_saturation: "lowVolume",
          source: "finder",
        },
      },
      {} as never,
    )
    expect(stored).toEqual({
      gls_pickup_point: {
        id: "SHOP1",
        gold_id: 42,
        name: "Pont SHOP1",
        address: "1011 Budapest, Fő utca 1.",
        type: "parcel-shop",
        zip: "1011",
        city: "Budapest",
        street: "Fő utca 1.",
        hours: [{ day: 1, from: "08:00", to: "17:30" }],
        features: ["acceptsCash", "delivery"],
        has_wheelchair_access: true,
        locker_saturation: null,
        external_id: null,
        source: "finder",
      },
    })
    const odd = await withGls([pont("SHOP1", "parcel-shop")]).validateFulfillmentData(
      { id: POINT },
      { gls_pickup_point: { id: "SHOP1", source: "<script>" } },
      {} as never,
    )
    expect((odd.gls_pickup_point as { source: string }).source).toBe("fallback")
  })

  it("an out-of-order locker cannot be shipped to, whichever picker sent it", async () => {
    const service = withGls([pont("LOCKER1", "parcel-locker", { lockerSaturation: "outOfOrder" })])
    await expect(
      service.validateFulfillmentData(
        { id: POINT },
        { gls_pickup_point: { id: "LOCKER1", source: "finder" } },
        {} as never,
      ),
    ).rejects.toThrow("unavailable for this shipping method")
  })

  it("refuses a GLS point option without a point, or with an unknown one", async () => {
    const service = withGls([pont("SHOP1", "parcel-shop")])
    await expect(service.validateFulfillmentData({ id: POINT }, {}, {} as never)).rejects.toThrow(
      "needs a gls_pickup_point id",
    )
    await expect(
      service.validateFulfillmentData({ id: POINT }, { gls_pickup_point: { id: "NINCS" } }, {} as never),
    ).rejects.toThrow("unavailable for this shipping method")
  })

  it("the heavy option refuses a locker and takes a parcel shop", async () => {
    const service = withGls([pont("LOCKER1", "parcel-locker"), pont("SHOP1", "parcel-shop")])
    await expect(
      service.validateFulfillmentData({ id: HEAVY_POINT }, { gls_pickup_point: { id: "LOCKER1" } }, {} as never),
    ).rejects.toThrow("unavailable for this shipping method")
    await expect(
      service.validateFulfillmentData({ id: HEAVY_POINT }, { gls_pickup_point: { id: "SHOP1" } }, {} as never),
    ).resolves.toMatchObject({ gls_pickup_point: { id: "SHOP1" } })
  })

  it("home delivery asks for no point", async () => {
    await expect(
      withGls([]).validateFulfillmentData({ id: HOME }, { any: 1 }, {} as never),
    ).resolves.toEqual({ any: 1 })
  })

  it("an unreachable GLS list refuses the point option", async () => {
    const service = new AcroporaFulfillmentService({
      ...cradleWith(configuredSettings),
      glsPickupPoints: new GlsPickupPointsService({ fetcher: async () => Promise.reject(new Error("net")) }),
    } as never)
    await expect(
      service.validateFulfillmentData({ id: POINT }, { gls_pickup_point: { id: "SHOP1" } }, {} as never),
    ).rejects.toThrow("currently unavailable")
  })
})
