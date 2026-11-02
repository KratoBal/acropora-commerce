import { translator } from "@lib/i18n/dictionary"
import { localeOf } from "@lib/i18n/locale"
import { STORE_NAME } from "@lib/store"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ChevronDown from "@modules/common/icons/chevron-down"

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
    <div className="relative w-full bg-acr-shell font-acr-sans small:min-h-screen">
      <div className="h-16 border-b border-acr-line bg-acr-white">
        <nav className="content-container flex h-full items-center justify-between">
          <LocalizedClientLink
            href="/cart"
            className="flex flex-1 basis-0 items-center gap-x-2 text-[14px] leading-[22px] text-acr-slate hover:text-acr-ink"
            data-testid="back-to-cart-link"
          >
            <ChevronDown className="rotate-90" size={16} />
            <span className="hidden small:block">
              {t("checkoutPage.backToCart")}
            </span>
            <span className="block small:hidden">{t("checkoutPage.back")}</span>
          </LocalizedClientLink>
          <LocalizedClientLink
            href="/"
            className="text-[18px] font-medium uppercase tracking-[1.8px] text-acr-ink"
            data-testid="store-link"
          >
            {STORE_NAME}
          </LocalizedClientLink>
          <div className="flex-1 basis-0" />
        </nav>
      </div>
      <div className="relative" data-testid="checkout-container">
        {children}
      </div>
    </div>
  )
}
