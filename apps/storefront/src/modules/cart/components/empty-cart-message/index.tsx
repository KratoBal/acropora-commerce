import { translator, type Key } from "@lib/i18n/dictionary"
import { localeOf } from "@lib/i18n/locale"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

/**
 * AZ ÜRES KOSÁR NEM HIBAÁLLAPOT, HANEM KIINDULÓPONT. A terv három ajánlót
 * mutat, mert az üres kosár az a pillanat, amikor a vevő nem tudja, hol
 * kezdje. A szövegek szótár-kulcsok; a hivatkozás egyelőre mind a bolt.
 */
const AJANLOK: readonly { cim: Key; leiras: Key; href: string }[] = [
  {
    cim: "cartPage.emptyOfferWysiwyg",
    leiras: "cartPage.emptyOfferWysiwygText",
    href: "/store",
  },
  {
    cim: "cartPage.emptyOfferTech",
    leiras: "cartPage.emptyOfferTechText",
    href: "/store",
  },
  {
    cim: "cartPage.emptyOfferConsumables",
    leiras: "cartPage.emptyOfferConsumablesText",
    href: "/store",
  },
]

const EmptyCartMessage = ({ countryCode }: { countryCode: string }) => {
  const t = translator(localeOf(countryCode))

  return (
    <div
      className="flex flex-col items-start gap-8 py-8 small:py-12"
      data-testid="empty-cart-message"
    >
      <div className="flex max-w-[36rem] flex-col gap-3">
        <span className="text-[12px] font-medium uppercase leading-[16px] tracking-[1.8px] text-acr-slate">
          {t("cartPage.emptyLabel")}
        </span>
        <h1 className="font-kiemelt text-[40px] font-normal leading-[44px] tracking-[-0.01em] text-acr-ink small:text-[58px] small:leading-[62px]">
          {t("cartPage.emptyHeading")}
        </h1>
        <p className="text-[18px] leading-[30px] text-acr-slate">
          {t("cartPage.emptyLead")}
        </p>
      </div>

      <div className="grid w-full grid-cols-1 gap-4 small:grid-cols-3">
        {AJANLOK.map((ajanlo) => (
          <LocalizedClientLink
            key={ajanlo.cim}
            href={ajanlo.href}
            className="flex h-full flex-col gap-2 border border-acr-line bg-acr-white p-[18px] hover:border-acr-slate"
            data-testid="empty-cart-ajanlo"
          >
            <span className="text-[20px] leading-[34px] tracking-[-0.2px] text-acr-ink">
              {t(ajanlo.cim)}
            </span>
            <span className="text-[14px] leading-[22px] text-acr-slate">
              {t(ajanlo.leiras)}
            </span>
            <span
              className="mt-auto pt-2 text-[14px] text-acr-ocean"
              aria-hidden="true"
            >
              {t("cartPage.emptyOfferCta")}
            </span>
          </LocalizedClientLink>
        ))}
      </div>

      {/* Az akváriumot kezdőknek: a telefonszám a bolté, nem fordítandó. */}
      <div className="w-full border border-acr-line bg-acr-mist p-[18px]">
        <p className="text-[16px] font-medium leading-[26px] text-acr-ink">
          {t("cartPage.emptyStartTitle")}
        </p>
        <p className="text-[14px] leading-[22px] text-acr-slate">
          {t("cartPage.emptyStartText")}{" "}
          <a href="tel:+36202676801" className="underline">
            +36 20 267 6801
          </a>
        </p>
      </div>
    </div>
  )
}

export default EmptyCartMessage
