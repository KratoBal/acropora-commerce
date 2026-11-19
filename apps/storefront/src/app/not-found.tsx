import { Metadata } from "next"

import NincsOldal from "@modules/common/components/nincs-oldal"
import AruhazKeret from "@modules/layout/templates/aruhaz-keret"

export const metadata: Metadata = {
  title: "404",
  description: "Hiba történt",
}

/**
 * AZ ISMERETLEN CIM IS A BOLT KERETEBEN ALLO 404-ET KAPJA (2026-11-19, kirakat-kinezet lista).
 * Egy teljesen ismeretlen cim (`/hu/kapcsolat`, `/hu/rolunk`) nem illeszkedik egyetlen laphoz
 * sem, ezert a gyoker not-found-ja jon: eddig keret nelkul, csak egy "Vissza a fooldalra"
 * linkkel. Most ugyanazt a kozos keretet (fejlec, kereso, lablec) kapja, mint egy ismeretlen
 * termek vagy kategoria.
 *
 * NEM MINDENT ELKAPO (`[...rest]`) OLDAL, MERT AZ ELTORI A FIOKOT: a `[countryCode]` alatt allo
 * catch-all a Next.js 15.5-ben a `/account` parhuzamos utvonalait (`@login`, `@dashboard`)
 * "Expected clientReferenceManifest to be defined" hibaval 500-ra viszi, `next start` alatt
 * (merve 2026-11-19: ugyanaz a fa a catch-all nelkul 200, vele 500; a (main) csoportban es
 * azon kivul is). A `nincs-oldal-keret.spec.ts` ezert tiltja a catch-all utat.
 *
 * A gyoker not-found-nak nincs utvonal-parametere, ezert a keret az alapertelmezett (magyar)
 * orszagszegmenssel all; a 404 szovege a kliensen az ut elso szegmenseibol valasztja a nyelvet
 * (`NincsOldal`), a keret nyelve angol uton magyar marad.
 */
export default function NotFound() {
  return (
    <AruhazKeret countryCode="hu">
      <NincsOldal />
    </AruhazKeret>
  )
}
