"use server"

import { sdk } from "@lib/config"
import type { CsomagpontKereses, FoxpostCsomagpont } from "@lib/util/csomagpont"

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
              ({ id, name, address, zip, city }) => ({
                id,
                name,
                address,
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
