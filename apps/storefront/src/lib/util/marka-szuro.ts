/**
 * A MARKA SZURO (P2, 2026-09-29), a 117:108 "Márka" szakasza szerint.
 *
 * A marka a termek Medusa-gyujtemenye: a stage 65 gyujtemenye mind markanev.
 * A szuro a cimben all (`?marka=<gyujtemeny-azonosito>`, tobbszor is), tehat
 * megoszthato, es szerveren renderelodik. Tiszta fuggvenyek: a lekeres a
 * kategorialapon van, itt csak a dontes.
 */
import type { SortOptions } from "@modules/store/components/refinement-list/sort-products"

export const MARKA_PARAM = "marka"

/** A cim marka-parameterei: vagva, uresek nelkul, ismetles nelkul. */
export function markaAzonositok(ertek?: string | string[]): string[] {
  const lista = Array.isArray(ertek) ? ertek : ertek ? [ertek] : []
  return Array.from(new Set(lista.map((elem) => elem.trim()).filter(Boolean)))
}

export type MarkaSor = { id: string; nev: string; szam: number }

type TermekMarkaval = {
  collection?: { id?: string | null; title?: string | null } | null
}

/**
 * A kategoria termekeibol a markak darabszama, csokkeno sorrendben (egyenlo
 * szamnal nev szerint). A marka nelkuli termek nem ad sort: arra nincs mit
 * szurni.
 */
export function markaSorok(termekek: readonly TermekMarkaval[]): MarkaSor[] {
  const sorok = new Map<string, MarkaSor>()
  for (const termek of termekek) {
    const id = termek.collection?.id
    if (!id) continue
    const sor = sorok.get(id)
    if (sor) sor.szam += 1
    else
      sorok.set(id, {
        id,
        nev: (termek.collection?.title ?? "").trim() || id,
        szam: 1,
      })
  }
  return Array.from(sorok.values()).sort(
    (a, b) => b.szam - a.szam || a.nev.localeCompare(b.nev, "hu"),
  )
}

/** Egy marka ki-be kapcsolasa a kivalasztottak kozott. */
export function markaValtas(aktiv: readonly string[], id: string): string[] {
  return aktiv.includes(id)
    ? aktiv.filter((elem) => elem !== id)
    : [...aktiv, id]
}

/**
 * A lista cime a szurokkel: a rendezes, az opcio-szurok es a markak
 * megmaradnak. Lap nelkul az elso lapra visz (szuro-valtaskor ez kell).
 */
export function szuroCim(allapot: {
  sortBy?: SortOptions
  optionValueIds?: readonly string[]
  markak?: readonly string[]
  page?: number
}): string {
  const params = new URLSearchParams()
  if (allapot.sortBy) params.set("sortBy", allapot.sortBy)
  for (const id of allapot.optionValueIds ?? [])
    params.append("optionValueIds", id)
  for (const id of allapot.markak ?? []) params.append(MARKA_PARAM, id)
  if (allapot.page && allapot.page > 1) params.set("page", String(allapot.page))
  const szoveg = params.toString()
  return szoveg ? `?${szoveg}` : "?"
}
