import type { Marka } from "@lib/data/brands"
import { translator } from "@lib/i18n/dictionary"
import { localeOf } from "@lib/i18n/locale"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

type MarkaSor = Pick<Marka, "name" | "handle">

/**
 * A MARKALISTA TORZSE: a markak nev szerint, betunkent csoportositva, a
 * kezdolap es a listalapok vilagos stilusaban (2026-11-03: `acr-` tokenek,
 * morzsa, nagy cim, a betu-sav a `mist` savon, mint a listalapok rendezo
 * savja). Logo nincs rajta (a logok gyujtese all, acrobot 36605); amig nincs
 * marka, egy mondat mondja meg, hogy a lista ures, nem egy ures racs. A
 * szovegek szotar-kulcsok (hu es en), a lap nyelve az utvonal szegmense.
 */
export function MarkaListaLap({
  markak,
  countryCode = "hu",
}: {
  markak: ReadonlyArray<MarkaSor>
  countryCode?: string
}) {
  const t = translator(localeOf(countryCode))
  const betuk = new Map<string, MarkaSor[]>()
  for (const marka of [...markak].sort((a, b) =>
    a.name.localeCompare(b.name, "hu"),
  )) {
    const betu = (marka.name.trim()[0] ?? "#").toLocaleUpperCase("hu")
    // betu az, aminek van kis- es nagybetus alakja (az ekezetes is)
    const kulcs = betu.toLocaleLowerCase("hu") !== betu ? betu : "#"
    betuk.set(kulcs, [...(betuk.get(kulcs) ?? []), marka])
  }
  const kulcsok = Array.from(betuk.keys())
  /** The section id of a group: the "#" group (names that start with a digit or a sign) gets an ASCII id. */
  const azonosito = (betu: string) =>
    `marka-betu-${betu === "#" ? "szam" : betu}`

  return (
    <div className="bg-acr-shell font-acr-sans" data-testid="marka-lista-lap">
      <nav
        aria-label={t("brandIndex.breadcrumbLabel")}
        className="mx-auto flex min-h-[58px] max-w-[1440px] items-center px-4 small:px-[80px]"
      >
        <ol className="flex flex-wrap items-center gap-x-2 text-[14px] uppercase leading-[22px] text-acr-slate">
          <li aria-current="page">{t("brandIndex.crumb")}</li>
        </ol>
      </nav>

      <header className="mx-auto max-w-[1440px] px-4 pb-10 pt-8 small:px-[56px] small:pb-[44px] small:pt-[52px]">
        <h1 className="text-[40px] font-light leading-[44px] tracking-[-1px] text-acr-ink small:text-[58px] small:leading-[62px]">
          {t("brandIndex.title")}
        </h1>
      </header>

      {markak.length === 0 ? (
        <div className="mx-auto max-w-[1440px] px-4 pb-16 pt-8 small:px-[56px]">
          <p
            className="text-[14px] text-acr-slate"
            data-testid="marka-lista-ures"
          >
            {t("brandIndex.empty")}
          </p>
        </div>
      ) : (
        <>
          <div className="bg-acr-mist">
            <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-4 py-[18px] small:flex-row small:items-center small:justify-between small:px-[56px]">
              <ul
                className="flex min-w-0 gap-2 overflow-x-auto"
                aria-label={t("brandIndex.lettersLabel")}
                data-testid="marka-betuk"
              >
                {kulcsok.map((betu) => (
                  <li key={betu} className="shrink-0">
                    <a
                      href={`#${azonosito(betu)}`}
                      className="flex h-[42px] min-w-[42px] items-center justify-center border border-acr-line bg-acr-white px-3 text-[14px] font-medium text-acr-ink hover:border-acr-slate"
                    >
                      {betu}
                    </a>
                  </li>
                ))}
              </ul>
              <span
                className="shrink-0 text-[14px] leading-[22px] text-acr-slate"
                data-testid="marka-darab"
              >
                {t("brandIndex.count", { count: markak.length })}
              </span>
            </div>
          </div>

          <div className="mx-auto flex max-w-[1440px] flex-col gap-y-10 px-4 pb-16 pt-10 small:px-[56px]">
            {Array.from(betuk.entries()).map(([betu, sor]) => (
              <section
                key={betu}
                aria-labelledby={azonosito(betu)}
                className="scroll-mt-6 border-t border-acr-line pt-5"
              >
                <h2
                  id={azonosito(betu)}
                  className="text-[28px] font-light leading-[34px] text-acr-ink"
                >
                  {betu}
                </h2>
                <ul className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 xsmall:grid-cols-2 small:grid-cols-4">
                  {sor.map((marka) => (
                    <li key={marka.handle}>
                      <LocalizedClientLink
                        className="text-[16px] leading-[24px] text-acr-slate hover:text-acr-ink"
                        href={`/marka/${encodeURIComponent(marka.handle)}`}
                      >
                        {marka.name}
                      </LocalizedClientLink>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
