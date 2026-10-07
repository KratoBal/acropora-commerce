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
    szabaly: "json-ld-product",
    gazda: "FE-2",
    ok: "strukturált adat még nincs (a P0 PR 1, 3 és 4 után)",
  },
  {
    szabaly: "json-ld-breadcrumb",
    gazda: "FE-2",
    ok: "strukturált adat még nincs (a P0 PR 1, 3 és 4 után)",
  },
  {
    szabaly: "noindex",
    tipusok: ["kereses", "facet"],
    gazda: "FE-4",
    ok: "a keresés és a facet noindexe az FE-4-ben jön (robots.txt-tiltás nélkül)",
  },
  {
    szabaly: "lapozas-canonical",
    gazda: "FE-4",
    ok: "a 2. lap ma az 1. lapra canonicalizál (D9)",
  },
  {
    szabaly: "canonical-onmaga",
    tipusok: ["marka"],
    gazda: "P0 PR 11",
    ok: "a márkalapnak nincs canonicalja",
  },
  {
    szabaly: "alt",
    tipusok: [
      "termek-gtin",
      "termek-gtin-nelkul",
      "termek-elfogyott",
      "kategoria-level",
      "marka",
    ],
    gazda: "P0 PR 9",
    ok: 'a listakép alt-ja "Thumbnail", a kapcsolódó termékek képe alt=""',
  },
  {
    szabaly: "v-id",
    gazda: "FE-7 3. rész",
    ok: "a ?v_id közvetlen megnyitása az első HTML-ben a változatot mutassa",
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
