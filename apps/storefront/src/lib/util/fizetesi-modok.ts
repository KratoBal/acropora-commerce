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
export const FIZETESI_SZEREPEK = [
  "ONLINE_CARD",
  "COD",
  "PAY_AT_STORE",
  "BANK_TRANSFER",
] as const

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
  // PD-002 (Balázs, 2026-09-28): a bolti fizetés CSAK személyes átvételnél
  // áll, ezért a felirat az átvételt nevezi meg, nem a helyet.
  PAY_AT_STORE: "Fizetés átvételkor",
  // bb3a6bd5 (Balázs, 2026-10-06): a díjbekérőt az OS-ből gombbal küldjük
  BANK_TRANSFER: "Előre utalás",
}

/**
 * A MOD KARTYAJANAK ALCIME, ha a cim magaban nem mondja meg, mi tortenik. Az
 * elore utalasnal a vevo nem fizet a penztarban: a dijbekerot emailben kapja,
 * es a hatarido (8 nap) Balazs dontese (2026-10-06 16:32 UTC).
 */
export const FIZETESI_SZEREP_ALCIM: Partial<Record<FizetesiSzerep, string>> = {
  BANK_TRANSFER: "Díjbekérő emailben, 8 napos fizetési határidővel",
}

export const fizetesiModAlcim = (
  mod: EngedelyezettFizetesiMod,
): string | undefined => FIZETESI_SZEREP_ALCIM[mod.role]

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

/**
 * A VEVO ALTAL OLVASOTT FELIRAT EGY MODRA: a szerepe adja (lasd fent). A Stripe
 * az egyetlen kartyas szolgaltato (Balazs, 2026-10-05), tehat a kartyas sornak
 * nem kell megkulonbozteto kiegeszites; az Apple Pay es a Google Pay a
 * kartyamezoben jelenik meg, ha a vevo eszkoze tudja.
 */
export const fizetesiModCimke = (mod: EngedelyezettFizetesiMod): string =>
  FIZETESI_SZEREP_CIMKE[mod.role]
