import { translator } from "@lib/i18n/dictionary"
import { localeOf } from "@lib/i18n/locale"
import { STORE_NAME } from "@lib/store"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ChevronDown from "@modules/common/icons/chevron-down"
import Footer from "@modules/layout/templates/footer"

/**
 * A PENZTAR SAJAT, SZUKITETT FEJLECE MARAD (fizetesnel bevett: nincs menu, ami elvinne a vevot), DE A VALODI LOGOVAL, ES A
 * LABLEC A KIRAKAT KOZOS LABLECE (Balazs 2026-10-26 07:52 UTC: fejlec es lablec minden aloldalon a kezdolap szerint;
 * acrobot 49644: legalabb a logo a szoveg helyett, es a lablec ott legyen). A szoveges "ACROPORA" feliratot a kezdolap
 * fejlecenek logoja (`/images/acropora-logo.svg`) valtja. A tartalom mar nem tolti ki a teljes kepernyomagassagot: a lablec
 * kozvetlenul utana all; a rovid, osszecsukott allapotu penztar (elso lepes) igy sem hagy ures savot a lablec elott.
 */
export default async function CheckoutLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await params
  const t = translator(localeOf(countryCode))

  return (
    <>
      <div className="relative w-full bg-acr-shell font-acr-sans">
        <div className="h-16 border-b border-acr-line bg-acr-white">
          <nav className="mx-auto flex h-full w-full max-w-[1440px] items-center justify-between px-4 small:px-16">
            <LocalizedClientLink
              href="/cart"
              className="flex flex-1 basis-0 items-center gap-x-2 text-[14px] leading-[22px] text-acr-slate hover:text-acr-ink"
              data-testid="back-to-cart-link"
            >
              <ChevronDown className="rotate-90" size={16} />
              <span className="hidden small:block">
                {t("checkoutPage.backToCart")}
              </span>
              <span className="block small:hidden">
                {t("checkoutPage.back")}
              </span>
            </LocalizedClientLink>
            <LocalizedClientLink
              href="/"
              className="flex shrink-0 items-center"
              data-testid="store-link"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/acropora-logo.svg"
                alt={STORE_NAME}
                className="block h-[40px] w-auto"
                data-testid="penztar-logo"
              />
            </LocalizedClientLink>
            <div className="flex-1 basis-0" />
          </nav>
        </div>
        <div className="relative" data-testid="checkout-container">
          {children}
        </div>
      </div>
      <Footer countryCode={countryCode} />
      {/*
      A RAGADO FIZETESI SAV HELYE A LABLEC ALATT (barracuda, #754): mobilon a fizetesi lepes `stripe-cta-sav` savja a
      kepernyo aljara ragad (`fixed bottom-0`, ~76 px), es a helyfoglaloja az osszesitoben all, amely eddig a dokumentum alja
      volt. A lablec most utana jon, ezert a sav az utolso lablec-sort (a copyright es a suti-beallitas gomb) fedne: ez a
      helyfoglalo a lablec UTAN adja vissza a 76 pixelt, de CSAK ha a sav ott van (`penztar-lablec-hely`, globals.css).
    */}
      <div aria-hidden="true" className="penztar-lablec-hely small:hidden" />
    </>
  )
}
