import type { MedusaContainer } from "@medusajs/framework/types"

import { pickupRetryOperations, runPickupRetry } from "../workflows/utils/pickup-retry"

/**
 * A MIXED CART'S MISSING PICKUP ORDER, RETRIED EVERY TEN MINUTES AND ALERTED
 * ON (audit P1/6). See `runPickupRetry`.
 */
export default async function pickupRetryJob(container: MedusaContainer) {
  await runPickupRetry(pickupRetryOperations(container))
}

export const config = {
  name: "pickup-retry",
  schedule: "*/10 * * * *",
}
