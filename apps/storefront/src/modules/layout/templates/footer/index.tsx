import { kezdolapTartalom } from "@lib/data/kezdolap-tartalom"

import { lablecAdat } from "./lablec-adat"
import { LablecKeret } from "./lablec-keret"

export default async function Footer() {
  /*
    A SZERKESZTHETO LABLEC (nautilus 36013): a bemutatkozas, az oszlopok, a
    kozossegi cimek es az also sor az OS-bol jon, a kezdolap gyorsitotarazott
    rekordjabol (ugyanaz a lekeres es cimke, mint a fejlece). Szerkesztes
    nelkul a lablec a regi bolt lablecenek szerkezete (kirakat-lablec-kep).

    A KOLLEKCIOK OSZLOPA 2026-10-27 OTA NINCS (a referencia-kepen nincs), ezert
    a lablec a gyujtemenyeket sem kerdezi le.
  */
  const lablec = lablecAdat(await kezdolapTartalom())

  return <LablecKeret lablec={lablec} />
}
