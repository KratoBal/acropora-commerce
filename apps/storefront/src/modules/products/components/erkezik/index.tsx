import { translator } from "@lib/i18n/dictionary"
import type { Locale } from "@lib/i18n/locale"
import {
  arrivalDayText,
  arrivalIsLate,
  type LivestockArrival,
} from "@lib/util/livestock-arrival"
import SzoljHasonlo from "@modules/products/components/szolj-hasonlo"

/**
 * "ÉRKEZIK" A TERMEKLAPON (V2.6 S3b, kartya f4e4832b): egy uton levo elo allat, aminek az OS-ben erkezese van (a termek
 * metaadataban a `livestock_arrival` kulcs). A nap es az allapot, semmi mas: nincs mennyiseg, nincs igeret. Egy NAP, ami
 * mar elmult, nem datumkent all a multban, hanem "az erkezes kesik" (a szerkesztes, ami uj napot ad, ujravetit).
 *
 * A FELIRATKOZAS ("Értesíts, ha megérkezik", a bolt `product` fajtaja) csak a kapcsolo mogott, es a hivo dont (`urlap`): ez a
 * komponens mindig a sort rajzolja. A hozzajarulas es a level szovege nem vegleges (Balazs).
 *
 * A "ma" a bolt napja (Budapest); a hivo adja, hogy a komponens ne a sajat orajara tamaszkodjon (a teszt rogzitett napot ad).
 */
export default function Erkezik({
  erkezes,
  termekId,
  urlap,
  ma,
  rendelheto = false,
  locale = "hu",
}: {
  erkezes: LivestockArrival
  termekId: string
  /** a termek utanrendelessel kaphato: a sor ezt mondja ("Rendelheto, ..."), es az ertesito urlap a hivo dontese (ilyenkor nem kell) */
  rendelheto?: boolean
  urlap: boolean
  ma: string
  locale?: Locale
}) {
  const t = translator(locale)
  const kesik = arrivalIsLate(erkezes, ma)
  return (
    <>
      <section
        className="product-page-constraint mt-8 flex max-w-[640px] flex-col gap-y-1"
        aria-labelledby="erkezik-cim"
        data-testid="erkezik"
      >
        <h2 id="erkezik-cim" className="text-xl-semi text-ui-fg-base">
          {t("livestockArrival.title")}
        </h2>
        <p className="txt-medium" data-testid="erkezik-nap">
          {kesik
            ? t(
                rendelheto
                  ? "livestockArrival.lateOrderable"
                  : "livestockArrival.late",
              )
            : t(
                rendelheto
                  ? "livestockArrival.expectedOrderable"
                  : "livestockArrival.expected",
                { date: arrivalDayText(erkezes.expectedOn, locale) },
              )}
        </p>
        <p className="txt-small text-gray-600" data-testid="erkezik-allapot">
          {erkezes.stage === "in_transit"
            ? t("livestockArrival.inTransit")
            : t("livestockArrival.ordered")}
        </p>
      </section>
      {urlap ? (
        <SzoljHasonlo termekId={termekId} locale={locale} fajta="product" />
      ) : null}
    </>
  )
}
