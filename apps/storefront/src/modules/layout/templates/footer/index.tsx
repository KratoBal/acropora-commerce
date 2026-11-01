import { kezdolapTartalom } from "@lib/data/kezdolap-tartalom"
import { localeOf } from "@lib/i18n/locale"

import { lablecAdat } from "./lablec-adat"
import { LablecKeret } from "./lablec-keret"

export default async function Footer({
  countryCode,
}: {
  /** A lap elso utvonal-szegmense: ebbol jon a nyelv (`hu`, `en-hu`). */
  countryCode: string
}) {
  /*
    A SZERKESZTHETO LABLEC (nautilus 36013): a bemutatkozas, az oszlopok, a
    kozossegi cimek es az also sor az OS-bol jon, a kezdolap gyorsitotarazott
    rekordjabol (ugyanaz a lekeres es cimke, mint a fejlece). Szerkesztes
    nelkul a lablec a regi bolt lablecenek szerkezete (kirakat-lablec-kep).

    A KOLLEKCIOK OSZLOPA 2026-10-27 OTA NINCS (a referencia-kepen nincs), ezert
    a lablec a gyujtemenyeket sem kerdezi le.
  */
  const locale = localeOf(countryCode)
  const lablec = lablecAdat(await kezdolapTartalom(), locale)

  return <LablecKeret lablec={lablec} locale={locale} />
}
