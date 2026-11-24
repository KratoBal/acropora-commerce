import HtmlLang from "@modules/common/components/html-lang"
import { vevoiSzovegek } from "@lib/data/vevoi-szovegek"
import { DEFAULT_LOCALE, localeOf } from "@lib/i18n/locale"
import { VevoiSzovegekProvider } from "@lib/i18n/vevoi-szovegek-kontextus"

/**
 * THE LANGUAGE OF THE PATH, FOR EVERY PAGE UNDER A COUNTRY (`hu`: Hungarian, `en-hu`: English; `lib/i18n/locale.ts`).
 * It tells the document its language, and hands the client components the customer texts edited in the OS for that language
 * (card 7bfca4eb; `useTranslate`). The frame, the header and the pages are the route groups' own layouts.
 */
export default async function CountryLayout(props: {
  children: React.ReactNode
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  const locale = localeOf(countryCode)

  return (
    <VevoiSzovegekProvider
      locale={locale}
      szovegek={await vevoiSzovegek(locale)}
    >
      {locale !== DEFAULT_LOCALE ? <HtmlLang lang={locale} /> : null}
      {props.children}
    </VevoiSzovegekProvider>
  )
}
