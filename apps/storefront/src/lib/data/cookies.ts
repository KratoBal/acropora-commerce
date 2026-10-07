import "server-only"
import { cookies as nextCookies } from "next/headers"

export const getAuthHeaders = async (): Promise<
  { authorization: string } | Record<string, never>
> => {
  try {
    const cookies = await nextCookies()
    const token = cookies.get("_medusa_jwt")?.value

    if (!token) {
      return {}
    }

    return { authorization: `Bearer ${token}` }
  } catch {
    return {}
  }
}

export const getCacheTag = async (tag: string): Promise<string> => {
  try {
    const cookies = await nextCookies()
    const cacheId = cookies.get("_medusa_cache_id")?.value

    if (!cacheId) {
      return ""
    }

    return `${tag}-${cacheId}`
  } catch {
    return ""
  }
}

/**
 * A LEKERES CIMKEI: a latogatonkenti ES a kozos (kartya 2d22116c).
 *
 * Eddig CSAK a latogatonkenti cimke allt (`products-<_medusa_cache_id>`),
 * suti nelkul pedig SEMMI, mikozben a termek-lekeres `force-cache`. Egy
 * arvaltozasra tehat semmi nem tudta egyszerre minden latogato gyorsitotarat
 * uriteni: a kozponti `revalidateTag` a latogatonkenti cimket nem eri el, a
 * cimke nelkuli bejegyzest pedig semmi. A KOZOS cimke (`products`) ezt adja
 * meg: az `/api/revalidate` egy hivassal mindet uriti. A latogatonkenti marad,
 * mert a kosar es a fiok a sajat urites-hivasaiban arra epit.
 */
export const getCacheOptions = async (
  tag: string,
): Promise<{ tags: string[] }> => {
  if (typeof window !== "undefined") {
    return { tags: [tag] }
  }

  const cacheTag = await getCacheTag(tag)

  return { tags: cacheTag ? [cacheTag, tag] : [tag] }
}

/**
 * A PUBLIKUS KATALOGUS CIMKEI, SUTI NELKUL (FE-7, Balazs 2026-10-07: a
 * publikus lapok gyorsitotarazhatok legyenek).
 *
 * A `getCacheOptions` a latogatonkenti `_medusa_cache_id` sutit olvassa, es a
 * Next.js-ben egy suti olvasasa az EGESZ utvonalat dinamikussa teszi: minden
 * termek-, kategoria- es marka-lap `private, no-store` valaszt adott, mert a
 * lekeresuk sutit olvasott. A katalogus adata nem latogatofuggo (vasarlo-fuggo
 * ar, vevocsoport nincs a boltban), tehat a publikus lekeres CSAK a kozos
 * cimket viszi; az arvaltozasra az `/api/revalidate` ezt uriti (#514).
 * A kosar, a fiok es a penztar tovabbra is a `getCacheOptions`-t hasznalja.
 */
export const getPublicCacheOptions = async (
  tag: string,
): Promise<{ tags: string[] }> => ({ tags: [tag] })

// `sameSite: "lax"` rather than `"strict"`: the customer returns from a
// redirect-based payment method (iDEAL, Bancontact, ...) via a cross-site
// top-level navigation. A "strict" cookie is withheld on that navigation, so
// the storefront would see a logged-out, cartless visitor and render a 404 for
// the checkout page instead of resuming the order. "lax" is sent on top-level
// GET navigations while still blocking cross-site subrequests.
export const setAuthToken = async (token: string) => {
  const cookies = await nextCookies()
  cookies.set("_medusa_jwt", token, {
    maxAge: 60 * 60 * 24 * 7,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  })
}

export const removeAuthToken = async () => {
  const cookies = await nextCookies()
  cookies.set("_medusa_jwt", "", {
    maxAge: -1,
  })
}

export type PendingCustomer = {
  email: string
  first_name?: string
  last_name?: string
  phone?: string
  /** A regisztraciokor rogzitett adatok (peldaul az ASZF-elfogadas). */
  metadata?: Record<string, unknown>
}

// During the email verification flow the customer record isn't created until
// the customer verifies their email and logs in. We temporarily persist the
// extra signup fields in a cookie so they survive the customer leaving to open
// their inbox, and read them back when creating the customer at login.
export const setPendingCustomer = async (customer: PendingCustomer) => {
  const cookies = await nextCookies()
  cookies.set("_medusa_pending_customer", JSON.stringify(customer), {
    maxAge: 60 * 60 * 24,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  })
}

export const getPendingCustomer = async (): Promise<PendingCustomer | null> => {
  const cookies = await nextCookies()
  const value = cookies.get("_medusa_pending_customer")?.value

  if (!value) {
    return null
  }

  try {
    return JSON.parse(value) as PendingCustomer
  } catch {
    return null
  }
}

export const removePendingCustomer = async () => {
  const cookies = await nextCookies()
  cookies.set("_medusa_pending_customer", "", {
    maxAge: -1,
  })
}

export const getCartId = async () => {
  const cookies = await nextCookies()
  return cookies.get("_medusa_cart_id")?.value
}

// See the note on `setAuthToken`: `sameSite: "lax"` so the cart cookie survives
// the cross-site return navigation from a redirect-based payment method.
export const setCartId = async (cartId: string) => {
  const cookies = await nextCookies()
  cookies.set("_medusa_cart_id", cartId, {
    maxAge: 60 * 60 * 24 * 7,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  })
}

export const removeCartId = async () => {
  const cookies = await nextCookies()
  cookies.set("_medusa_cart_id", "", {
    maxAge: -1,
  })
}
