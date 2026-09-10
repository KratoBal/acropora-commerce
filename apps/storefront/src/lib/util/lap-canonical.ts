/**
 * A TERMEKLAP, A STORE-LAP ES A FOOLDAL KANONIKUS CIME.
 *
 * A kategoria-lape kulon fajlban all (`kategoria-canonical.ts`), mert az egy
 * MERT HIBA javitasa volt (a canonical egy nem letezo lapra mutatott). Ez a
 * HAROM UJ: ezeknek a lapoknak soha nem volt canonicaljuk.
 *
 * (A fooldal 2026-09-10-en kerult ide, a masik ketto utan. A fenti mondat
 * addig "ez a ketto"-t mondott -- egy szam, ami a sajat fajljaban avult el.)
 *
 * === MIT OLD MEG, ES MIT NEM (merve 2026-09-10 a stage bolton) ===
 *
 * Vegigmertem, mi eri el ugyanazt a tartalmat tobb cimen:
 *
 *     /products/<handle>            ATIRANYIT a /hu/... alakra
 *     /hu/products/<handle>/        ATIRANYIT
 *     /HU/products/<handle>         404
 *     /                             ATIRANYIT a /hu-ra
 *     ?fbclid= ?gclid= ?utm_source= ?ref=    200, UGYANAZ a tartalom, MAS cim
 *
 * Vagyis a canonical EGY dolgot old meg, amit ma semmi mas: a kovetesi
 * parameteres cimeket. Minden mas alakot atiranyitas kezel.
 *
 * Ez nem elmeleti: a bolt Facebook-hirdeteseket futtat, es minden
 * hirdetes-kattintas `?fbclid=...` alaku cimre erkezik.
 *
 * === A HANDLE KODOLVA MARAD, ES EZ A LENYEG ===
 *
 * A termeklap `generateMetadata` fuggvenye DEKODOLJA a handle-t az API-hivashoz
 * (`decodeHandleParam`). A CANONICALHOZ a NYERS, kodolt alak kell -- ugyanaz a
 * szabaly, amit a kategoria-canonical fejlece mond ki: aki ide dekodolast tesz,
 * visszahozza a ketszeres kodolas hibajat (2026-09-07). Ezert ez a fuggveny a
 * `params.handle` erteket kapja, nem a dekodoltat.
 *
 * Merve: letezik ekezetes handle
 * (`nyos-reef-putty-200g-k%C3%A9tkomponens%C5%B1-korall-ragaszt%C3%B3-fekete`).
 */
export function termeklapCanonical(
  countryCode: string,
  handle: string,
): string {
  return `/${countryCode}/products/${handle}`
}

/**
 * A STORE-LAP KANONIKUS CIME.
 *
 * === EGY ITELET VAN BENNE, ES KIMONDOM, HOGY AZ ===
 *
 * A store-lap NEGY fajta query-parametert ismer: `page`, `sortBy`,
 * `optionValueIds` es `q`. A kerdes az, melyik marad benne a kanonikus cimben.
 *
 *     page       BENNE MARAD, ha nagyobb mint 1
 *     sortBy     kimarad
 *     optionValueIds  kimarad
 *     q          kimarad
 *
 * A `page` azert marad, mert a lapozott oldalak MAS termekeket mutatnak. Ha a
 * 2. lap az elsore mutatna kanonikusan, azt allitanank, hogy a rajta allo
 * termekek maskepp is elerhetok -- holott nem. (A rel=next/prev jelolest a
 * Google 2019-ben elejtette, es azota a lapozott lapok SAJAT MAGUKRA mutatnak.)
 *
 * A masik harom kimarad, mert azok ugyanazt a keszletet RENDEZIK vagy SZURIK:
 * a mogottuk allo termekek a szuretlen lapon is elerhetok.
 *
 * EZ ITELET, NEM MERES. Ha valaki maskepp donti el (peldaul hogy a lapozott
 * lapok se legyenek kulon kanonikusak), az ervelheto, es akkor ez a bekezdes
 * valtozik. Amit NEM szabad: eldonteni ugy, hogy a dontes nem latszik.
 */
export function storeCanonical(
  countryCode: string,
  oldal?: number | null,
): string {
  const alap = `/${countryCode}/store`
  return oldal && oldal > 1 ? `${alap}?page=${oldal}` : alap
}

/**
 * A FOOLDAL KANONIKUS CIME.
 *
 * A LEGEGYSZERUBB A HAROM KOZUL, ES EPP EZERT KELL ODAIRNI, MIERT KELL EGYALTALAN.
 *
 * A fooldalnak nincs se lapozasa, se szuroje, tehat nincs mit eldonteni benne.
 * Egyetlen duplikalo alak marad, ugyanaz, mint a masik ket lapnal: a kovetesi
 * parameteres cim.
 *
 * MERVE 2026-09-10, a stage bolton, negy alakon:
 *
 *     /hu                    200,  0 atiranyitas
 *     /hu?fbclid=abc123      200,  0 atiranyitas   <- EZ a duplikatum
 *     /hu/                   200,  1 atiranyitas a /hu-ra
 *     /                      200,  1 atiranyitas a /hu-ra
 *
 * Vagyis a per-jeles es az orszagkod nelkuli alakot atiranyitas kezeli, a
 * kovetesi parameterest semmi. A bolt Facebook-hirdeteseket futtat, es minden
 * hirdetes-kattintas `?fbclid=...` alaku cimre erkezik -- a fooldalra is.
 */
export function fooldalCanonical(countryCode: string): string {
  return `/${countryCode}`
}
