import type { MerchantItem } from "./merchant-feed-item"

/**
 * THE META (FACEBOOK) CATALOG FEED (card 87f351a3, A18; Balázs 2026-11-18 21:30 UTC, msg 1572725779375071492: Google and
 * Facebook feed yes, Árukereső and olcsóbbat.hu no). The same mapper as the Google feed decides what an item says
 * (`merchant-feed-item.ts`: the page's price and sale price, image, brand, GTIN, the storefront's stock rule); this
 * only translates it into Meta's words. Meta reads an RSS 2.0 file with the `g:` namespace, so the XML transport is
 * the same (`merchantFeedXml`).
 *
 * WHAT DIFFERS FROM GOOGLE:
 *   availability   Meta's values have a space: "in stock", "out of stock", and a backorderable item at zero stock is
 *                  "available for order" (the page sells it; Meta asks for no ship day, so the Google rule that turns
 *                  it into out of stock without a lead time does not apply, and until the stocktake a zero is not
 *                  "sold out").
 *   left out      the Google-only fields (`availability_date`, `identifier_exists`, `unit_pricing_measure`,
 *                  `shipping_weight`).
 *
 * NOT SENT ANYWHERE: the feed is a URL; submitting it to a Meta catalog is an outside publication (Balázs's word).
 */
export type MetaCatalogItem = {
  id: string
  item_group_id?: string
  title: string
  description: string
  link: string
  image_link: string
  additional_image_link: string[]
  price: string
  sale_price?: string
  availability: "in stock" | "out of stock" | "available for order"
  condition: "new" | "used"
  brand?: string
  gtin?: string
  product_type?: string
}

const META_AVAILABILITY: Record<MerchantItem["availability"], MetaCatalogItem["availability"]> = {
  in_stock: "in stock",
  out_of_stock: "out of stock",
  backorder: "available for order",
}

export function toMetaCatalogItem(item: MerchantItem): MetaCatalogItem {
  return {
    id: item.id,
    ...(item.item_group_id ? { item_group_id: item.item_group_id } : {}),
    title: item.title,
    description: item.description,
    link: item.link,
    image_link: item.image_link,
    additional_image_link: item.additional_image_link,
    price: item.price,
    ...(item.sale_price ? { sale_price: item.sale_price } : {}),
    availability: META_AVAILABILITY[item.availability],
    condition: item.condition,
    ...(item.brand ? { brand: item.brand } : {}),
    ...(item.gtin ? { gtin: item.gtin } : {}),
    ...(item.product_type ? { product_type: item.product_type } : {}),
  }
}
