"use client"

import { useState } from "react"

import { searchFoxpostPickupPoints } from "@lib/data/csomagpont"
import type { CsomagpontKereses, FoxpostCsomagpont } from "@lib/util/csomagpont"
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
}: {
  /** A futarszolgalat neve a mondatokban ("Foxpost", "GLS"). */
  szolgaltato?: string
  /** A kereses: a Foxpost es a GLS ugyanabban az alakban valaszol. */
  kereso?: (kereses: string) => Promise<CsomagpontKereses>
  /** A kosarban mar allo pont, ha van. */
  kivalasztott?: { name?: string; address?: string } | null
  onValaszt: (pont: FoxpostCsomagpont) => void | Promise<void>
}) {
  const [kereses, setKereses] = useState("")
  const [eredmeny, setEredmeny] = useState<CsomagpontKereses | null>(null)
  const [betolt, setBetolt] = useState(false)

  const keres = async (esemeny: React.FormEvent) => {
    esemeny.preventDefault()
    if (!kereses.trim()) return
    setBetolt(true)
    setEredmeny(await kereso(kereses))
    setBetolt(false)
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
          Válaszd ki, melyik {szolgaltato} csomagpontba kéred a csomagot.
        </p>
      )}
      <form onSubmit={keres} className="flex gap-2" role="search">
        <label className="flex flex-1 flex-col gap-1 txt-small text-ui-fg-subtle">
          Irányítószám vagy város
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
          A {szolgaltato} csomagpontjai most nem érhetők el. Válassz másik
          szállítási módot.
        </p>
      ) : null}
      {eredmeny?.elerheto && eredmeny.pontok.length === 0 ? (
        <p
          className="txt-medium text-ui-fg-base"
          data-testid="csomagpont-nincs"
        >
          Nincs találat erre a keresésre.
        </p>
      ) : null}
      {eredmeny?.elerheto && eredmeny.pontok.length > 0 ? (
        <ul className="flex flex-col gap-2" data-testid="csomagpont-lista">
          {eredmeny.pontok.map((pont) => (
            <li key={pont.id}>
              <button
                type="button"
                onClick={() => onValaszt(pont)}
                className="w-full border border-ui-border-base px-4 py-3 text-left hover:shadow-borders-interactive-with-active"
                data-testid="csomagpont"
              >
                <span className="block txt-medium-plus text-ui-fg-base">
                  {pont.name}
                </span>
                <span className="block txt-small text-ui-fg-subtle">
                  {pont.address}
                </span>
              </button>
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
