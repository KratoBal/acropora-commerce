/**
 * A VEVO KET MEGJEGYZESE A PENZTARBAN (kartya d3b54954; a rendeles
 * adatlapja, Figma 494:386, "Megjegyzesek"): egy a boltnak, egy a futarnak.
 * A hatter a kosar metaadatan tarolja (`POST /store/cart-notes/:cart_id`), es
 * a rendelesre a Medusa viszi at. A kulcsok es a hosszak a hatterrel azonosak
 * (`apps/backend/src/workflows/utils/order-notes.ts`).
 */
export const VEVO_MEGJEGYZES_KULCS = "acropora_customer_note"
export const FUTAR_MEGJEGYZES_KULCS = "acropora_carrier_note"

export const VEVO_MEGJEGYZES_MAX = 1000
/** A Foxpost cimkejen 50 karakter fer el vagas nelkul (nautilus 26570). */
export const FUTAR_MEGJEGYZES_MAX = 50

export type Megjegyzesek = { vevo: string; futar: string }

const olvas = (
  metaadat: Record<string, unknown> | null | undefined,
  kulcs: string,
) => {
  const ertek = metaadat?.[kulcs]
  return typeof ertek === "string" ? ertek : ""
}

/** Ami a kosaron mar all: a mezok kezdoerteke. */
export function megjegyzesekKosarbol(
  metaadat: Record<string, unknown> | null | undefined,
): Megjegyzesek {
  return {
    vevo: olvas(metaadat, VEVO_MEGJEGYZES_KULCS),
    futar: olvas(metaadat, FUTAR_MEGJEGYZES_KULCS),
  }
}

/**
 * A mentendo torzs, vagy null, ha nincs mit menteni. A futarnak szolo
 * megjegyzes csak hazhoz szallitasnal el: csomagpontnal es bolti atvetelnel
 * nincs futar, aki elolvasna, ezert ott a mar tarolt szoveget is torli.
 */
export function megjegyzesValtozas(
  tarolt: Megjegyzesek,
  uj: Megjegyzesek,
  hazhoz: boolean,
): { customer_note?: string | null; carrier_note?: string | null } | null {
  const torzs: { customer_note?: string | null; carrier_note?: string | null } =
    {}
  const vevo = uj.vevo.trim()
  if (vevo !== tarolt.vevo.trim()) torzs.customer_note = vevo || null
  const futar = hazhoz ? uj.futar.trim() : ""
  if (futar !== tarolt.futar.trim()) torzs.carrier_note = futar || null
  return Object.keys(torzs).length ? torzs : null
}
