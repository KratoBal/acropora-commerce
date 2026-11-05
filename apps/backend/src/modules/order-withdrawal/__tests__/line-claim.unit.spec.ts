import { readFileSync } from "node:fs"
import { join } from "node:path"

/*
  WHAT TURNS THIS RED (the line claim). The model without its unique (order_id, item_id) index, or with the index
  not unique; the migration without the UNIQUE index (the model alone creates nothing: the migrations are handwritten,
  so a model that says unique and a migration that does not is a database that allows the second declaration); the
  migration not copying the existing declarations line by line (old declarations would hold no claim); the migration
  failing on a line that two old declarations carry (the old race could leave both standing); the service without the
  item model; the declaration and its claim written outside one transaction (a write without the shared context, or
  the workflow deleting a losing declaration by hand: that is the window this closes).
*/
const dir = join(__dirname, "..")
const source = (file: string) => readFileSync(join(dir, file), "utf8")

describe("the line claim: model, migration and service agree", () => {
  const model = source("models/order-withdrawal-item.ts")
  const migration = source("migrations/Migration20261105230000.ts")

  it("the model declares a UNIQUE index on (order_id, item_id)", () => {
    expect(model).toMatch(/on:\s*\["order_id",\s*"item_id"\],\s*unique:\s*true/)
  })

  it("the migration creates the table and the same UNIQUE index, partial on deleted_at like the model", () => {
    expect(migration).toMatch(/create table if not exists "order_withdrawal_item"/)
    expect(migration).toMatch(
      /CREATE UNIQUE INDEX IF NOT EXISTS "IDX_order_withdrawal_item_order_item" ON "order_withdrawal_item" \("order_id", "item_id"\) WHERE deleted_at IS NULL/,
    )
  })

  it("the migration copies the existing declarations line by line, oldest first, and never fails on a shared line", () => {
    expect(migration).toMatch(/insert into "order_withdrawal_item"[\s\S]*unnest\(w\."item_ids"\)/)
    expect(migration).toMatch(/order by w\."created_at", w\."id"/)
    expect(migration).toMatch(/on conflict do nothing/)
  })

  it("the declaration and its claim are written in ONE transaction: a transactional method, the same shared context on both writes", () => {
    const service = source("service.ts")
    expect(service).toMatch(/@InjectTransactionManager\(\)\s*protected async declareWithClaims_/)
    const body = service.slice(service.indexOf("protected async declareWithClaims_"))
    // each pattern may not run past its own call (a lazy match would find the OTHER call's context and prove nothing)
    expect(body).toMatch(/createOrderWithdrawals\((?:(?!createOrderWithdrawalItems\()[\s\S])*?\bsharedContext\b/)
    expect(body).toMatch(/createOrderWithdrawalItems\((?:(?!return row)[\s\S])*?\bsharedContext\b/)
    // the public method hands its context on, and the workflow no longer deletes a losing declaration by hand
    expect(service).toMatch(/declareWithClaims_\(input, sharedContext\)/)
    const flow = readFileSync(join(__dirname, "../../../workflows/utils/withdrawal/withdrawal.ts"), "utf8")
    expect(flow).not.toMatch(/deleteOrderWithdrawals/)
    expect(flow).toMatch(/svc\.declareWithClaims\(/)
  })

  it("the service carries both models", () => {
    const service = source("service.ts")
    expect(service).toMatch(/MedusaService\(\{\s*OrderWithdrawal,\s*OrderWithdrawalItem\s*\}\)/)
  })
})
