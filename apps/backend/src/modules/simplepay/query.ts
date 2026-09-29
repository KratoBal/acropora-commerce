import { SimplePayClient } from "./client"

/**
 * QUERY (section 3.17) for one transaction's status and total, straight from
 * SimplePay. The customer's return is not proof either way (L1011-1012), so
 * what happens next is decided on this.
 */
export const simplePayTransaction = async (
  client: SimplePayClient,
  transactionId: number | string
): Promise<{ status?: string; total?: number }> => {
  const answer = await client.call<{
    transactions?: { transactionId: number; status?: string; total?: number | string }[]
  }>("query", { transactionIds: [String(transactionId)] })
  const found = answer.transactions?.find((t) => String(t.transactionId) === String(transactionId))
  return { status: found?.status, total: found?.total === undefined ? undefined : Number(found.total) }
}

/** Ended without payment (statuses, L493-505). */
export const SIMPLEPAY_UNPAID_FINAL = new Set(["CANCELLED", "TIMEOUT", "NOTAUTHORIZED"])

/** Money taken or held. */
export const SIMPLEPAY_PAID = new Set(["FINISHED", "AUTHORIZED"])
