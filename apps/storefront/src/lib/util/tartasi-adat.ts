/**
 * A TARTASI ADATOK (V2.2 S4, kartya d2fc06e7; a spec: exchange/otletek-2026-11-04/v2-2-tartasi-blokk.md).
 *
 * A SZERZODES murenaval (46072): a Medusa termek `metadata.husbandry` kulcsa egy JSON SZOVEG, amit az OS vetit (S3,
 * `apps/api/src/integrations/medusa/medusa-husbandry.ts`): csak elo allatra, csak ELLENORZOTT blokkra, kapcsolo mogott.
 * Csak a kitoltott kulcsok vannak benne; egy hianyzo kulcs, vagy a kulcs hianya, "ellenorzes alatt". Uj ertek uj `v`.
 *
 * AZ OLVASAS TURO: ismeretlen verzio, hibas JSON, ismeretlen ertek -> az a mezo (vagy az egesz blokk) "ellenorzes alatt",
 * soha nem dob, es semmit nem talal ki. A magyar szavakat a kirakat adja; a fokozat-skala az OS
 * `packages/types/src/product-husbandry.ts` HUSBANDRY_DIFFICULTY_SCALE-jenek masa (ket repo, kozos csomag nelkul: a
 * szerzodes ket helyen all).
 */

export const TARTAS_NEHEZSEGEK = [
  "KONNYU",
  "KOZEPES",
  "HALADO",
  "SZAKERTO",
] as const
export type TartasNehezseg = (typeof TARTAS_NEHEZSEGEK)[number]
const ZONAK = ["ALSO", "KOZEPSO", "FELSO"] as const
const KORALLOS = [
  "IGEN",
  "NEM",
  "FELTETELES",
  "ALLITAS_NELKULI",
  "NEM_FAJ_SZINTU",
] as const
const TARSAS = [
  "EGYEDUL",
  "PARBAN",
  "CSOPORTBAN",
  "TOBB_PELDANY_TARTHATO",
] as const
const AGRESSZIO = [
  "BEKES",
  "TERULETVEDO",
  "RAGADOZO",
  "CSALANOZ",
  "FAJTARSSAL_AGRESSZIV",
  "FELTETELES",
] as const
const ETETES = [
  "SZURO_PLANKTON",
  "ALGAEVO",
  "HUSEVO",
  "MINDENEVO",
  "TORMELEKEVO",
  "FOTOSZINTETIZALO",
  "TISZTOGATO",
] as const
const IGENY = ["GYENGE", "KOZEPES", "EROS", "NEM_ERTELMEZHETO"] as const
const DIMENZIO = [
  "TESTHOSSZ",
  "KARFESZTAVOLSAG",
  "HEJMERET",
  "TELJES_KITERJEDES",
] as const
const SZARMAZAS = ["TENYESZTETT", "VADFOGAS"] as const
const FAJTA = ["fish", "coral", "invertebrate"] as const

export type TartasiAdat = {
  kind: (typeof FAJTA)[number]
  verifiedOn: string | null
  difficulty: TartasNehezseg | null
  minLiter: number | null
  maturityMonths: number | null
  placementZone: (typeof ZONAK)[number] | null
  reefSafe: (typeof KORALLOS)[number] | null
  reefSafeReason: string | null
  social: (typeof TARSAS)[number] | null
  aggression: (typeof AGRESSZIO)[number][]
  coralEater: boolean | null
  invertebrateEater: boolean | null
  feeding: (typeof ETETES)[number][]
  feedingFrequency: string | null
  liveFood: boolean | null
  light: (typeof IGENY)[number] | null
  flow: (typeof IGENY)[number] | null
  maxSize: { value: number; dimension: (typeof DIMENZIO)[number] } | null
  sourcing: (typeof SZARMAZAS)[number] | null
  notFor: string | null
}

const egyik = <T extends string>(lista: readonly T[], v: unknown): T | null =>
  typeof v === "string" && (lista as readonly string[]).includes(v)
    ? (v as T)
    : null
const tobb = <T extends string>(lista: readonly T[], v: unknown): T[] =>
  Array.isArray(v) ? v.filter((x): x is T => egyik(lista, x) !== null) : []
const szam = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null
const szoveg = (v: unknown) =>
  typeof v === "string" && v.trim() !== "" ? v.trim().slice(0, 500) : null
const logikai = (v: unknown) => (typeof v === "boolean" ? v : null)
const nap = (v: unknown) =>
  typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null

/** A metaadat `husbandry` kulcsa, vagy null: nincs, nem 1-es verzio, hibas JSON, vagy nem ismert a fajta. */
export function tartasiAdat(
  metadata: Record<string, unknown> | null | undefined,
): TartasiAdat | null {
  const nyers = metadata?.husbandry
  if (typeof nyers !== "string") return null
  let o: Record<string, unknown>
  try {
    const parsed: unknown = JSON.parse(nyers)
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed))
      return null
    o = parsed as Record<string, unknown>
  } catch {
    return null
  }
  if (o.v !== 1) return null
  const kind = egyik(FAJTA, o.kind)
  if (!kind) return null
  const meret = o.max_size as
    { value?: unknown; dimension?: unknown } | undefined
  const meretErtek = szam(meret?.value)
  const meretDim = egyik(DIMENZIO, meret?.dimension)
  return {
    kind,
    verifiedOn: nap(o.verified_on),
    difficulty: egyik(TARTAS_NEHEZSEGEK, o.difficulty),
    minLiter: szam(o.min_liter),
    maturityMonths: szam(o.maturity_months),
    placementZone: egyik(ZONAK, o.placement_zone),
    reefSafe: egyik(KORALLOS, o.reef_safe),
    reefSafeReason: szoveg(o.reef_safe_reason),
    social: egyik(TARSAS, o.social),
    aggression: tobb(AGRESSZIO, o.aggression),
    coralEater: logikai(o.coral_eater),
    invertebrateEater: logikai(o.invertebrate_eater),
    feeding: tobb(ETETES, o.feeding),
    feedingFrequency: szoveg(o.feeding_frequency),
    liveFood: logikai(o.live_food),
    light: egyik(IGENY, o.light),
    flow: egyik(IGENY, o.flow),
    maxSize:
      meretErtek !== null && meretDim
        ? { value: meretErtek, dimension: meretDim }
        : null,
    sourcing: egyik(SZARMAZAS, o.sourcing),
    notFor: szoveg(o.not_for),
  }
}

