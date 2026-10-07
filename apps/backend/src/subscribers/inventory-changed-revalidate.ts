import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import {
  INVENTORY_CHANGE_EVENTS,
  revalidateCoalescer,
  sendStorefrontRevalidate,
  storefrontRevalidateConfig,
} from "../workflows/utils/storefront-revalidate"

/**
 * A stock level changed: the storefront's product cache is emptied, at most
 * once a window (FE-7 part 3; the pattern is the price subscriber's, #514).
 * The cached product and category pages carry availability, so without this a
 * sold-out product would stay buyable until the page's revalidate time ran
 * out. Without ACROPORA_STOREFRONT_URL and STOREFRONT_REVALIDATE_SECRET it
 * does nothing.
 */
export const REVALIDATE_WINDOW_MS = 3_000

let coalescer: ReturnType<typeof revalidateCoalescer> | null = null

export default async function inventoryChangedRevalidate({
  container,
}: SubscriberArgs<{ id: string }>) {
  const config = storefrontRevalidateConfig(process.env)
  if (!config) return
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  coalescer ??= revalidateCoalescer(
    () => sendStorefrontRevalidate(config, logger),
    REVALIDATE_WINDOW_MS
  )
  coalescer.request()
}

export const config: SubscriberConfig = {
  event: [...INVENTORY_CHANGE_EVENTS],
}
