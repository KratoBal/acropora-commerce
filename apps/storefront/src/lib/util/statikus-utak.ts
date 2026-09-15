/**
 * MEGKERULI-E EZ AZ UT AZ ORSZAGKOD-ATIRANYITAST?
 *
 * KULON FAJLBAN ALL, ES EZ NEM IZLES: a `middleware.ts` a `next/server` modult
 * importalja, tehat a benne allo dontes csak a Next futasidejevel egyutt merheto.
 * Onallo fuggvenykent viszont egysegtesztelheto -- ugyanaz a lepes, amit a repo
 * mashol is hasznal, amikor egy dontes nem merheto ott, ahol all.
 *
 * === MI DONT, ES MIERT NEVESITETT LISTA ===
 *
 * Korabban a middleware-ben `pathname.includes(".")` allt: MINDEN pontot tartalmazo
 * ut megkerulte az atiranyitast. A mellekhatasa SOFT-404 volt -- egy `/barmi.txt`
 * alaku cim 200-at adott a not-found lap torzsevel, es egy kereso ervenyes lapnak
 * lathatta. (barracuda es nautilus merese, 2026-09-10.)
 *
 * === ES A LISTA SAJAT SZABALYA, AMIT MAGA SERTETT MEG ===
 *
 * Itt allt, hogy "uj bejegyzes csak akkor kerul ide, amikor egy gyoker szintu
 * statikus fajlt TENYLEGESEN kiszolgalunk -- talalgatasbol bovitve a lista
 * visszahozza a soft-404-et, csak szukebben". A `/sitemap.xml` epp igy kerult be:
 * egy MEG MEG NEM LETEZO sitemap utjat tartotta szabadon.
 *
 * ES A JOSLAT BETELJESULT. Merve az elo teszt-kirakaton (2026-09-15):
 *
 *     /hu               200   121 219   <title>Acropora    <- ismert pozitiv kontroll
 *     /a.b              307             -> /hu/a.b -> rendes 404
 *     /nincs.txt        307             -> ugyanaz
 *     /hu/nincs.txt     404    11 465   <title>404
 *     /sitemap.xml      200    69 957   <title>Acropora    <- SOFT-404, MA IS
 *
 * A harom megnevezett cim kozul kettо meggyogyult, a harmadik NEM: a
 * `/sitemap.xml` szabad utat kapott, sitemap viszont nincs mogotte (az
 * `app/` alatt csak `robots.ts` all), tehat a kirakat egy RENDES LAPOT ad ra
 * 200-zal. Egy keresonek ez nem hianyzo sitemap, hanem egy HTML sitemap.
 *
 * Ezert a lista MA EGY elemu, es a `/robots.txt` azert maradhat, mert
 * `app/robots.ts` tenylegesen kiszolgalja.
 *
 * A SZABALY PEDIG MOSTANTOL NEM CSAK LE VAN IRVA: a `statikus-utak.spec.ts`
 * minden bejegyzeshez megkoveteli a kiszolgalo forrast. Egy szabaly, aminek
 * nincs eszkoze, megnyugtat -- es epp ez a bejegyzes mutatta meg, hogy kevés.
 */
export const STATIKUS_GYOKER_UTAK = ["/robots.txt"] as const

export function statikusGyokerUt(pathname: string): boolean {
  return (STATIKUS_GYOKER_UTAK as readonly string[]).includes(pathname)
}
