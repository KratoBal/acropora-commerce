import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError, Modules } from "@medusajs/framework/utils"

import { resolveBrandService } from "../../../../admin/brands/helpers"
import { resolveLandingPageService } from "../../../../admin/landing-pages/helpers"
import { landingSzuro, leszarmazottakkal } from "../../szuro"

/**
 * A LANDING TERMEKEI, AZONOSITOKKENT (SEO P1-14, t10). A kirakat ebbol lapoz,
 * oldalanként 12 azonositoval a `/store/products` id-szurojen.
 *
 * MIERT ITT, ES NEM A KIRAKATBAN: a marka-kapcsolat a brand modulban el
 * (`product_brand`), es a Store API termek-vegpontja erre nem tud szurni. A
 * kategoria-szurest a termek-modul vegzi, a ketto metszete egy hivas.
 *
 * Csak publikalt termek, a legujabb elol. A nem publikalt vagy ismeretlen
 * landing, es az ervenytelen szuro ugyanaz a 404.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const [page] = await resolveLandingPageService(req.scope).listLandingPages(
    { handle: req.params.handle, is_published: true },
    { take: 1 }
  )
  const szuro = page ? landingSzuro(page.filter) : null
  if (!szuro)
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Landing page with handle ${req.params.handle} was not found`
    )

  let markasTermekek: string[] | undefined
  if (szuro.os_brand_ids.length) {
    const sorok = await resolveBrandService(req.scope).listProductBrands(
      { os_brand_id: szuro.os_brand_ids },
      { select: ["product_id"] }
    )
    markasTermekek = Array.from(new Set(sorok.map((s) => s.product_id)))
    if (!markasTermekek.length) {
      res.json({ product_ids: [] })
      return
    }
  }

  const termekModul = req.scope.resolve(Modules.PRODUCT)
  // a kivalasztott kategoria az alkategoriaival egyutt (nautilus, 29016)
  const kategoriak = szuro.category_ids.length
    ? leszarmazottakkal(
        await termekModul.listProductCategories(
          {},
          { select: ["id", "parent_category_id"] }
        ),
        szuro.category_ids
      )
    : []

  const termekek = await termekModul.listProducts(
    {
      status: "published",
      ...(markasTermekek ? { id: markasTermekek } : {}),
      ...(kategoriak.length ? { categories: { id: kategoriak } } : {}),
    },
    { select: ["id"], order: { created_at: "DESC" } }
  )
  res.json({ product_ids: termekek.map((t) => t.id) })
}
