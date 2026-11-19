import { model } from "@medusajs/framework/utils"

/**
 * ONE ROW PER MOVEMENT OF A CUSTOMER'S POINTS. THERE IS NO BALANCE COLUMN: the balance is the sum of the customer's
 * rows, so it cannot drift from the history that explains it. Rows are never updated; a wrong credit is answered by a
 * second row with the opposite sign.
 *
 *   customer_id  the Medusa customer (`cus_...`). Whether a guest's record may hold points is an open business
 *                question; the ledger does not decide it.
 *   kind         see `LOYALTY_KINDS`.
 *   points       whole points, signed: a credit is positive, a debit negative. Never zero (a zero movement says
 *                nothing and would hide a mistake).
 *   order_id     the order that earned or took the points, when there is one (accrual and reversal, later).
 *   reference    the caller's own key for the movement. UNIQUE while set: sending the same movement twice (a retry
 *                after a timeout) stores it once. The database is the referee, not the caller's check.
 *   reason       free text a person reads (why was this credited), at most `REASON_MAX`. Never shown to the customer.
 *   actor        who did it: the admin user or API key id, or the system.
 */
export const LoyaltyEntry = model
  .define("loyalty_entry", {
    id: model.id({ prefix: "loyent" }).primaryKey(),
    customer_id: model.text(),
    kind: model.text(),
    points: model.number(),
    order_id: model.text().nullable(),
    reference: model.text().nullable(),
    reason: model.text(),
    actor: model.text(),
  })
  .indexes([
    { name: "IDX_loyalty_entry_customer_id", on: ["customer_id"], where: "deleted_at IS NULL" },
    { name: "IDX_loyalty_entry_reference", on: ["reference"], unique: true, where: "reference IS NOT NULL AND deleted_at IS NULL" },
  ])

export default LoyaltyEntry
