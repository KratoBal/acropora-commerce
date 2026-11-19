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

type LiveShippingPaymentRule = ShippingPaymentRuleRowInput & { id: string }

const pairOf = (row: ShippingPaymentRuleRowInput) =>
  `${row.shipping_role}|${row.payment_role}`

/**
 * WHAT A MATRIX SAVE CHANGES, pair by pair: a pair that stays only moves (its
 * position), a pair that is gone is removed, a new pair is created. A live pair
 * is never created a second time, so the partial unique index on the pair (live
 * rows only) has nothing to refuse.
 *
 * Why not "soft-delete everything, create everything" (the first version, #804):
 * in one transaction the inserts reached the database before the soft-delete,
 * and every save, an unchanged one too, was refused with "Shipping payment rule
 * ... already exists" (measured on the test shop, acrobot 56585, and reproduced
 * on a built server with a fresh database).
 */
export function planShippingPaymentRuleReplace(
  live: LiveShippingPaymentRule[],
  rows: ShippingPaymentRuleRowInput[]
): {
  removed: string[]
  moved: { id: string; position: number }[]
  created: ShippingPaymentRuleRowInput[]
} {
  const wanted = new Map(rows.map((row) => [pairOf(row), row]))
  const kept = new Set(live.map(pairOf))
  return {
    removed: live.filter((row) => !wanted.has(pairOf(row))).map((row) => row.id),
    moved: live.flatMap((row) => {
      const next = wanted.get(pairOf(row))
      return next && next.position !== row.position
        ? [{ id: row.id, position: next.position }]
        : []
    }),
    created: rows.filter((row) => !kept.has(pairOf(row))),
  }
}

class CommerceSettingsModuleService extends MedusaService({
  CommerceSetting,
  ShippingPaymentRule,
}) {
  /**
   * THE WHOLE PAYMENT MATRIX AT ONCE, in one transaction (card e0e2378b), so the
   * checkout never reads half of an edit: the pairs that stay move, the pairs
   * that are gone are soft-deleted (their history kept), the new ones created
   * (`planShippingPaymentRuleReplace`). The caller validates (`matrixToRows`).
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
      {
        select: ["id", "shipping_role", "payment_role", "position"],
        take: null,
      },
      sharedContext
    )
    const plan = planShippingPaymentRuleReplace(live, rows)
    if (plan.removed.length)
      await this.softDeleteShippingPaymentRules(plan.removed, {}, sharedContext)
    if (plan.moved.length)
      await this.updateShippingPaymentRules(plan.moved, sharedContext)
    if (plan.created.length)
      await this.createShippingPaymentRules(plan.created, sharedContext)
  }
}

export default CommerceSettingsModuleService
