/**
 * A TERMEKLAP MEZOI -- ES MIERT KONSTANS, NEM BEIRT SZOVEG A LAPON.
 *
 * A `listProducts` a `fields` erteket a `...queryParams` UTAN teriti szet, tehat
 * egy hivo altal megadott `fields` NEM bovul, hanem FELULIR. Aki a termeklapon
 * egyetlen relaciot akar hozzavenni, csendben elveszi az osszes tobbit.
 *
 * === EZ MEG IS TORTENT, ES MERVE VAN (2026-09-07, staging) ===
 *
 * A lap `fields: "*categories"` erteket adott at. A valasz kulcsai kozott a
 * `metadata` NEM szerepelt. Ugyanaz a termek, ugyanaz a hivas, egyetlen mezo
 * kulonbseggel:
 *
 *   fields=*categories             ->  metadata HIANYZIK
 *   fields=*categories,+metadata   ->  metadata megjon
 *
 * AMI EMIATT NEM MUKODOTT: a lap szintjen szamolt `uniquePieceOf(product.metadata)`
 * MINDIG hamisat adott. Vagyis az egyedi peldany JELVENYE az elso kepen es az
 * alatta allo IGERET soha nem jelent meg, egyetlen WYSIWYG termeken sem.
 *
 * === ES AMIERT EZ NEHEZ VOLT ESZREVENNI ===
 *
 * A `ProductActions` UGYANEZT a jelzot olvassa, es ott JO: azt a terméket a
 * `ProductActionsWrapper` kuldi, sajat lekerdezessel, `fields` felulirasa
 * nelkul. Ugyanaz a fuggveny, ugyanaz a mezo, KET KULONBOZO termek-objektum --
 * az egyik ismerte a jelzot, a masik nem. A harom keszlet-allapot es a
 * valaszto-elnyomas ezert vegig helyesen mukodott, mikozben a jelveny nem.
 *
 * Egy lap tehat nem egy termek-objektumot lat, hanem tobbet, kulonbozo
 * mezokeszlettel. Amit egy komponens megkap, az attol fugg, KI kerdezte le.
 *
 * === A KET RESZ, ES MI TORIK EL NELKULE ===
 *
 *   *categories   a kirakat sotet-vilagos valtoja (`vilagaTermeknek`) ebbol
 *                 dolgozik, `mpath`-tal egyutt. A `+categories` alak URESET ad,
 *                 es akkor MINDEN termek a muszaki vazat kapja.
 *   +metadata     az `unique_piece` jelzo, es rajta a jelveny, az igeret es az
 *                 "Eladva" allapot.
 */
/**
 * === ES AZ OT MEZO, AMIT A FELULIRAS ELEJTETT (2026-09-08) ===
 *
 * A fenti szabaly ("a hivo fields-e felulir") nem csak a `metadata`-t erinti: a
 * `listProducts` sajat alapertelmezese OT dolgot ker, es a lap MIND AZ OTOT
 * elejtette, amikor sajat `fields` erteket adott at:
 *
 *   *variants.calculated_price     a szamolt ar
 *   +variants.inventory_quantity   a keszlet szama
 *   *variants.images               a valtozathoz kotott kepek
 *   *variants.options              a valtozat opcioi
 *   +tags                          a cimkek
 *
 * A `calculated_price` volt koztuk a leglathatobb, es EMIATT maradt a lapon egy
 * MASODIK lekerdezes (`VasarlasKeret`), ami a teljes alapertelmezessel kerdez
 * ujra. A nev ("real time pricing") felrevezet: nem frissesseget vedett -- mind
 * a ket hivas ugyanaz a `listProducts`, ugyanazzal a `force-cache` beallitassal
 * es ugyanazzal a cimkevel, egy statikusan general utvonalon.
 *
 * ES EGY KOVETKEZMENY, AMI MA MEG ARTALMATLAN: a lap `getImagesForVariant`
 * fuggvenye a `variant.images` mezobol szur, es azt a feluliras elejtette --
 * ma a HELYES eredmenyt adja, mert minden termeknek pontosan egy valtozata van.
 * Az elso TOBBVALTOZATOS terméknel viszont a szures csendben nem tortenne meg.
 *
 * AMIERT MIND AZ OT VISSZAKERUL, ES NEM CSAK AZ AR: ha egy kimarad, a hiba
 * NEMA -- egy mezo, amit senki nem ker, ugyanugy nez ki, mint egy mezo, ami
 * ures. (acrobot dontese, msg_id 14740.)
 *
 * A MERET NEM ELLENERV ITT: ez EGY termek lekerdezese, nem lista. A korabban
 * mert meret-kockazat (`*products` 19 sornal rendben, 1492-nel 4,1 MB) a
 * KOLLEKCIOS lekerdezesekre all, ahol sorszorzo van; itt nincs.
 *
 * ES AMI SZANDEKOSAN NEM VALTOZIK EBBEN A KORBEN: a masodik lekerdezes MARAD.
 * A mezok visszaadasaval elhagyhatova valik, de az mar viselkedes-valtozas,
 * sajat meressel -- ket dolog egy korben azt jelentene, hogy egy hiba eseten
 * nem tudjuk, melyiktol.
 */
export const TERMEKLAP_FIELDS =
  "*categories,+metadata," +
  "*variants.calculated_price,+variants.inventory_quantity," +
  "*variants.images,*variants.options,+tags"

/**
 * A ket resz kulon is megnevezve, hogy az allitasok NE a teljes sztringet
 * hasonlitsak. Egy betu szerinti egyezes akkor is zold maradna, ha a sorrend
 * valtozik, es akkor is pirosodna, ha valaki egy HARMADIK, artalmatlan mezot
 * vesz fel.
 */
export const TERMEKLAP_MEZO_KATEGORIAK = "*categories"
export const TERMEKLAP_MEZO_METAADAT = "+metadata"

/**
 * A `listProducts` alapertelmezesenek ot mezoje, kulon nevesitve. Azert
 * egyesevel, es nem egy sztringkent, hogy egy allitas MEGNEVEZHESSE, melyik
 * hianyzik -- egy teljes-sztring osszevetes csak annyit mondana, hogy "nem
 * egyezik".
 */
export const TERMEKLAP_ALAPMEZOK = [
  "*variants.calculated_price",
  "+variants.inventory_quantity",
  "*variants.images",
  "*variants.options",
  "+tags",
] as const