/** A hianyzo adat helyett (a spec 3. pontja): soha nem ures cella, soha nem alapertelmezett ertek. */
export const HIANYZO_ADAT =
  "Ellenőrzés alatt. Érdeklődj a boltban vásárlás előtt."

/**
 * A FOKOZATOK (az OS HUSBANDRY_DIFFICULTY_SCALE masa, a spec 2. pontja): felirat, a vevonek szolo kriterium, es a 3. es
 * 4. fokozat fix mondata.
 */
export const NEHEZSEG_SKALA: Readonly<
  Record<
    TartasNehezseg,
    {
      szint: 1 | 2 | 3 | 4
      felirat: string
      kriterium: string
      megjegyzes: string | null
    }
  >
> = {
  KONNYU: {
    szint: 1,
    felirat: "Kezdőknek is",
    kriterium:
      "Tűri a paraméter-ingadozást, nincs különleges etetési vagy medenceigénye, tenyésztett vagy jól akklimatizálható.",
    megjegyzes: null,
  },
  KOZEPES: {
    szint: 2,
    felirat: "Közepes",
    kriterium:
      "Stabil, legalább néhány hónapos medencét kér, de nincs különleges igénye.",
    megjegyzes: null,
  },
  HALADO: {
    szint: 3,
    felirat: "Haladóknak",
    kriterium:
      "Érett, stabil medencét, pontos paramétert vagy különleges etetést kér.",
    megjegyzes:
      "Ezt a fajt érett, stabil medencébe javasoljuk. Ha most indítottad a medencédet, kérdezz a boltban, mielőtt megrendeled.",
  },
  SZAKERTO: {
    szint: 4,
    felirat: "Szakértőknek",
    kriterium:
      "Csak érett, tapasztalattal kezelt medencébe, vagy nagyon nehezen tartható, vagy különleges igényű.",
    megjegyzes:
      "Ezt a fajt csak tapasztalt tartóknak ajánljuk. Megrendelés előtt kérjük, egyeztess velünk.",
  },
}

/**
 * A "KORALLOS AKVARIUMBAN TARTHATO" FELIRAT: Luca szohasznalati szabalya (emlek 2637, 11-04) pont ezt a kifejezest adja
 * (korallos / tengeri / sos vizes akvarium; a "reef" es a "zatonyakvarium" kozszo nem), tehat marad (acrobot 46080).
 */
export const KORALLOS_FELIRAT = "Korallos akváriumban tartható"

export const FELIRATOK = {
  zona: { ALSO: "alsó zóna", KOZEPSO: "középső zóna", FELSO: "felső zóna" },
  korallos: {
    IGEN: "igen",
    NEM: "nem",
    FELTETELES: "korlátozottan",
    ALLITAS_NELKULI: "nincs megbízható adat",
    NEM_FAJ_SZINTU: "fajonként eltér",
  },
  tarsas: {
    EGYEDUL: "egyedül tartandó",
    PARBAN: "párban tartható",
    CSOPORTBAN: "csoportban tartható",
    TOBB_PELDANY_TARTHATO: "több példány együtt tartható",
  },
  agresszio: {
    BEKES: "békés",
    TERULETVEDO: "területvédő",
    RAGADOZO: "ragadozó",
    CSALANOZ: "csalánoz",
    FAJTARSSAL_AGRESSZIV: "fajtársaival agresszív",
    FELTETELES: "feltételesen agresszív",
  },
  etetes: {
    SZURO_PLANKTON: "szűrő, planktonevő",
    ALGAEVO: "algaevő",
    HUSEVO: "húsevő",
    MINDENEVO: "mindenevő",
    TORMELEKEVO: "törmelékevő",
    FOTOSZINTETIZALO: "fotoszintetizáló",
    TISZTOGATO: "tisztogató",
  },
  igeny: {
    GYENGE: "gyenge",
    KOZEPES: "közepes",
    EROS: "erős",
    NEM_ERTELMEZHETO: "nem értelmezhető",
  },
  dimenzio: {
    TESTHOSSZ: "testhossz",
    KARFESZTAVOLSAG: "karfesztávolság",
    HEJMERET: "héjméret",
    TELJES_KITERJEDES: "teljes kiterjedés",
  },
  szarmazas: { TENYESZTETT: "tenyésztett", VADFOGAS: "vadfogás" },
} as const

/** Az elo allat figyelmeztetes a blokk aljan (a spec 3. pontja; Balazs 2026-09-29: elo allat csak bolti atvetellel). */
export const ELO_ALLAT_FIGYELMEZTETES =
  "Élő állat, csak bolti átvétellel, érkezés után akklimatizációs útmutatóval."
