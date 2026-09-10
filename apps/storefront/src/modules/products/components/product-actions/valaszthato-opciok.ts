/**
 * VAN-E EGYALTALAN MIBOL VALASZTANI -- EGY HELYEN, MERT KET HELY OLVASSA.
 *
 * A valaszto blokk KET feltetelen all: a vaz slot-feltetele donti el, hogy a
 * rekesz TELINEK vagy URESNEK jelolodjon, a komponens sajat orzoje pedig azt,
 * hogy rajzol-e. Ha a ket hely kulon szamolna, elcsuszhatnanak ugy, hogy semmi
 * nem hibazik: a vaz telinek jelolne egy uresen rajzolo dobozt.
 *
 * Ezert a szabaly EGY fuggvenyben all, es mind a ketto ezt hivja -- ugyanaz az
 * alak, mint a kategoria-hivatkozasnal a kozos konstans.
 *
 * === A SZABALY, ES A MERES, AMIBOL KOVETKEZIK ===
 *
 * Akkor van mibol valasztani, ha LEGALABB EGY opcio-csoportnak KETTO vagy tobb
 * erteke van. Egy csoport egyetlen ertekkel nem valasztas: az "Alap" doboz nulla
 * informaciot ad, es kozben azt IGERI a vevonek, hogy van mibol valasztania.
 *
 * MERVE 2026-09-10 a stage bolton (`*options,*options.values`, a mezo mind az
 * 1492 soron jelen):
 *
 *     1492 termek, mindegyiknek PONTOSAN EGY opcio-csoportja        {1: 1492}
 *     minden csoportban PONTOSAN EGY ertek                          {1: 1492}
 *     a csoport neve mindenhol "Kivitel", az ertek mindenhol "Alap"
 *
 * Nulla kivetel. Vagyis az egy ertekes eset nem szelsoseg, hanem MIND az 1492
 * lap -- es ezert ez a valtozas 1492 lapot erint, nem egyet.
 *
 * Ez nem veletlen: a meret-testverek KULON termeklapkent kolztoznek at (Balazs
 * dontese, 2026-09-04), tehat a vetites termekenkent egy valtozatot ir.
 *
 * === AMIT EZ NEM MOND MEG ===
 *
 * Nem mondja meg, hogy a valaszto HELYES-e, csak hogy van-e mit mutatnia. Az
 * egyedi peldany kulon feltetel, es a komponensben all (a #83 ota).
 */
export function vanValaszthatoOpcio(
  termek:
    | {
        options?:
          ({ values?: { value?: string | null }[] | null } | null)[] | null
      }
    | null
    | undefined,
): boolean {
  return (termek?.options ?? []).some(
    (csoport) => (csoport?.values?.length ?? 0) > 1,
  )
}
