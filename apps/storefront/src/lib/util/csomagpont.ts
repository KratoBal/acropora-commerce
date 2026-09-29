/**
 * A FOXPOST-CSOMAGPONT (P4-1), ahogy a backend kereseje adja
 * (`GET /store/foxpost/pickup-points?q=`). A penztar csak az azonositot kuldi
 * vissza; a nevet es a cimet a backend a sajat listajabol teszi a szallitasi
 * modra, tehat a bongeszo nem irhat be kitalalt pontot.
 */
export type FoxpostCsomagpont = {
  id: string
  name: string
  address: string
  zip: string
  city: string
}

export type CsomagpontKereses = {
  /** `false`, ha a Foxpost nincs beallitva vagy a listaja nem erheto el. */
  elerheto: boolean
  pontok: FoxpostCsomagpont[]
  /** Az osszes talalat szama; a `pontok` ennek legfeljebb az elso `limit` darabja. */
  talalat: number
}

/** A szallitasi mod adata a kivalasztott csomagponttal (`setShippingMethod`). */
export function foxpostSzallitasiAdat(pontId: string) {
  return { foxpost_pickup_point: { id: pontId } }
}

/** A GLS-csomagpont szallitasi adata (P4): csak az azonosito megy, a tobbit a hatter irja. */
export function glsSzallitasiAdat(pontId: string) {
  return { gls_pickup_point: { id: pontId } }
}

/** Egy GLS csomagpontos szallitasi mod, es hogy nehezarus-e (csak csomagbolt). */
export type GlsPontMod = { option_id: string; heavy: boolean }

