/**
 * A LÉPÉSJELZŐ ÁLLÁSA A PÉNZTÁR ŰRLAP-OLDALÁN (0 = kosár, 1 = adatok, 2 = fizetés).
 * A cím és a szállítás lépés az "Adatok"; az ellenőrzés (`?step=review`) már a
 * HARMADIK, a fizetés lépése, mert a megrendelés gombja ott áll (acrobot 40272).
 * A fizetés oldala (`?step=payment`) külön lap, saját jelzővel.
 */
export const lepesjelzoAllas = (step: string | undefined): 1 | 2 =>
  step === "review" ? 2 : 1
