/**
 * AZ ORSZAGKOD NELKULI UT ATIRANYITASANAK KODJA (SEO frontend roadmap FE-6,
 * Balazs 2026-10-07).
 *
 * Egy 301-et a bongeszo es a Google VEGLEG megjegyez: a regi cim helyett
 * onnantol a celt hasznalja, es a link-ertek is oda kerul. Ez csak akkor
 * helyes, ha a cel MINDEN latogatonak ugyanaz, ES a cel egy letezo lap.
 *
 * 1. A CEL MINDENKINEK UGYANAZ. A middleware a celt latogatonkent is valaszthatja
 *    (Cloudflare vagy Vercel orszag-fejlec, ha az orszag a regio-terkepben van).
 *    Amig a terkepben EGYETLEN orszag all, a cel mindenkinek ugyanaz. Ha egyszer
 *    tobb orszag lesz, a cel latogatofuggo: akkor marad az ideiglenes 307.
 *    Merve 2026-10-07: a teszt Medusa egyetlen regioja a Hungary, egy orszaggal (hu).
 *
 * 2. A CEL EGY LETEZO LAP. A middleware MINDEN orszag nelkuli utat atiranyit, a
 *    rossz vagy ismeretlen orszagkodut is: a `/de/termek` cele `/hu/de/termek`,
 *    ami nem letezik. Ezt vegleg megjegyeztetni a keresovel hiba (barracuda
 *    atvetele, #518). Ezert 301 csak a gyoker (`/`) es azok az utak kapnak,
 *    amelyek elso szakasza a kirakat egy ISMERT lap-szakasza (`ISMERT_LAP_SZAKASZOK`);
 *    minden mas marad 307. A lista a `app/[countryCode]` alatti mappakbol all,
 *    es a spec a fajlrendszerhez meri: egy uj lap-mappa nev szerint pirosit.
 */
export const ISMERT_LAP_SZAKASZOK = [
  "account",
  "cart",
  "categories",
  "checkout",
  "collections",
  "hamarosan",
  "jogi",
  "order",
  "products",
  "rendeles-fizetese",
  "store",
  "verify-account",
] as const

export function orszagAtiranyitasKod(
  orszagokSzama: number,
  pathname: string,
): 301 | 307 {
  if (orszagokSzama !== 1) return 307
  if (pathname === "/") return 301
  const elso = pathname.split("/")[1] ?? ""
  return (ISMERT_LAP_SZAKASZOK as readonly string[]).includes(elso) ? 301 : 307
}
