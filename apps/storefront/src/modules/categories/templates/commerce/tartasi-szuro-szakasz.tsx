import type { Translate } from "@lib/i18n/dictionary"
import { szuroLinkRel } from "@lib/seo/szuro-link"
import { FELIRATOK, KORALLOS_FELIRAT } from "@lib/util/tartasi-adat"
import type { TartasiSor } from "@lib/util/tartasi-szuro"

/**
 * A TARTASI SZURO SZAKASZAI A SZURO-OSZLOPBAN (V2.2 S5): tartasi nehezseg, korallos akvariumban tarthato, minimalis
 * medence. A sor a marka-lista sorae (jelolo negyzet, felirat, darabszam); egy csoport csak akkor all, ha a
 * kategoriaban van allat, amire az erteke illik (a darabszam a bolt `facets` mezojebol).
 */
export default function TartasiSzuroSzakasz({
  sorok,
  link,
  t,
}: {
  sorok: {
    nehezseg: TartasiSor[]
    korallos: TartasiSor[]
    medence: TartasiSor[]
  }
  link: (sor: TartasiSor) => string
  t: Translate
}) {
  const csoportok = [
    {
      kulcs: "nehezseg",
      cim: t("category.husbandryDifficulty"),
      sorok: sorok.nehezseg,
    },
    { kulcs: "korallos", cim: KORALLOS_FELIRAT, sorok: sorok.korallos },
    {
      kulcs: "medence",
      cim: t("category.husbandryTank"),
      sorok: sorok.medence,
    },
  ].filter((cs) => cs.sorok.length > 0)
  if (!csoportok.length) return null
  return (
    <>
      {csoportok.map((cs) => (
        <section
          key={cs.kulcs}
          className="flex flex-col gap-2 border-t border-acr-line pt-[13px]"
          data-testid={`szuro-tartas-${cs.kulcs}`}
        >
          <h3 className="text-[16px] font-medium leading-[26px] text-acr-ink">
            {cs.cim}
          </h3>
          <ul className="flex flex-col gap-2">
            {cs.sorok.map((sor) => {
              const href = link(sor)
              return (
                <li key={sor.kulcs}>
                  <a
                    href={href}
                    rel={szuroLinkRel(href)}
                    aria-current={sor.aktiv ? "true" : undefined}
                    className={
                      "flex items-center justify-between gap-2 text-[14px] leading-[22px] hover:text-acr-ink " +
                      (sor.aktiv ? "text-acr-ink" : "text-acr-slate")
                    }
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className={
                          "h-[15px] w-[15px] shrink-0 border " +
                          (sor.aktiv
                            ? "border-acr-navy bg-acr-navy"
                            : "border-acr-slate bg-acr-mist")
                        }
                        aria-hidden="true"
                      />
                      {/* a korallos csoport egyetlen sora: a cim maga a felirat */}
                      <span className="min-w-0">
                        {sor.felirat || FELIRATOK.korallos.IGEN}
                      </span>
                    </span>
                    <span className="shrink-0">{sor.szam}</span>
                  </a>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </>
  )
}
