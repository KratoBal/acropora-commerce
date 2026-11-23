/**
 * THE COLLECTION BEHIND A BRAND PAGE. The brand page lists its products from a
 * product collection (`marka-lap-torzs.tsx`: sort, filters and paging all run on
 * `collection_id`), so a brand without one has nothing to show and its page is a
 * 404. The pairing is the page's own, in the same order:
 *
 * 1. by the OS id (`collection.external_id`), because a collection created before
 *    a slug change keeps its old handle (measured on the test shop, 2026-10-30:
 *    `aqua-medic` against the brand `aquamedic`);
 * 2. else a collection with the brand's own handle (the storefront's fallback).
 *
 * Measured on the test shop, 2026-11-19: 45 of the 105 brands that have products
 * had neither, and `/hu/marka` linked all 105, so 45 links led to a 404 (and the
 * sitemap listed them). The list and the brand's own record now use this one rule.
 */
type CollectionRow = { handle: string; external_id?: string | null }

type CollectionLister = {
  listProductCollections: (
    filters: never,
    config?: { select?: string[]; take?: number }
  ) => Promise<CollectionRow[]>
}

type Brand = { os_brand_id: string; handle: string }

/** The collection handle of every brand that has one, keyed by the brand's OS id. */
export const brandCollectionHandles = async (
  products: CollectionLister,
  brands: Brand[]
): Promise<Map<string, string>> => {
  const collections = await products.listProductCollections({} as never, {
    select: ["handle", "external_id"],
  })
  const byExternalId = new Map<string, string>()
  const handles = new Set<string>()
  for (const c of collections) {
    handles.add(c.handle)
    if (c.external_id) byExternalId.set(c.external_id, c.handle)
  }
  const found = new Map<string, string>()
  for (const brand of brands) {
    const handle =
      byExternalId.get(brand.os_brand_id) ??
      (handles.has(brand.handle) ? brand.handle : null)
    if (handle) found.set(brand.os_brand_id, handle)
  }
  return found
}

/** The same rule for one brand: its collection's handle, or `null`. */
export const brandCollectionHandle = async (
  products: CollectionLister,
  brand: Brand
): Promise<string | null> => {
  const [byId] = await products.listProductCollections(
    { external_id: brand.os_brand_id } as never,
    { select: ["handle"], take: 1 }
  )
  if (byId) return byId.handle
  const [byHandle] = await products.listProductCollections(
    { handle: brand.handle } as never,
    { select: ["handle"], take: 1 }
  )
  return byHandle?.handle ?? null
}
