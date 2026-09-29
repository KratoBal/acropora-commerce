/**
 * A KERESESI TALALATOK SZAMAI ES CIMEI (P2, 4a, a 152:88 szerint).
 *
 * A kereso vegpont legfeljebb 200 termek-azonositot ad, `created_at` szerint
 * csokkeno sorrendben. A talalati lap a kategoria-fuleket ("Technika · 9") es
 * a Márka szurot EZEKBOL a termekekbol szamolja: a Medusa nem ad facet-szamot.
 * Tiszta fuggvenyek; a lekeres a lapon van.
 */
import type { SortOptions } from "@modules/store/components/refinement-list/sort-products"

import { MARKA_PARAM, markaSorok, type MarkaSor } from "./marka-szuro"

export type TalalatTermek = {
  id: string
  collection?: { id?: string | null; title?: string | null } | null
  categories?:
    | {
        id?: string | null
        name?: string | null
        parent_category_id?: string | null
      }[]
    | null
}

export type GyokerSor = { id: string; nev: string; szam: number }

export const GYOKER_PARAM = "gyoker"

/**
 * A talalatok GYOKER-kategoriai darabszammal (a bolt a termeket az osei
 * kategoriaiba is besorolja, tehat a gyoker a termek sajat listajaban all).
 * Egy termek egy gyokeret egyszer szamol. Csokkeno sorrend, egyenlonel nev.
 */
export function gyokerSorok(termekek: readonly TalalatTermek[]): GyokerSor[] {
  const sorok = new Map<string, GyokerSor>()
  for (const termek of termekek) {
    const latott = new Set<string>()
    for (const kat of termek.categories ?? []) {
      if (!kat.id || kat.parent_category_id || latott.has(kat.id)) continue
      latott.add(kat.id)
      const sor = sorok.get(kat.id)
      if (sor) sor.szam += 1
      else
        sorok.set(kat.id, {
          id: kat.id,
          nev: (kat.name ?? "").trim() || kat.id,
          szam: 1,
        })
    }
  }
  return Array.from(sorok.values()).sort(
    (a, b) => b.szam - a.szam || a.nev.localeCompare(b.nev, "hu"),
  )
}

/** A talalatok markai, a kategorialap szabalyaval. */
export function talalatMarkai(termekek: readonly TalalatTermek[]): MarkaSor[] {
  return markaSorok(termekek)
}

/**
 * A szurt azonositok, a KERESES sorrendjeben (az `ids` adja a sorrendet, a
 * termek-adat csak a szurest). Ismeretlen azonosito kimarad: amit nem tudunk
 * besorolni, azt szurt nezetben nem allitjuk talalatnak.
 */
export function szurtAzonositok(
  ids: readonly string[],
  termekek: readonly TalalatTermek[],
  szuro: { gyoker?: string; markak?: readonly string[] },
): string[] {
  if (!szuro.gyoker && !(szuro.markak?.length ?? 0)) return [...ids]
  const szerint = new Map(termekek.map((t) => [t.id, t]))
  return ids.filter((id) => {
    const termek = szerint.get(id)
    if (!termek) return false
    if (
      szuro.gyoker &&
      !(termek.categories ?? []).some((k) => k.id === szuro.gyoker)
    )
      return false
    if (
      szuro.markak?.length &&
      !szuro.markak.includes(termek.collection?.id ?? "")
    )
      return false
    return true
  })
}

/** A talalati lap cime: a kereses, a gyoker, a markak, a rendezes, a lap. */
export function keresesCim(allapot: {
  q: string
  gyoker?: string
  markak?: readonly string[]
  sortBy?: SortOptions
  page?: number
}): string {
  const params = new URLSearchParams()
  params.set("q", allapot.q)
  if (allapot.gyoker) params.set(GYOKER_PARAM, allapot.gyoker)
  for (const id of allapot.markak ?? []) params.append(MARKA_PARAM, id)
  if (allapot.sortBy) params.set("sortBy", allapot.sortBy)
  if (allapot.page && allapot.page > 1) params.set("page", String(allapot.page))
  return `?${params.toString()}`
}
