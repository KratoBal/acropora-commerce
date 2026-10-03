import type { TermekTudas } from "@lib/data/product-knowledge"
import React from "react"

/**
 * A TERMEK-TUDAS BLOKK A MUSZAKI LAPON (KZ Amino szelet, PD-014).
 *
 * Az Acropora OS-ben elfogadott TENYEK, ahogy a vetites a Medusaba irta. A
 * jovahagyott szoveg (lead + body) NEM itt all, hanem a leiras-fulben, a
 * `tudasLeiras` alakjaban. Egy hely, egy szoveg (acrobot dontese, 26138). A blokk NEM dont: amit kap, azt mutatja, harom szaballyal:
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
    kulcs: lathato(KULCS_TENYEK),
    szakaszok: lathato(SZAKASZOK),
  }
}

/**
 * A JOVAHAGYOTT SZOVEG (lead, majd body) A LEIRAS HELYERE, HTML-KENT, vagy `null`.
 *
 * A vetites ugyanezt a szoveget a termek `description` mezojebe is irja (PR A),
 * de a termek-lekeres orokre gyorsitotarazott (`force-cache`, ervenytelenites
 * nelkul), a tudas-lekeres viszont 60 mp-enkent frissul. A stage merese
 * (acrobot, 2026-10-03 21:03-21:12 UTC): egy visszaallitott lead a store
 * route-on es a Medusa leirasban mar az eredeti volt, a lapon 3 percig meg a
 * regi, mert a lap a `description`-bol rajzolt. Ezert a lap a szoveget innen
 * veszi, ha van; a hely ugyanaz (a leiras-ful), csak a forras frissebb.
 *
 * A `copy` tomb CSAK jovahagyott, nem elavult blokkot hord (az OS szuri), es ha
 * ures, az OS a leirast sem irja at: ilyenkor `null`, es a lap a mai leirast
 * mutatja. Az alak ugyanaz, mint az OS `copyToHtml`-je: ures sor bekezdest
 * bont, a sortores szokoz, minden szoveg escape-elve.
 */
export function tudasLeiras(
  tudas: TermekTudas | null | undefined,
): string | null {
  const blokkok = (tudas?.copy ?? [])
    .filter((c) => c.block === "lead" || c.block === "body")
    .sort((a, b) => (a.block === b.block ? 0 : a.block === "lead" ? -1 : 1))
  const html = blokkok
    .flatMap((c) => c.body.split(/\n{2,}/))
    .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join("\n")
  return html === "" ? null : html
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

/**
 * VAN-E MIT MUTATNI. A muszaki lap ebbol donti el, hogy a blokk egyaltalan
 * bekerul-e: tudas nelkuli termeknel a lap BETURE a mai marad (a `fulek` slot
 * nem kap ures toldalekot, ami a vaz varakozo szoveget elnyomna).
 */
export function vanTudas(tudas: TermekTudas | null | undefined): boolean {
  if (!tudas) return false
  const { kulcs, szakaszok } = reszek(tudas)
  return kulcs.length > 0 || szakaszok.length > 0
}

export function TermekTudasBlokk({ tudas }: { tudas: TermekTudas | null }) {
  if (!tudas || !vanTudas(tudas)) return null
  const { kulcs, szakaszok } = reszek(tudas)

  return (
    <section
      data-testid="termek-tudas"
      className="mt-6 flex flex-col gap-4 text-small-regular text-[var(--terv-szoveg-halvany)]"
    >
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
