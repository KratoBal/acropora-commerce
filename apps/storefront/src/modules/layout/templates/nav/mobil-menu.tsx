"use client"

import { HttpTypes } from "@medusajs/types"
import { FejlecMenuPont } from "@lib/util/fejlec-menu-pontok"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useEffect, useId, useState } from "react"

type Category = HttpTypes.StoreProductCategory

/**
 * A MOBIL FEJLEC MENUJE (P1b, 2026-09-29).
 *
 * A Figma mobil fejlece (220:3 a kanonikus, 196:4 es 226:123 ugyanigy) egy
 * KET VONALAS menu-ikont rajzol a bal szelen: 20x1.5 pixeles vonalak, 4 pixel
 * kozzel, a mod cimszineben. Mogotte panel nincs a tervben, tehat a panel
 * tartalma a meglevo fejlec kepessegeibol all ossze, uj funkcio nelkul:
 *
 *   - a menupontok, ugyanaz a nyolc, mint az asztali menuben
 *     (`fejlecMenuPontok`), de itt mind kozvetlen link;
 *   - a kereso, ugyanarra a `/store` lapra, ugyanazzal a `q` mezovel;
 *   - a fiok linkje.
 *
 * Asztalon (`small` fole) rejtve: ott az asztali menu es kereso all.
 */
export const MobilMenu = ({
  pontok,
  keresoCel,
}: {
  pontok: FejlecMenuPont<Category>[]
  keresoCel: string
}) => {
  const [nyitva, setNyitva] = useState(false)
  const panelId = useId()
  const cel = (pont: FejlecMenuPont<Category>) =>
    pont.tipus === "gyoker"
      ? `/categories/${pont.kategoria.handle}`
      : pont.tipus === "oldal"
        ? `/categories/${pont.handle}`
        : `/hamarosan/${pont.tema}`

  useEffect(() => {
    if (!nyitva) return
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setNyitva(false)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [nyitva])

  return (
    <div className="small:hidden">
      <button
        type="button"
        className="flex h-[32px] w-[20px] flex-col items-start justify-center gap-[4px]"
        aria-expanded={nyitva}
        aria-controls={panelId}
        aria-label={nyitva ? "Menü bezárása" : "Menü megnyitása"}
        onClick={() => setNyitva((most) => !most)}
        data-testid="mobil-menu-gomb"
      >
        <span className="block h-[1.5px] w-[20px] bg-acr-mode-heading" />
        <span className="block h-[1.5px] w-[20px] bg-acr-mode-heading" />
      </button>
      <div
        id={panelId}
        hidden={!nyitva}
        className="absolute inset-x-0 top-full border-b border-acr-mode-border bg-acr-mode-bg px-[18px] pb-6 pt-4"
        data-testid="mobil-menu-panel"
      >
        <form
          action={keresoCel}
          method="get"
          className="mb-4 border-b border-acr-mode-border"
        >
          <label className="sr-only" htmlFor="mobil-kereso-mezo">
            Keresés
          </label>
          <input
            id="mobil-kereso-mezo"
            type="search"
            name="q"
            placeholder="Keresés"
            className="h-[40px] w-full bg-transparent text-[15px] text-acr-mode-heading outline-none placeholder:text-acr-mode-text"
          />
        </form>
        <ul className="flex flex-col">
          {pontok.map((pont) => (
            <li key={pont.felirat}>
              <LocalizedClientLink
                href={cel(pont)}
                className="block py-[10px] text-[15px] text-acr-mode-heading"
                onClick={() => setNyitva(false)}
                data-testid={`mobil-menu-pont-${pont.felirat}`}
              >
                {pont.felirat}
              </LocalizedClientLink>
            </li>
          ))}
          <li>
            <LocalizedClientLink
              href="/account"
              className="block py-[10px] text-[15px] text-acr-mode-text"
              onClick={() => setNyitva(false)}
            >
              Fiók
            </LocalizedClientLink>
          </li>
        </ul>
      </div>
    </div>
  )
}
