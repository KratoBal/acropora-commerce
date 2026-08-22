import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { defaultSetting, resolveService, upsertSetting } from "../helpers"
import { AdminUpdateCommerceSettingType } from "../validators"

/** `key` is the setting key, for example `cash_on_delivery_fee_huf`. */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const service = resolveService(req.scope)
  const key = req.params.key

  const [commerce_setting] = await service.listCommerceSettings(
    { key },
    { take: 1 }
  )

  res.json({ commerce_setting: commerce_setting ?? defaultSetting(key) })
}

export const POST = async (
  req: MedusaRequest<AdminUpdateCommerceSettingType>,
  res: MedusaResponse
) => {
  const { value, description } = req.validatedBody

  const commerce_setting = await upsertSetting(
    req.scope,
    req.params.key,
    value,
    description
  )

  res.json({ commerce_setting })
}
