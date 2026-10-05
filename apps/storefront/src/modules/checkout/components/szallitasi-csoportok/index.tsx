import { HttpTypes } from "@medusajs/types"

import { szallitasiCsoportok } from "@lib/util/fizetesi-oldal"
import { convertToLocale } from "@lib/util/money"
import PenztarKartya from "@modules/checkout/components/penztar-kartya"

/**
 * "Szállítási csoportok" (Figma 209:3): ezen a lepesen mar csak megjelenik,
 * nem modosithato. Vegyes kosarnal az elo allatos resz kulon csoport.
 */
export default function SzallitasiCsoportok({
  cart,
  boltiTetelek,
}: {
  cart: HttpTypes.StoreCart
  boltiTetelek: readonly string[]
}) {
  const csoportok = szallitasiCsoportok(cart, new Set(boltiTetelek))
  if (!csoportok.length) return null
  return (
    <PenztarKartya
      cim="Szállítási csoportok"
      data-testid="szallitasi-csoportok"
    >
      <p className="mb-3 text-[13px] text-acr-slate">
        A szállítási módok ezen a lépésen már nem módosíthatók.
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
              {cs.mod} ·{" "}
              {convertToLocale({
                amount: cs.osszeg,
                currency_code: cart.currency_code,
              })}
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
