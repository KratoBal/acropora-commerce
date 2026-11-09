"use client"

import { useActionState } from "react"

import { szoljFeliratkozasAkcio } from "@lib/data/szolj-hasonlo"
import { translator } from "@lib/i18n/dictionary"
import type { Locale } from "@lib/i18n/locale"
import { jogiOldal } from "@lib/util/fogyasztobarat"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

const MEZO =
  "h-11 w-full min-w-0 border px-4 txt-small outline-none focus-visible:ring-2"

/**
 * "SZÓLJ, HA JÖN HASONLÓ" (V2.4, kartya 0c1265d2): az eladott egyedi darab
 * lapjan, a most kaphato hasonlok alatt. Egy e-mail-cim es a hozzajarulas; a
 * darab azonositoja rejtett mezo, a fajt a bolt a termek sajat cimebol olvassa.
 * A hozzajarulas mondata betura a bolt rogzitett mondata, a tajekoztato linkje
 * utana all (a hirlevel-sor tartalek alakja), tehat a latott es a rogzitett
 * mondat ugyanaz.
 *
 * Kapcsolo mogott (`szoljBekapcsolva`): a hivo dont, ez a komponens mindig rajzol.
 */
export default function SzoljHasonlo({
  termekId,
  locale = "hu",
}: {
  termekId: string
  locale?: Locale
}) {
  const t = translator(locale)
  const [allapot, kuld, folyamatban] = useActionState(
    szoljFeliratkozasAkcio,
    null,
  )
  const beirt = allapot?.allapot === "hiba" ? allapot.ertekek : undefined

  return (
    <section
      className="product-page-constraint mt-12 flex max-w-[640px] flex-col gap-y-4"
      aria-labelledby="szolj-hasonlo-cim"
      data-testid="szolj-hasonlo"
    >
      <h2 id="szolj-hasonlo-cim" className="text-xl-semi text-ui-fg-base">
        {t("stockAlert.title")}
      </h2>
      {allapot?.allapot === "kesz" ? (
        <p
          role="status"
          className="txt-medium"
          data-testid="szolj-hasonlo-kesz"
        >
          {t("stockAlert.done")}
        </p>
      ) : (
        <form action={kuld} className="flex flex-col gap-3" noValidate>
          <p className="txt-medium text-gray-600">{t("stockAlert.text")}</p>
          <input type="hidden" name="product_id" value={termekId} />
          <input type="hidden" name="locale" value={locale} />
          <div className="flex flex-col gap-3 small:flex-row">
            <input
              name="email"
              type="email"
              aria-label={t("stockAlert.email")}
              placeholder={t("stockAlert.email")}
              autoComplete="email"
              required
              maxLength={254}
              defaultValue={beirt?.email}
              className={MEZO}
              style={{
                background: "var(--terv-hatter-lap)",
                color: "var(--terv-szoveg)",
                borderColor: "var(--terv-keret)",
              }}
            />
            <button
              type="submit"
              disabled={folyamatban}
              className="h-11 shrink-0 px-6 txt-small-plus disabled:opacity-60"
              style={{
                background: "var(--terv-kiemel)",
                color: "var(--terv-kiemel-szoveg)",
              }}
            >
              {t("stockAlert.button")}
            </button>
          </div>
          <label className="flex items-start gap-2 txt-small">
            <input
              type="checkbox"
              name="consent"
              required
              className="mt-0.5 h-4 w-4 shrink-0"
            />
            <span>
              <span data-testid="szolj-hasonlo-hozzajarulas">
                {t("stockAlert.consent")}
              </span>{" "}
              <LocalizedClientLink
                href={jogiOldal("adatkezeles")}
                className="underline"
                data-testid="szolj-hasonlo-adatkezeles"
              >
                {t("stockAlert.policyLink")}
              </LocalizedClientLink>
            </span>
          </label>
          {allapot?.allapot === "hiba" ? (
            <p
              role="alert"
              className="txt-small"
              data-testid="szolj-hasonlo-hiba"
            >
              {allapot.uzenet}
            </p>
          ) : null}
        </form>
      )}
    </section>
  )
}
