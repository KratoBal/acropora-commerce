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
 * A lista MA KET elemu, es egyik sem letezo fajlt ved: UTAT TART SZABADON. A kirakat
 * `public/` mappajaban egyetlen gyoker szintu fajl all (`favicon.ico`), es azt a
 * middleware matchere NEVVEL mar kizarja.
 *
 * === ES AMIERT EZ NEM FUGG A ROBOTSTOL ===
 *
 * Ha a `/robots.txt` MA nem letezik, ugyanugy viselkedik, mint eddig. Ha egyszer
 * letezni fog, az utja MAR szabad -- ehhez a fajlhoz nem kell hozzanyulni.
 *
 * UJ BEJEGYZES CSAK AKKOR KERUL IDE, amikor egy gyoker szintu statikus fajlt
 * TENYLEGESEN kiszolgalunk. Talalgatasbol bovitve a lista visszahozza a soft-404-et,
 * csak szukebben.
 */
export const STATIKUS_GYOKER_UTAK = ["/robots.txt", "/sitemap.xml"] as const

export function statikusGyokerUt(pathname: string): boolean {
  return (STATIKUS_GYOKER_UTAK as readonly string[]).includes(pathname)
}
