import type { OrderLocale } from "../order-locale"

/**
 * THE LINK TO THE GUEST ORDER PAGE, FOR THE MAIL (card d5c6befd and the "Rendelésem" page, acrobot 43870): the shop
 * knows its own address, the OS renders the words, so the shop sends the ADDRESS as a fact (`order_view_url`) and the
 * OS draws the link wherever its template wants one. The page is `/<country>/rendeles-megtekintese` of the storefront
 * (`hu` for Hungarian, `en-hu` for English, the first path segment of the storefront), where the customer types the
 * order number and the address; nothing about the order is in the link.
 *
 * `ACROPORA_STOREFRONT_URL` is the storefront's own address (the revalidation and the merchant feed use it). Only an
 * https address is used, and only its ORIGIN (a path, a query or credentials in the variable are dropped): an unset,
 * malformed or non-https value is `null`, and the OS then draws no link.
 */
export const ORDER_VIEW_PATH = "rendeles-megtekintese"

const COUNTRY_SEGMENT: Record<OrderLocale, string> = { hu: "hu", en: "en-hu" }

export const orderViewUrl = (env: NodeJS.ProcessEnv, locale: OrderLocale): string | null => {
  const raw = env.ACROPORA_STOREFRONT_URL?.trim()
  if (!raw) return null
  try {
    const url = new URL(raw)
    if (url.protocol !== "https:") return null
    return `${url.origin}/${COUNTRY_SEGMENT[locale]}/${ORDER_VIEW_PATH}`
  } catch {
    return null
  }
}
