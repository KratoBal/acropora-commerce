"use client"

import { useActionState, useId } from "react"

import { szoljFeliratkozasAkcio } from "@lib/data/szolj-hasonlo"
import { translator } from "@lib/i18n/dictionary"
import type { Locale } from "@lib/i18n/locale"
import { jogiOldal } from "@lib/util/fogyasztobarat"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

const MEZO =
  "h-11 w-full min-w-0 border px-4 txt-small outline-none focus-visible:ring-2"

/**
 * "ÉRTESÍTS, HA MEGÉRKEZIK" AZ ERKEZO ALLATOK LAPJAN (V2.6 S4c): a kotetlen sor FAJARA. A sor azonositoja (`arrival_id`) rejtett
 * mezo; a fajt a bolt a SOR nevebol olvassa, nem a kerestol (commerce #719). A hozzajarulas mondata a faj mondata (a bolt
 * rogzitett mondata), tehat a latott es a rogzitett mondat ugyanaz. Egy lapon tobb is all: az azonositok `useId`-bol.
 */
export default function ErkezesFeliratkozas({
  erkezesId,
  locale = "hu",
}: {
  erkezesId: string
  locale?: Locale
}) {
  const t = translator(locale)
  const id = useId()
  const [allapot, kuld, folyamatban] = useActionState(
    szoljFeliratkozasAkcio,
    null,
  )
  const beirt = allapot?.allapot === "hiba" ? allapot.ertekek : undefined
  if (allapot?.allapot === "kesz")
    return (
      <p
        role="status"
        className="txt-small"
        data-testid="erkezes-feliratkozas-kesz"
      >
        {t("stockAlert.done")}
      </p>
    )
  return (
    <form
      action={kuld}
      className="flex flex-col gap-2"
      noValidate
      data-testid="erkezes-feliratkozas"
    >
      <input type="hidden" name="arrival_id" value={erkezesId} />
      <input type="hidden" name="kind" value="species" />
      <input type="hidden" name="locale" value={locale} />
      <div className="flex flex-col gap-2 small:flex-row">
        <input
          id={`${id}-email`}
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
          {t("livestockArrivals.notify")}
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
          <span data-testid="erkezes-feliratkozas-hozzajarulas">
            {t("stockAlert.consent")}
          </span>{" "}
          <LocalizedClientLink
            href={jogiOldal("adatkezeles")}
            className="underline"
          >
            {t("stockAlert.policyLink")}
          </LocalizedClientLink>
        </span>
      </label>
      {allapot?.allapot === "hiba" ? (
        <p
          role="alert"
          className="txt-small"
          data-testid="erkezes-feliratkozas-hiba"
        >
          {allapot.uzenet}
        </p>
      ) : null}
    </form>
  )
}
