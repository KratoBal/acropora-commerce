/**
 * A KATEGORIA-LAP KANONIKUS CIME -- ES MIERT NEM ELEG A KATEGORIA-SZEGMENS.
 *
 * MERVE 2026-09-10, a fo agon (e943d82c). A lap `generateMetadata` fuggvenye
 * ezt adta:
 *
 *     canonical: `${params.category.join("/")}`
 *
 * A `metadataBase` BE VAN ALLITVA (`app/layout.tsx` es a `[countryCode]`
 * layout, mindketto `new URL(getBaseURL())`), tehat a Next.js a relativ
 * erteket FELOLDJA. A baj nem a relativsag:
 *
 *     a lap valodi utja      /{countryCode}/categories/{...category}
 *     a canonical feloldva   /{...category}
 *
 * Vagyis a `/{countryCode}/categories/` ELOTAG hianyzik, es a kanonikus cim egy
 * olyan lapra mutat, ami nem letezik -- ezert ad 404-et.
 *
 * === A SZEGMENSEK KODOLVA MARADNAK, ES EZ SZANDEKOS ===
 *
 * A `params.category` MAR KODOLT szegmenseket tart (a `decode-handle-param.ts`
 * fejlece meri es mondja ki: `term%C3%A9kek` alakban erkezik). Egy URL-ben ez a
 * HELYES alak, tehat ez a fuggveny NEM dekodol es nem is kodol ujra -- csak
 * osszefuz. Aki ide dekodolast tesz, ugyanazt a hibat hozza vissza, amit a
 * ketszeres kodolas javitasa (2026-09-07) megszuntetett.
 *
 * === A TOBBSZEGMENSU ALAK MA NEM ALL ELO (merve 2026-09-10, nautilus) ===
 *
 * A kategoria-utak a stage bolton EGYSZEGMENSUEK: a handle mar magaban hordozza
 * a lancot (`aquaforest---korallt%C3%A1pok`), es a morzsamenu is EGYETLEN
 * handle-lel linkel (`product-breadcrumb/index.tsx`). Merve harom valodi
 * kiszolgalt lapon: `/hu/categories/korallok`, `/hu/categories/term%C3%A9kek` es
 * `/hu/categories/aquaforest---korallt%C3%A1pok` mind 200-at ad, a tobbszegmensu
 * `/hu/categories/term%C3%A9kek/eledelek---term%C3%A9kek` pedig 404-et.
 *
 * A `join("/")` tehat ma egy NEM LETEZO esetet kezel. Ez nem hiba, es nem is kell
 * kivenni -- de aki ezt a sort olvassa, kulonben azt hinne, hogy a tobbszintu ut
 * letezik, es arra epitene.
 *
 * === A HATOKORE ===
 *
 * CSAK a kategoria-lap cimet adja. A `robots` fejlec es a kereso-lathatosag
 * kiszolgalo szinten dol el (kulon kartya), a lap CIME pedig szandekosan a
 * teljes nevet viseli -- azt ez a fuggveny nem erinti.
 */
export function kategoriaCanonical(
  countryCode: string,
  categorySegments: readonly string[],
): string {
  const ut = categorySegments.join("/")
  return `/${countryCode}/categories/${ut}`
}
