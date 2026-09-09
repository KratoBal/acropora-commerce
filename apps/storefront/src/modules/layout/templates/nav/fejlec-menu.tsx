"use client"

import { ArrowRightMini } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { KeyboardEvent, useEffect, useId, useRef, useState } from "react"

type Category = HttpTypes.StoreProductCategory

/** Explicit navigation decision; this is not derived from the category tree. */
const HEADER_MENU_ITEMS = ["Termékek", "Halak", "Korallok", "Gerinctelenek"]
/**
 * A GYORSLINKEK -- ES CSAK AZ EGYIKNEK VAN CELPONTJA.
 *
 * Balazs kerese (2026-09-09 17:42, acrobot atadasaban): "a Gyorslikek is kell
 * a bal oldalra ahogy most is van csak ugyanugy kicsiben ott elso korben
 * Akciok, Új termékek".
 *
 * === A MERES, MIELOTT BARMIT BEKOTOTTEM ===
 *
 *   "Új termékek"   VAN CELPONT: a lista mar ma is tud rendezni datum
 *                   szerint (`sortBy=created_at`, a felulet "Legújabbak"
 *                   neven kinalja). A hivatkozas tehat nem uj kepesseg,
 *                   csak egy MEGLEVO ut rovidebb eleresе.
 *
 *   "Akciók"        NINCS CELPONT, es ezt megmertem, nem feltetelezem:
 *                     a bolt gyujtemenyeinek szama          NULLA
 *                     akcio/kedvezmeny szuro a kirakatban   NINCS
 *                   Vagyis nem egy hivatkozas hianyzik, hanem az a felulet,
 *                   ami az akcios termekeket kilistazna.
 *
 * === ES AMIT EBBOL NEM CSINALOK ===
 *
 * NEM talalok ki celpontot. Egy `/store` hivatkozas "Akciók" nev alatt olyan
 * lapra vinne, ami MINDEN terméket mutat -- az nem rovidebb ut, hanem hamis
 * igeret. Hogy mi legyen az akcios lap, Balazs dontese.
 *
 * Amig nincs, a tetel NEM NEZ KI LINKNEK. Ez ugyanaz a hatar, amit ma a
 * bolyegkep-sornal es a ket gombnal is huztunk: ami kattinthatonak latszik es
 * nem az, rosszabb a hianyanal.
 */
type Gyorslink = { cimke: string; ut?: string }

const QUICK_LINKS: Gyorslink[] = [
  { cimke: "Akciók" },
  { cimke: "Új termékek", ut: "/store?sortBy=created_at" },
]
/*
  A PANEL A TELJES FEJLEC ALATT KEZDODIK.

  Itt korabban `calc(var(--fejlec-magassag) + 36px)` allt: a 36 a bizalmi sav
  magassaga volt, KEZZEL beirva. Az eredmeny helyes volt (115), de ugyanaz a
  szam a sav sajat stilusaban is ott allt -- ket hely, egy szabaly.
*/
const PANEL_TOP = "var(--fejlec-teljes-magassag)"

const sortedChildren = (category: Category | undefined) =>
  [...(category?.category_children ?? [])].sort((a, b) =>
    a.name.localeCompare(b.name, "hu"),
  )

