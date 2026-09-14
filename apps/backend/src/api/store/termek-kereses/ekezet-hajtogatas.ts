/**
 * EKEZET-HAJTOGATAS A KERESESHEZ.
 *
 * === A MERT HIBA (576d6250) ===
 *
 * A kirakat keresoje a Medusa `q` parameteret hasznalja, abbol pedig a mag
 * `oszlop ILIKE '%token%'` feltetelt epit (merve a csomagban:
 * `@medusajs/utils/dist/dal/mikro-orm/mikro-orm-free-text-search-filter.js`).
 * A Postgres ILIKE a kis- es nagybetut osszevonja, az EKEZETET NEM. Merve a
 * kiszolgalt lapon, 2026-09-14, harom parral es ket kontrollal:
 *
 *     lehabzó     61-72 talalat        lehabzo     0
 *     világítás   73-84                vilagitas   0
 *     szűrő      241-252               szuro       4
 *     quantum      9  POZITIV KONTROLL (ekezet nelkuli szo, TALAL)
 *     zzzzqqqqxxxx 0  NEGATIV KONTROLL (nem letezo szo, NEM talal)
 *
 * A `szuro` NEGY talalata a lenyeges reszlet: az ekezet nelkuli keresés nem
 * "semmit nem talal", hanem CSAK azt, ami a katalogusban maga is ekezet nelkul
 * all.
 *
 * === MIERT A TAROLT OLDALT IS HAJTOGATNI KELL ===
 *
 * Az adat ekezetes, a vevo ekezet nelkul gepel. Ha CSAK a kerdesrol szednenk le
 * az ekezetet, az ekezetes keresesek vesznenek el -- vagyis kevesebbet
 * talalnank, nem tobbet. Ezert MIND A KET oldal ugyanarra az alakra megy.
 *
 * === MIERT `translate()`, ES NEM `unaccent` ===
 *
 * A `translate()` a Postgres BEEPITETT fuggvenye: nem kell hozza bovitmeny,
 * telepites, verzio-egyeztetes. Az `unaccent` altalanosabb (minden nyelvre),
 * de kiterjesztes -- es egy uj fuggoseg mas merlegelest kivanna, mint egy
 * beepitett fuggveny. A bolt magyar, a keszlet ismert.
 */

/**
 * A MAGYAR EKEZETES BETUK ES A HAJTOGATOTT PARJUK.
 *
 * A KET SZTRING HOSSZA KOTELEZOEN EGYEZIK, es allitas is all ra: a Postgres
 * `translate()` POZICIO szerint parositja oket. Egy eltevedt betu nem hibazna,
 * csak MAST hajtogatna -- es a kulonbseg csendben rossz talalatokat adna.
 *
 * A NAGYBETUS ALAK IS KELL, mert a hajtogatas a `lower()` UTAN fut ugyan, de a
 * fuggvenyt onmagaban is hasznaljuk (a kerdes oldalan, JavaScriptben), es ott
 * nincs `lower()`.
 */
export const EKEZETES = "áéíóöőúüűÁÉÍÓÖŐÚÜŰ";
export const HAJTOGATOTT = "aeiooouuuAEIOOOUUU";

/** A kerdes oldalan: ugyanaz a hajtogatas, JavaScriptben. */
export function hajtogat(szoveg: string): string {
  let ki = "";
  for (const betu of szoveg.toLowerCase()) {
    const hely = EKEZETES.indexOf(betu);
    ki += hely === -1 ? betu : HAJTOGATOTT[hely];
  }
  return ki;
}

/**
 * A KERESETT SZAVAK. A Medusa `q` szokozok menten bont, es a szavakat ES-sel
 * koti ossze -- ezt kovetjuk, kulonben a mai viselkedes CSENDBEN megvaltozna.
 */
export function szavakra(kifejezes: string): string[] {
  return kifejezes.trim().split(/\s+/).filter(Boolean).map(hajtogat);
}

/** Egy oszlop hajtogatott alakja SQL-ben. A nevet a HIVO adja, nem a felhasznalo. */
export function oszlopHajtogatva(oszlop: string): string {
  return `translate(lower(${oszlop}), '${EKEZETES}', '${HAJTOGATOTT}')`;
}
