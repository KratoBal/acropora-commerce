import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError, Modules } from "@medusajs/framework/utils"

import { forStore, resolveBrandService } from "../../../admin/brands/helpers"

/**
 * The brand page's record by its handle (`/hu/marka/{handle}`).
 *
 * A brand with no product behind it is a 404, the same rule as the sitemap's
 * list (barracuda #1678 B, t11): a switched-off or archived brand keeps its
 * record here (the OS takes its products' links away but does not delete the
 * record), and without this rule its page, and the old collection page's
 * canonical pointing at it, would live on.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const service = resolveBrandService(req.scope)
  const [brand] = await service.listBrands(
    { handle: req.params.handle },
    { take: 1 }
  )
  const [link] = brand
    ? await service.listProductBrands(
        { os_brand_id: brand.os_brand_id },
        { take: 1 }
      )
    : []
  if (!brand || !link)
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Brand with handle ${req.params.handle} was not found`
    )
  // The page lists its products from the brand's collection. The collection
  // is paired by the OS id (`collection.external_id`), not by handle: a
  // collection created before a slug change keeps its old handle (measured on
  // the test shop, 2026-10-30: `aqua-medic` against the brand `aquamedic`).
  const [collection] = await req.scope
    .resolve(Modules.PRODUCT)
    .listProductCollections(
      { external_id: brand.os_brand_id } as never,
      { select: ["handle"], take: 1 }
    )
  res.json({
    brand: { ...forStore(brand), collection_handle: collection?.handle ?? null },
  })
}
