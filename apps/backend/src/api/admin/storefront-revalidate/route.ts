import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import {
  sendStorefrontRevalidate,
  storefrontRevalidateConfig,
  storefrontRevalidateStatus,
} from "../../../workflows/utils/storefront-revalidate"
import { AdminStorefrontRevalidateType } from "./validators"

/**
 * THE STOREFRONT REVALIDATION, MEASURABLE (card 54bb3779, A4). GET: is it switched on, which variable gave the address, the
 * target's HOST (never the secret), when an event last reached a subscriber, and when a call last went out with what result
 * (the HTTP status, or the error and its cause code). POST: one call by hand, over the same path as the subscribers, and the
 * same status row back: 200 when the storefront answered OK, 502 when the call failed (the body says how), 409 when the
 * revalidation is not configured. The memory is the process's.
 */
export const GET = async (_req: MedusaRequest, res: MedusaResponse) => {
  res.json({ storefront_revalidate: storefrontRevalidateStatus() })
}

export const POST = async (req: MedusaRequest<AdminStorefrontRevalidateType>, res: MedusaResponse) => {
  const config = storefrontRevalidateConfig(process.env)
  if (!config) {
    res.status(409).json({
      message: "The revalidation is not configured: it needs an address (STOREFRONT_REVALIDATE_URL or ACROPORA_STOREFRONT_URL) and STOREFRONT_REVALIDATE_SECRET.",
      storefront_revalidate: storefrontRevalidateStatus(),
    })
    return
  }
  const ok = await sendStorefrontRevalidate(
    config,
    req.scope.resolve(ContainerRegistrationKeys.LOGGER),
    undefined,
    req.validatedBody?.tags ?? ["products"],
    "manual"
  )
  res.status(ok ? 200 : 502).json({ ok, storefront_revalidate: storefrontRevalidateStatus() })
}
