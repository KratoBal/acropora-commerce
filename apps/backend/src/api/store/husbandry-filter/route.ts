import { MedusaResponse, MedusaStoreRequest } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"

import { kulcsosCache } from "./gyorsitotar"
import { szures, szuroKeresbol, szuroTenyek, type Termek } from "./szures"

/**
 * THE HUSBANDRY FILTER (V2.2 S5): `GET /store/husbandry-filter?category_id=...&difficulty=...&reef_safe=1&tank=...`.
 * The rules are in `szures.ts`; here only the reading, cached per category and channel set (`gyorsitotar.ts`).
 *
 * THE BOUND: a category's published products, at most HATAR. Measured 2026-11-10 on the test shop: the largest
 * live-animal root (Halak) holds 125. Above the bound the answer says `complete: false` and the storefront shows no
 * husbandry filter at all (a filter over a cut list would place animals wrongly, with no sign).
 */
const HATAR = 1000
const DARAB = 100

/**
 * HOW LONG A READING IS SERVED (barracuda, #730): as long as the storefront's own revalidation of this answer
 * (`apps/storefront/src/lib/data/tartasi-szuro.ts`, 60 s), so a direct caller cannot make the shop read more often than
 * the storefront does. A changed husbandry block shows in the filter within a minute; the product page reads it at once.
 */
export const TTL_MS = 60_000

type Olvasas = { termekek: Termek[]; complete: boolean }

/** The route with its caches; the tests build their own with a clock. */
export function husbandryFilterGet(ttlMs: number, now: () => number = Date.now) {
  const kategoriak = kulcsosCache<Set<string>>(ttlMs, now)
  const olvasasok = kulcsosCache<Olvasas>(ttlMs, now)
  return async (req: MedusaStoreRequest, res: MedusaResponse) => {
    const kategoria = typeof req.query.category_id === "string" ? req.query.category_id.trim() : ""
    if (!kategoria)
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "category_id is required")
    const szuro = szuroKeresbol(req.query as Record<string, unknown>)
    const termekModul = req.scope.resolve(Modules.PRODUCT)

    /*
      ONLY AN ACTIVE, PUBLIC CATEGORY (barracuda, #730): an internal or inactive one would give out its counts, and an
      unknown id would only cost a read. The list is short (219 categories on the test shop, 2026-09-08) and read once
      per TTL, so the check is one cached set, not a query per call.
    */
    const nyilvanos = await kategoriak("*", async () => {
      const sorok = (await termekModul.listProductCategories(
        { is_active: true, is_internal: false },
        { select: ["id"], take: null }
      )) as { id: string }[]
      return new Set(sorok.map((k) => k.id))
    })
    if (!nyilvanos.has(kategoria))
      throw new MedusaError(MedusaError.Types.NOT_FOUND, `Category with id ${kategoria} was not found`)

    const csatornak = [...(req.publishable_key_context?.sales_channel_ids ?? [])].sort()
    const { termekek, complete } = await olvasasok(`${kategoria} ${csatornak.join(",")}`, async () => {
      const sorok = (await termekModul.listProducts(
        { status: "published", categories: { id: [kategoria] } },
        // the id breaks created_at ties, as the list's own order (#539)
        { select: ["id", "metadata"], order: { created_at: "DESC", id: "DESC" }, take: HATAR + 1 }
      )) as { id: string; metadata?: Record<string, unknown> | null }[]
      const csatornan = await kirakatCsatornajan(req, sorok.slice(0, HATAR).map((s) => s.id))
      return {
        complete: sorok.length <= HATAR,
        termekek: sorok
          .slice(0, HATAR)
          .filter((s) => csatornan.has(s.id))
          .map((s) => ({ id: s.id, tenyek: szuroTenyek(s.metadata) })),
      }
    })

    res.json({ ...szures(termekek, szuro), complete })
  }
}

export const GET = husbandryFilterGet(TTL_MS)

/**
 * The storefront channel's products among the ids (the landing pages' rule, barracuda #544): a product only on the
 * counter channel is not in the list, so it must not be counted either. If not one product came with its
 * `sales_channels`, the answer did not carry the field: nothing is narrowed, and a warning is left.
 */
async function kirakatCsatornajan(req: MedusaStoreRequest, azonositok: string[]): Promise<Set<string>> {
  const csatornak = req.publishable_key_context?.sales_channel_ids ?? []
  if (!csatornak.length || !azonositok.length) return new Set(azonositok)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const benne = new Set<string>()
  let vanMezo = false
  for (let i = 0; i < azonositok.length; i += DARAB) {
    const { data } = await query.graph({
      entity: "product",
      fields: ["id", "sales_channels.id"],
      filters: { id: azonositok.slice(i, i + DARAB) },
    })
    for (const t of data as { id: string; sales_channels?: { id: string }[] | null }[]) {
      if (Array.isArray(t.sales_channels)) vanMezo = true
      if (t.sales_channels?.some((c) => csatornak.includes(c?.id))) benne.add(t.id)
    }
  }
  if (!vanMezo) {
    req.scope
      .resolve(ContainerRegistrationKeys.LOGGER)
      .warn("[husbandry-filter] the products came without sales_channels; the filter is not narrowed to the storefront's channel")
    return new Set(azonositok)
  }
  return benne
}
