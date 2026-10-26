"use server"

import { elonezetBekapcsolva } from "@lib/util/kezdolap-elonezet"
import { ervenyesRekord } from "@lib/util/kezdolap-rekord"
import type { KezdolapTartalom } from "@modules/kezdolap/tartalom"
import { tisztitottTartalom } from "@modules/kezdolap/tisztitas"
import {
  lablecAdat,
  type LablecAdat,
} from "@modules/layout/templates/footer/lablec-adat"

/**
 * A TISZTITOTT ELONEZETI ADAT, SZERVEROLDALON. A lablec bemutatkozasat es a
 * formazott szovegeket a `sanitize-html` tisztitja, az pedig nem a
 * bongeszo-csomagba valo: az elo elonezet kliense a kapott rekordot ide kuldi,
 * es a TISZTITOTT rekordot (a `tisztitott` jelolovel) es a lablec adatat kapja
 * vissza. A kliens csak ezt rajzolja ki. A rekordot a szerver MEG EGYSZER ellenorzi (a kliens ellenorzese nem
 * hatar), es a hivas csak bekapcsolt elonezetnel dolgozik.
 */
export async function elonezetiAdat(
  rekord: unknown,
): Promise<
  | { ok: true; adat: LablecAdat; rekord: KezdolapTartalom }
  | { ok: false; hiba: string }
> {
  if (!elonezetBekapcsolva(process.env))
    return { ok: false, hiba: "az elonezet nincs bekapcsolva" }
  const eredmeny = ervenyesRekord(rekord)
  if (!eredmeny.ok) return { ok: false, hiba: eredmeny.hiba }
  return {
    ok: true,
    adat: lablecAdat(eredmeny.rekord),
    rekord: tisztitottTartalom(eredmeny.rekord) ?? eredmeny.rekord,
  }
}
