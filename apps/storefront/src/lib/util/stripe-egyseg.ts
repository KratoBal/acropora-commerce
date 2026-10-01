/**
 * EGY ÖSSZEG A STRIPE LEGKISEBB EGYSÉGÉBEN, ahogy a háttér a PaymentIntentet
 * létrehozza (`@medusajs/payment-stripe` getSmallestUnit, a háttérben
 * `smallest-unit.ts`, ott a csomag saját függvényéhez mérve). A halasztott
 * kártyamező összege ezzel egyezik a közös intent összegével. A forint NEM
 * nulla-tizedes ebben a táblában: 1 000 Ft = 100 000.
 */
const NULLA_TIZEDES = [
  "BIF",
  "CLP",
  "DJF",
  "GNF",
  "JPY",
  "KMF",
  "KRW",
  "MGA",
  "PYG",
  "RWF",
  "UGX",
  "VND",
  "VUV",
  "XAF",
  "XOF",
  "XPF",
]
const HAROM_TIZEDES = ["BHD", "IQD", "JOD", "KWD", "OMR", "TND"]

export const stripeEgyseg = (osszeg: number, penznem: string): number => {
  const kod = penznem.toUpperCase()
  const hatvany = NULLA_TIZEDES.includes(kod)
    ? 0
    : HAROM_TIZEDES.includes(kod)
      ? 3
      : 2
  // egesz forintnal a szorzas pontos; a hatter a csomag BigNumber-alakjat hasznalja
  let egyseg = Math.round(osszeg * Math.pow(10, hatvany))
  if (hatvany === 3) {
    egyseg = Math.ceil(egyseg / 10) * 10
  }
  return egyseg
}
