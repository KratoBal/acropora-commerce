"use server"

import { elonezetBekapcsolva } from "@lib/util/kezdolap-elonezet"
import { ervenyesRekord } from "@lib/util/kezdolap-rekord"
import {
  lablecAdat,
  type LablecAdat,
} from "@modules/layout/templates/footer/lablec-adat"

/**
 * A LABLEC ADATA AZ ELONEZETHEZ, SZERVEROLDALON. A lablec bemutatkozasat a
 * `sanitize-html` tisztitja, az pedig nem a bongeszo-csomagba valo: az elo
 * elonezet kliense a kapott rekordot ide kuldi, es tiszta, sima adatot kap
 * vissza. A rekordot a szerver MEG EGYSZER ellenorzi (a kliens ellenorzese nem
 * hatar), es a hivas csak bekapcsolt elonezetnel dolgozik.
 */
export async function lablecAdatElonezethez(
  rekord: unknown,
): Promise<{ ok: true; adat: LablecAdat } | { ok: false; hiba: string }> {
  if (!elonezetBekapcsolva(process.env))
    return { ok: false, hiba: "az elonezet nincs bekapcsolva" }
  const eredmeny = ervenyesRekord(rekord)
  if (!eredmeny.ok) return { ok: false, hiba: eredmeny.hiba }
  return { ok: true, adat: lablecAdat(eredmeny.rekord) }
}
