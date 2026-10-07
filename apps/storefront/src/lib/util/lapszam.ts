/**
 * LETEZIK-E A LAPSZAM (FE-7 3. resz, barracuda elozetes review, 2. lelet).
 *
 * A `?page=N` a `_p/N` belso utra megy, ami ISR: minden uj N egy uj
 * gyorsitotar-bejegyzes. Az utolso lap utani lapszam eddig ures listat adott
 * 200-zal es sajat canonicallal: soft 404, amit a kereso indexelhet, es amivel
 * a tar kivulrol tolthato. Ilyenkor a lap `notFound()`-ot ad.
 *
 * A HELYE A LAP TORZSE, NEM A LISTA: a lista `Suspense` alatt all, es ott a
 * `notFound()` mar a kiszolgalt 200-as valaszba kerul (merve 2026-10-07, Next
 * 15.5.24 probaepites: 200, `x-nextjs-cache: HIT`, a not-found tartalommal).
 *
 * Az 1. lap mindig letezik, ures listaval is: az a lap maga, nem egy lapszam.
 */
export function lapszamLetezik(
  lap: number,
  darab: number,
  meret: number,
): boolean {
  if (!Number.isInteger(lap) || lap < 1) return false
  return lap <= Math.max(1, Math.ceil(darab / meret))
}

/** A lapozott (`_p`) keres: CSAK lapszam, szuro nelkul. A szurt lap dinamikus, ott nem ellenorzunk. */
export function csakLapszam(
  keres: Record<string, string | string[] | undefined>,
): number | null {
  const kulcsok = Object.keys(keres).filter((k) => keres[k] !== undefined)
  if (kulcsok.length !== 1 || kulcsok[0] !== "page") return null
  const lap = Number(keres.page)
  return Number.isInteger(lap) && lap > 1 ? lap : null
}
