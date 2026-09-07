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
export const TERMEKLAP_FIELDS = "*categories,+metadata"

/**
 * A ket resz kulon is megnevezve, hogy az allitasok NE a teljes sztringet
 * hasonlitsak. Egy betu szerinti egyezes akkor is zold maradna, ha a sorrend
 * valtozik, es akkor is pirosodna, ha valaki egy HARMADIK, artalmatlan mezot
 * vesz fel.
 */
export const TERMEKLAP_MEZO_KATEGORIAK = "*categories"
export const TERMEKLAP_MEZO_METAADAT = "+metadata"
