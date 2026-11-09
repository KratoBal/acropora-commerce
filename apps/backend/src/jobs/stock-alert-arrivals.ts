import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { runStockAlertArrivals, stockAlertArrivalOperations } from "../workflows/utils/stock-alert-arrivals"
import { stockAlertArrivalReady } from "../workflows/utils/webshop-mail/stock-alert-arrival-mail"

/**
 * "SZÓLJ, HA JÖN HASONLÓ": THE ARRIVALS, EVERY TEN MINUTES (V2.4, card 0c1265d2). A confirmed sign-up is told once
 * when a piece of its species (or its product) becomes buyable; see `runStockAlertArrivals`. Behind the stock alert's
 * switch and the mail's: while either is off, nothing is read and nothing is marked, so a row is not "told" by a mail
 * that never left.
 */
export default async function stockAlertArrivalsJob(container: MedusaContainer) {
  if (!stockAlertArrivalReady()) return
  const result = await runStockAlertArrivals(stockAlertArrivalOperations(container))
  if (result.told || result.failed) {
    container
      .resolve(ContainerRegistrationKeys.LOGGER)
      .info(`Stock alert arrivals: ${result.rows} waiting, ${result.told} told, ${result.failed} not sent`)
  }
}

export const config = {
  name: "stock-alert-arrivals",
  schedule: "*/10 * * * *",
}
