/**
 * MILYEN MENNYISEGEKET KINALHAT A KOSAR EGY SORNAL.
 *
 * === A HIBA, AMIT JAVIT ===
 *
 * A kosar eddig MINDIG 1-tol kinalt, tiz opcioig. A minimalis rendelesi
 * mennyiseget nem olvasta -- azt csak a termeklap ismeri.
 *
 * Merve a boltban (2026-09-08, mind az 1492 termek): tizennegy termeknek van
 * egynel nagyobb minimuma.
 *
 *   minimum  10   ->  8 termek
 *   minimum 100   ->  5 termek
 *   minimum   5   ->  1 termek
 *
 * Ket kulon baj kovetkezett belole, es a masodik a sulyosabb:
 *
 *   1. a vevo a kosarban a minimum ALA vihette a mennyiseget
 *   2. szazas minimumnal a lista tizig ert, tehat a helyes erteket EL SEM
 *      TUDTA ERNI
 *
 * === MIERT TIZ OPCIO, ES MIERT A MINIMUMTOL ===
 *
 * A tiz a mai viselkedes, es nem nyulok hozza: ez a javitas a KEZDOPONTOT
 * mozditja, nem a lista hosszat. Egy hosszabb lista kulon dontes lenne.
 *
 * ES A JELENLEGI ERTEK MINDIG BENNE VAN, meg ha a minimum ala esik is. Ez nem
 * engedmeny: ha egy sor valahogy a minimum ala kerult (regi kosar, kesobb
 * valtozott minimum), a legordulo nem mutathat MASt, mint ami a kosarban all.
 * Egy select, ami nem tartalmazza a sajat erteket, uresen vagy hamis erteken
 * jelenik meg -- vagyis a vevo mast latna, mint amit fizet.
 */
export function kosarMennyisegOpciok(
  minimum: number,
  jelenlegi: number,
  maximum = 10,
): number[] {
  const also = Math.max(1, Math.floor(minimum) || 1);
  const darab = Math.max(1, Math.floor(maximum) || 1);

  const opciok = new Set<number>();
  for (let i = 0; i < darab; i += 1) opciok.add(also + i);
  if (Number.isFinite(jelenlegi) && jelenlegi > 0) {
    opciok.add(Math.floor(jelenlegi));
  }
  return Array.from(opciok).sort((a, b) => a - b);
}
