import { HttpTypes } from "@medusajs/types"

import { rendelesiAdatok } from "@lib/util/fizetesi-oldal"
import PenztarKartya from "@modules/checkout/components/penztar-kartya"

/** "Rendelési adatok" (Figma 209:3): a mar rogzitett kapcsolattartas es szamlazas. */
export default function RendelesiAdatok({
  cart,
}: {
  cart: HttpTypes.StoreCart
}) {
  const adat = rendelesiAdatok(cart)
  return (
    <PenztarKartya cim="Rendelési adatok" data-testid="rendelesi-adatok">
      <div className="grid grid-cols-1 gap-4 small:grid-cols-2">
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-acr-heritage">
            Kapcsolattartás
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
            Számlázás
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
