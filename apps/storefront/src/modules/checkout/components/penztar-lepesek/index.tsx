import { translator, type Key } from "@lib/i18n/dictionary"
import { localeOf } from "@lib/i18n/locale"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { clx } from "@modules/common/components/ui"

/**
 * A PENZTAR LEPESJELZOJE (Figma 209:3): Kosár, Adatok, Fizetés. Az "Adatok" a
 * mai cim- es szallitasi lepest fogja ossze. A mar megtett lepes visszavisz.
 */
const LEPESEK = [
  { szam: 1, nev: "cartPage.stepCart", href: "/cart" },
  { szam: 2, nev: "cartPage.stepDetails", href: "/checkout?step=address" },
  { szam: 3, nev: "cartPage.stepPayment", href: null },
] as const satisfies readonly { szam: number; nev: Key; href: string | null }[]

export default function PenztarLepesek({
  aktiv,
  countryCode,
}: {
  aktiv: 1 | 2 | 3
  /** the first path segment: `hu` (Hungarian) or `en-hu` (English) */
  countryCode: string
}) {
  const t = translator(localeOf(countryCode))
  return (
    <nav
      aria-label={t("checkoutPayment.stepsLabel")}
      className="border-b border-acr-line bg-acr-mist"
      data-testid="penztar-lepesek"
    >
      <ol className="content-container flex items-center gap-3 py-4 small:gap-6">
        {LEPESEK.map((lepes, i) => {
          const jelen = lepes.szam === aktiv
          const tartalom = (
            <span className="flex items-center gap-2">
              <span
                className={clx(
                  "flex h-6 w-6 items-center justify-center text-[12px] text-acr-white",
                  jelen ? "bg-acr-heritage" : "bg-acr-ink",
                )}
              >
                {lepes.szam}
              </span>
              <span
                className={clx(
                  "text-[14px]",
                  jelen ? "font-medium text-acr-ink" : "text-acr-ink",
                )}
              >
                {t(lepes.nev)}
              </span>
            </span>
          )
          return (
            <li
              key={lepes.szam}
              className="flex items-center gap-3 small:gap-6"
              aria-current={jelen ? "step" : undefined}
            >
              {lepes.href && lepes.szam < aktiv ? (
                <LocalizedClientLink href={lepes.href}>
                  {tartalom}
                </LocalizedClientLink>
              ) : (
                tartalom
              )}
              {i < LEPESEK.length - 1 ? (
                <span
                  className="hidden h-px w-16 bg-acr-line small:block"
                  aria-hidden="true"
                />
              ) : null}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
