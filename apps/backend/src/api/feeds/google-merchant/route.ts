import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import {
  MerchantFeedConfigError,
  loadMerchantItems,
  merchantFeedDeps,
} from "../../../services/merchant-feed-loader"
import { merchantFeedXml } from "../../../services/merchant-feed-xml"

/**
 * THE GOOGLE MERCHANT FEED (SEO P1-13, plan C11), XML transport. Not under
 * `/store`: the Merchant Center fetches a URL and sends no publishable key.
 * It hands out what the product pages already show, nothing more.
 *
 * Nothing submits it anywhere: registering this URL in a Merchant Center is a
 * separate, explicit step.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const storefrontUrl = process.env.ACROPORA_STOREFRONT_URL
  let items
  try {
    items = await loadMerchantItems(merchantFeedDeps(req.scope), {
      storefrontUrl,
    })
  } catch (error) {
    if (error instanceof MerchantFeedConfigError) {
      res.status(503).json({ message: error.message })
      return
    }
    throw error
  }
  const base = storefrontUrl!.trim().replace(/\/+$/, "")
  res.setHeader("Content-Type", "application/xml; charset=utf-8")
  res.setHeader("Cache-Control", "public, max-age=900")
  res.send(
    merchantFeedXml(items, {
      title: "Acropora",
      link: `${base}/hu`,
      description: "Acropora termékek",
    })
  )
}
