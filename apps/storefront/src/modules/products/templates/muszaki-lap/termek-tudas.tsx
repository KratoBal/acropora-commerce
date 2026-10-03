import type { TermekTudas } from "@lib/data/product-knowledge"
import React from "react"

/**
 * A TERMEK-TUDAS BLOKK A MUSZAKI LAPON (KZ Amino szelet, PD-014).
 *
 * Az Acropora OS-ben elfogadott tenyek es jovahagyott szoveg, ahogy a vetites
 * a Medusaba irta. A blokk NEM dont: amit kap, azt mutatja, harom szaballyal:
 *
 *   ertek, VERIFIED vagy SUGGESTED   az ertek latszik (ember fogadta el)
 *   CONFLICTING_SOURCES              a mezo latszik "A források eltérnek"
 *                                    felirattal, ERTEK NELKUL: a ket forras
 *                                    erteke az OS bizonyitekaban marad
 *   minden mas, vagy nincs sor       a mezo nem jelenik meg
 *
 * A harmadik sor szandekosan szuk: egy UNVERIFIED vagy POSSIBLE_WRONG_VALUE
 * ertek a vevo elott tenykent olvasodna. Ma az OS ilyet nem is vetit.
 *
 * A gyarto allitasai kulon cimke alatt allnak ("A gyártó szerint"): azok a
 * gyarto mondatai, nem a mi tenyeink.
 */
const ELTERES = "A források eltérnek"

type Megjelenes = { ertek: string } | { elteres: true } | null

export function megjelenes(tudas: TermekTudas, mezo: string): Megjelenes {
  const teny = tudas.facts.find((f) => f.field === mezo)
  if (!teny) return null
  if (teny.status === "CONFLICTING_SOURCES") return { elteres: true }
  if ((teny.status === "VERIFIED" || teny.status === "SUGGESTED") && teny.value)
    return { ertek: teny.unit ? `${teny.value} ${teny.unit}` : teny.value }
  return null
}

const Ertek = ({ m }: { m: Exclude<Megjelenes, null> }) =>
  "elteres" in m ? (
    <span data-testid="tudas-elteres" className="italic">
      {ELTERES}
    </span>
  ) : (
    <span className="whitespace-pre-line">{m.ertek}</span>
  )

const KULCS_TENYEK: [string, string][] = [
  ["packSize", "Kiszerelés"],
  ["dosing", "Adagolás"],
  ["application", "Felhasználás"],
]

const SZAKASZOK: [string, string][] = [
  ["dosing", "Adagolás"],
  ["packageContents", "A csomag tartalma"],
  ["manufacturerClaims", "A gyártó szerint"],
  ["manufacturerInfo", "Gyártói adatok"],
]

function reszek(tudas: TermekTudas) {
  const lathato = (lista: [string, string][]) =>
    lista
      .map(([mezo, cimke]) => [mezo, cimke, megjelenes(tudas, mezo)] as const)
      .filter(([, , m]) => m)
  return {
    lead: tudas.copy.find((c) => c.block === "lead")?.body,
    kulcs: lathato(KULCS_TENYEK),
    szakaszok: lathato(SZAKASZOK),
  }
}

/**
 * VAN-E MIT MUTATNI. A muszaki lap ebbol donti el, hogy a blokk egyaltalan
 * bekerul-e: tudas nelkuli termeknel a lap BETURE a mai marad (a `fulek` slot
 * nem kap ures toldalekot, ami a vaz varakozo szoveget elnyomna).
 */
export function vanTudas(tudas: TermekTudas | null | undefined): boolean {
  if (!tudas) return false
  const { lead, kulcs, szakaszok } = reszek(tudas)
  return Boolean(lead) || kulcs.length > 0 || szakaszok.length > 0
}

export function TermekTudasBlokk({ tudas }: { tudas: TermekTudas | null }) {
  if (!tudas || !vanTudas(tudas)) return null
  const { lead, kulcs, szakaszok } = reszek(tudas)

  return (
    <section
      data-testid="termek-tudas"
      className="mt-6 flex flex-col gap-4 text-small-regular text-[var(--terv-szoveg-halvany)]"
    >
      {lead
        ? lead.split(/\n{2,}/).map((bekezdes, i) => (
            <p key={i} data-testid="tudas-lead">
              {bekezdes}
            </p>
          ))
        : null}
      {kulcs.length ? (
        <dl data-testid="tudas-kulcs" className="grid grid-cols-3 gap-3">
          {kulcs.map(([mezo, cimke, m]) => (
            <div key={mezo} data-testid={`tudas-kulcs-${mezo}`}>
              <dt className="text-xsmall-regular uppercase">{cimke}</dt>
              <dd>
                <Ertek m={m!} />
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      {szakaszok.map(([mezo, cimke, m]) => (
        <div key={mezo} data-testid={`tudas-${mezo}`}>
          <h3 className="text-base-semi">{cimke}</h3>
          <Ertek m={m!} />
        </div>
      ))}
    </section>
  )
}