export const FejlecMenu = ({
  kategoriak,
  nevek,
}: {
  kategoriak: Category[]
  /**
   * A MEGJELENITENDO NEVEK, AZONOSITO SZERINT -- A BETOLTOTOL, NEM ITT SZAMOLVA.
   *
   * A menu eddig FELTETEL NELKUL vagta le a szulo nevet (`rovidNev`). Az a
   * vagas a mai adaton helyes, a kategoria-betoltes UTAN viszont pont azt a
   * szulo-utotagot vinne el a 77 UTKOZO kategoriarol, amit a dontes
   * szandekosan megtart -- es a hiba akkor jelenne meg, tehat regressziónak
   * latszana, holott ma keletkezne.
   *
   * Az egyedisegrol csak a TELJES katalogus tud dontenni, es az itt nincs meg:
   * a menu a NEM URES GYOKEREKET kapja. Ezert jon a terkep keszen, a
   * betoltobol, ahol a teljes lista amugy is a kezben van -- uj lekerdezes
   * nelkul.
   */
  nevek?: Map<string, string>
}) => {
  const [openName, setOpenName] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [panelLeft, setPanelLeft] = useState(16)
  const categoryButtons = useRef<(HTMLButtonElement | null)[]>([])
  const panelId = useId()
  /*
    A TARTALEK NEM A ROVID ALAK, HANEM A TELJES NEV.

    Ha egy azonosito nincs a terkepen (peldaul mert a hivo nem adott terkepet),
    a TELJES nev a biztonsagos valasztas: az sosem ketertelmu. A rovid alakra
    esni vissza azt jelentene, hogy a hianyzo adat CSENDBEN visszahozza a
    feltetel nelkuli vagast -- pontosan azt, amit ez a valtozas megszuntet.
  */
  const nev = (category: Category) =>
    nevek?.get(category.id) ?? (category.name ?? "").trim()

  const root = kategoriak.find((category) => category.name === openName)
  const categories = sortedChildren(root)

  const close = () => {
    setOpenName(null)
    setExpandedId(null)
  }

  useEffect(() => {
    if (!openName) return
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") close()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [openName])

  const toggle = (name: string, element: HTMLButtonElement) => {
    if (openName === name) return close()
    const rect = element.getBoundingClientRect()
    setPanelLeft(Math.max(16, Math.min(rect.left, window.innerWidth - 1080)))
    setOpenName(name)
    setExpandedId(null)
  }

  const navigate = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return
    event.preventDefault()
    const next =
      event.key === "ArrowDown"
        ? (index + 1) % categories.length
        : (index - 1 + categories.length) % categories.length
    categoryButtons.current[next]?.focus()
  }

  return (
    <>
      {/*
        A SAV MAGAN BELUL GORGET, ES NEM FESZITI SZET A LAPOT.

        === A MERT HIBA (2026-09-09, kitelepitett lap, 390 keppontos nezet) ===

            a nezet szelessege       390
            a lap scrollWidth-je     575
            tullogo elem             9, a lanc a kategoria-savtol indul

        Vagyis a TELJES lap vizszintesen gorgethetove valt egy telefonon --
        MINDEN lapon, nem csak a termeklapon (a nyitolapon es a listan is
        merve, ugyanaz a 575).

        Az ok a `shrink-0` volt ezen a savon: a negy menupont 313 keppontot
        foglal, es 390-nel nem zsugorodott, hanem KITOLTA a kosar-linket
        575-ig.

        === A LEGKISEBB VALTOZAS, ES AMIT SZANDEKOSAN NEM DONT EL ===

        `min-w-0` plusz `overflow-x-auto`: a sav a sajat hataran belul gorget,
        es SEMMI nem tunik el. Ez NEM a mobil fejlec vegleges alakja -- az
        kulon dontes (osszecsukott menu, gorgetheto sav, vagy a negy nev
        elrejtese), es a `f62f4061` kartyan all.

        Amit ez a valtozas allit: egy lap ne legyen vizszintesen gorgetheto egy
        telefonon. Az nem izles-kerdes, es nem var a mobil nezet dontesere.

        === A JAVITAST A KISZOLGALT LAPON PROBALTAM KI, MIELOTT MEGIRTAM ===

        Ugyanezt a harom osztaly-valtozast futtattam ra a kitelepitett lapra
        bongeszobol: a scrollWidth 575-rol 390-re esett, es a sav magan belul
        gorgetheto lett (112 keppont szeles). Vagyis nem a jelolesbol
        kovetkeztetek a hatasra.
      */}
      <nav
        className="flex min-w-0 items-center gap-4 overflow-x-auto"
        aria-label="Kategóriák"
      >
        {HEADER_MENU_ITEMS.map((name) => (
          <button
            key={name}
            type="button"
            className="text-[14px] font-semibold"
            aria-controls={panelId}
            aria-expanded={openName === name}
            onClick={(event) => toggle(name, event.currentTarget)}
            data-testid={`category-menu-trigger-${name}`}
          >
            {name}
          </button>
        ))}
      </nav>

      {openName ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[60] cursor-default bg-black/35"
            onClick={close}
            aria-label="Kategóriamenü bezárása"
            data-testid="category-menu-backdrop"
          />
          {/*
            A PANEL NEM DIALOGUS, HANEM LENYILO -- ES A MARKUP TOBBI RESZE MAR
            MA IS EZT MONDTA.

            === A HAROM JELOLES, AMI NEM UGYANAZT MONDTA ===

                a nyito gombokon   aria-expanded + aria-controls   lenyilo
                itt               role="dialog"                    dialogus
                a fokuszban       nincs csapda, nincs aria-modal   nem modalis

            Egy `role="dialog"` azt igeri a felolvasonak, hogy egy elkulonult
            reteg nyilt meg, amibol a Tab nem lep ki. Itt kilep: a billentyuzet
            szabadon vegigmegy a lap mogottes tartalman.

            === ES A KOVETKEZMENY MERHETO, NEM ELMELETI ===

            A hatterlap (`fixed inset-0`, `bg-black/35`) az EGERTOL elzarja a
            mogottes lapot: barhova kattintasz, azt talalod, es a menu bezarul.
            A BILLENTYUZET viszont belesetal ugyanabba a tartalomba. Ket
            bemeneti eszkoz mast lat ugyanarrol a lapreszrol.

            === KET UT VOLT, ES EZ AZ OLCSOBB ES A HELYESEBB ===

            Vagy dialogus marad, es akkor jar hozza `aria-modal` ES
            fokusz-csapda (tobb kod, es egy fejlec-gombhoz tapado lenyilonal
            szokatlan) -- vagy lekerul a szerep, es a jeloles egysegesen a
            lenyilo mintat mondja. A gombokon MAR OTT ALL az `aria-expanded`
            es az `aria-controls`, tehat ez a valtozas nem vezet be uj mintat,
            hanem megszunteti az egyetlen kivetelt.

            Az `aria-label` MARAD: a szakasznak igy is van neve, es a
            `category-menu-panel` jelolo valtozatlan.
          */}
          <section
            id={panelId}
            aria-label={`${openName} kategóriamenü`}
            /*
              A PANEL SAJAT MAGAN BELUL GORGET, MERT AZ ALJA MA ELERHETETLEN.

              MERVE 2026-09-09, a kitelepitett lapon:

                  a panel pozicioja           fixed
                  a panel teteje              y=115 gorgetes ELOTT ES UTAN
                  az utolso link alja         1260, mind a ket allapotban
                  a lap maga                  1259 magas
                  vagyis osszesen gorgetheto  359 keppont

              A panel FIX, tehat a lap gorgetese nem mozditja: a huszonharom
              kategoriabol az also resz SEHOGY nem erheto el. Nem
              kenyelmetlenseg, hanem elerhetetlen tartalom.

              Ket nezetmagassagon merve, mennyi log ki a nezet aljan:

                  900 magas nezet    381 keppont
                  700 magas nezet    581 keppont -- a lista tobb mint fele

              A KORLAT A MEGLEVO VALTOZOBOL SZAMOL, nem egy talalt szambol: a
              panel teteje `--fejlec-teljes-magassag`, tehat pontosan annyi
              hely marad neki, amennyi a fejlec alatt van. Az `1rem` a lap
              aljan hagyott levegő, ugyanaz az ertek, mint a jobb oldali
              vasarlasi panelnel.

              ES AMI EZ NEM: nem a vegleges alak. Hogy a menu tobb oszlopba
              keruljon-e, vagy rovidebb listat mutasson, KULON dontes, es
              Balazsnal all. Ez a valtozas csak azt szunteti meg, hogy addig is
              elerhetetlen legyen valami -- mind a harom ut mellett all: ha a
              lista rovid lesz, ez a gorgetes egyszeruen nem sul el.

              ES AZ `overflow-x-hidden` NEM DISZ: itt korabban `overflow-hidden`
              allt (a lekerekitett also sarkok levagasahoz). Ha csak az
              `overflow-y-auto` maradna, a masik tengely a CSS szabalya szerint
              `visible`-rol `auto`-ra valtana -- vagyis a panel VIZSZINTESEN is
              gorgethetove valna. Pontosan az a hiba, amit ma a fejlecen
              javitottunk (`ff12ccb4`), csak egy szinttel beljebb.
            */
            className="fixed z-[61] w-[min(1064px,calc(100vw-2rem))] overflow-x-hidden overflow-y-auto rounded-b-xl border shadow-xl"
            style={{
              top: PANEL_TOP,
              left: `${panelLeft}px`,
              maxHeight: "calc(100vh - var(--fejlec-teljes-magassag) - 1rem)",
              background: "var(--terv-hatter)",
              borderColor: "var(--terv-keret)",
              color: "var(--terv-szoveg)",
            }}
            data-testid="category-menu-panel"
          >
            <div className="grid grid-cols-1 md:grid-cols-[190px_minmax(0,1fr)_280px]">
              <aside
                className="p-5"
                style={{
                  background: "var(--terv-kiemel)",
                  color: "var(--terv-kiemel-szoveg)",
                }}
                data-testid="category-menu-quick-links"
              >
                <h2 className="text-lg font-semibold">Gyorslinkek</h2>
                <ul className="mt-5 space-y-3 text-sm">
                  {QUICK_LINKS.map((gyors) => (
                    <li key={gyors.cimke}>
                      {gyors.ut ? (
                        <LocalizedClientLink
                          className="font-semibold hover:underline"
                          href={gyors.ut}
                          onClick={close}
                          data-testid="category-menu-quick-link"
                        >
                          {gyors.cimke}
                        </LocalizedClientLink>
                      ) : (
                        /*
                          CELPONT NELKUL NEM LINK-KINEZET: nincs `font-semibold`
                          es nincs alahuzas lebegtetesre. A szoveg ott all --
                          Balazs kerte --, de nem iger kattintast.
                        */
                        <span data-testid="category-menu-quick-varakozo">
                          {gyors.cimke}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </aside>
              <section
                className="border-y p-4 md:border-y-0 md:border-r"
                style={{ borderColor: "var(--terv-keret)" }}
                aria-label={`${openName} fő kategóriái`}
                data-testid="category-menu-categories"
              >
                <h2 className="text-sm font-semibold uppercase tracking-wide">
                  {openName}
                </h2>
                {root ? (
                  <ul className="mt-3 space-y-1">
                    {categories.map((category, index) => {
                      const children = sortedChildren(category)
                      const expanded = expandedId === category.id
                      return (
                        <li key={category.id}>
                          <div className="flex min-h-11 items-center rounded-md hover:bg-[var(--terv-hatter-halvany)]">
                            <LocalizedClientLink
                              href={`/categories/${category.handle}`}
                              onClick={() =>
                                setExpandedId(expanded ? null : category.id)
                              }
                              className="min-w-0 flex-1 px-3 py-2 text-sm font-medium"
                              data-testid="category-menu-category-link"
                            >
                              {/*
                                A ROVID NEV ITT IS -- a szulo a NYITOTT gyoker.

                                A bolt neveiben a szulo neve is ott all
                                (`SPS - Korallok`). A morzsamenu es a
                                kategoria-lap a rovid alakot mutatja; ha a menu
                                a teljeset mutatna, a latogato MAS feliratot
                                latna a linken, mint a megnyitott lapon.

                                Egy szint eleg, nem kell lanc: a szulo maga a
                                nyitott gyoker, aminek nincs felette semmi.
                              */}
                              {nev(category)}
                            </LocalizedClientLink>
                            <button
                              ref={(element) => {
                                categoryButtons.current[index] = element
                              }}
                              type="button"
                              className="m-1 grid h-8 w-8 place-items-center rounded border"
                              style={{ borderColor: "var(--terv-keret)" }}
                              aria-label={`${nev(category)} alkategóriái`}
                              aria-expanded={expanded}
                              onClick={() =>
                                setExpandedId(expanded ? null : category.id)
                              }
                              onKeyDown={(event) => navigate(event, index)}
                              data-testid="category-menu-category-expand"
                            >
                              <ArrowRightMini
                                aria-hidden="true"
                                className={expanded ? "rotate-90" : ""}
                              />
                            </button>
                          </div>
                          {expanded ? (
                            children.length > 0 ? (
                              <ul
                                className="grid grid-cols-2 gap-2 px-3 pb-3 pt-1 sm:grid-cols-3"
                                data-testid="category-menu-subcategory-tiles"
                              >
                                {children.map((child) => (
                                  <li key={child.id}>
                                    <LocalizedClientLink
                                      href={`/categories/${child.handle}`}
                                      onClick={close}
                                      className="block rounded-md border px-3 py-2 text-xs font-medium hover:bg-[var(--terv-hatter-halvany)]"
                                      style={{
                                        borderColor: "var(--terv-keret)",
                                      }}
                                    >
                                      {/*
                                        HARMADIK SZINT: a szulo a MASODIK szint
                                        ROVID neve, nem a teljes -- kulonben a
                                        levagas nem talalna.
                                      */}
                                      {nev(child)}
                                    </LocalizedClientLink>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p
                                className="px-3 pb-3 text-xs"
                                style={{ color: "var(--terv-szoveg-halvany)" }}
                              >
                                Ehhez a kategóriához nincs elérhető
                                alkategória-adat.
                              </p>
                            )
                          ) : null}
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                  <p
                    className="mt-3 text-sm"
                    style={{ color: "var(--terv-szoveg-halvany)" }}
                  >
                    Ehhez a menüponthoz nincs elérhető kategória-adat.
                  </p>
                )}
              </section>
              <aside className="p-5" data-testid="category-menu-editorial-card">
                {/* Temporary editorial mock: final content needs a separate decision. */}
                <div
                  className="overflow-hidden rounded-lg border"
                  style={{ borderColor: "var(--terv-keret)" }}
                >
                  <div
                    className="grid h-28 place-items-center bg-[var(--terv-hatter-halvany)]"
                    role="img"
                    aria-label="Ideiglenes korallábrázolás"
                  >
                    <svg
                      viewBox="0 0 160 80"
                      className="h-20 w-40"
                      aria-hidden="true"
                    >
                      <path
                        d="M80 72V40M80 48 54 24M80 48l26-24M54 24 37 15M54 24l-5-18M106 24l17-9M106 24l5-18"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="5"
                        strokeLinecap="round"
                      />
                      <circle cx="80" cy="40" r="9" fill="currentColor" />
                    </svg>
                  </div>
                  <div className="p-4">
                    <p
                      className="text-xs font-semibold uppercase tracking-wide"
                      style={{ color: "var(--terv-kiemel-tinta)" }}
                    >
                      Útmutató
                    </p>
                    <h2 className="mt-1 text-base font-semibold">
                      Így állítsd össze az első zátonyakváriumodat
                    </h2>
                    <p
                      className="mt-2 text-sm"
                      style={{ color: "var(--terv-szoveg-halvany)" }}
                    >
                      Eszközök, élő kövek és az első lakók sorrendje egy helyen.
                    </p>
                    <span
                      className="mt-3 inline-block text-sm font-semibold"
                      style={{ color: "var(--terv-kiemel-tinta)" }}
                    >
                      Cikk megnyitása →
                    </span>
                  </div>
                </div>
              </aside>
            </div>
          </section>
        </>
      ) : null}
    </>
  )
}
