/**
 * SZOL A VEVONEK, HA A TALALATI LISTA LE VAN VAGVA.
 *
 * === A MERT HIBA ===
 *
 * A vegpont felso hatara 200 azonosito, es a valasz KIMONDJA, ha levagta a
 * listat (`csonkolt`). Csak epp a kirakatban SENKI nem olvasta: merve az
 * origin/main-en (bca990c), a mezo a tipusban all es harom helyen visszaterul,
 * de egyetlen komponens sem hivatkozik ra.
 *
 * A kitelepitett vegponton `szuro` -> 200 talalat, `csonkolt=true`. A vevo
 * tehat 200 terméket latott, es SEMMI nem mondta meg neki, hogy van meg. Egy
 * levagott lista pontosan ugy nez ki, mint egy kisebb keszlet, es a vevo azt
 * olvassa ki belole, hogy ennyink van. A szam nem hibas, hanem HAZUDIK.
 *
 * Egy jelzes, ami sehova nem er el, ugyanaz, mint a hianya.
 *
 * === A SZAM A VALASZBOL JON, NEM BEEGETVE ===
 *
 * A `darab` a vegpont `count` mezoje, ami csonkolaskor PONTOSAN a felso hatar.
 * A 200-at KIIRNI ide hiba lenne: a hatar a backenden all (`FELSO_HATAR`), es
 * egy masodik helyre irt szam attol a naptol hazudik, amikor az elsot
 * atallitjak -- es senki nem venne eszre, mert a lap ettol meg megjelenik.
 *
 * === A DONTES IS ITT VAN, NEM A LAPON ===
 *
 * A komponens `csonkolt=false` eseten `null`-t ad. Igy a "mikor latszik"
 * kerdes jsdom alatt MERHETO; a lapon (`paginated-products.tsx`) hagyva csak a
 * forras szovegere lehetne allitast irni, mert az a fajl `server-only`
 * adatreteget importal.
 */
export function KeresesCsonkolt({
  csonkolt,
  darab,
}: {
  csonkolt: boolean
  darab: number
}) {
  if (!csonkolt) return null

  return (
    <p
      className="text-base-regular text-ui-fg-subtle mb-4"
      data-testid="kereses-csonkolt"
    >
      Több mint {darab} termék illik erre a keresésre, itt az első {darab}{" "}
      látszik. Pontosítsd a keresést, ha nem találod, amit keresel.
    </p>
  )
}

export default KeresesCsonkolt
