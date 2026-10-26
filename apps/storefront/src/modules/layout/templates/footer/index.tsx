import { listCollections } from "@lib/data/collections"
import { kezdolapTartalom } from "@lib/data/kezdolap-tartalom"

import { lablecAdat } from "./lablec-adat"
import { LablecKeret } from "./lablec-keret"

export default async function Footer() {
  /*
    CSAK AZ KELL, AMIT A LABLEC KIIR: id, handle, title (kartya 62811c0f). A
    `*products` minden gyujtemeny minden termeket hozta (merve a stage-en
    2026-10-07: 1,7 MB, a szukitett 5,3 KB). 2 MB korul a Next nem tarolja a
    valaszt, tehat minden lap minden renderelese ujra lekerte: buildenkent
    kb. 385-szor (nautilus felmerese).
  */
  const { collections } = await listCollections({
    fields: "id,handle,title",
  })
  /*
    A SZERKESZTHETO LABLEC (nautilus 36013): a bemutatkozas, az oszlopok, a
    kozossegi cimek es az also sor az OS-bol jon, a kezdolap gyorsitotarazott
    rekordjabol (ugyanaz a lekeres es cimke, mint a fejlece). Szerkesztes
    nelkul a lablec PONTOSAN a mai.
  */
  const lablec = lablecAdat(await kezdolapTartalom())

  return <LablecKeret lablec={lablec} collections={collections} />
}
