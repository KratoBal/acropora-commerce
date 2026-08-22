import { MedusaContainer } from "@medusajs/framework"

import { COMMERCE_SETTINGS_MODULE } from "../../../modules/commerce-settings"
import CommerceSettingsModuleService from "../../../modules/commerce-settings/service"
import {
  CASH_ON_DELIVERY_FEE_SETTING_KEY,
  CASH_ON_DELIVERY_FEE_SETTING_DESCRIPTION,
  DEFAULT_CASH_ON_DELIVERY_FEE_HUF,
  normalizeCashOnDeliveryFee,
} from "../../../workflows/utils/cod-fee"

export const resolveService = (
  scope: MedusaContainer
): CommerceSettingsModuleService => scope.resolve(COMMERCE_SETTINGS_MODULE)

/**
 * Per-key validation and defaults.
 *
 * A settings table is only as safe as its edges: the value column is JSON, so
 * the checks have to happen where a value enters. Unknown keys are accepted as
 * they are; known keys are validated by the module that owns them.
 */
export const KNOWN_SETTINGS: Record<
  string,
  { description: string; defaultValue: unknown; validate: (v: unknown) => unknown }
> = {
  [CASH_ON_DELIVERY_FEE_SETTING_KEY]: {
    description: CASH_ON_DELIVERY_FEE_SETTING_DESCRIPTION,
    defaultValue: DEFAULT_CASH_ON_DELIVERY_FEE_HUF,
    validate: normalizeCashOnDeliveryFee,
  },
}

/** Validates, then serializes to the text column. */
export const validateSettingValue = (key: string, value: unknown): string => {
  const validated = KNOWN_SETTINGS[key]
    ? KNOWN_SETTINGS[key].validate(value)
    : value

  return typeof validated === "string" ? validated : String(validated)
}

/** A key with no row is not missing, it is unset, and the default applies. */
export const defaultSetting = (key: string) => ({
  id: null,
  key,
  value: KNOWN_SETTINGS[key]?.defaultValue ?? null,
  description: KNOWN_SETTINGS[key]?.description ?? null,
  is_default: true,
})

export const upsertSetting = async (
  scope: MedusaContainer,
  key: string,
  value: unknown,
  description?: string | null
) => {
  const service = resolveService(scope)
  const validated = validateSettingValue(key, value)

  const [existing] = await service.listCommerceSettings({ key }, { take: 1 })

  if (!existing) {
    const [created] = await service.createCommerceSettings([
      {
        key,
        value: validated,
        description: description ?? KNOWN_SETTINGS[key]?.description ?? null,
      },
    ])
    return created
  }

  const [updated] = await service.updateCommerceSettings([
    {
      id: existing.id,
      value: validated,
      ...(description === undefined ? {} : { description }),
    },
  ])
  return updated
}
