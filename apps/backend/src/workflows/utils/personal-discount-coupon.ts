import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

/**
 * A SAJÁT KEDVEZMÉNY MELLETT NINCS KUPON (kártya 20713f62; Balázs, 2026-11-19 06:48 UTC, Eldöntendő szál, msg
 * 1572866210066866238: „Saját kedvezménynél ki kell írni hogy ezt a kupont te nem tudod felhasználni").
 *
 * A vevőnkénti kedvezmény az OS-ből jön: egy automatikus promóció, amelynek a kódja a vevő azonosítójából képződik
 * (`EGYEDI-` + a vevő azonosítója nagybetűvel, acropora-os `webshop-customer-discounts.rules.ts`). A Medusa 2.22-ben a
 * promóciók nem zárják ki egymást, ezért a döntés itt van: ha a kosár vevőjének AKTÍV saját kedvezménye van, egy ÚJ
 * kuponkód elutasítva, a kirakat által felismert kóddal (`PERSONAL_DISCOUNT_COUPON`), hogy a vevő a saját mondatát lássa.
 *
 * Két helyen fut: amikor a kosár kódjai változnak (`updateCartPromotionsWorkflow`, csak az ÚJ kódra: egy sima frissítés
 * a meglévő kódokkal nem bukhat el), és a rendelés lezárásakor (az a kupon, ami a belépés előtt került a kosárra, itt
 * akad meg, mert a belépéskor a kosár frissítése nem hoz új kódot).
 */
export const PERSONAL_DISCOUNT_COUPON = "personal_discount_coupon"

/** The OS's prefix (`PERSONAL_CODE_PREFIX` in acropora-os); a code with it is the customer's own discount, not a coupon. */
export const PERSONAL_CODE_PREFIX = "EGYEDI-"

export const isPersonalCode = (code: string) => code.startsWith(PERSONAL_CODE_PREFIX)

export const personalCodeOf = (customerId: string) => `${PERSONAL_CODE_PREFIX}${customerId.toUpperCase()}`

type QueryContainer = { resolve: (key: string) => unknown }
type Query = { graph: (args: Record<string, unknown>) => Promise<{ data: Record<string, unknown>[] }> }

/** Whether the customer's own discount is live: its automatic promotion exists and is active. */
export async function hasActivePersonalDiscount(container: QueryContainer, customerId: string): Promise<boolean> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as Query
  const { data } = await query.graph({
    entity: "promotion",
    fields: ["id", "code", "status", "is_automatic"],
    filters: { code: personalCodeOf(customerId) },
  })
  return data.some((row) => row.status === "active" && row.is_automatic === true)
}

/** Refuses the coupons among `codes` when the customer has a live own discount; the customer's own code passes. */
export async function assertNoCouponWithPersonalDiscount(
  container: QueryContainer,
  customerId: string | null | undefined,
  codes: readonly (string | null | undefined)[]
): Promise<void> {
  if (!customerId) return
  const coupons = codes.filter((code): code is string => !!code && !isPersonalCode(code))
  if (!coupons.length) return
  if (!(await hasActivePersonalDiscount(container, customerId))) return
  throw new MedusaError(
    MedusaError.Types.NOT_ALLOWED,
    `${PERSONAL_DISCOUNT_COUPON}: a customer with an own discount cannot use a coupon (${coupons.join(", ")})`
  )
}

/** The codes `next` adds to `current`: a refresh that keeps the cart's codes adds none. */
export const newCodes = (
  next: readonly string[] | null | undefined,
  current: readonly (string | null | undefined)[]
): string[] => {
  const have = new Set(current.filter(Boolean))
  return (next ?? []).filter((code) => !have.has(code))
}

/** The completion's check: the cart's codes and customer read now (the completion's cart carries no promotion codes). */
export async function assertCartHasNoCouponWithPersonalDiscount(container: QueryContainer, cartId: string): Promise<void> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as Query
  const { data } = await query.graph({
    entity: "cart",
    fields: ["id", "customer_id", "promotions.code"],
    filters: { id: cartId },
  })
  const cart = data[0] as { customer_id?: string | null; promotions?: { code?: string | null }[] | null } | undefined
  if (!cart) return
  await assertNoCouponWithPersonalDiscount(
    container,
    cart.customer_id,
    (cart.promotions ?? []).map((promotion) => promotion?.code)
  )
}
