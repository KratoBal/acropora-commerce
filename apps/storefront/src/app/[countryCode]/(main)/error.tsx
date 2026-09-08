"use client"

import { useEffect } from "react"

import InteractiveLink from "@modules/common/components/interactive-link"
import { Text } from "@modules/common/components/ui"

/**
 * A NYILVANOS LAPOK HIBA-HATARA.
 *
 * MIERT LETEZIK: e nelkul a Next.js SAJAT, ANGOL hibalapja jelenik meg a
 * vevonek. Egy elesitesi nap barmilyen atmeneti hibaja (a bolt nem valaszol,
 * egy lekerdezes idotullepese) igy nem magyar mondat, hanem keretrendszer-lap.
 *
 * A SZOVEG NEM UJ: a "Hiba tortent" a mar meglevo 404-lapok metaadatabol jon,
 * a "Vissza a fooldalra" pedig szo szerint azokrol a lapokrol. Uzleti igeretet
 * (szallitas, garancia, elerhetoseg) SZANDEKOSAN nem tartalmaz -- az kulon
 * dontes, es nem a hibalapon dol el.
 *
 * A FUGGVENY NEVE SZANDEKOSAN NEM `Error`: az arnyekolna a beepitett `Error`
 * konstruktort ott, ahol valaki `Error` neven importalja -- es akkor egy
 * `new Error(...)` a KOMPONENST hivna meg. Merve: a sajat specem elso valtozata
 * pontosan igy hasalt el (`TypeError: Cannot read properties of null (reading
 * 'useEffect')`), es a hiba-verem "new Error" alakban mutatta, ami ELVEZET a
 * valodi oktol. A Next.js a DEFAULT exportot hasznalja, a nev szabad.
 *
 * A `reset` a Next.js sajat ujraprobalasa: ugyanazt a szegmenst rendereli ujra,
 * teljes lap-ujratoltes nelkul. Ezert all elol -- egy atmeneti hibanal ez az
 * olcso kiut, es csak utana a visszavezeto ut.
 */
export default function HibaHatar({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // A NAPLOBA MEGY, A LAPRA NEM. A `digest` az egyetlen azonosito, ami a
    // szerver-oldali hibat osszekoti ezzel a lappal; a hibauzenet MAGA nem
    // kerul a vevo ele, mert belso reszleteket hordozhat.
    console.error("Storefront hiba:", error.digest ?? error.message)
  }, [error])

  return (
    <div className="flex flex-col gap-4 items-center justify-center min-h-[calc(100vh-64px)]">
      <h1 className="text-2xl-semi text-ui-fg-base">Hiba történt</h1>
      <p className="text-small-regular text-ui-fg-base">
        Az oldal betöltése közben hiba történt.
      </p>
      <button
        type="button"
        onClick={reset}
        className="text-ui-fg-interactive underline underline-offset-4"
        data-testid="hiba-ujraprobalas"
      >
        <Text className="text-ui-fg-interactive">Próbáld újra</Text>
      </button>
      <InteractiveLink href="/">Vissza a főoldalra</InteractiveLink>
      <InteractiveLink href="/store">Termékek</InteractiveLink>
    </div>
  )
}
