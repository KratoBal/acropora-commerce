/**
 * AZ ORSZAGKOD NELKULI UT ATIRANYITASANAK KODJA (SEO frontend roadmap FE-6,
 * Balazs 2026-10-07).
 *
 * Egy 301-et a bongeszo es a Google VEGLEG megjegyez: a regi cim helyett
 * onnantol a celt hasznalja, es a link-ertek is oda kerul. Ez csak akkor
 * helyes, ha a cel MINDEN latogatonak ugyanaz.
 *
 * A middleware a celt latogatonkent is valaszthatja (Cloudflare vagy Vercel
 * orszag-fejlec, ha az orszag a regio-terkepben van). Amig a terkepben EGYETLEN
 * orszag all, a cel mindenkinek ugyanaz, tehat 301. Ha egyszer tobb orszag lesz,
 * a cel latogatofuggo, es egy vegleges atiranyitas a kovetkezo latogatot rossz
 * orszagba kuldene: akkor marad az ideiglenes 307.
 *
 * Merve 2026-10-07: a teszt Medusa egyetlen regioja a Hungary, egy orszaggal (hu).
 */
export function orszagAtiranyitasKod(orszagokSzama: number): 301 | 307 {
  return orszagokSzama === 1 ? 301 : 307
}
