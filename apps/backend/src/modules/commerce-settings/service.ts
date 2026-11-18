import { Context } from "@medusajs/framework/types"
import {
  InjectManager,
  InjectTransactionManager,
  MedusaContext,
  MedusaService,
} from "@medusajs/framework/utils"

import CommerceSetting from "./models/commerce-setting"
import ShippingPaymentRule from "./models/shipping-payment-rule"

export type ShippingPaymentRuleRowInput = {
  shipping_role: string
  payment_role: string
  position: number
}

class CommerceSettingsModuleService extends MedusaService({
  CommerceSetting,
  ShippingPaymentRule,
}) {
  /**
   * THE WHOLE PAYMENT MATRIX AT ONCE, in one transaction (card e0e2378b): the
   * live rows are soft-deleted and the new ones created, so the checkout never
   * reads half of an edit, and the soft-deleted rows keep the history of who
   * offered what before. The partial unique index (live rows only) lets the old
   * and the new pair exist side by side. The caller validates (`matrixToRows`).
   */
  @InjectManager()
  async replaceShippingPaymentRules(
    rows: ShippingPaymentRuleRowInput[],
    @MedusaContext() sharedContext: Context = {}
  ) {
    await this.replaceShippingPaymentRules_(rows, sharedContext)
  }

  @InjectTransactionManager()
  protected async replaceShippingPaymentRules_(
    rows: ShippingPaymentRuleRowInput[],
    @MedusaContext() sharedContext: Context = {}
  ) {
    // `take: null`: a generated list returns one page (15) by default, and the matrix holds up to 16 pairs
    const live = await this.listShippingPaymentRules(
      {},
      { select: ["id"], take: null },
      sharedContext
    )
    if (live.length)
      await this.softDeleteShippingPaymentRules(
        live.map((row) => row.id),
        {},
        sharedContext
      )
    if (rows.length) await this.createShippingPaymentRules(rows, sharedContext)
  }
}

export default CommerceSettingsModuleService
