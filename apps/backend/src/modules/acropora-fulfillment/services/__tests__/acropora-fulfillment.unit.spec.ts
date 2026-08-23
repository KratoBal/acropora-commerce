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
    contextWith([{ unit_price: goodsTotalHuf, quantity: 1 }]),
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
        contextWith([{ unit_price: 10_000, quantity: 1 }]),
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
        { unit_price: 49_600, quantity: 1 },
        {
          unit_price: 450,
          quantity: 1,
          metadata: { [ACROPORA_LINE_ITEM_KIND_METADATA_KEY]: "fee" },
        },
      ]),
    )

    expect(result.calculated_amount).toBe(3_500)
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
        contextWith([{ unit_price: 50_000, quantity: 1 }]),
      ),
    ).rejects.toThrow(/Unknown Acropora shipping option id/)
  })
})
