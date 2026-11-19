import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import { runBoundaryTick, type BoundaryRunState } from "../workflows/utils/price-list-boundary"
import { sendStorefrontRevalidate, storefrontRevalidateConfig } from "../workflows/utils/storefront-revalidate"

/**
 * THE STOREFRONT'S PRODUCT CACHE AT A SALE'S START AND END, EVERY MINUTE (card 54bb3779). Medusa switches a price list by
 * the clock and emits nothing then, so nothing else would empty the cache; see `price-list-boundary.ts`. Without
 * ACROPORA_STOREFRONT_URL and STOREFRONT_REVALIDATE_SECRET it does nothing (the same switch as the price subscriber).
 * The memory is the process's: a restart empties the cache once on its first tick.
 */
const state: BoundaryRunState = { last: null }

export default async function priceListBoundaryRevalidate(container: MedusaContainer) {
  const config = storefrontRevalidateConfig(process.env)
  if (!config) return
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const pricing = container.resolve(Modules.PRICING) as {
    listPriceLists(
      filters: { status: string[] },
      config: { select: string[]; take: null },
    ): Promise<{ starts_at?: Date | string | null; ends_at?: Date | string | null }[]>
  }
  const outcome = await runBoundaryTick(
    {
      activeWindows: () => pricing.listPriceLists({ status: ["active"] }, { select: ["starts_at", "ends_at"], take: null }),
      send: () => sendStorefrontRevalidate(config, logger),
    },
    state,
    new Date(),
  )
  if (outcome === "purged" || outcome === "purged-first" || outcome === "purged-again")
    logger.info(`Price list boundary: storefront cache emptied (${outcome}).`)
}

export const config = {
  name: "price-list-boundary-revalidate",
  schedule: "* * * * *",
}
