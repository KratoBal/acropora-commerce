"use client"

import { useId, useState } from "react"

type ProductDescriptionTabsProps = {
  description: string | null
}

type Tab = {
  label: string
  /**
   * A TELEFONON HASZNALT, ROVIDEBB FELIRAT -- CSAK OTT, AHOL A TERV MAST AD.
   *
   * A tervlap mobil kerete a ful-cimkeket NEM csak rovidíti, hanem AT IS
   * NEVEZI: az 1b lapon "Műszaki adatok" helyett "Adatok" all. (picasso
   * leirasa a terv mobil szakaszarol, 2026-09-09.)
   *
   * Ahol a ket alak AZONOS (a "Leírás" mindket kereten ugyanaz), ott ez a
   * mezo hianyzik -- egy `rovidCimke: "Leírás"` sor azt sugallna, hogy van
   * kulonbseg, holott nincs.
   */
  rovidCimke?: string
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
/**
 * A FULEK A TERV SAJAT TOKENJEIN ALLNAK, NEM NYERS MEDUSA-OSZTALYOKON.
 *
 * === AMI ITT ALLT, ES A LEGFONTOSABB EGY SOR ===
 *
 * Az AKTIV ful alavonasa `border-ui-fg-interactive` volt, ami rgb(59,130,246)
 * -- Tailwind blue-500. Ez a szin a design-rendszerunkben SEHOL maskent nem
 * fordul elo: idegen szin egy MUKODO komponensen. A terv az aktiv fult a lap
 * SAJAT szovegszinevel jeloli, nem kulon akcentszinnel.
 *
 * A hat par (picasso merese, 2026-09-10):
 *
 *   border-ui-border-base       -> var(--terv-keret)
 *   border-ui-fg-interactive    -> var(--terv-szoveg)          (kek -> lap-szin)
 *   text-ui-fg-base             -> var(--terv-szoveg)
 *   text-ui-fg-muted            -> var(--terv-szoveg-halvany)
 *   outline-ui-fg-interactive   -> var(--terv-kiemel)          (rez fokusz-gyuru)
 *   text-ui-fg-subtle           -> var(--terv-szoveg-halvany)
 *
 * A BETUTIPUS NEM ERINTETT: mind a harom resz mar a lap sajat fontjat orokli.
 *
 * === AMIT EZ A CSERE NEM ER EL, ES EZ MERVE VAN ===
 *
 * A ful-panel TARTALMA nem JSX: `dangerouslySetInnerHTML` toltifel, a HTML
 * pedig a termek leirasabol jon. A benne allo `table table-condensed`,
 * `attr-label` es `attr-value` osztalyok a TAROLT szovegben vannak, nem nalunk:
 *
 *   a kirakat forrasaban          0 elofordulas (mind a harom osztalyra)
 *   a kiszolgalt lapon            3 / 9 / 9 elofordulas
 *
 * Vagyis a panel BELSEJE ettol a valtozastol nem mozdul. Ha az is a tervhez
 * igazodik, az MASIK munka: vagy a tarolt HTML-t kell atirni, vagy egy globalis
 * szabalyt kell rea adni -- es a ketto kozott dontes kell, nem szerkesztés.
 *
 * (Picasso ezt kerdesként jelezte, nem allitaskent; a fenti ket szam a valasz.)
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
      ? [
          {
            label: "Műszaki adatok",
            rovidCimke: "Adatok",
            html: tables.join(""),
          },
        ]
      : []),
    ...(hasVisibleContent(prose) ? [{ label: "Leírás", html: prose }] : []),
  ]
  const [activeIndex, setActiveIndex] = useState(0)

  if (!tabs.length) return null
  if (tabs.length === 1) {
    return (
      <div
        className="text-medium prose prose-sm max-w-none text-[var(--terv-szoveg-halvany)]"
        data-testid="product-description"
        dangerouslySetInnerHTML={{ __html: tabs[0].html }}
      />
    )
  }

  const activeTab = tabs[activeIndex] ?? tabs[0]
  return (
    <div data-testid="product-description-tabs">
      <div
        className="flex border-b border-[var(--terv-keret)]"
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
              className={`px-4 py-3 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--terv-kiemel)] ${selected ? "border-b-2 border-[var(--terv-szoveg)] text-[var(--terv-szoveg)]" : "text-[var(--terv-szoveg-halvany)] hover:text-[var(--terv-szoveg)]"}`}
            >
              {/*
                KET FELIRAT, EGY GOMB -- ES NEM KET GOMB.

                A rovid alak `lg:hidden`, a teljes `hidden lg:inline`. Ket
                KULON gomb eseten a szerep-jeloles (`role="tab"`,
                `aria-selected`, `aria-controls`) es a fokusz-kezeles KETSZER
                allna itt, es a felolvaso KET fület latna egy helyett.

                A toresponti hatar `lg`, ugyanaz, ahol a termeklap egy
                oszlopbol kettobe valt.
              */}
              {tab.rovidCimke ? (
                <>
                  <span className="lg:hidden">{tab.rovidCimke}</span>
                  <span className="hidden lg:inline">{tab.label}</span>
                </>
              ) : (
                tab.label
              )}
            </button>
          )
        })}
      </div>
      <div
        id={`${baseId}-panel-${activeIndex}`}
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-${activeIndex}`}
        className="pt-4 text-medium prose prose-sm max-w-none text-[var(--terv-szoveg-halvany)]"
        dangerouslySetInnerHTML={{ __html: activeTab.html }}
      />
    </div>
  )
}

export default ProductDescriptionTabs
