/** Hany mennyiseget kinalunk legfeljebb. A mai viselkedes, kulon dontes nelkul. */
const LEGFELJEBB_OPCIO = 10

/**
 * MILYEN MENNYISEGEKET KINALHAT A KOSAR EGY SORNAL.
 *
 * === A HIBA, AMIT JAVIT ===
 *
 * A kosar eddig MINDIG 1-tol kinalt, tiz opcioig. A minimalis rendelesi
 * mennyiseget nem olvasta -- azt csak a termeklap ismeri.
 *
 * Merve a TESZT BOLTBAN (2026-09-08, a Store API mind az 1492 termeke):
 * tizennegy termeknek van egynel nagyobb minimuma.
 *
 *   minimum  10   ->  8 termek
 *   minimum 100   ->  5 termek
 *   minimum   5   ->  1 termek
 *
 * A POPULACIO ITT NEM DISZ, mert ugyanerrol a dologrol MASIK szam is all a
 * tarhazban: a `minimum-order-quantity.ts` doksija TIZENHATOT ir (8 / 7 / 1).
 * Mind a ketto igaz, csak mas halmazon kelt -- az a 2026-09-02-i UNAS
 * exporton, ez a teszt Medusan, ami szukebb. Populacio nelkul a kovetkezo
 * olvaso azt hinne, hogy az egyik elavult, es "kijavitana" a masikat.
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
 * === A HARMADIK ARGUMENTUM FELSO HATAR, NEM DARABSZAM (javitva 2026-09-08) ===
 *
 * Az elso valtozatban `maximum = 10` allt, es a torzs DARABSZAMKENT hasznalta:
 * a minimumtol annyi elemet sorolt fel. A regi kodban ugyanez az ertek a lista
 * FELSO HATARA volt (1-tol addig). Minimum 1-nel a ketto egybeesik, tehat a
 * kulonbseg NEM LATSZOTT -- a hivas alakja ugyanaz maradt, a jelentese nem.
 *
 * Amiert ez nem elmeleti: a hivo helyen ott all egy TODO, hogy a valodi
 * keszletet kellene atadni. Ha valaki azt megcsinalja, tizes minimumnal es
 * tizenketto keszletnel a darabszamos olvasat 10-tol 19-ig kinalna -- a keszlet
 * FOLE, csendben. (acrobot mérése, msg_id 14666.)
 *
 * Ezert a harmadik argumentum most FELSO HATAR (`keszlet`), es alapertelmezesben
 * VEGTELEN: ma nem ismerjuk a keszletet, es egy nem ismert korlat ne szukitsen.
 * A tiz opcio korlatja a fuggvenyen BELUL all, konstanskent -- igy a ket korlat
 * nem keverheto ossze, es a szazas minimum tovabbra is elerheto (100-tol 109-ig).
 *
 * === ES AZ ARGUMENTUMOK MOSTANTOL OBJEKTUMBAN JONNEK (2026-09-08) ===
 *
 * A fenti bekezdes egy MERT hibarol szol: a harmadik POZICIONALIS argumentum
 * jelentese csendben megvaltozott (darabszamrol felso hatarra), es a hivas
 * alakja ugyanaz maradt. A lepeskozzel es a rendelesi maximummal ebbol OT
 * pozicionalis argumentum lenne -- ugyanaz a csapda, csak nagyobb.
 *
 * Ezert a fuggveny egyetlen objektumot vesz at. Egy elgepelt vagy felcserelt
 * mezo igy FORDITASI HIBA, nem nemaan mas viselkedes.
 *
 * A ket uj mezo:
 *   lepes              ekkora ugrasokban lehet rendelni (alapertelmezes 1)
 *   rendelesiMaximum   a termek sajat felso hatara, a KESZLETTOL fuggetlenul
 *
 * A ketto kulon all, es ez nem reszletkerdes: a keszlet azt mondja meg,
 * mennyi VAN, a rendelesi maximum azt, hogy mennyit ENGEDUNK. A ket ok
 * kulonbozo, es a szukebb nyer.
 *
 * A tiz opcio korlatja LEPESKOZZEL SZORZODIK: tizes lepesnel a lista 10-tol
 * 100-ig ér, nem 10-tol 19-ig. A lista HOSSZA marad tiz elem -- azt a mai
 * viselkedest nem valtoztatom.
 *
 * A ket korlat egyutt: a lista a minimumtol indul, legfeljebb tiz elem, es
 * SOHA nem megy a keszlet fole. Ha a keszlet a minimum ALATT van, egyetlen
 * rendelheto mennyiseg sincs -- olyankor a lista ures marad, es csak a
 * jelenlegi ertek kerul bele (lasd lentebb).
 *
 * ES A JELENLEGI ERTEK MINDIG BENNE VAN, meg ha a minimum ala esik is. Ez nem
 * engedmeny: ha egy sor valahogy a minimum ala kerult (regi kosar, kesobb
 * valtozott minimum), a legordulo nem mutathat MASt, mint ami a kosarban all.
 * Egy select, ami nem tartalmazza a sajat erteket, uresen vagy hamis erteken
 * jelenik meg -- vagyis a vevo mast latna, mint amit fizet.
 */
export function kosarMennyisegOpciok(input: {
  minimum: number
  jelenlegi: number
  keszlet?: number
  lepes?: number
  rendelesiMaximum?: number | null
}): number[] {
  const { minimum, jelenlegi } = input
  const keszlet = input.keszlet ?? Number.POSITIVE_INFINITY
  const rendelesiMaximum = input.rendelesiMaximum ?? null

  const also = Math.max(1, Math.floor(minimum) || 1)
  const lepes =
    Number.isInteger(input.lepes) && (input.lepes as number) >= 1
      ? (input.lepes as number)
      : 1

  const hatarok = [
    Number.isFinite(keszlet) ? Math.floor(keszlet) : Number.POSITIVE_INFINITY,
    typeof rendelesiMaximum === "number"
      ? rendelesiMaximum
      : Number.POSITIVE_INFINITY,
  ]
  const felso = Math.min(also + (LEGFELJEBB_OPCIO - 1) * lepes, ...hatarok)

  const opciok = new Set<number>()
  for (let ertek = also; ertek <= felso; ertek += lepes) opciok.add(ertek)
  if (Number.isFinite(jelenlegi) && jelenlegi > 0) {
    opciok.add(Math.floor(jelenlegi))
  }
  return Array.from(opciok).sort((a, b) => a - b)
}
