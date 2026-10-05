import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"

/**
 * THE KEPT HOLD STANDS ON MEDUSA'S OWN CONDITION (order-edit-hold.ts), so this
 * reads the INSTALLED workflow, not a copy of it. If an upgrade changes the
 * condition, this is red before an edit cancels a hold.
 *
 * What it pins, in @medusajs/core-flows create-or-update-order-payment-collection.js:
 * - the collection query takes AWAITING (else an AWAITING collection is not
 *   found, and a second collection is opened);
 * - only AUTHORIZED and PARTIALLY_AUTHORIZED recreate (cancel) the collection;
 * - a found, not-recreated collection only gets its amount updated;
 * and that the edit's confirm still runs this workflow.
 */
const coreFlows = dirname(require.resolve("@medusajs/core-flows"))
const read = (path: string) => readFileSync(join(coreFlows, path), "utf8")
const squash = (source: string) => source.replace(/\s+/g, " ")

describe("Medusa's payment collection step on an order edit's confirm", () => {
  const source = squash(read("order/workflows/create-or-update-order-payment-collection.js"))

  it("finds an AWAITING collection", () => {
    expect(source).toMatch(/status: \[[^\]]*PaymentCollectionStatus\.AWAITING[^\]]*\]/)
  })

  it("recreates (cancels) only an AUTHORIZED or PARTIALLY_AUTHORIZED collection", () => {
    const recreate = source.match(/const shouldRecreate = [^;]*;/)?.[0] ?? ""
    expect(recreate).toContain("PaymentCollectionStatus.AUTHORIZED")
    expect(recreate).toContain("PaymentCollectionStatus.PARTIALLY_AUTHORIZED")
    expect([...new Set(recreate.match(/PaymentCollectionStatus\.\w+/g))].sort()).toEqual([
      "PaymentCollectionStatus.AUTHORIZED",
      "PaymentCollectionStatus.PARTIALLY_AUTHORIZED",
    ])
  })

  it("a found collection that is not recreated only gets the amount the order owes", () => {
    expect(source).toMatch(
      /!!existingPaymentCollection\?\.id && !shouldRecreate && utils_1\.MathBN\.gte\(amountPending, 0\)\); \}\)\.then\(\(\) => \{ return \(0, payment_collection_1\.updatePaymentCollectionStep\)\(\{ selector: \{ id: existingPaymentCollection\.id \}, update: \{ amount: amountPending, \}, \}\);/
    )
  })

  it("the edit's confirm still runs this workflow", () => {
    const confirm = squash(read("order/workflows/order-edit/confirm-order-edit-request.js"))
    expect(confirm).toContain("createOrUpdateOrderPaymentCollectionWorkflow.runAsStep")
  })
})
