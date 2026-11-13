/**
 * AZ ÉRINTÉSI TERÜLET NAGYOBB, MINT A LÁTHATÓ JEL (stage 390 px, 2026-11-13).
 *
 * A kosár törlő ikonja 19 x 15 px, a "Kedvezménykód hozzáadása" és a "Vásárlás folytatása" 22 px, a menü gombja 20 px széles, a pénztár
 * "Vissza" linkje 22 px magas: mind a WCAG 2.5.8 (24 px) alatt, telefonon alig találhatók el. A méretük a tervé, ezért nem a láthatót
 * növeljük: egy átlátszó `::after` terület adja a nagyobb találati felületet (a szülő `relative`). 8 px vízszintesen, 12 px függőlegesen:
 * a kosár törlő ikonja és a mennyiség-választó között ~13 px a hézag, ezt a vízszintes érték nem lépi át.
 */
export const TAP_AREA =
  "relative after:absolute after:-inset-x-2 after:-inset-y-3 after:content-['']"
