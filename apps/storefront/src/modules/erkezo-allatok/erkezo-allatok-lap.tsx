import { translator, type Key } from "@lib/i18n/dictionary"
import type { Locale } from "@lib/i18n/locale"
import {
  erkezesFeliratkozasKell,
  type ErkezoAllat,
} from "@lib/util/erkezo-allatok"
import { arrivalDayText } from "@lib/util/livestock-arrival"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ErkezesFeliratkozas from "./erkezes-feliratkozas"

const FAJTA_KULCS: Record<ErkezoAllat["fajta"], Key> = {
  FISH: "livestockArrivals.kindFish",
  INVERTEBRATE: "livestockArrivals.kindInvertebrate",
  CORAL: "livestockArrivals.kindCoral",
}

/**
 * AZ "ÉRKEZŐ ÁLLATOK" LAP (V2.6 S4c, kartya f4e4832b): ami uton van es elojegyezheto, a bolt egy listajabol (a kotott is, a
 * termeklapjara linkelve). Soronkent a fajta, a nev, a nap (vagy hogy kesik: a nap a bolt "ma"-jahoz merve, a termeklap
 * szabalyaval) es az allapot; mennyiseg nincs. A kotetlen, fajt nevezo sornal, ha a fajnak most nincs megveheto termeke, a
 * faj-feliratkozas (kapcsolo mogott, a hivo dont).
 */
export function ErkezoAllatokLap({
  cim,
  sorok,
  handleOf,
  ma,
  feliratkozas,
  locale = "hu",
}: {
  cim: string
  sorok: readonly ErkezoAllat[]
  handleOf: Readonly<Record<string, string>>
  ma: string
  feliratkozas: boolean
  locale?: Locale
}) {
  const t = translator(locale)
  return (
    <div
      className="content-container flex flex-col gap-y-6 py-12"
      data-testid="erkezo-allatok"
    >
      <h1 className="text-2xl-semi">{cim}</h1>
      <p className="txt-medium text-gray-600">{t("livestockArrivals.intro")}</p>
      {sorok.length === 0 ? (
        <p className="txt-medium" data-testid="erkezo-allatok-ures">
          {t("livestockArrivals.empty")}
        </p>
      ) : (
        <ul
          className="flex flex-col divide-y"
          data-testid="erkezo-allatok-lista"
        >
          {sorok.map((sor) => {
            const handle = sor.termekId ? handleOf[sor.termekId] : undefined
            const kesik = sor.nap < ma
            return (
              <li
                key={sor.id}
                className="flex flex-col gap-y-2 py-4"
                data-testid="erkezo-allat"
              >
                <span className="txt-small text-gray-600">
                  {t(FAJTA_KULCS[sor.fajta])}
                </span>
                <span className="txt-large-plus">
                  {handle ? (
                    <LocalizedClientLink
                      href={`/termek/${handle}`}
                      className="underline"
                    >
                      {sor.nev}
                    </LocalizedClientLink>
                  ) : (
                    sor.nev
                  )}
                </span>
                <span className="txt-medium" data-testid="erkezo-allat-nap">
                  {kesik
                    ? t("livestockArrival.late")
                    : t("livestockArrival.expected", {
                        date: arrivalDayText(sor.nap, locale),
                      })}
                </span>
                <span className="txt-small text-gray-600">
                  {sor.allapot === "IN_TRANSIT"
                    ? t("livestockArrival.inTransit")
                    : t("livestockArrival.ordered")}
                </span>
                {erkezesFeliratkozasKell(sor, feliratkozas) ? (
                  <ErkezesFeliratkozas erkezesId={sor.id} locale={locale} />
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
