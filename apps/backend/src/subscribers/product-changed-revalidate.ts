import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import {
  PRODUCT_CHANGE_EVENTS,
  revalidateCoalescer,
  sendStorefrontRevalidate,
  storefrontRevalidateConfig,
} from "../workflows/utils/storefront-revalidate"

/**
 * A product or variant changed: the storefront's product cache is emptied, at
 * most once a window (the reasoning is in `storefront-revalidate.ts`). A
 * projection run writes many products; the window turns them into one call.
 * Without ACROPORA_STOREFRONT_URL and STOREFRONT_REVALIDATE_SECRET it does
 * nothing.
 */
export const REVALIDATE_WINDOW_MS = 3_000

let coalescer: ReturnType<typeof revalidateCoalescer> | null = null

export default async function productChangedRevalidate({
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
  event: [...PRODUCT_CHANGE_EVENTS],
}
