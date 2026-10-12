import {
  MedusaResponse,
  MedusaStoreRequest,
} from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"

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
const DARAB = 100

export const GET = async (req: MedusaStoreRequest, res: MedusaResponse) => {
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
    // az id a created_at-holtversenyt bontja: egy kotegelt import egy
    // idobelyeget ir egy egesz kotegre (barracuda, #539 es #544)
    { select: ["id"], order: { created_at: "DESC", id: "DESC" } }
  )
  const azonositok = termekek.map((t) => t.id)

  /*
    A KIRAKAT CSATORNAJARA SZUKITVE (barracuda #544 review). A boltnak tobb
    csatornaja van (az alapertelmezett es a pultos); egy csak pultos, publikalt
    termek kulonben beleszamitana a lapszamba, de a kirakat nem mutatna, es
    ures, indexelheto lapok keletkeznenek. A termek-modul a csatornat nem
    ismeri (az link), ezert a #539 mintajara a termekek `sales_channels.id`
    mezojebol szurunk, darabolva.
  */
  const csatornak = req.publishable_key_context?.sales_channel_ids ?? []
  if (!csatornak.length || !azonositok.length) {
    res.json({ product_ids: azonositok })
    return
  }
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const csatornan = new Set<string>()
  let vanMezo = false
  for (let i = 0; i < azonositok.length; i += DARAB) {
    const { data } = await query.graph({
      entity: "product",
      fields: ["id", "sales_channels.id"],
      filters: { id: azonositok.slice(i, i + DARAB) },
    })
    for (const t of data as {
      id: string
      sales_channels?: { id: string }[] | null
    }[]) {
      if (Array.isArray(t.sales_channels)) vanMezo = true
      if (t.sales_channels?.some((c) => csatornak.includes(c?.id)))
        csatornan.add(t.id)
    }
  }
  /*
    AZ ORZO (barracuda #544, acrobot 29038, a #542 mintajara): ha EGYETLEN
    termeken sem jott meg a `sales_channels` mezo, a valasz nem hordozta az
    adatot. A szukites ilyenkor minden termeket kiejtene, es minden valogatas
    ures, noindex lap lenne, hiba nelkul. Ezert nem szur, es nyomot hagy.
  */
  if (!vanMezo) {
    req.scope
      .resolve(ContainerRegistrationKeys.LOGGER)
      .warn(
        "[landing product-ids] the products came without sales_channels; the list is not narrowed to the storefront's channel"
      )
    res.json({ product_ids: azonositok })
    return
  }
  res.json({ product_ids: azonositok.filter((id) => csatornan.has(id)) })
}
