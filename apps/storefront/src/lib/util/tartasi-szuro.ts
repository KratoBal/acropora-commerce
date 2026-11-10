/**
 * A TARTASI SZURO A KIRAKAT CIMEBEN (V2.2 S5, kartya d2fc06e7; a spec 4. pontja: "Szűrők a kategórián: tartási nehézség,
 * korallos akváriumban tartható, minimális medence (literre sávokban)").
 *
 * A szuro a cimben all, mint a marka (`?nehezseg=KONNYU&korallos=1&medence=101-300`), tehat megoszthato es szerveren
 * renderelodik; a `_szurt` utra visz (`belso-utvonalak.js`). A dontes a commerce bolte (`GET /store/husbandry-filter`):
 * itt csak a cim olvasasa es irasa all, tiszta fuggvenyekkel.
 */
import {
  NEHEZSEG_SKALA,
  TARTAS_NEHEZSEGEK,
  type TartasNehezseg,
} from "@lib/util/tartasi-adat"

/**
 * A MEDENCE-SAVOK: JAVASLAT, NEM DONTES. A spec "literre sávokban" keri, savot nem nevez; ez a harom nautilus olvasata
 * (46091), murena a szeletre elfogadta (46095). Egy allat a SAJAT minimalis medenceje savjaba esik. A bolt ugyanezt a
 * harom kulcsot ismeri (`apps/backend/src/api/store/husbandry-filter/szures.ts`).
 */
export const MEDENCE_SAVOK = ["0-100", "101-300", "301-"] as const
export type MedenceSav = (typeof MEDENCE_SAVOK)[number]

export const SAV_FELIRAT: Record<MedenceSav, string> = {
  "0-100": "legfeljebb 100 l",
  "101-300": "101–300 l",
  "301-": "300 l felett",
}

export const NEHEZSEG_PARAM = "nehezseg"
export const KORALLOS_PARAM = "korallos"
export const MEDENCE_PARAM = "medence"

export type TartasiSzuro = {
  nehezseg: TartasNehezseg[]
  korallos: boolean
  medence: MedenceSav[]
}

export const URES_TARTASI_SZURO: TartasiSzuro = {
  nehezseg: [],
  korallos: false,
  medence: [],
}

const lista = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v : v ? [v] : []).map((x) => x.trim())

/** A cim tartasi parameterei: ismeretlen ertek nelkul, ismetles nelkul (egy regi link is valaszol). */
export function tartasiSzuroKeresbol(
  keres: Record<string, string | string[] | undefined>,
): TartasiSzuro {
  const csak = <T extends string>(ertekek: readonly T[], v: string[]) =>
    Array.from(
      new Set(
        v.filter((x): x is T => (ertekek as readonly string[]).includes(x)),
      ),
    )
  return {
    nehezseg: csak(TARTAS_NEHEZSEGEK, lista(keres[NEHEZSEG_PARAM])),
    korallos: lista(keres[KORALLOS_PARAM]).includes("1"),
    medence: csak(MEDENCE_SAVOK, lista(keres[MEDENCE_PARAM])),
  }
}

export const tartasiSzuroAktiv = (s?: TartasiSzuro | null) =>
  Boolean(s && (s.nehezseg.length || s.korallos || s.medence.length))

/** A szuro a cim parameterei kozott (a `szuroCim` hivja, a tobbi szuro utan). */
export function tartasiParameterek(
  params: URLSearchParams,
  s?: TartasiSzuro | null,
) {
  if (!s) return
  for (const n of s.nehezseg) params.append(NEHEZSEG_PARAM, n)
  if (s.korallos) params.set(KORALLOS_PARAM, "1")
  for (const m of s.medence) params.append(MEDENCE_PARAM, m)
}

const valt = <T>(lista: readonly T[], ertek: T) =>
  lista.includes(ertek) ? lista.filter((x) => x !== ertek) : [...lista, ertek]

