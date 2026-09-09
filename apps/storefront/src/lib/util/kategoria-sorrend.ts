/**
 * A NEGY KATEGORIA-NEV ES A SORRENDJUK, EGY HELYEN.
 *
 * Balazs szava, 2026-09-09 09:54: "MIndenhol: Termékek, Halak, Korallok,
 * Gerinctelenek". A "mindenhol" miatt all ez a lista KULON modulban, es nem
 * abban a komponensben, amelyik eloszor hasznalta: ket hely olvassa (a fejlec
 * menuje es a lablec oszlopai), es ha ket masolat allna belole, egy kesobbi
 * sorrend-valtoztatas CSENDBEN csak az egyik helyen menne at.
 *
 * === MIERT NEM SZAMOLT SORREND ===
 *
 * Semmilyen adatbol nem vezetheto le. Meret szerint sem (Korallok 8 termek,
 * Gerinctelenek 27, megis a Korallok all elorebb), es a bolt `rank` mezojebol
 * sem (az Termekek, Gerinctelenek, Halak, Korallok sorrendet ad).
 */
export const KATEGORIA_SORREND = [
  "Termékek",
  "Halak",
  "Korallok",
  "Gerinctelenek",
] as const

/**
 * A NEVEZETT NEGYET ELORE RAKJA, A TOBBIT A VEGEN MEGHAGYJA.
 *
 * === MIERT NEM SZURES, HOLOTT MA UGYANAZT ADNA ===
 *
 * Ma a bolt pontosan ezt a negy nem-ures gyokeret adja (merve 2026-09-09),
 * tehat egy szuro es egy rendezes MA azonos eredmenyu. Nem mindegy viszont,
 * MELYIK IRANYBAN tevedne, ha megsem:
 *
 *   szuressel     egy uj gyoker CSENDBEN eltunne a lablecbol. Senki nem latja.
 *   rendezessel   egy uj gyoker a sor VEGEN jelenik meg. Latszik, es egy
 *                 mondattal eldontheto, hova kerul.
 *
 * A fejlec menuje szandekosan SZUR (ott Balazs negy tetelt kert), a lablec
 * viszont terkep-szerepben all, tehat ott a rejtve marado hiba a dragabb.
 *
 * A rendezes STABIL (a nyelv garantalja), tehat a nevezetteken kivuli elemek
 * abban a sorrendben maradnak, ahogy erkeztek -- ma az a bolt `rank` mezoje.
 */
export const sorrendbeRakva = <T extends { name: string }>(
  kategoriak: T[],
): T[] => {
  const helye = (nev: string) => {
    const i = (KATEGORIA_SORREND as readonly string[]).indexOf(nev)
    return i === -1 ? KATEGORIA_SORREND.length : i
  }

  return [...kategoriak].sort((a, b) => helye(a.name) - helye(b.name))
}
