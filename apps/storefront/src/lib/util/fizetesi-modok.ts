/**
 * WHICH PAYMENT METHODS THE CHECKOUT MAY SHOW.
 *
 * Two lists meet here, and neither one alone is the answer:
 *
 *   the region's providers  what Medusa has enabled for this region. It knows
 *                           nothing about how the cart is being delivered.
 *   the backend's answer    which providers THIS cart may use, from
 *                           GET /store/payment-options. The shipping option
 *                           decides it, and the decision is Balázs's.
 *
 * Showing the first list alone is what the checkout did until now, and it is
 * why cash on delivery would appear on a store-pickup cart, where there is no
 * delivery to collect on.
 *
 * THE STOREFRONT DOES NOT DECIDE, IT INTERSECTS. A provider the backend allows
 * but the region does not offer cannot be used, and one the region offers but
 * the backend does not allow must not be offered. Both directions drop.
 */
export const FIZETESI_SZEREPEK = ["ONLINE_CARD", "COD", "PAY_AT_STORE"] as const

export type FizetesiSzerep = (typeof FIZETESI_SZEREPEK)[number]

export type EngedelyezettFizetesiMod = { id: string; role: FizetesiSzerep }

/**
 * The label the customer reads, by ROLE rather than by provider id.
 *
 * The id is an environment setting on the backend (`ACROPORA_PP_COD`), so
 * keying the label by id would put a copy of that setting in the storefront.
 * The role travels in the response next to the id, and it is the thing that
 * actually names what the customer is choosing.
 */
export const FIZETESI_SZEREP_CIMKE: Record<FizetesiSzerep, string> = {
  ONLINE_CARD: "Bankkártyás fizetés",
  COD: "Utánvét",
  PAY_AT_STORE: "Fizetés a boltban",
}

/**
 * The region's providers, narrowed to what this cart may use, each carrying
 * its role.
 *
 * The ORDER comes from the backend's list, not from the region's: the backend
 * orders by payment role, which is a decision, while the region's order is
 * whatever the store API returned.
 */
export const engedelyezettFizetesiModok = <T extends { id: string }>(
  regioModjai: readonly T[],
  engedelyezett: readonly EngedelyezettFizetesiMod[],
): (T & { role: FizetesiSzerep })[] =>
  engedelyezett.flatMap((mod) => {
    const talalat = regioModjai.find((jelolt) => jelolt.id === mod.id)

    return talalat ? [{ ...talalat, role: mod.role }] : []
  })
