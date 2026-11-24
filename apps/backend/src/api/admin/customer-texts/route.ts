import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

import {
  CUSTOMER_TEXT_CATALOG,
  CUSTOMER_TEXT_GROUPS,
  customerTextRefusal,
} from "../../../modules/customer-texts/catalog"
import {
  sendStorefrontRevalidate,
  storefrontRevalidateConfig,
} from "../../../workflows/utils/storefront-revalidate"
import { CUSTOMER_TEXTS_TAG, resolveCustomerTextService } from "./helpers"
import { AdminPostCustomerTextType } from "./validators"

/**
 * THE CUSTOMER TEXTS FOR THE OS PAGE (card 7bfca4eb): the catalog (key, group and the dictionary's text in both languages, in the
 * customer's journey order) and the stored overrides. The OS shows the default beside the edited text, so it keeps no copy.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const overrides = await resolveCustomerTextService(req.scope).listOverrides()
  res.json({
    groups: CUSTOMER_TEXT_GROUPS,
    catalog: CUSTOMER_TEXT_CATALOG,
    overrides: overrides.map(({ key, locale, value, updated_at }) => ({ key, locale, value, updated_at })),
  })
}

/**
 * One key in one language. Refused (400) when the key is not in the catalog, the text is empty or too long, or it does not keep
 * the default's `{slots}`. After a write the storefront's tag is emptied; a failed call is logged, never thrown.
 */
export const POST = async (
  req: MedusaRequest<AdminPostCustomerTextType>,
  res: MedusaResponse
) => {
  const { key, locale, value } = req.validatedBody
  if (value !== null) {
    const refusal = customerTextRefusal(key, locale, value)
    if (refusal) throw new MedusaError(MedusaError.Types.INVALID_DATA, refusal)
  } else if (!CUSTOMER_TEXT_CATALOG.some((entry) => entry.key === key)) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, `Unknown customer text key: ${key}`)
  }
  const saved = await resolveCustomerTextService(req.scope).setOverride(
    key,
    locale,
    value === null ? null : value.trim()
  )
  const config = storefrontRevalidateConfig(process.env)
  if (config)
    await sendStorefrontRevalidate(
      config,
      req.scope.resolve(ContainerRegistrationKeys.LOGGER),
      fetch,
      [CUSTOMER_TEXTS_TAG],
      CUSTOMER_TEXTS_TAG
    )
  res.json({
    customer_text: saved ? { key: saved.key, locale: saved.locale, value: saved.value } : { key, locale, value: null },
  })
}
