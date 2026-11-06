import type { Context } from "@medusajs/framework/types"
import { InjectManager, InjectTransactionManager, MedusaContext, MedusaService } from "@medusajs/framework/utils"

import OrderWithdrawal from "./models/order-withdrawal"
import OrderWithdrawalItem from "./models/order-withdrawal-item"

export type DeclarationInput = {
  order_id: string
  customer_name: string
  /** the lines the declaration withdraws from: each one is claimed (the unique index is the referee) */
  item_ids: string[]
}

class OrderWithdrawalModuleService extends MedusaService({ OrderWithdrawal, OrderWithdrawalItem }) {
  /**
   * THE DECLARATION AND THE CLAIM OF ITS LINES IN ONE TRANSACTION (barracuda, #691 review). They used to be two writes
   * with two windows between them: a process that died after the declaration left one without its claim (a double
   * declaration could follow), and a declaration that lost the claim stood until it removed itself, where a pull of the
   * OS could take it. In one transaction a lost claim (the unique index refuses a line) rolls the declaration back with
   * it: it never stands, and a declaration never stands without its claim. The caller reads the error as "maybe a lost
   * race" and reads the standing lines again; this method does not interpret it.
   */
  @InjectManager()
  async declareWithClaims(input: DeclarationInput, @MedusaContext() sharedContext: Context = {}) {
    return await this.declareWithClaims_(input, sharedContext)
  }

  @InjectTransactionManager()
  protected async declareWithClaims_(input: DeclarationInput, @MedusaContext() sharedContext: Context = {}) {
    // both writes carry the SAME shared context: that is what puts them in the one transaction
    const row = await this.createOrderWithdrawals(
      { order_id: input.order_id, customer_name: input.customer_name, item_ids: input.item_ids, status: "new" },
      sharedContext,
    )
    await this.createOrderWithdrawalItems(
      input.item_ids.map((item_id) => ({ withdrawal_id: row.id, order_id: input.order_id, item_id })),
      sharedContext,
    )
    return row
  }
}

export default OrderWithdrawalModuleService
