import { isDay, type LivestockArrivalStage } from "@lib/util/livestock-arrival"

/**
 * AZ UTON LEVO ELO ALLATOK LISTAJA, AHOGY A BOLT ADJA (V2.6 S4c, kartya f4e4832b; a pare: a commerce
 * `GET /store/livestock-arrivals`, nautilus S4a). Soronkent: `{ id, kind, label, expected_on, status, medusa_product_id,
 * species_key, species_buyable }`. Az OS csak azt kuldi ki, ami a vevo elott allhat (elojegyezheto, meg nem erkezett,
 * nem lemondott), a nev is.
 *
 * SZIGORUAN OLVASSUK, SORONKENT: egy sor, ami nem pontosan a szerzodes, kimarad (a tobbi marad), mert egy hibas sor a
 * vevo elott rosszabb a semminel: egy elo allat erkezeset mondja. Ismeretlen fajta vagy allapot, nem valodi nap, ures
 * vagy tul hosszu nev, hibas tipusu mezo: a sor nincs.
 */
export const ARRIVING_KINDS = ["FISH", "INVERTEBRATE", "CORAL"] as const
export type ArrivingKind = (typeof ARRIVING_KINDS)[number]

export type ArrivingAnimal = {
  /** a commerce sora, amit a feliratkozas visszakuld (`arrival_id`) */
  id: string
  kind: ArrivingKind
  label: string
  /** `YYYY-MM-DD` */
  expectedOn: string
  stage: LivestockArrivalStage
  /** a bolti termek, ha az erkezes mar termekhez kotott (a lap linket ad ra) */
  productId: string | null
  /** a faj kulcsa a feliratkozashoz, vagy null, ha a nev nem faj */
  speciesKey: string | null
  /** a fajnak most van megveheto termeke: ilyenkor a lap nem ajanl feliratkozast */
  speciesBuyable: boolean
}

const STATUS: Record<string, LivestockArrivalStage> = {
  ORDERED: "ordered",
  IN_TRANSIT: "in_transit",
}
const LABEL_MAX = 200

const text = (value: unknown): string | null =>
  typeof value === "string" && value.trim() !== "" ? value.trim() : null

/** Egy sor a szerzodes szerint, vagy null. */
function rowOf(row: unknown): ArrivingAnimal | null {
  if (typeof row !== "object" || row === null || Array.isArray(row)) return null
  const r = row as Record<string, unknown>
  const id = text(r.id)
  const label = text(r.label)
  if (!id || !label || label.length > LABEL_MAX) return null
  if (!ARRIVING_KINDS.includes(r.kind as ArrivingKind)) return null
  if (!isDay(r.expected_on)) return null
  const stage = typeof r.status === "string" ? STATUS[r.status] : undefined
  if (!stage) return null
  if (r.medusa_product_id !== null && text(r.medusa_product_id) === null)
    return null
  if (r.species_key !== null && text(r.species_key) === null) return null
  if (typeof r.species_buyable !== "boolean") return null
  return {
    id,
    kind: r.kind as ArrivingKind,
    label,
    expectedOn: r.expected_on,
    stage,
    productId: r.medusa_product_id === null ? null : text(r.medusa_product_id),
    speciesKey: r.species_key === null ? null : text(r.species_key),
    speciesBuyable: r.species_buyable,
  }
}

/**
 * A valasz torzse (`{ livestock_arrivals: [...] }`) sorai, rendezve: varhato nap, azon belul a nev (magyar sorrend).
 * Ami nem a szerzodes, kimarad; a torzs, ami nem az, ures lista.
 */
export function arrivingAnimalsOf(body: unknown): ArrivingAnimal[] {
  const list = (body as { livestock_arrivals?: unknown } | null)
    ?.livestock_arrivals
  if (!Array.isArray(list)) return []
  return list
    .map(rowOf)
    .filter((row): row is ArrivingAnimal => row !== null)
    .sort(
      (a, b) =>
        a.expectedOn.localeCompare(b.expectedOn) ||
        a.label.localeCompare(b.label, "hu"),
    )
}

/** Fajtankent csoportositva, a fajtak rogzitett sorrendjeben; az ures fajta kimarad. */
export function groupedByKind(
  animals: readonly ArrivingAnimal[],
): { kind: ArrivingKind; animals: ArrivingAnimal[] }[] {
  return ARRIVING_KINDS.map((kind) => ({
    kind,
    animals: animals.filter((a) => a.kind === kind),
  })).filter((group) => group.animals.length > 0)
}
