import { simplePayVisszateres } from "@lib/data/simplepay"
import { simplePayEredmeny, tranzakcioAzR, tranzakcioSor } from "@lib/util/simplepay-eredmeny"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Heading, Text } from "@modules/common/components/ui"

export const metadata = { title: "A fizetés eredménye" }

/**
 * A SIMPLEPAY FIZETES EREDMENYE (P4-4, a leiras 3.13 fejezete). A mai penztar
 * kinezeteben, nem a Figma-terv szerint.
 *
 * Az eredmenyt a HATTER mondja meg, az alairt `r` es `s` alapjan (a tranzakcio
 * lekerdezesevel), nem az URL: egy kezzel irt cimmel nem lehet sikert
 * kiiratni. A tranzakcio-azonosito csak sikeres es sikertelen fizetesnel all.
 */
export default async function SimplePayEredmenyLap(props: {
  searchParams: Promise<{ r?: string; s?: string }>
}) {
  const { r, s } = await props.searchParams
  const valasz = r && s ? await simplePayVisszateres(r, s) : null
  const eredmeny = simplePayEredmeny(valasz, tranzakcioAzR(r))

  return (
    <div className="content-container py-12 max-w-xl" data-testid="simplepay-eredmeny">
      <Heading level="h1" className="text-2xl-regular mb-4">
        {eredmeny.cim}
      </Heading>
      {eredmeny.tranzakcio && (
        <Text className="txt-medium mb-2" data-testid="simplepay-tranzakcio">
          {tranzakcioSor(eredmeny.tranzakcio)}
        </Text>
      )}
      {eredmeny.sorok.map((sor) => (
        <Text key={sor} className="txt-medium text-ui-fg-subtle mb-2">
          {sor}
        </Text>
      ))}
      <div className="mt-6">
        {eredmeny.rendelesId ? (
          <LocalizedClientLink href={`/order/${eredmeny.rendelesId}/confirmed`} className="underline">
            A rendelésed
          </LocalizedClientLink>
        ) : eredmeny.vissza ? (
          <LocalizedClientLink href="/checkout?step=payment" className="underline">
            Vissza a fizetéshez
          </LocalizedClientLink>
        ) : (
          <LocalizedClientLink href="/account/orders" className="underline">
            A rendeléseim
          </LocalizedClientLink>
        )}
      </div>
    </div>
  )
}
