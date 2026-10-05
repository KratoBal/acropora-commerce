import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { runPaymentDeadlines } from "../workflows/utils/order-payment/deadlines"
import { deadlineOperations } from "../workflows/utils/order-payment/operations"

/**
 * THE PAYMENT LINK'S DEADLINES, HOURLY (the lejáró zárolás plan, 2.5): the
 * day-3 reminder, and on day 6 the link's expiry (a released hold's order is
 * closed). See `runPaymentDeadlines`.
 */
export default async function orderPaymentDeadlinesJob(container: MedusaContainer) {
  const report = await runPaymentDeadlines(deadlineOperations(container))
  if (report.reminded.length || report.expired.length || report.failed.length) {
    container
      .resolve(ContainerRegistrationKeys.LOGGER)
      .info(
        `Payment deadlines: reminded ${report.reminded.length}, expired ${report.expired.length}, closed ${report.closed.length}, failed ${report.failed.length}`
      )
  }
}

export const config = {
  name: "order-payment-deadlines",
  schedule: "0 * * * *",
}
