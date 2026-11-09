import { translator } from "@lib/i18n/dictionary"
import { localeOf } from "@lib/i18n/locale"
import {
  oraPerc,
  sajatFoglalasok,
  type FoglalasValasz,
} from "@lib/util/kosar-foglalas"

/**
 * A KOSAR SAJAT FOGLALASAI (V2.3 S2b): minden egyedi darabnal, amit ez a kosar tart, egy sor a
 * foglalas vegevel ("[óó:pp]-ig neked tartjuk"), vagy annak kimondasa, hogy lejart, es a darab a
 * rendeleskor a vevoe, ha meg szabad. Csak a bolt valaszabol rajzol: valasz nelkul (hiba, kikapcsolt
 * foglalas) nincs sor, mert nem allitunk olyat, amirol nem tudunk.
 */
export default function FoglalasSorok({
  tetelek,
  foglalasok,
  countryCode,
  most = new Date(),
}: {
  tetelek: readonly { variant_id?: string | null; title?: string | null }[]
  foglalasok: FoglalasValasz | null
  countryCode: string
  most?: Date
}) {
  const t = translator(localeOf(countryCode))
  const sajat = sajatFoglalasok(foglalasok, most)
  const sorok = tetelek.flatMap((tetel) => {
    const foglalas = tetel.variant_id ? sajat.get(tetel.variant_id) : undefined
    return foglalas
      ? [{ id: tetel.variant_id!, title: tetel.title ?? "", ...foglalas }]
      : []
  })
  if (!sorok.length) return null
  return (
    <ul
      className="flex flex-col gap-y-1 text-[14px] text-acr-ink"
      data-testid="cart-hold-lines"
    >
      {sorok.map((sor) => (
        <li key={sor.id} data-testid="cart-hold-line">
          {sor.lejart
            ? t("cartPage.holdEnded", { title: sor.title })
            : t("cartPage.holdMine", {
                title: sor.title,
                ido: oraPerc(sor.until),
              })}
        </li>
      ))}
    </ul>
  )
}
