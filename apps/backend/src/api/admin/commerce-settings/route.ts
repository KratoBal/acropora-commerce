import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { resolveService, upsertSetting } from "./helpers"
import { AdminUpsertCommerceSettingType } from "./validators"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const service = resolveService(req.scope)
  const { key } = req.validatedQuery as { key?: string | string[] }

  const commerce_settings = await service.listCommerceSettings(
    key ? { key } : {}
  )

  res.json({ commerce_settings })
}

export const POST = async (
  req: MedusaRequest<AdminUpsertCommerceSettingType>,
  res: MedusaResponse
) => {
  const { key, value, description } = req.validatedBody

  const commerce_setting = await upsertSetting(
    req.scope,
    key,
    value,
    description
  )

  res.json({ commerce_setting })
}
