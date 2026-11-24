import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { COMMERCE_SETTING_DEFINITIONS } from "../../../modules/commerce-settings/definitions"
import { loadLoyaltyAccrualSettings, LOYALTY_ACCRUAL_SETTING_KEYS } from "../../../workflows/utils/loyalty/loyalty-accrual"
import { loadLoyaltySettings, LOYALTY_SETTING_KEYS } from "../../../workflows/utils/loyalty/loyalty-settings"

/**
 * GET /admin/loyalty-settings
 *
 * What the checkout actually uses for the points redemption, and WHERE each value comes from (card dfb79916): `row` a person
 * stored it (POST /admin/commerce-settings), `env` the environment (`LOYALTY_*`, how the test shop was switched on before the
 * admin could), `default` nobody set it. The plain `GET /admin/commerce-settings/<key>` shows only the stored row or the
 * definition's default, so it would show the default while the environment decides; the OS reads this one. `keys` names the
 * commerce-setting key behind each field and its description, so the OS writes to the right key.
 *
 * `accrual` is the same for the points EARNED (credited when an order is closed): `settings`, `sources` (`row`, `default`,
 * `row_invalid`, `read_failed`; no environment source) and `keys`. Added beside the redemption's fields, which did not change.
 */
export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const { settings, sources } = await loadLoyaltySettings(req.scope)
  const accrual = await loadLoyaltyAccrualSettings(req.scope)
  res.status(200).json({
    settings,
    sources,
    keys: Object.fromEntries(
      LOYALTY_SETTING_KEYS.map((key) => [key, { description: COMMERCE_SETTING_DEFINITIONS[key].description }]),
    ),
    accrual: {
      settings: accrual.settings,
      sources: accrual.sources,
      keys: Object.fromEntries(
        LOYALTY_ACCRUAL_SETTING_KEYS.map((key) => [key, { description: COMMERCE_SETTING_DEFINITIONS[key].description }]),
      ),
    },
  })
}