/** Egy ertek ki-be kapcsolasa: a csoporton belul tobb is valaszthato. */
export function tartasiValtas(
  s: TartasiSzuro,
  valtas:
    { nehezseg: TartasNehezseg } | { korallos: true } | { medence: MedenceSav },
): TartasiSzuro {
  if ("nehezseg" in valtas)
    return { ...s, nehezseg: valt(s.nehezseg, valtas.nehezseg) }
  if ("medence" in valtas)
    return { ...s, medence: valt(s.medence, valtas.medence) }
  return { ...s, korallos: !s.korallos }
}

/** A bolt valasza (`GET /store/husbandry-filter`). */
export type TartasiSzuroValasz = {
  product_ids: string[]
  unchecked: number
  complete: boolean
  facets: {
    difficulty: Record<TartasNehezseg, number>
    reef_safe: number
    tank: Record<MedenceSav, number>
  }
}

/** A szuro-oszlop sorai: csak az ertek kap sort, amire a kategoriaban van allat (mint a markaknal). */
export type TartasiSor = {
  kulcs: string
  felirat: string
  szam: number
  aktiv: boolean
  szuro: TartasiSzuro
}

export function tartasiSorok(
  valasz: TartasiSzuroValasz,
  s: TartasiSzuro,
): { nehezseg: TartasiSor[]; korallos: TartasiSor[]; medence: TartasiSor[] } {
  return {
    nehezseg: TARTAS_NEHEZSEGEK.filter(
      (n) => valasz.facets.difficulty[n] > 0,
    ).map((n) => ({
      kulcs: n,
      felirat: NEHEZSEG_SKALA[n].felirat,
      szam: valasz.facets.difficulty[n],
      aktiv: s.nehezseg.includes(n),
      szuro: tartasiValtas(s, { nehezseg: n }),
    })),
    korallos:
      valasz.facets.reef_safe > 0
        ? [
            {
              kulcs: "1",
              felirat: "",
              szam: valasz.facets.reef_safe,
              aktiv: s.korallos,
              szuro: tartasiValtas(s, { korallos: true }),
            },
          ]
        : [],
    medence: MEDENCE_SAVOK.filter((m) => valasz.facets.tank[m] > 0).map(
      (m) => ({
        kulcs: m,
        felirat: SAV_FELIRAT[m],
        szam: valasz.facets.tank[m],
        aktiv: s.medence.includes(m),
        szuro: tartasiValtas(s, { medence: m }),
      }),
    ),
  }
}

/**
 * HANY AZONOSITO MEHET A LISTA `id` SZUROJEBE. Az azonositok a `/store/products` cimeben utaznak (a landing-lapok
 * mintaja), es a cim hossza korlatos. Merve 2026-11-10 a teszt kirakaton: a legnagyobb elo allat ag (Halak) 125 termek.
 * E folott a lap nem alkalmazza a szurot, es ezt KI IS MONDJA (`category.husbandryTooMany`), nem vag csendben.
 */
export const AZONOSITO_HATAR = 300

const szam = (v: unknown) =>
  typeof v === "number" && Number.isInteger(v) && v >= 0
const szamok = (o: unknown, kulcsok: readonly string[]) =>
  typeof o === "object" &&
  o !== null &&
  kulcsok.every((k) => szam((o as Record<string, unknown>)[k]))

/** A valasz szigoru olvasasa: egy hianyzo vagy rossz mezo az egeszet ervenyteleniti. */
export function valaszAlak(body: unknown): TartasiSzuroValasz | null {
  const b = body as Partial<TartasiSzuroValasz> | null
  if (
    !b ||
    !Array.isArray(b.product_ids) ||
    !b.product_ids.every((id) => typeof id === "string") ||
    !szam(b.unchecked) ||
    typeof b.complete !== "boolean" ||
    !b.facets ||
    !szamok(b.facets.difficulty, TARTAS_NEHEZSEGEK) ||
    !szam(b.facets.reef_safe) ||
    !szamok(b.facets.tank, MEDENCE_SAVOK)
  )
    return null
  return b as TartasiSzuroValasz
}
