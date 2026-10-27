/**
 * A TERMEK MARKAJA A JSON-LD-BEN ES A FEEDBEN UGYANAZ (audit S4).
 *
 * A sorrend a Merchant feedé (`merchant-feed-item.ts`: `context.brands[id] ??
 * product.collection?.title?.trim()`): ELSO a marka-modul neve, ha az nincs
 * vagy ures, a gyujtemeny cime (szokozok nelkul), ha az sincs, nincs marka. A
 * ket hely ket kodbazis (a hatter es a kirakat nem importalja egymast), ezert
 * a szabaly itt is, ott is ki van mondva, es mindket oldalon teszt orzi.
 */
export function markaNev(
  modulNev: string | null | undefined,
  gyujtemenyCim: string | null | undefined,
): string | null {
  const modul = modulNev?.trim()
  if (modul) return modul
  const gyujtemeny = gyujtemenyCim?.trim()
  return gyujtemeny ? gyujtemeny : null
}
