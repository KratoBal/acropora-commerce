import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { feedCache } from "../../../services/merchant-feed-cache"
import {
  MerchantFeedConfigError,
  loadMerchantItems,
  merchantFeedDeps,
} from "../../../services/merchant-feed-loader"
import { merchantFeedXml } from "../../../services/merchant-feed-xml"
import { toMetaCatalogItem } from "../../../services/meta-catalog-item"

/**
 * THE META CATALOG FEED (card 87f351a3): the Google feed's items in Meta's words (`meta-catalog-item.ts`), with a
 * backorderable item kept as "available for order". Same read side, same 15 minute cache, its own cache entry.
 */
const FEED_TTL_MS = 15 * 60 * 1000
const cached = feedCache(FEED_TTL_MS)

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const storefrontUrl = process.env.ACROPORA_STOREFRONT_URL
  let body: string
  try {
    body = await cached(async () => {
      const items = await loadMerchantItems(merchantFeedDeps(req.scope), {
        storefrontUrl,
        keepBackorder: true,
      })
      const base = storefrontUrl!.trim().replace(/\/+$/, "")
      return merchantFeedXml(items.map(toMetaCatalogItem), {
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
