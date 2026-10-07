import type { MintaTipus } from "./mintaoldalak"
import type { SzabalyKulcs } from "./szabalyok"

/**
 * A VARHATO-PIROS SZABALYOK: ami MA meg nincs kesz, de a szerzodes resze (SEO
 * frontend FE-8). Nem hianyzik a tesztbol, hanem itt all, a gazda PR-jevel es az
 * okkal.
 *
 * KET IRANYBAN KOT:
 * - ha a szabaly ezen a lapon piros, a teszt KIHAGYOTTKENT jelenik meg, az okkal;
 * - ha mar ZOLD, a teszt PIROS: "vedd ki innen". Kulonben egy kesz javitas
 *   kesobbi regresszioja is kihagyott maradna, es senki nem latna. Aki a javitast
 *   viszi, ugyanabban a PR-ben veszi ki a sorat.
 *
 * A `tipusok` szukiti, mely mintakon varhato; nelkule minden mintan.
 */
export type Varhato = {
  szabaly: SzabalyKulcs | "v-id"
  tipusok?: readonly MintaTipus[]
  gazda: string
  ok: string
}

export const VARHATO: readonly Varhato[] = [
  {
    szabaly: "noindex",
    tipusok: ["kereses", "facet"],
    gazda: "FE-4",
    ok: "a keresés és a facet noindexe az FE-4-ben jön (robots.txt-tiltás nélkül)",
  },
  {
    szabaly: "canonical-onmaga",
    tipusok: ["marka"],
    gazda: "P0 PR 11",
    ok: "a márkalapnak nincs canonicalja",
  },
]

export function varhato(
  szabaly: Varhato["szabaly"],
  tipus: MintaTipus,
): Varhato | null {
  return (
    VARHATO.find(
      (v) => v.szabaly === szabaly && (!v.tipusok || v.tipusok.includes(tipus)),
    ) ?? null
  )
}
