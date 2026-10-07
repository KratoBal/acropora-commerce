/**
 * A GENERIKUS ALT-SZOVEGEK (Balazs 2026-10-07, 5. pont): a `Thumbnail` es a
 * `Termékfotó` nev szerint, plusz ami ugyanigy semmit nem mond a keprol. A
 * szabaly NEM az, hogy minden `alt` legyen nem ures: a dekorativ kep `alt=""`-t
 * kaphat; a termekkep a termek nevet viseli.
 *
 * Egy helyen all: a forras-orzo (`oldal-szerkezet.spec.ts`) es a renderelt HTML
 * szerzodese (FE-8) is ezt hasznalja.
 */
export const GENERIKUS_ALT: readonly RegExp[] = [
  /^thumbnail$/i,
  /^term[eé]kfot[oó]$/i,
  /^term[eé]kk[eé]p$/i,
  /^(k[eé]p|fot[oó]|image|photo|picture|img)( \d+)?$/i,
  /^product image( \d+)?$/i,
  /^placeholder$/i,
  /\.(jpe?g|png|webp|gif|avif|svg)$/i,
]

export function generikusAlt(alt: string): boolean {
  return GENERIKUS_ALT.some((m) => m.test(alt.trim()))
}
