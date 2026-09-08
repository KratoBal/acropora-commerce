/**
 * A KERESES SZOVEGENEK KIOLVASASA A CIM PARAMETEREIBOL.
 *
 * MIERT KULON FAJLBAN, ES NEM AZ UTVONALBAN (merve 2026-09-08): eloszor a
 * `store/page.tsx` fajlban allt, es a rea irt teszt-fajl BE SEM TOLTODOTT --
 * az utvonal szerver-oldali modulokat hoz magaval, es a jsdom elhasal rajta
 * ("This module cannot be imported from a Client Component module").
 *
 * ES AMI EBBOL A DRAGABB TANULSAG: a futtato osszesitoje ettol nem lett piros
 * abban a sorban, amit neztem. A `Tests 6 passed (6)` sor ZOLD volt, mert a
 * hat lefutott teszt tenyleg atment; a hetediket tartalmazo FAJL viszont el sem
 * indult. Azt csak a `Test Files 1 failed` sor mondta meg.
 *
 * Ezert lakik itt: egy tiszta fuggveny, amit barmi importalhat.
 */

/**
 * TOMBBOL AZ ELSO ERTEK, NEM OSSZEFUZVE.
 *
 * A `?q=a&q=b` alak tombot ad. Egy osszefuzott kereses ("ab") NEM hibazna, csak
 * mast keresne -- es a vevo nem tudna, miert nem talalja, amit beirt.
 *
 * A CSUPA SZOKOZ URES KERESES, nem "szokoz" kereses: arra a bolt osszes termeke
 * jon vissza, ami pontosan az, amit a vevo var.
 */
export function keresesSzovege(q?: string | string[]): string | undefined {
  const nyers = Array.isArray(q) ? q[0] : q
  const tisztitott = nyers?.trim()
  return tisztitott ? tisztitott : undefined
}
