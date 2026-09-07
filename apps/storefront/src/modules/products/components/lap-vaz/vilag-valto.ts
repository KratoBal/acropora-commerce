import { HttpTypes } from "@medusajs/types"

import type { Vilag } from "./index"

/**
 * MELYIK VILAGOT KAPJA EGY TERMEK -- ES MIERT A KATEGORIA-FA DONT.
 *
 * Balazs dontese (acrobot atadasaban, 2026-09-07): "a korallokhoz a 2a valo ami
 * ek sotetek a szinei". Vagyis a valto a TERMEK FAJTAJA, nem izles es nem a
 * latogato beallitasa.
 *
 * === MIERT NEM A unique_piece JELZO, HOLOTT MA UGYANAZT ADNA ===
 *
 * A stage 21 termekebol harom all a Korallok alatt, es PONTOSAN ugyanaz a harom
 * viseli a unique_piece jelzot. A ket jel ma egyezik -- es epp ezert veszelyes.
 *
 * A JELENTESUK kulonbozik: a unique_piece "egyedi peldany", ami az elo allatok
 * RESZHALMAZA. Egy korall, amibol tobb darab van ugyanabbol a fragbol, ELO
 * ALLAT, es a jelzo a VILAGOS lapra kuldene. Ma azert egyeznek, mert a teszt
 * bolt egyetlen elo allata egyben egyedi peldany is.
 *
 * Ugyanaz a proxy-csapda, amit murena nevezett meg az `allow_backorder`-nel: a
 * jel ma helyes eredmenyt ad, es nem azt jelenti, amit mondani akarunk.
 *
 * === A KET AG, AMI EGYELORE VILAGOS, ES A FELTETEL, AMI MEGFORDITJA ===
 *
 * Merve 2026-09-07-en, a stage Store API-jan:
 *
 *   Edesvizi akvarisztika   4 alkategoria,  0 TERMEK a teljes reszfa alatt
 *   Shop 'n the Shop        0 alkategoria,  0 TERMEK
 *
 * Ma tehat EGYIK SEM valt ki semmit, es egy dontes, ami ma nem valt ki semmit,
 * nem surgos. Ezert vilagosak.
 *
 * A FELTETEL, AMI MEGFORDITJA: ha valaha ELO ALLAT kerul barmelyik ala, az az ag
 * is sotet lesz. Ez nem "majd megnezzuk", hanem megnevezett esemeny, amit a
 * kovetkezo ember fel tud ismerni -- es a ket nulla mondja meg, mibol kovetkezett.
 *
 * === ES EGY HATAR, AMIT KIMONDOK ===
 *
 * A Halak (15 alkategoria) es a Gerinctelenek (7) alatt MA SZINTEN NULLA termek
 * all. A sotet vilagot tehat ma EGYEDUL a Korallok harom termeke valtja ki -- a
 * masik ket ag szabalya megirva all, de a mai adaton nem probalhato ki.
 */

/**
 * A HAROM ELO ALLAT GYOKER NEVE.
 *
 * NEVRE es nem azonositora: a kategoria-azonositok a vetites minden ujraepitesenel
 * mas ULID-ot kapnak (a mai `pcat_01M1PAM...` sorozat 2026-09-04-en keletkezett),
 * a nevek viszont a forras-katalogusbol jonnek es stabilak. Egy beegetett
 * azonosito a kovetkezo teljes ujravetitesnel CSENDBEN elavulna: a valto nem
 * hibazna, csak minden termeket vilagosnak mondana.
 */
export const ELO_ALLAT_GYOKEREK = ["Korallok", "Halak", "Gerinctelenek"] as const

type Kategoria = {
  name?: string | null
  mpath?: string | null
}

/**
 * A GYOKER a termek kategoria-listajabol: az az elem, aminek az `mpath`-ja
 * egyetlen szegmensbol all. A Medusa minden ost is felsorol a termek
 * kategoriai kozott, tehat a gyoker ott van a listaban.
 */
function gyokerNevek(katok: Kategoria[]): string[] {
  return katok
    .filter((k) => (k.mpath ?? "").split(".").length === 1)
    .map((k) => (k.name ?? "").trim())
    .filter(Boolean)
}

export function vilagaTermeknek(
  termek: Pick<HttpTypes.StoreProduct, "categories"> | null | undefined
): Vilag {
  const katok = (termek?.categories ?? []) as Kategoria[]
  const gyokerek = gyokerNevek(katok)

  const eloAllat = gyokerek.some((nev) =>
    (ELO_ALLAT_GYOKEREK as readonly string[]).includes(nev)
  )

  return eloAllat ? "sotet" : "vilagos"
}
