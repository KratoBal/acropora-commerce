"use client"

import { useId, useState } from "react"

type ProductDescriptionTabsProps = {
  description: string | null
}

type Tab = {
  label: string
  html: string
}

const TABLE_PATTERN = /<table\b[^>]*>[\s\S]*?<\/table\s*>/gi

const hasVisibleContent = (html: string) =>
  html
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .trim().length > 0

/**
 * The description has already been sanitized before it reaches the storefront.
 * This component only separates its existing HTML tables; it deliberately does
 * not alter, sanitize, or interpret their contents.
 */
const ProductDescriptionTabs = ({
  description,
}: ProductDescriptionTabsProps) => {
  const baseId = useId()
  const tables = description?.match(TABLE_PATTERN) ?? []
  const prose = description?.replace(TABLE_PATTERN, "") ?? ""
  /*
    AZ ADAT-FUL ALL ELOL, A LEIRAS MASODIK -- ES EZ A TERVBOL JON.

    A tervlap NEGY keretében all ful-sav, es MIND A NEGYBEN a "Leírás" a
    MASODIK elem:

        2a asztali    Gondozás | Leírás | Vízparaméterek | Élőállat-szállítás | Értékelések
        2a mobil      Gondozás | Leírás | Szállítás
        1b asztali    Műszaki adatok | Leírás | Spektrum & PAR | Értékelések | Letöltések
        1b mobil      Adatok | Leírás | Értékelés

    Elottünk mindenhol az ADAT all, csak a neve mas vilagonkent. Nalunk ma
    ketto ful van (a leiras szovege es a belole kihamozott tablazat), tehat
    a terv sorrendjebol annyi kovetheto, hogy a tablazat megy elore.

    ES A KEZDO FUL IS EZZEL VALTOZIK, mert az `activeIndex` nullarol indul.
    Ez SZANDEKOS es a tervbol merve: mind a negy kereten a ful-sav ALATT a
    tablazatos adat all kirajzolva ("Nehézség | Haladó", "Teljesítmény |
    160 W"), nem a prozai szoveg -- vagyis a terven is az elso, adat-ful az
    aktiv.

    (Forras: exchange/design-balazs/termeklap-1b-es-2a-2026-09-07.html)
  */
  const tabs: Tab[] = [
    ...(tables.length
      ? [{ label: "Műszaki adatok", html: tables.join("") }]
      : []),
    ...(hasVisibleContent(prose) ? [{ label: "Leírás", html: prose }] : []),
  ]
  const [activeIndex, setActiveIndex] = useState(0)

  if (!tabs.length) return null
  if (tabs.length === 1) {
    return (
      <div
        className="text-medium text-ui-fg-subtle prose prose-sm max-w-none"
        data-testid="product-description"
        dangerouslySetInnerHTML={{ __html: tabs[0].html }}
      />
    )
  }

  const activeTab = tabs[activeIndex] ?? tabs[0]
  return (
    <div data-testid="product-description-tabs">
      <div
        className="flex border-b border-ui-border-base"
        role="tablist"
        aria-label="Termékadatok"
      >
        {tabs.map((tab, index) => {
          const selected = index === activeIndex
          return (
            <button
              key={tab.label}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${index}`}
              id={`${baseId}-tab-${index}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActiveIndex(index)}
              className={`px-4 py-3 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ui-fg-interactive ${selected ? "border-b-2 border-ui-fg-interactive text-ui-fg-base" : "text-ui-fg-muted hover:text-ui-fg-base"}`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
      <div
        id={`${baseId}-panel-${activeIndex}`}
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-${activeIndex}`}
        className="pt-4 text-medium text-ui-fg-subtle prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: activeTab.html }}
      />
    </div>
  )
}

export default ProductDescriptionTabs
