"use client"

import { useActionState } from "react"

import { hirlevelFeliratkozasAkcio } from "@lib/data/hirlevel"
import { jogiOldal } from "@lib/util/fogyasztobarat"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

import { hozzajarulasLinkkel, type HirlevelAdat } from "./hirlevel-adat"

const MEZO =
  "h-11 w-full min-w-0 border px-4 txt-small outline-none focus-visible:ring-2"

/**
 * A HIRLEVEL-SOR A LABLEC FOLOTT (Balazs, 2026-10-27, kirakat-lablec-kep; a
 * regi bolt lablece): cim, szoveg, nev, e-mail, a hozzajarulas szovege az
 * Adatkezelesi tajekoztato linkjevel, es a gomb. A szovegeket az OS adja; a
 * mezok es a link rogzitettek.
 *
 * A feliratkozas a teszt bolt sajat listajaba megy, level nem megy ki (#577).
 */
export function HirlevelSor({ hirlevel }: { hirlevel: HirlevelAdat }) {
  const [allapot, kuld, folyamatban] = useActionState(
    hirlevelFeliratkozasAkcio,
    null,
  )
  const beirt = allapot?.allapot === "hiba" ? allapot.ertekek : undefined

  return (
    <section
      className="w-full"
      style={{
        background: "var(--terv-hatter-sotet)",
        color: "var(--terv-szoveg-vilagos)",
      }}
      aria-labelledby="hirlevel-cim"
      data-testid="lablec-hirlevel"
    >
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-4 py-10 lg:px-16">
        <div className="flex flex-col gap-2 small:flex-row small:items-baseline small:gap-8">
          {hirlevel.cim ? (
            <h2
              id="hirlevel-cim"
              className="txt-xlarge-plus uppercase tracking-wide"
            >
              {hirlevel.cim}
            </h2>
          ) : (
            <h2 id="hirlevel-cim" className="sr-only">
              Hírlevél
            </h2>
          )}
          {hirlevel.szoveg ? (
            <p className="txt-medium">{hirlevel.szoveg}</p>
          ) : null}
        </div>
        {allapot?.allapot === "kesz" ? (
          <p role="status" className="txt-medium" data-testid="hirlevel-kesz">
            Köszönjük, feliratkoztál a hírlevelünkre.
          </p>
        ) : (
          <form action={kuld} className="flex flex-col gap-3" noValidate>
            <div className="flex flex-col gap-3 small:flex-row">
              <input
                name="name"
                aria-label="Név"
                placeholder="Név"
                autoComplete="name"
                required
                maxLength={100}
                defaultValue={beirt?.nev}
                className={MEZO}
                style={{
                  background: "var(--terv-hatter-lap)",
                  color: "var(--terv-szoveg)",
                  borderColor: "var(--terv-keret)",
                }}
              />
              <input
                name="email"
                type="email"
                aria-label="E-mail"
                placeholder="E-mail"
                autoComplete="email"
                required
                maxLength={254}
                defaultValue={beirt?.email}
                className={MEZO}
                style={{
                  background: "var(--terv-hatter-lap)",
                  color: "var(--terv-szoveg)",
                  borderColor: "var(--terv-keret)",
                }}
              />
              <button
                type="submit"
                disabled={folyamatban}
                className="h-11 shrink-0 px-6 txt-small-plus uppercase tracking-wide disabled:opacity-60"
                style={{
                  background: "var(--terv-kiemel)",
                  color: "var(--terv-kiemel-szoveg)",
                }}
              >
                {hirlevel.gomb}
              </button>
            </div>
            <label className="flex items-start gap-2 txt-small">
              <input
                type="checkbox"
                name="consent"
                required
                className="mt-0.5 h-4 w-4 shrink-0"
              />
              <Hozzajarulas szoveg={hirlevel.hozzajarulas} />
            </label>
            {allapot?.allapot === "hiba" ? (
              <p role="alert" className="txt-small" data-testid="hirlevel-hiba">
                {allapot.uzenet}
              </p>
            ) : null}
          </form>
        )}
      </div>
    </section>
  )
}

/** A hozzajarulas szovege, a tajekoztato kifejezese mint link (`hozzajarulasLinkkel`). */
function Hozzajarulas({ szoveg }: { szoveg: string }) {
  const link = (felirat: string) => (
    <LocalizedClientLink
      href={jogiOldal("adatkezeles")}
      className="underline"
      data-testid="hirlevel-adatkezeles"
    >
      {felirat}
    </LocalizedClientLink>
  )
  const reszek = hozzajarulasLinkkel(szoveg)
  return reszek ? (
    <span>
      {reszek.elotte}
      {link(reszek.link)}
      {reszek.utana}
    </span>
  ) : (
    <span>
      {szoveg} {link("Adatkezelési tájékoztató")}
    </span>
  )
}
