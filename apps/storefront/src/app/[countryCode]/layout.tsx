import HtmlLang from "@modules/common/components/html-lang"
import { DEFAULT_LOCALE, localeOf } from "@lib/i18n/locale"

/**
 * THE LANGUAGE OF THE PATH, FOR EVERY PAGE UNDER A COUNTRY (`hu`: Hungarian, `en-hu`: English; `lib/i18n/locale.ts`).
 * It only tells the document its language; the frame, the header and the pages are the route groups' own layouts.
 */
export default async function CountryLayout(props: {
  children: React.ReactNode
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  const locale = localeOf(countryCode)

  return (
    <>
      {locale !== DEFAULT_LOCALE ? <HtmlLang lang={locale} /> : null}
      {props.children}
    </>
  )
}
