import { kezdolapTartalom } from "@lib/data/kezdolap-tartalom"
import KezdolapFejlec from "@modules/kezdolap/fejlec"
import { KL_TOKENEK } from "@modules/kezdolap/kl-tokenek"
import { kezdolapAdat } from "@modules/kezdolap/tartalom"
import { KosarAllapotProvider } from "@modules/layout/components/kosar-allapot"
import KosarSziget from "@modules/layout/components/kosar-allapot/kosar-sziget"
import Footer from "@modules/layout/templates/footer"

/**
 * A KIRAKAT KERETE: MINDEN PUBLIKUS LAP UGYANAZT A FEJLECET ES LABLECET KAPJA
 * (Balazs, 2026-10-26 07:52 UTC, fo csatorna: "minden aloldalon a kezdolap
 * fejlece es lablece"). A kezdolap (`(kezdolap)`) es a tobbi lap (`(main)`)
 * eddig ket kulon, masolt vazat hasznalt, a (main) a regi (P1b) fejleccel;
 * most mindketto ezt a keretet hivja, hogy a ketto ne csusszon szet megint.
 *
 * A KERET NEM OLVAS SUTIT: a kosar-allapot kliensoldalon jon, a fejlec
 * szovegei ugyanabbol a szerkesztheto, gyorsitotarazott rekordbol (a lappal
 * kozos cimke), a lablec kozos. Ezt a `aruhaz-keret.spec.tsx` meri.
 *
 * A CHECKOUT (`(checkout)`) NEM ITT ALL: annak a sajat, szandekosan szuk
 * fejlece van (Vissza a kosarhoz); azt Balazs donti el.
 */
export default async function AruhazKeret(props: {
  children: React.ReactNode
  countryCode: string
}) {
  const adat = kezdolapAdat(await kezdolapTartalom())

  return (
    <KosarAllapotProvider>
      <div style={KL_TOKENEK}>
        <KezdolapFejlec s={adat} countryCode={props.countryCode} />
        <KosarSziget />
        {props.children}
      </div>
      <Footer />
    </KosarAllapotProvider>
  )
}
