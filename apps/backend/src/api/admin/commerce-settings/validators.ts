import { z } from "@medusajs/framework/zod"

export const AdminUpsertCommerceSetting = z
  .object({
    key: z.string().min(1),
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
    key: z.union([z.string(), z.array(z.string())]).optional(),
  })
  .strict()

export type AdminUpsertCommerceSettingType = z.infer<
  typeof AdminUpsertCommerceSetting
>
export type AdminUpdateCommerceSettingType = z.infer<
  typeof AdminUpdateCommerceSetting
>
