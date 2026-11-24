import { Metadata } from "next"
import { vevoiForditas } from "@lib/i18n/vevoi-forditas"

import { localeOf } from "@lib/i18n/locale"
import { STORE_NAME } from "@lib/store"
import LoginTemplate from "@modules/account/templates/login-template"

type Props = { params: Promise<{ countryCode: string }> }

// the sign-in page's body is translated: its title and description follow the page's language
export async function generateMetadata(props: Props): Promise<Metadata> {
  const { countryCode } = await props.params
  const t = await vevoiForditas(localeOf(countryCode))
  return {
    title: t("account.auth.login.title"),
    description: t("account.auth.loginMetaDescription", { store: STORE_NAME }),
  }
}

export default function Login() {
  return <LoginTemplate />
}
