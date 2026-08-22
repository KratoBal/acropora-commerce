import { MedusaContainer } from "@medusajs/framework"

import { COMMERCE_SETTINGS_MODULE } from "../../../modules/commerce-settings"
import {
  assertCommerceSettingKey,
  COMMERCE_SETTING_DEFINITIONS,
  CommerceSettingKey,
} from "../../../modules/commerce-settings/definitions"
import CommerceSettingsModuleService from "../../../modules/commerce-settings/service"

export const resolveService = (
  scope: MedusaContainer
): CommerceSettingsModuleService => scope.resolve(COMMERCE_SETTINGS_MODULE)

/**
 * Per-key validation and defaults.
 *
 * A settings table is only as safe as its edges: the value column is text, so
 * the checks have to happen where a value enters. Unknown keys are rejected.
 */
export const KNOWN_SETTINGS = COMMERCE_SETTING_DEFINITIONS

/** Validates, then serializes to the text column. */
export const validateSettingValue = (key: string, value: unknown): string => {
  const knownKey = assertCommerceSettingKey(key)
  const validated = KNOWN_SETTINGS[knownKey].normalize(value)

  return String(validated)
}

/** A missing row exposes an approved default, or an explicit unconfigured state. */
export const defaultSetting = (key: string) => {
  const knownKey = assertCommerceSettingKey(key)
  const definition = KNOWN_SETTINGS[knownKey]
  const hasDefault = definition.defaultValue !== undefined

  return {
    id: null,
    key: knownKey,
    value: definition.defaultValue ?? null,
    description: definition.description,
    is_default: hasDefault,
    is_configured: false,
  }
}

export const upsertSetting = async (
  scope: MedusaContainer,
  key: string,
  value: unknown,
  description?: string | null
) => {
  const knownKey: CommerceSettingKey = assertCommerceSettingKey(key)
  const service = resolveService(scope)
  const validated = validateSettingValue(knownKey, value)
  const definition = KNOWN_SETTINGS[knownKey]

  const [existing] = await service.listCommerceSettings(
    { key: knownKey },
    { take: 1 }
  )

  if (!existing) {
    const [created] = await service.createCommerceSettings([
      {
        key: knownKey,
        value: validated,
        description: description ?? definition.description,
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
