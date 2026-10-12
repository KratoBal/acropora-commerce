import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { feedCache } from "../../../services/merchant-feed-cache"
import {
  MerchantFeedConfigError,
  loadMerchantItems,
  merchantFeedDeps,
} from "../../../services/merchant-feed-loader"
import { merchantFeedXml } from "../../../services/merchant-feed-xml"

const FEED_TTL_MS = 15 * 60 * 1000
const cached = feedCache(FEED_TTL_MS)

/**
 * THE GOOGLE MERCHANT FEED (SEO P1-13, plan C11), XML transport. Not under
 * `/store`: the Merchant Center fetches a URL and sends no publishable key.
 * It hands out what the product pages already show, nothing more, and a
 * built feed is served from a 15-minute server-side cache, so the public
 * route cannot make the catalogue be read at will.
 *
 * Nothing submits it anywhere: registering this URL in a Merchant Center is a
 * separate, explicit step.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const storefrontUrl = process.env.ACROPORA_STOREFRONT_URL
  let body: string
  try {
    body = await cached(async () => {
      const items = await loadMerchantItems(merchantFeedDeps(req.scope), {
        storefrontUrl,
      })
      const base = storefrontUrl!.trim().replace(/\/+$/, "")
      return merchantFeedXml(items, {
        title: "Acropora",
        link: `${base}/hu`,
        description: "Acropora termékek",
      })
    })
  } catch (error) {
    if (error instanceof MerchantFeedConfigError) {
      res.status(503).json({ message: error.message })
      return
    }
    throw error
  }
  res.setHeader("Content-Type", "application/xml; charset=utf-8")
  res.setHeader("Cache-Control", "public, max-age=900")
  res.send(body)
}
