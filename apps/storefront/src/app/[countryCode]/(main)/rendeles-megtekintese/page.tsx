import { translator } from "@lib/i18n/dictionary"
import { localeOf } from "@lib/i18n/locale"
import GuestOrderForm from "@modules/guest-order/components/guest-order-form"
import { Metadata } from "next"

type Props = { params: Promise<{ countryCode: string }> }

export const metadata: Metadata = {
  title: "Rendelés megtekintése",
  // a vevő saját rendelése, a link nem kerülhet keresőbe
  robots: { index: false, follow: false },
}

/**
 * „RENDELÉS MEGTEKINTÉSE” (V1.1): a vendég rendelésszám és e-mail cím alapján látja a rendelése
 * állapotát, regisztráció nélkül. A lap csak a keretet adja, az űrlap és a válasz kliens oldali
 * (`GuestOrderForm`): a keresés szervermű, nem kerül se URL-be, se gyorsítótárba.
 */
export const revalidate = 300

// a lap statikus keret (a keresés kliens oldali szervermű): ISR, mint a többi publikus lap
export async function generateStaticParams() {
  return []
}

export default async function RendelesMegtekintesePage(props: Props) {
  const { countryCode } = await props.params
  const t = translator(localeOf(countryCode))
  return (
    <div
      className="content-container flex justify-center py-10 small:py-16"
      data-testid="rendeles-megtekintese"
    >
      <div className="flex w-full max-w-[640px] flex-col gap-y-8">
        <header className="flex flex-col gap-y-2">
          <h1 className="text-[26px] font-semibold text-acr-ink">
            {t("guestOrder.pageTitle")}
          </h1>
          <p className="text-acr-slate">{t("guestOrder.intro")}</p>
        </header>
        <GuestOrderForm />
      </div>
    </div>
  )
}
