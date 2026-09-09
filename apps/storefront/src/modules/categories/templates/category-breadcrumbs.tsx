import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"

import { rovidNevekLancban } from "@lib/util/kategoria-fa"

/**
 * A KATEGORIA-LAP MORZSAMENUJE -- KULON FAJLBAN, HOGY MERHETO LEGYEN.
 *
 * === MIERT KELLETT KIEMELNI ===
 *
 * A lap-szintu `templates/index.tsx` `server-only` kodot huz be (az
 * adatlekero gyerekein at), tehat jsdom alatt NEM importalhato -- ezt megmertem:
 * "This module cannot be imported from a Client Component module."
 *
 * A morzsamenu viszont TISZTA megjelenites: egy kategoria-lancot kap, es nevek
 * jonnek ki belole. Kulon fajlban all, tehat renderelheto -- es a rovid nev
 * ezzel VISELKEDESKENT merheto, nem forras-szovegkent.
 *
 * Ugyanaz a lepes, mint amit ma a kep-blokknal es a kosar-gombnal tettunk: ha
 * a kod egy renderelheto helyre kerul, az allitas is oda kerul.
 */
export function Breadcrumbs({
  category,
}: {
  category: HttpTypes.StoreProductCategory
}) {
  const parents: HttpTypes.StoreProductCategory[] = []
  let current = category.parent_category

  while (current) {
    parents.unshift(current)
    current = current.parent_category
  }

  /*
    A ROVID NEVEK, A TELJES LANCON.

    A bolt neveiben a szulo neve is ott all (`SPS - Korallok`). A morzsamenu a
    ROVID nevet mutatja (#315), es acrobot dontese szerint a kategoria-lap
    KOVETI -- a ketto szetvalasztasa lenne az uj dontes, nem az egyutt-mozgas.

    Az erv, ami eldontotte: ha a link felirata elter attol, amit a latogato a
    megnyitott lapon lat, a vevo nem tudja eldonteni, ugyanoda jutott-e. Ez
    hiba, nem stilus.

    LANCBAN szamolunk, nem elemenkent: minden szint rovid neve a SZULO ROVID
    nevetol fugg.
  */
  const lanc = [...parents, category]
  const rovidek = rovidNevekLancban(lanc)

  return (
    <nav aria-label="Morzsamenü" className="mb-6 text-sm">
      <ol
        className="flex flex-wrap gap-2"
        style={{ color: "var(--terv-szoveg-halvany)" }}
      >
        {parents.map((parent, index) => (
          <li key={parent.id} className="flex gap-2">
            <LocalizedClientLink href={`/categories/${parent.handle}`}>
              {rovidek[index]}
            </LocalizedClientLink>
            <span aria-hidden="true">/</span>
          </li>
        ))}
        <li aria-current="page" style={{ color: "var(--terv-szoveg)" }}>
          {rovidek[rovidek.length - 1]}
        </li>
      </ol>
    </nav>
  )
}
