import { translator } from "@lib/i18n/dictionary"
import type { Locale } from "@lib/i18n/locale"
import { arrivalDayText, arrivalIsLate } from "@lib/util/livestock-arrival"
import {
  groupedByKind,
  type ArrivingAnimal,
} from "@lib/util/livestock-arrivals"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

/**
 * AZ "ÉRKEZŐ ÁLLATOK" LAP (V2.6 S4c, kartya f4e4832b): az uton levo elo allatok fajtankent, a nevvel, a varhato nappal es
 * az allapottal. A lista a bolt sajat valasza (`GET /store/livestock-arrivals`), amit az OS tolt fel; a lap nem szamol
 * semmit, es nem igeri tobbnek a napot, mint amennyi: egy elmult nap nem datum a multban, hanem "az erkezes kesik".
 *
 * A KOTOTT ERKEZES (mar van bolti termeke) linket kap a termek lapjara, ha a bolt megadja a termek kezeloejet; link nelkul
 * is megall a sor. A FELIRATKOZAS ("Ertesits, ha megerkezik") kulon szelet (S4c-2): a kapcsolo es a hozzajarulas szovege
 * jogi ellenorzesen all.
 *
 * `ma` a bolt napja (Budapest), a hivo adja, hogy a komponens ne a sajat orajara tamaszkodjon.
 */
export default function ErkezoAllatokLap({
  animals,
  handles,
  ma,
  locale = "hu",
}: {
  animals: readonly ArrivingAnimal[]
  /** bolti termek azonosito -> kezelo, a kotott erkezesek linkjehez */
  handles: Readonly<Record<string, string>>
  ma: string
  locale?: Locale
}) {
  const t = translator(locale)
  const groups = groupedByKind(animals)
  return (
    <div className="min-h-[calc(100vh-64px)] bg-acr-mist py-10 small:py-14">
      <div
        className="content-container flex max-w-[760px] flex-col gap-8"
        data-testid="erkezo-allatok"
      >
        <div className="flex flex-col gap-3">
          <h1 className="text-[30px] font-normal leading-[36px] text-acr-ink small:text-[38px] small:leading-[46px]">
            {t("arrivingAnimals.title")}
          </h1>
          <p className="text-[15px] text-acr-slate">
            {t("arrivingAnimals.intro")}
          </p>
        </div>
        {groups.length === 0 ? (
          <p className="text-[15px] text-acr-ink" data-testid="erkezo-ures">
            {t("arrivingAnimals.empty")}
          </p>
        ) : (
          groups.map((group) => (
            <section
              key={group.kind}
              aria-labelledby={`erkezo-${group.kind}`}
              data-testid={`erkezo-${group.kind}`}
              className="flex flex-col gap-3"
            >
              <h2
                id={`erkezo-${group.kind}`}
                className="text-[22px] font-normal text-acr-ink"
              >
                {t(`arrivingAnimals.kind.${group.kind}`)}
              </h2>
              <ul className="flex flex-col gap-3">
                {group.animals.map((animal) => {
                  const handle = animal.productId
                    ? handles[animal.productId]
                    : undefined
                  return (
                    <li
                      key={animal.id}
                      className="flex flex-col gap-1 border border-acr-line bg-acr-white px-5 py-4"
                      data-testid="erkezo-sor"
                    >
                      <span className="text-[17px] text-acr-ink">
                        {animal.label}
                      </span>
                      <span
                        className="text-[15px] text-acr-ink"
                        data-testid="erkezo-nap"
                      >
                        {arrivalIsLate(
                          {
                            expectedOn: animal.expectedOn,
                            stage: animal.stage,
                          },
                          ma,
                        )
                          ? t("livestockArrival.late")
                          : t("livestockArrival.expected", {
                              date: arrivalDayText(animal.expectedOn, locale),
                            })}
                      </span>
                      <span
                        className="text-[13px] text-acr-slate"
                        data-testid="erkezo-allapot"
                      >
                        {animal.stage === "in_transit"
                          ? t("livestockArrival.inTransit")
                          : t("livestockArrival.ordered")}
                      </span>
                      {handle ? (
                        <LocalizedClientLink
                          href={`/termek/${handle}`}
                          className="mt-1 text-[14px] underline"
                          data-testid="erkezo-link"
                        >
                          {t("arrivingAnimals.viewProduct")}
                        </LocalizedClientLink>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            </section>
          ))
        )}
      </div>
    </div>
  )
}
