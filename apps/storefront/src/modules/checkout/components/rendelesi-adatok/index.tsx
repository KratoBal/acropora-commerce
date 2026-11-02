import { HttpTypes } from "@medusajs/types"

import { translator } from "@lib/i18n/dictionary"
import { localeOf } from "@lib/i18n/locale"
import { rendelesiAdatok } from "@lib/util/fizetesi-oldal"
import PenztarKartya from "@modules/checkout/components/penztar-kartya"

/** "Rendelési adatok" (Figma 209:3): a mar rogzitett kapcsolattartas es szamlazas. */
export default function RendelesiAdatok({
  cart,
  countryCode,
}: {
  cart: HttpTypes.StoreCart
  /** the first path segment: `hu` (Hungarian) or `en-hu` (English) */
  countryCode: string
}) {
  const t = translator(localeOf(countryCode))
  const adat = rendelesiAdatok(cart, localeOf(countryCode))
  return (
    <PenztarKartya
      cim={t("checkoutPayment.cardOrderData")}
      data-testid="rendelesi-adatok"
    >
      <div className="grid grid-cols-1 gap-4 small:grid-cols-2">
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-acr-heritage">
            {t("checkoutPayment.cardContact")}
          </p>
          <p className="text-[15px] font-medium text-acr-ink">
            {adat.kapcsolat.nev}
          </p>
          <p className="text-[13px] text-acr-slate">
            {adat.kapcsolat.elerhetoseg}
          </p>
        </div>
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-acr-heritage">
            {t("checkoutPayment.cardBilling")}
          </p>
          <p className="text-[15px] font-medium text-acr-ink">
            {adat.szamlazas.nev}
          </p>
          <p className="text-[13px] text-acr-slate">{adat.szamlazas.cim}</p>
        </div>
      </div>
    </PenztarKartya>
  )
}
