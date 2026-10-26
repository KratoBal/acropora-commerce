import { rovidHtml } from "@lib/util/rovid-html"
import { htmlAlaku, ROVID_KULCSOK } from "./rovid"
import type { KezdolapTartalom } from "./tartalom"

/**
 * A REKORD FORMAZOTT SZOVEGEINEK TISZTITASA, SZERVEROLDALON. A kotott helyeken
 * allo, HTML-alaku ertekeket a "short" profil szerint tisztitja, es a rekordot
 * `tisztitott` jelolovel adja vissza: csak ezt a jelolot ismeri el a lap
 * HTML-nek (`rovidErtek`). A jelolo SOHA nem jon az OS-bol: a rekord
 * validatora ismeretlen kulcskent elutasitja.
 */
export function tisztitottTartalom(
  tartalom: KezdolapTartalom | null,
): KezdolapTartalom | null {
  if (!tartalom) return null
  const tisztit = (ertek: string) =>
    htmlAlaku(ertek) ? rovidHtml(ertek) : ertek
  return {
    ...tartalom,
    texts: Object.fromEntries(
      Object.entries(tartalom.texts ?? {}).map(([kulcs, ertek]) => [
        kulcs,
        ROVID_KULCSOK.has(kulcs) ? tisztit(ertek) : ertek,
      ]),
    ),
    slides: tartalom.slides
      ? tartalom.slides.map((dia) => ({ ...dia, text: tisztit(dia.text) }))
      : tartalom.slides,
    tisztitott: true,
  }
}
