/**
 * A FIOK RENDELESEI (P5, 249:3; mobilon 249:204): csoportositas, cimkek,
 * datum. Tiszta fuggvenyek; a lekeres a `lib/data/orders.ts`-ben van.
 *
 * Az uzleti allapot a #410 bolti utvonalabol jon
 * (`GET /store/customers/me/order-business-statuses`), a valasz alakja a
 * backend `customer-business-statuses.ts` fajljabol merve:
 * `{ business_statuses: [{ order_id, status, label, updated_at }] }`.
 */
export type UzletiAllapot = {
  order_id: string
  status: string
  label: string
  updated_at: string
}

type Rendeles = { id: string; created_at?: string | Date | null }

export type RendelesSor<T extends Rendeles> = {
  rendeles: T
  allapot: UzletiAllapot | null
}

const LEZART = new Set(["closed", "closed_unsuccessfully"])

/**
 * NYITOTT ES KORABBI (249:37): a ket lezart allapot (Megrendelés lezárva,
 * Sikertelenül lezárt rendelés) a "Korábbi rendelések" ala kerul, minden mas
 * felul, nagy kartyan. Allapot nelkuli rendeles NYITOTTNAK szamit: nem tudjuk,
 * hogy lezarult, es egy ismeretlen allapotu rendelest nem sullyesztunk el.
 */
export function rendelesCsoportok<T extends Rendeles>(
  rendelesek: readonly T[],
  allapotok: readonly UzletiAllapot[],
): { nyitott: RendelesSor<T>[]; korabbi: RendelesSor<T>[] } {
  const szerint = new Map(allapotok.map((a) => [a.order_id, a]))
  const sorok = rendelesek.map((rendeles) => ({
    rendeles,
    allapot: szerint.get(rendeles.id) ?? null,
  }))
  return {
    nyitott: sorok.filter((s) => !s.allapot || !LEZART.has(s.allapot.status)),
    korabbi: sorok.filter((s) => s.allapot && LEZART.has(s.allapot.status)),
  }
}

/**
 * A cimke kinezete (249:41, 249:74): nyitott allapot rez keret es szoveg; a
 * teljesitett zold keret (a keret sajat szine, a Foundations palettaban nincs
 * zold); a sikertelenul lezart semleges (a keretben nincs ilyen minta).
 */
export function allapotFajta(
  status: string,
): "nyitott" | "teljesitve" | "sikertelen" {
  if (status === "closed") return "teljesitve"
  if (status === "closed_unsuccessfully") return "sikertelen"
  return "nyitott"
}

const HONAP = new Intl.DateTimeFormat("hu-HU", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "Europe/Budapest",
})
const ROVID = new Intl.DateTimeFormat("hu-HU", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "Europe/Budapest",
})

/** "2026. szeptember 28." (asztal, 249:45) */
export function rendelesDatum(ido: string | Date | null | undefined): string {
  if (!ido) return ""
  return HONAP.format(new Date(ido))
}

/** "2026. 09. 28." (mobil, 249:222) */
export function rendelesDatumRovid(
  ido: string | Date | null | undefined,
): string {
  if (!ido) return ""
  return ROVID.format(new Date(ido))
}

/** A rendelesszam: a Medusa sorszama. A keret "ACR-2026-…" alakja nincs meg. */
export function rendelesSzam(displayId: number | string | null | undefined) {
  return displayId === null || displayId === undefined ? "" : `#${displayId}`
}

const FIZETES: Record<string, string> = {
  not_paid: "fizetésre vár",
  awaiting: "fizetésre vár",
  authorized: "fizetés engedélyezve",
  partially_authorized: "részben engedélyezve",
  captured: "kifizetve",
  partially_captured: "részben kifizetve",
  partially_refunded: "részben visszatérítve",
  refunded: "visszatérítve",
  canceled: "fizetés törölve",
  requires_action: "fizetési teendő",
}

/** A Medusa fizetesi allapota magyarul; ismeretlen ertekre ures. */
export function fizetesiAllapot(status: string | null | undefined): string {
  return (status && FIZETES[status]) || ""
}

/**
 * EGY LEADÁSBÓL KÉT RENDELÉS (P4-2, Balázs 2026-09-29): a vegyes kosár a
 * kiszállított és egy bolti átvételes rendelés lesz, és a háttér a kettőt
 * mindkét irányban összeköti a metadatában (`split-completion.ts`). A vevő
 * mindkettőt látja; a kártya és a visszaigazolás megnevezi a párját.
 */
export const BOLTI_RENDELES_KULCS = "acropora_pickup_order_id"
export const FO_RENDELES_KULCS = "acropora_parent_order_id"

export type KapcsoltRendeles = {
  id: string
  /** Igaz, ha a PÁR a bolti átvételes rendelés. */
  bolti: boolean
}

export function kapcsoltRendeles(
  metadata: Record<string, unknown> | null | undefined,
): KapcsoltRendeles | null {
  const bolti = metadata?.[BOLTI_RENDELES_KULCS]
  if (typeof bolti === "string" && bolti) return { id: bolti, bolti: true }
  const fo = metadata?.[FO_RENDELES_KULCS]
  if (typeof fo === "string" && fo) return { id: fo, bolti: false }
  return null
}

/** "Egy leadásból: #13, bolti átvétel" -- a pár száma és a fajtája. */
export function kapcsoltFelirat(
  displayId: number | string | null | undefined,
  bolti: boolean,
): string {
  return `Egy leadásból: ${rendelesSzam(displayId)}, ${
    bolti ? "bolti átvétel" : "kiszállítás"
  }`
}

