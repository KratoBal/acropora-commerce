import type { TermekTudas } from "@lib/data/product-knowledge"
import { translator, type Key, type Translate } from "@lib/i18n/dictionary"
import { DEFAULT_LOCALE, type Locale } from "@lib/i18n/locale"
import { adagOlvas } from "@lib/util/adagolas"
import { gyartoiAdagSzoveg } from "@lib/util/adagolas-szoveg"
import React from "react"

import { AdagoloKalkulator } from "./adagolo-kalkulator"

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

type Megjelenes = { ertek: string } | { elteres: true } | null

export function megjelenes(tudas: TermekTudas, mezo: string): Megjelenes {
  const teny = tudas.facts.find((f) => f.field === mezo)
  if (!teny) return null
  if (teny.status === "CONFLICTING_SOURCES") return { elteres: true }
  if ((teny.status === "VERIFIED" || teny.status === "SUGGESTED") && teny.value)
    return { ertek: teny.unit ? `${teny.value} ${teny.unit}` : teny.value }
  return null
}

const Ertek = ({ m, t }: { m: Exclude<Megjelenes, null>; t: Translate }) =>
  "elteres" in m ? (
    <span data-testid="tudas-elteres" className="italic">
      {t("product.knowledgeDiffer")}
    </span>
  ) : (
    <span className="whitespace-pre-line">{m.ertek}</span>
  )

const KULCS_TENYEK: [string, Key][] = [
  ["packSize", "product.packSize"],
  ["dosing", "product.knowledgeDosing"],
  ["application", "product.knowledgeUse"],
]

const SZAKASZOK: [string, Key][] = [
  ["dosing", "product.knowledgeDosing"],
  ["packageContents", "product.knowledgePackage"],
  ["manufacturerClaims", "product.knowledgeClaims"],
  ["manufacturerInfo", "product.knowledgeInfo"],
]

/**
 * AZ ADAGOLAS OLVASHATOAN (V3.1): a kanonikus alak ("5 ml/100 L/day") helyett
 * "5 ml / 100 liter, naponta". Ami nem kanonikus, az ugy marad, ahogy jott.
 */
function olvashato(
  mezo: string,
  m: Megjelenes,
  t: Translate,
  locale: Locale,
): Megjelenes {
  if (mezo !== "dosing" || !m || !("ertek" in m)) return m
  const adag = adagOlvas(m.ertek)
  return adag ? { ertek: gyartoiAdagSzoveg(adag, t, locale) } : m
}

/** A kalkulator csak ELLENORZOTT (VERIFIED) es kanonikus adagnal jelenik meg; a SUGGESTED nem eleg. */
export function kalkulatorErtek(tudas: TermekTudas): string | null {
  const teny = tudas.facts.find((f) => f.field === "dosing")
  return teny?.status === "VERIFIED" && teny.value && adagOlvas(teny.value)
    ? teny.value
    : null
}

function reszek(
  tudas: TermekTudas,
  t: Translate = translator("hu"),
  locale: Locale = DEFAULT_LOCALE,
) {
  const lathato = (lista: [string, Key][]) =>
    lista
      .map(
        ([mezo, kulcs]) =>
          [
            mezo,
            t(kulcs),
            olvashato(mezo, megjelenes(tudas, mezo), t, locale),
          ] as const,
      )
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

export function TermekTudasBlokk({
  tudas,
  locale = DEFAULT_LOCALE,
}: {
  tudas: TermekTudas | null
  /** A lap nyelve; alapertek magyar. */
  locale?: Locale
}) {
  if (!tudas || !vanTudas(tudas)) return null
  const t = translator(locale)
  const { kulcs, szakaszok } = reszek(tudas, t, locale)
  const kalkulator = kalkulatorErtek(tudas)

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
                <Ertek m={m!} t={t} />
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      {szakaszok.map(([mezo, cimke, m]) => (
        <div key={mezo} data-testid={`tudas-${mezo}`}>
          <h3 className="text-base-semi">{cimke}</h3>
          <Ertek m={m!} t={t} />
          {mezo === "dosing" && kalkulator ? (
            <AdagoloKalkulator ertek={kalkulator} locale={locale} />
          ) : null}
        </div>
      ))}
    </section>
  )
}
