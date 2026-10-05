"use client"

import { useState } from "react"

import { searchFoxpostPickupPoints } from "@lib/data/csomagpont"
import {
  type CsomagpontKereses,
  type FoxpostCsomagpont,
  foxpostPontReszletek,
} from "@lib/util/csomagpont"
import { Button } from "@modules/common/components/ui"

/**
 * A FOXPOST-CSOMAGPONT VALASZTO (P4, a mai penztar-lepesben, atrajzolas nelkul).
 *
 * A Foxpost-mod csomagpont nelkul nem allithato be (a hatter elutasitja), ezert
 * a mod kivalasztasa ezt nyitja meg: iranyitoszam vagy varos, talalati lista, es
 * a valasztott pont a szallitasi mod adataba kerul (`foxpostSzallitasiAdat`).
 * A hatter a pont nevet es cimet a sajat listajabol irja a modra.
 */
export default function CsomagpontValaszto({
  kivalasztott,
  onValaszt,
  szolgaltato = "Foxpost",
  kereso = (kereses: string) => searchFoxpostPickupPoints(kereses),
  szovegek,
  keresoCimke = "Irányítószám vagy város",
}: {
  /**
   * Sajat allapot-szovegek (a FOXPOST tartalek listaja, Figma 486:346): a
   * kezdo segitseg, a talalat nelkuli es a betoltesi hiba mondata. Hibanal
   * ilyenkor "Újra" gomb is van. Nelkule a regi (GLS) mondatok maradnak.
   */
  szovegek?: { ures: string; nincs: string; hiba: string }
  /** A futarszolgalat neve a mondatokban ("Foxpost", "GLS"). */
  szolgaltato?: string
  /** A kereses: a Foxpost es a GLS ugyanabban az alakban valaszol. */
  kereso?: (kereses: string) => Promise<CsomagpontKereses>
  /** A kereso mezo felirata (a GLS-nel a pont neve is kereshato). */
  keresoCimke?: string
  /** A kosarban mar allo pont, ha van. */
  kivalasztott?: { name?: string; address?: string } | null
  onValaszt: (pont: FoxpostCsomagpont) => void | Promise<void>
}) {
  const [kereses, setKereses] = useState("")
  const [eredmeny, setEredmeny] = useState<CsomagpontKereses | null>(null)
  const [betolt, setBetolt] = useState(false)

  const futtat = async () => {
    if (!kereses.trim()) return
    setBetolt(true)
    setEredmeny(await kereso(kereses))
    setBetolt(false)
  }
  const keres = async (esemeny: React.FormEvent) => {
    esemeny.preventDefault()
    await futtat()
  }

  return (
    <div className="flex flex-col gap-3 pb-8" data-testid="csomagpont-valaszto">
      {kivalasztott?.name ? (
        <p
          className="txt-medium text-ui-fg-base"
          data-testid="csomagpont-kivalasztott"
        >
          Kiválasztott csomagpont: {kivalasztott.name}
          {kivalasztott.address ? `, ${kivalasztott.address}` : ""}
        </p>
      ) : (
        <p className="txt-medium text-ui-fg-muted">
          {szovegek?.ures ??
            `Válaszd ki, melyik ${szolgaltato} csomagpontba kéred a csomagot.`}
        </p>
      )}
      <form onSubmit={keres} className="flex gap-2" role="search">
        <label className="flex flex-1 flex-col gap-1 txt-small text-ui-fg-subtle">
          {keresoCimke}
          <input
            name="csomagpont_kereses"
            value={kereses}
            onChange={(e) => setKereses(e.target.value)}
            className="h-10 border border-ui-border-base px-3 txt-medium text-ui-fg-base"
            data-testid="csomagpont-kereses"
          />
        </label>
        <Button
          type="submit"
          variant="secondary"
          className="h-10 self-end"
          isLoading={betolt}
          data-testid="csomagpont-kereses-gomb"
        >
          Keresés
        </Button>
      </form>
      {eredmeny && !eredmeny.elerheto ? (
        <p
          className="txt-medium text-ui-fg-base"
          data-testid="csomagpont-nem-elerheto"
        >
          {szovegek?.hiba ??
            `A ${szolgaltato} csomagpontjai most nem érhetők el. Válassz másik szállítási módot.`}
          {szovegek ? (
            <button
              type="button"
              onClick={() => void futtat()}
              className="ml-2 text-acr-heritage underline underline-offset-2"
              data-testid="csomagpont-ujra"
            >
              Újra
            </button>
          ) : null}
        </p>
      ) : null}
      {eredmeny?.elerheto && eredmeny.pontok.length === 0 ? (
        <p
          className="txt-medium text-ui-fg-base"
          data-testid="csomagpont-nincs"
        >
          {szovegek?.nincs ?? "Nincs találat erre a keresésre."}
        </p>
      ) : null}
      {eredmeny?.elerheto && eredmeny.pontok.length > 0 ? (
        <ul className="flex flex-col gap-2" data-testid="csomagpont-lista">
          {eredmeny.pontok.map((pont) => (
            <li key={pont.id}>
              <button
                type="button"
                onClick={() => onValaszt(pont)}
                // az uzemen kivuli GLS-pont latszik, de nem valaszthato (a prompt 6. pontja)
                disabled={pont.nem_valaszthato}
                aria-disabled={pont.nem_valaszthato || undefined}
                className={
                  pont.nem_valaszthato
                    ? "w-full cursor-not-allowed border border-ui-border-base bg-acr-mist/40 px-4 py-3 text-left opacity-60"
                    : "w-full border border-ui-border-base px-4 py-3 text-left hover:shadow-borders-interactive-with-active"
                }
                data-testid="csomagpont"
              >
                <span className="flex items-start gap-3">
                  {pont.tipus_logo ? (
                    // a GLS hivatalos logoja a pont fajtajahoz, helyi kepkent
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={pont.tipus_logo}
                      alt={pont.variant ?? ""}
                      className="mt-1 h-[14px] w-auto shrink-0"
                      data-testid="csomagpont-tipus-logo"
                    />
                  ) : null}
                  {pont.icon_url ? (
                    // A Foxpost sajat tipus-ikonja (iconUrl), a hatter csak a
                    // cdn.foxpost.hu cimet engedi at; next/image itt nem kell.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={pont.icon_url}
                      alt=""
                      width={28}
                      height={28}
                      className="mt-0.5 h-7 w-7 shrink-0 object-contain"
                      data-testid="csomagpont-ikon"
                    />
                  ) : null}
                  <span className="min-w-0">
                    {pont.variant ? (
                      <span
                        className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-acr-slate"
                        data-testid="csomagpont-tipus"
                      >
                        {pont.variant}
                      </span>
                    ) : null}
                    <span className="block txt-medium-plus text-ui-fg-base">
                      {pont.name}
                    </span>
                    <span className="block txt-small text-ui-fg-subtle">
                      {pont.address}
                    </span>
                    {(pont.reszletek ?? foxpostPontReszletek(pont)) ? (
                      <span
                        className="block txt-small text-ui-fg-subtle"
                        data-testid="csomagpont-reszletek"
                      >
                        {pont.reszletek ?? foxpostPontReszletek(pont)}
                      </span>
                    ) : null}
                    {pont.figyelmeztetes ? (
                      <span
                        className={
                          pont.nem_valaszthato
                            ? "mt-1 block txt-small text-ui-fg-base"
                            : "mt-1 block txt-small text-acr-heritage"
                        }
                        data-testid="csomagpont-figyelmeztetes"
                      >
                        {pont.figyelmeztetes}
                      </span>
                    ) : null}
                  </span>
                </span>
              </button>
              {pont.findme ? (
                <details className="px-4 pb-2 txt-small text-ui-fg-subtle">
                  <summary className="cursor-pointer">Hol találom?</summary>
                  <p
                    className="whitespace-pre-line"
                    data-testid="csomagpont-findme"
                  >
                    {pont.findme}
                  </p>
                </details>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {eredmeny?.elerheto && eredmeny.talalat > eredmeny.pontok.length ? (
        <p className="txt-small text-ui-fg-muted" data-testid="csomagpont-tobb">
          {eredmeny.talalat} találatból az első {eredmeny.pontok.length}{" "}
          látszik; pontosíts a keresésen.
        </p>
      ) : null}
    </div>
  )
}
