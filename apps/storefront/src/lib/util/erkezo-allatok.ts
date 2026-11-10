/**
 * AZ ERKEZO ALLATOK LISTAJA, AHOGY A BOLT ADJA (V2.6 S4c, kartya f4e4832b; a szerzodes a commerce #719-ben, murena es
 * nautilus 45613/45618/45620): `GET /store/livestock-arrivals`, soronkent
 * `{ id, kind, label, expected_on, status, medusa_product_id, species_key, species_buyable }`.
 *
 * SZIGORUAN OLVASVA, SORONKENT: egy sor, ami nem pontosan a szerzodes (ismeretlen fajta vagy allapot, nem valodi nap, ures
 * nev, hianyzo mezo), kimarad, a tobbi megjelenik. Egy rossz sor rosszabb a semminel: elo allat erkezeserol beszel.
 *
 * A "MA" A BOLT NAPJA: az OS es a bolt nem hasonlitja a napot a mai naphoz, a lap mondja ki a kesest (`arrivalIsLate`, a
 * termeklap szabalya).
 */
export type ErkezoAllatFajta = "FISH" | "INVERTEBRATE" | "CORAL"
export type ErkezoAllatAllapot = "ORDERED" | "IN_TRANSIT"

export type ErkezoAllat = {
  id: string
  fajta: ErkezoAllatFajta
  nev: string
  /** a varhato nap, `YYYY-MM-DD` */
  nap: string
  allapot: ErkezoAllatAllapot
  /** a kotott termek boltbeli azonositoja, vagy null (faj vagy csoport erkezese) */
  termekId: string | null
  /** a faj kulcsa a bolt szabalyaval, vagy null (csoport, "sp.") */
  fajKulcs: string | null
  /** a fajnak MOST van megveheto termeke: ilyenkor a lap nem ajanl feliratkozast (az ertesites sosem szolna) */
  fajKaphato: boolean
}

const FAJTAK: readonly ErkezoAllatFajta[] = ["FISH", "INVERTEBRATE", "CORAL"]
const ALLAPOTOK: readonly ErkezoAllatAllapot[] = ["ORDERED", "IN_TRANSIT"]
const NAP = /^(\d{4})-(\d{2})-(\d{2})$/

const valodiNap = (ertek: unknown): ertek is string => {
  if (typeof ertek !== "string") return false
  const m = NAP.exec(ertek)
  if (!m) return false
  const nap = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
  return nap.toISOString().slice(0, 10) === ertek
}

const szoveg = (ertek: unknown): ertek is string =>
  typeof ertek === "string" && ertek.trim() !== ""

/** A bolt valaszanak sorai, a szerzodes szerint olvasva; ami nem az, kimarad. */
export function erkezoAllatokOf(valasz: unknown): ErkezoAllat[] {
  const sorok = (valasz as { livestock_arrivals?: unknown } | null)
    ?.livestock_arrivals
  if (!Array.isArray(sorok)) return []
  const ki: ErkezoAllat[] = []
  for (const sor of sorok) {
    if (typeof sor !== "object" || sor === null) continue
    const o = sor as Record<string, unknown>
    if (!szoveg(o.id) || !szoveg(o.label)) continue
    if (!FAJTAK.includes(o.kind as ErkezoAllatFajta)) continue
    if (!ALLAPOTOK.includes(o.status as ErkezoAllatAllapot)) continue
    if (!valodiNap(o.expected_on)) continue
    if (o.medusa_product_id !== null && !szoveg(o.medusa_product_id)) continue
    if (o.species_key !== null && !szoveg(o.species_key)) continue
    if (typeof o.species_buyable !== "boolean") continue
    ki.push({
      id: o.id,
      fajta: o.kind as ErkezoAllatFajta,
      nev: o.label.trim(),
      nap: o.expected_on,
      allapot: o.status as ErkezoAllatAllapot,
      termekId: (o.medusa_product_id as string | null) ?? null,
      fajKulcs: (o.species_key as string | null) ?? null,
      fajKaphato: o.species_buyable,
    })
  }
  return ki
}

/**
 * Kell-e a sorhoz feliratkozas ("Értesíts, ha megérkezik", a FAJRA): csak a kotetlen sornal (a kotottnek a termeklapja van,
 * ott a termek-feliratkozas all), csak ha a nev fajt nevez, csak ha a fajnak most nincs megveheto termeke (kulonben az ertesites
 * sosem szolna, murena 45613), es csak a kapcsolo mogott (a hivo adja).
 */
export const erkezesFeliratkozasKell = (
  sor: ErkezoAllat,
  bekapcsolva: boolean,
): boolean =>
  bekapcsolva &&
  sor.termekId === null &&
  sor.fajKulcs !== null &&
  !sor.fajKaphato
