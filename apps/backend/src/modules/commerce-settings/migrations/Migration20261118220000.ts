import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/**
 * THE ROWS THIS MIGRATION INSERTS, WRITTEN OUT ON PURPOSE. A migration that has
 * run never runs again, so it must not import `SHIPPING_PAYMENT_RULE_SEED`: a
 * later edit of that constant would silently not reach a database that already
 * ran this file. A unit test holds this list and the constant equal.
 */
export const ROWS_INSERTED_HERE = [
  { shipping_role: "PICKUP", payment_role: "ONLINE_CARD", position: 1 },
  { shipping_role: "PICKUP", payment_role: "PAY_AT_STORE", position: 2 },
  { shipping_role: "PICKUP", payment_role: "BANK_TRANSFER", position: 3 },
  { shipping_role: "GLS_NORMAL", payment_role: "ONLINE_CARD", position: 1 },
  { shipping_role: "GLS_NORMAL", payment_role: "COD", position: 2 },
  { shipping_role: "GLS_NORMAL", payment_role: "BANK_TRANSFER", position: 3 },
  { shipping_role: "GLS_HEAVY", payment_role: "ONLINE_CARD", position: 1 },
  { shipping_role: "GLS_HEAVY", payment_role: "COD", position: 2 },
  { shipping_role: "GLS_HEAVY", payment_role: "BANK_TRANSFER", position: 3 },
  { shipping_role: "FOXPOST", payment_role: "ONLINE_CARD", position: 1 },
  { shipping_role: "FOXPOST", payment_role: "COD", position: 2 },
  { shipping_role: "FOXPOST", payment_role: "BANK_TRANSFER", position: 3 },
] as const

/**
 * THE TABLE TAKES OVER FROM THE CODE MATRIX (card e0e2378b). Until now the
 * checkout read the payment matrix from a constant and nothing read this table;
 * from this release the table is the only source, so it must hold today's
 * matrix the moment the code that reads it goes live - the same rows, the same
 * order, no behaviour change.
 *
 * ONLY INTO AN EMPTY TABLE. If a live row exists, someone has already set the
 * matrix (an Admin edit, or a hand-made row on a test shop), and that wins: this
 * file never overwrites a decision made after it was written.
 *
 * The values are fixed literals checked below, never data, so they go into the
 * SQL text directly.
 */
export class Migration20261118220000 extends Migration {
  override async up(): Promise<void> {
    const values = ROWS_INSERTED_HERE.map((row) => {
      if (
        !/^[A-Z_]+$/.test(row.shipping_role) ||
        !/^[A-Z_]+$/.test(row.payment_role) ||
        !Number.isInteger(row.position)
      )
        throw new Error(`Unexpected shipping payment rule: ${JSON.stringify(row)}`)
      return `('${row.shipping_role}', '${row.payment_role}', ${row.position})`
    })
    this.addSql(
      `insert into "shipping_payment_rule" ("id", "shipping_role", "payment_role", "position")
select 'spr_' || substr(md5(random()::text || clock_timestamp()::text || v.shipping_role || v.payment_role), 1, 26), v.shipping_role, v.payment_role, v.position
from (values ${values.join(", ")}) as v (shipping_role, payment_role, position)
where not exists (select 1 from "shipping_payment_rule" where "deleted_at" is null);`
    )
  }

  /**
   * Nothing to undo safely: after this release the rows may have been edited in
   * the Admin, and deleting them would leave the checkout with no payment method.
   */
  override async down(): Promise<void> {}
}
