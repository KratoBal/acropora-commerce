import { HttpTypes } from "@medusajs/types"

import { translator } from "@lib/i18n/dictionary"
import { localeOf } from "@lib/i18n/locale"
import { szallitasiCsoportok } from "@lib/util/fizetesi-oldal"
import { arSzoveg } from "@lib/util/ar-szoveg"
import PenztarKartya from "@modules/checkout/components/penztar-kartya"

/**
 * "Szállítási csoportok" (Figma 209:3): ezen a lepesen mar csak megjelenik,
 * nem modosithato. Vegyes kosarnal az elo allatos resz kulon csoport.
 */
export default function SzallitasiCsoportok({
  cart,
  boltiTetelek,
  countryCode,
}: {
  cart: HttpTypes.StoreCart
  boltiTetelek: readonly string[]
  /** the first path segment: `hu` (Hungarian) or `en-hu` (English) */
  countryCode: string
}) {
  const t = translator(localeOf(countryCode))
  const csoportok = szallitasiCsoportok(cart, new Set(boltiTetelek), t)
  if (!csoportok.length) return null
  return (
    <PenztarKartya
      cim={t("checkoutPayment.cardGroups")}
      data-testid="szallitasi-csoportok"
    >
      <p className="mb-3 text-[13px] text-acr-slate">
        {t("checkoutPayment.groupsLead")}
      </p>
      <ul className="flex flex-col gap-3">
        {csoportok.map((cs) => (
          <li
            key={cs.cimke}
            className="border border-acr-line px-4 py-3"
            data-testid="szallitasi-csoport"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-acr-heritage">
              {cs.cimke}
            </p>
            <p className="text-[15px] font-medium text-acr-ink">
              {cs.mod} · {arSzoveg(cs.osszeg, cart.currency_code, t)}
            </p>
            <p className="text-[13px] text-acr-slate">
              {[cs.tetelek.join(" + "), cs.hova].filter(Boolean).join(" · ")}
            </p>
          </li>
        ))}
      </ul>
    </PenztarKartya>
  )
}
