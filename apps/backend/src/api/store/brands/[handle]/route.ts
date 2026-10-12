import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { forStore, resolveBrandService } from "../../../admin/brands/helpers"

/** The brand page's record by its handle (`/hu/marka/{handle}`). */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const [brand] = await resolveBrandService(req.scope).listBrands(
    { handle: req.params.handle },
    { take: 1 }
  )
  if (!brand)
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Brand with handle ${req.params.handle} was not found`
    )
  res.json({ brand: forStore(brand) })
}
