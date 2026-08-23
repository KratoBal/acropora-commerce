import { CalculateShippingOptionPriceDTO } from "@medusajs/framework/types"
import { asFunction, asValue } from "@medusajs/framework/awilix"
import { createMedusaContainer } from "@medusajs/framework/utils"

import {
  ACROPORA_LINE_ITEM_KIND_METADATA_KEY,
  GoodsTotalLineItem,
} from "../../../../workflows/utils/goods-total"
import { ShippingOptionRole } from "../../../../workflows/utils/shipping-eligibility"
import { resolveShippingOptionRoleBindings } from "../../../../workflows/utils/shipping-option-roles"
import { COMMERCE_SETTINGS_MODULE } from "../../../commerce-settings"
import { CommerceSettingsService } from "../../../commerce-settings/accessor"
import AcroporaFulfillmentService from "../../service"

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

const cradleWith = (settings: Record<string, unknown>) =>
  isolatedFulfillmentProviderCradle(serviceWith(settings))

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
