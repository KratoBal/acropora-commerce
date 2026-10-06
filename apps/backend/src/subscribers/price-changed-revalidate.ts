import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import {
  PRICE_CHANGE_EVENTS,
  revalidateCoalescer,
  sendStorefrontRevalidate,
  storefrontRevalidateConfig,
} from "../workflows/utils/storefront-revalidate"

/**
 * A price changed: the storefront's product cache is emptied, at most once a
 * window (card 2d22116c; the reasoning is in `storefront-revalidate.ts`).
 * Without ACROPORA_STOREFRONT_URL and STOREFRONT_REVALIDATE_SECRET it does
 * nothing.
 */
export const REVALIDATE_WINDOW_MS = 3_000

let coalescer: ReturnType<typeof revalidateCoalescer> | null = null

export default async function priceChangedRevalidate({
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
  event: [...PRICE_CHANGE_EVENTS],
}
