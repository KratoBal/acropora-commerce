import type { GuestPaymentKind } from "./guest-order"

/**
 * A FIZETESI HELYZET, EGY HELYEN (kartya 7bfca4eb, acrobot 60978). A vendeg-lap (`guest-order.ts` paymentTextKeys) es a fiok
 * (`rendelesek.ts` fizetesiAllapot) ugyanazt a rendelest ugyanugy kell, hogy elmondja; a szabaly eddig ket helyen allt, es egy
 * valtozas az egyiket elfelejthette volna (a #891 v2 hibaja ilyen volt: a feloldott zarolas `canceled` allapota). Itt dol el, mit
 * JELENT a fizetes fajtaja (commerce #891, #894) es a Medusa-allapot egyutt; a ket lap csak a sajat kulcsat valasztja hozza, es a
 * `fizetesi-helyzet.spec.ts` a kettot minden allapot x fajta eseten osszeveti.
 *
 *   feloldott       kartyas rendeles, a zarolast feloldottuk, a link az aru erkezesekor jon (a gyujto ilyenkor canceled is)
 *   linkre_var      kartyas rendeles, a fizetesi link kiment, fizetesre var
 *   atutalasra_var  eloreutalas, fizetesre var
 *   varakozik       fizetesre var, a fajta ismeretlen (regi bolt-valasz)
 *   kartya_var      sima kartyas rendeles fizetesre var (a boltban ritka: a kartya leadaskor zarol)
 *   atvetelkor      utanvet: atvetelkor fizet, nincs mire varni
 *   boltban         bolti fizetes: a boltban, atvetelkor fizet (a system provider azonnal authorized)
 *   lezart_zarolas  zarolas-allapot egy lezart rendelesen: a zarolas mar nem el
 *   eloleg_beerkezett  eloreutalas, az eloleg megjott, a hatralek meg nem (kartya d31a66a3, 2b; acrobot 61267): nem "kifizetve"
 *   null            a fajta nem mond semmi kulont: a nyers allapot beszel (kifizetve, visszateritve, ...)
 */
export type FizetesiHelyzet =
  | "feloldott"
  | "linkre_var"
  | "atutalasra_var"
  | "varakozik"
  | "kartya_var"
  | "atvetelkor"
  | "boltban"
  | "lezart_zarolas"
  | "eloleg_beerkezett"

const VARAKOZO = new Set(["not_paid", "awaiting"])
const ZAROLAS = new Set(["authorized", "partially_authorized"])
const LEZARO = new Set(["closed", "closed_unsuccessfully"])

/**
 * `state`: a Medusa fizetesi allapota; `kind`: a fizetes fajtaja (a bolt kuldi); `uzleti`: a rendeles uzleti allapota, ha a lap
 * ismeri (a vendeg-lapon a bolt mar a fajtaban szamol vele, #894).
 */
export function fizetesiHelyzet(
  state: string | null | undefined,
  kind: GuestPaymentKind | null,
  uzleti: string | null = null,
): FizetesiHelyzet | null {
  if (!state) return null
  const var_ = VARAKOZO.has(state)
  // the released hold reads canceled: releasing it cancels the order's only collection (release-hold.ts; barracuda on #891 v2)
  if (kind === "card_released" && (var_ || state === "canceled"))
    return "feloldott"
  // paying in the store authorizes at once (the system provider): no card hold, the customer pays at pickup
  if (kind === "store" && (var_ || state === "authorized")) return "boltban"
  if (var_) {
    if (kind === "cod") return "atvetelkor"
    if (kind === "transfer") return "atutalasra_var"
    if (kind === "card_link") return "linkre_var"
    if (kind === "card") return "kartya_var"
    return "varakozik"
  }
  // an advance by transfer arrived, the balance not yet: the raw status would say "részben kifizetve" or "Kifizetve"
  if (state === "partially_captured" && kind === "transfer")
    return "eloleg_beerkezett"
  if (ZAROLAS.has(state) && uzleti && LEZARO.has(uzleti))
    return "lezart_zarolas"
  return null
}
