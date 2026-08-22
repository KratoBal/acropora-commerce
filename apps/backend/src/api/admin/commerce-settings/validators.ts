import { z } from "@medusajs/framework/zod"

import { COMMERCE_SETTING_KEYS } from "../../../modules/commerce-settings/definitions"

const CommerceSettingKey = z.enum(COMMERCE_SETTING_KEYS)

export const AdminUpsertCommerceSetting = z
  .object({
    key: CommerceSettingKey,
    value: z.unknown(),
    description: z.string().nullish(),
  })
  .strict()

export const AdminUpdateCommerceSetting = z
  .object({
    value: z.unknown(),
    description: z.string().nullish(),
  })
  .strict()

export const AdminGetCommerceSettingsParams = z
  .object({
    key: z.union([CommerceSettingKey, z.array(CommerceSettingKey)]).optional(),
  })
  .strict()

export type AdminUpsertCommerceSettingType = z.infer<
  typeof AdminUpsertCommerceSetting
>
export type AdminUpdateCommerceSettingType = z.infer<
  typeof AdminUpdateCommerceSetting
>
