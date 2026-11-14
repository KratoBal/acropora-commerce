import {
  REEF_ALCIM,
  REEF_BEVEZETO,
  REEF_CIM,
  REEF_LEPESEK,
  REEF_TERMEK_MEGJEGYZES,
  REEF_ZARSZO,
} from "@lib/util/reef-inditas"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

/**
 * "INDITSD EL A KOROLLOS AKVARIUMODAT" (V4.4, kartya 34b46727): hat lepes, lepesenkent a mit csinalsz / miert / mikor
 * lephetsz tovabb, es a bolt termekei, ahol a bolti szoveg maga nevezi meg a lepest. A szoveg Korall sajat szovege;
 * a termekek cime a bolt valasza (`termekek`: kezelo -> cim, csak a megvehetok), ar es keszlet nem all az oldalon.
 * FEJLECREND: h1 a lap cime, h2 a lepesek, h3 a termek-csoportok (axe heading-order, 2026-11-14).
 */
export default function ReefInditasLap({
  termekek,
}: {
  /** bolti kezelo -> bolti cim; amelyik hianyzik, nem jelenik meg */
  termekek: Readonly<Record<string, string>>
}) {
  return (
    <div className="min-h-[calc(100vh-64px)] bg-acr-mist py-10 small:py-14">
      <div
        className="content-container flex max-w-[760px] flex-col gap-10"
        data-testid="reef-inditas"
      >
        <header className="flex flex-col gap-3">
          <h1 className="text-[30px] font-normal leading-[36px] text-acr-ink small:text-[38px] small:leading-[46px]">
            {REEF_CIM}
          </h1>
          <p className="text-[17px] text-acr-ink">{REEF_ALCIM}</p>
          <p className="text-[15px] text-acr-slate">{REEF_BEVEZETO}</p>
        </header>
        {REEF_LEPESEK.map((lepes) => {
          const csoportok = (lepes.csoportok ?? [])
            .map((csoport) => ({
              ...csoport,
              kaphato: csoport.termekek.filter((t) => termekek[t.handle]),
            }))
            .filter((csoport) => csoport.kaphato.length > 0)
          return (
            <section
              key={lepes.szam}
              aria-labelledby={`reef-lepes-${lepes.szam}`}
              data-testid={`reef-lepes-${lepes.szam}`}
              className="flex flex-col gap-4"
            >
              <h2
                id={`reef-lepes-${lepes.szam}`}
                className="text-[24px] font-normal text-acr-ink"
              >
                {lepes.szam}. lépés: {lepes.cim}
              </h2>
              {lepes.bekezdesek.map(([cimke, szoveg]) => (
                <p key={cimke} className="text-[15px] text-acr-ink">
                  <strong className="font-medium">{cimke}: </strong>
                  {szoveg}
                </p>
              ))}
              {lepes.kategoriak ? (
                <p
                  className="text-[15px] text-acr-slate"
                  data-testid="reef-kategoriak"
                >
                  {lepes.kategoriak}
                </p>
              ) : null}
              {csoportok.map((csoport) => (
                <div
                  key={csoport.cim}
                  className="flex flex-col gap-2"
                  data-testid="reef-csoport"
                >
                  <h3 className="text-[17px] font-medium text-acr-ink">
                    {csoport.cim}
                  </h3>
                  {csoport.megjegyzes ? (
                    <p
                      className="text-[13px] text-acr-slate"
                      data-testid="reef-megjegyzes"
                    >
                      {csoport.megjegyzes} {REEF_TERMEK_MEGJEGYZES}
                    </p>
                  ) : null}
                  <ul className="flex flex-col gap-2">
                    {csoport.kaphato.map((termek) => (
                      <li
                        key={termek.handle}
                        className="border border-acr-line bg-acr-white px-5 py-3"
                      >
                        <LocalizedClientLink
                          href={`/termek/${termek.handle}`}
                          className="text-[15px] underline"
                          data-testid="reef-termek"
                        >
                          {termekek[termek.handle]}
                        </LocalizedClientLink>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <p className="text-[15px] text-acr-ink">
                <strong className="font-medium">Továbbléphetsz, ha: </strong>
                {lepes.tovabblepes}
              </p>
            </section>
          )
        })}
        <p className="text-[16px] text-acr-ink">{REEF_ZARSZO}</p>
      </div>
    </div>
  )
}
