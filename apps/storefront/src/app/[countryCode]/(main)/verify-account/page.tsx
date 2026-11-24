import { Metadata } from "next"
import { vevoiForditas } from "@lib/i18n/vevoi-forditas"
import { Suspense } from "react"

import { localeOf } from "@lib/i18n/locale"
import VerifyAccount from "@modules/account/components/verify-account"

type Props = { params: Promise<{ countryCode: string }> }

// the page body is translated: its title and description follow the page's language
export async function generateMetadata(props: Props): Promise<Metadata> {
  const { countryCode } = await props.params
  const t = await vevoiForditas(localeOf(countryCode))
  return {
    title: t("account.auth.verify.metaTitle"),
    description: t("account.auth.verify.metaDescription"),
  }
}

export default async function VerifyAccountPage(props: Props) {
  const { countryCode } = await props.params
  const t = await vevoiForditas(localeOf(countryCode))
  return (
    <div className="w-full flex justify-center px-8 py-12">
      <Suspense
        fallback={
          <p className="text-base-regular text-ui-fg-base">
            {t("account.auth.verify.verifying")}
          </p>
        }
      >
        <VerifyAccount />
      </Suspense>
    </div>
  )
}
