/**
 * A GALERIA NAGY KEPENEK ALT-JA (Balazs 2026-10-07, 5. pont; barracuda atvetele,
 * #519).
 *
 * Itt korabban az allando `Termékfotó` allt, ami a dontesben szo szerint tiltott
 * generikus alt. A termek neve all a helyen; tobb kepnel a masodiktol a sorszam
 * is, hogy a felolvaso ne olvassa fel ugyanazt a nevet ketszer ugyanugy.
 * Nev nelkul `""`: inkabb diszito kep, mint egy szo, ami semmit nem mond.
 */
export function galeriaAlt(
  nev: string | null | undefined,
  index: number,
  darab: number,
): string {
  const tiszta = (nev ?? "").trim()
  if (!tiszta) return ""
  return darab > 1 && index > 0 ? `${tiszta} (${index + 1}. kép)` : tiszta
}
