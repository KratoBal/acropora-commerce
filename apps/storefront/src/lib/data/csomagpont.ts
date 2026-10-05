"use server"

import { sdk } from "@lib/config"
import type {
  CsomagpontKereses,
  FoxpostCsomagpont,
  GlsPontMod,
} from "@lib/util/csomagpont"

type Valasz =
  | { available: true; pickup_points: FoxpostCsomagpont[]; count: number }
  | { available: false; reason: string }

const NINCS: CsomagpontKereses = { elerheto: false, pontok: [], talalat: 0 }

/**
 * FOXPOST-CSOMAGPONT KERESES (P4-1): iranyitoszam-eleje, vagy a nev, a varos es
 * a cim szavai. Ures keresesre nem kerdez: a teljes lista kb. 5000 pont.
 * Hiba vagy nem beallitott Foxpost eseten `elerheto: false`, hogy a penztar a
 * Foxpostot ne kinalja.
 */
export async function searchFoxpostPickupPoints(
  kereses: string,
  limit = 20,
): Promise<CsomagpontKereses> {
  const q = kereses.trim()
  if (!q) return NINCS

  return sdk.client
    .fetch<Valasz>(`/store/foxpost/pickup-points`, {
      method: "GET",
      query: { q, limit },
      cache: "no-store",
    })
    .then((valasz) =>
      valasz.available
        ? {
            elerheto: true,
            pontok: valasz.pickup_points.map(
              ({
                id,
                name,
                address,
                zip,
                city,
                variant,
                payment_options,
                services,
                icon_url,
                findme,
              }) => ({
                id,
                name,
                address,
                zip,
                city,
                variant,
                payment_options,
                services,
                icon_url,
                findme,
              }),
            ),
            talalat: valasz.count,
          }
        : NINCS,
    )
    .catch(() => NINCS)
}

/**
 * MELYIK SZALLITASI MOD A FOXPOST, es valaszthato-e most (`GET /store/foxpost`).
 * A szerep-tabla a hatterben el; hiba eseten `null`, es a penztar ugy mukodik,
 * mint eddig (a Foxpost-mod ilyenkor pont nelkul, a hatter elutasitasaval).
 */
export async function retrieveFoxpostOption(): Promise<{
  option_id: string | null
  available: boolean
} | null> {
  return sdk.client
    .fetch<{ option_id: string | null; available: boolean }>(`/store/foxpost`, {
      method: "GET",
      cache: "no-store",
    })
    .catch(() => null)
}

type GlsValasz =
  | {
      available: true
      pickup_points: {
        id: string
        name: string
        zip: string
        city: string
        address: string
      }[]
      count: number
    }
  | { available: false; reason: string }

/**
 * GLS-CSOMAGPONT KERESES (P4), a Foxposteval azonos alakban, hogy a ket
 * valaszto egyforma legyen. A szallitasi modot is atadja: a nehezarus mod a
 * hatter szerint csak csomagboltot kinal, nem a bongeszo dont.
 */
export async function searchGlsPickupPoints(
  kereses: string,
  optionId: string,
  limit = 20,
): Promise<CsomagpontKereses> {
  const q = kereses.trim()
  if (!q) return NINCS

  return sdk.client
    .fetch<GlsValasz>(`/store/gls/pickup-points`, {
      method: "GET",
      query: { q, option_id: optionId, limit },
      cache: "no-store",
    })
    .then((valasz) =>
      valasz.available
        ? {
            elerheto: true,
            pontok: valasz.pickup_points.map(
              ({ id, name, zip, city, address }) => ({
                id,
                name,
                // A Foxpost cime iranyitoszammal kezdodik; a GLS-e is igy latszik.
                address: `${zip} ${city}, ${address}`,
                zip,
                city,
              }),
            ),
            talalat: valasz.count,
          }
        : NINCS,
    )
    .catch(() => NINCS)
}

/** A GLS csomagpontos szallitasi modok (`GET /store/gls`); hibanal ures. */
export async function retrieveGlsOptions(): Promise<GlsPontMod[]> {
  return sdk.client
    .fetch<{ options: GlsPontMod[] }>(`/store/gls`, {
      method: "GET",
      cache: "no-store",
    })
    .then((valasz) => valasz.options ?? [])
    .catch(() => [])
}
