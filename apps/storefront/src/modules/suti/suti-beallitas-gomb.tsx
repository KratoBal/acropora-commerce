"use client"

import { SUTI_BEALLITAS_ESEMENY } from "@lib/util/suti-hozzajarulas"

/**
 * A LABLEC "SUTIBEALLITASOK" GOMBJA (kartya d5515c7d): ujranyitja az ablakot a
 * beallitasokkal, ahol a dontes visszavonhato. Esemennyel szol, nem kozos
 * allapottal: a lablec szerver-komponens, az ablak a gyoker layoutban all.
 */
export function SutiBeallitasGomb({ felirat }: { felirat: string }) {
  return (
    <button
      type="button"
      className="txt-compact-small underline hover:text-terv-szoveg"
      style={{ color: "var(--terv-szoveg-halvany)" }}
      onClick={() => window.dispatchEvent(new Event(SUTI_BEALLITAS_ESEMENY))}
      data-testid="footer-suti-beallitasok"
    >
      {felirat}
    </button>
  )
}
