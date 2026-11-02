import { translator } from "@lib/i18n/dictionary"
import { localeOf } from "@lib/i18n/locale"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

/** A bejelentkezés felajánlása a vendég kosár fölött. */
const SignInPrompt = ({ countryCode }: { countryCode: string }) => {
  const t = translator(localeOf(countryCode))

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border border-acr-line bg-acr-white p-[18px]">
      <div>
        <h2 className="text-[20px] leading-[34px] tracking-[-0.2px] text-acr-ink">
          {t("cartPage.signInHeading")}
        </h2>
        <p className="text-[14px] leading-[22px] text-acr-slate">
          {t("cartPage.signInText")}
        </p>
      </div>
      <LocalizedClientLink
        href="/account"
        className="flex h-[44px] items-center border border-acr-line bg-acr-white px-6 text-[14px] font-medium text-acr-ink hover:border-acr-slate"
        data-testid="sign-in-button"
      >
        {t("cartPage.signInButton")}
      </LocalizedClientLink>
    </div>
  )
}

export default SignInPrompt
