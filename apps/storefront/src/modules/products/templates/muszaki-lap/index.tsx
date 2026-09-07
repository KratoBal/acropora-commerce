import { HttpTypes } from "@medusajs/types"
import LapVaz from "@modules/products/components/lap-vaz"
import { vazTartalom } from "@modules/products/components/lap-vaz/valodi-tartalom"
import { vilagaTermeknek } from "@modules/products/components/lap-vaz/vilag-valto"
import React from "react"

/**
 * A MUSZAKI TERMEKLAP: A VAZ BEKOTESE, ES CSAK A MUSZAKI TERMEKEKRE.
 *
 * === MIERT VAN EZ A KAPU, ES MIERT NEM A SABLONBAN ===
 *
 * A termeklap-sablon KOZOS: egyetlen fajl szolgal ki minden terméket, az elo
 * allatot es a muszakit is. Az elo allat lap MURENA kore (acrobot felosztasa,
 * 2026-09-07), es a vaz doboz-sorrendje MAS, mint a mai lape.
 *
 * Ha a vazat feltetel nelkul kotnenk be, az o lapja EGYIK PERCROL A MASIKRA
 * megvaltozna anelkul, hogy o ranezett volna. Nem veszne el semmi (a vaz
 * befogadja a harom keszlet-allapotot, a jelvenyt es a leptetot), de a
 * DONTES nem az enyem.
 *
 * Ezert all itt a kapu: a `vilagaTermeknek` mar megmondja, melyik termek elo
 * allat es melyik muszaki. Ugyanaz a jel dönti el azt is, ki kapja MAR a vazat.
 *
 * === AMIT EZ BIZONYITHATOVA TESZ ===
 *
 * Az elo allat lapja VALTOZATLAN marad, es ez nem igeret: allitas all ra. Amikor
 * murena keszen all, EGYETLEN sor cserel -- a `hasznaljaVazat` fuggveny torzse.
 */

/**
 * MA CSAK A MUSZAKI TERMEK KAPJA A VAZAT.
 *
 * Amikor az elo allat lapja is atall, ez a fuggveny `() => true` lesz, es a
 * mellette allo allitas fordul meg vele -- egy helyen, lathatoan.
 */
/**
 * AZ ATMENETI KOLTOZES-KAPCSOLO, ES MIERT NEM A VILAG-VALTOBOL OLVASSUK KI.
 *
 * A kapu ket kerdest tenne fel egyszerre, es a ketto NEM ugyanaz:
 *
 *   "elo allat-e ez a termek"     ALLANDO tulajdonsag; a vilag szinei ebbol jonnek
 *   "atallt-e mar a lapja a vazra" ATMENETI allapot, ami par nap mulva megszunik
 *
 * Ma a ketto EGYBEESIK, es epp ezert veszelyes egy sorba tenni oket: amikor a
 * koltozes kesz, a feltetel NEM azzal szunik meg, hogy megszunik az elo allat
 * fogalma -- hanem azzal, hogy nincs mit koltoztetni. Ha egy sor hordozza
 * mindkettot, valakinek ki kell talalnia, melyik felet torolje.
 *
 * Igy viszont a kapcsolo MEGMONDJA MAGAROL, hogy koltozesrol szol: murena
 * EGYETLEN ertek atirasaval kapcsolja be, es amikor mindenki a vazon van, a
 * konstans ES a feltetel EGYUTT torolheto, kerdes nelkul.
 *
 * (murena kerese, 2026-09-07, msg_id 14358; az erve az oveé.)
 */
export const ELO_ALLAT_VAZON = false

export function hasznaljaVazat(
  termek: Pick<HttpTypes.StoreProduct, "categories"> | null | undefined,
): boolean {
  if (vilagaTermeknek(termek) === "vilagos") return true
  return ELO_ALLAT_VAZON
}

type Props = {
  product: HttpTypes.StoreProduct
  vasarlasiResz?: React.ReactNode
  hasonloResz?: React.ReactNode
  fotoResz?: React.ReactNode
}

const MuszakiLap = ({
  product,
  vasarlasiResz,
  hasonloResz,
  fotoResz,
}: Props) => {
  return (
    <LapVaz
      vilag={vilagaTermeknek(product)}
      tartalom={vazTartalom(product, vasarlasiResz, hasonloResz, fotoResz)}
    />
  )
}

export default MuszakiLap
