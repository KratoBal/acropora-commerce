import { hasonloKaphatoTermekek } from "@lib/data/hasonlo-kaphato"
import { translator } from "@lib/i18n/dictionary"
import { localeOf } from "@lib/i18n/locale"
import type { ElkeltTetel } from "@lib/util/elkelt-darab"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

import ElkeltKivetel from "./elkelt-kivetel"

/**
 * A KOZBEN ELKELT EGYEDI DARAB ERTESITESE A KOSAR TETEJEN (V2.5). Emberi mondat a darab nevevel, harom hasonlo, most kaphato
 * darab (vagy az, hogy most nincs ilyen), es annak jelzese, hogy a kosar tobbi tetele megmaradt. A kifizetett osszegrol NEM
 * mond semmit (nyitott jogi dontes, kartya ffa5d8c6): se visszaterítést nem igér, se zarolasrol nem beszel.
 */
export default async function ElkeltErtesites({
  elkeltek,
  countryCode,
  maradtMas,
}: {
  elkeltek: ElkeltTetel[]
  countryCode: string
  /** van-e a kosarban mas tetel is az elkelteken kivul */
  maradtMas: boolean
}) {
  const t = translator(localeOf(countryCode))
  const hasonlok = await hasonloKaphatoTermekek({ elkeltek, countryCode })
  const nevek = elkeltek.map((darab) => darab.title).join(", ")
  return (
    <section
      role="alert"
      className="flex flex-col gap-y-3 border border-acr-heritage px-4 py-4 text-acr-ink"
      data-testid="cart-sold-notice"
    >
      <h2 className="text-[18px] font-semibold">{t("cartPage.soldTitle")}</h2>
      <p className="text-[14px]" data-testid="cart-sold-text">
        {t("cartPage.soldText", { name: nevek })}
      </p>
      <p className="text-[14px] font-semibold">{t("cartPage.soldSimilar")}</p>
      {hasonlok.length > 0 ? (
        <ul
          className="flex flex-col gap-y-1 text-[14px]"
          data-testid="cart-sold-similar"
        >
          {hasonlok.map((termek) => (
            <li key={termek.id}>
              <LocalizedClientLink
                href={`/termek/${termek.handle}`}
                className="underline"
              >
                {termek.title}
              </LocalizedClientLink>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[14px]" data-testid="cart-sold-none">
          {t("cartPage.soldNone")}
        </p>
      )}
      <ul className="flex flex-col gap-y-1" data-testid="cart-sold-remove">
        {elkeltek.map((darab) => (
          <li key={darab.lineId}>
            <ElkeltKivetel
              lineId={darab.lineId}
              title={darab.title}
              label={t("cartPage.soldRemove")}
            />
          </li>
        ))}
      </ul>
      {maradtMas ? (
        <p className="text-[14px]">{t("cartPage.soldOthersKept")}</p>
      ) : null}
    </section>
  )
}
