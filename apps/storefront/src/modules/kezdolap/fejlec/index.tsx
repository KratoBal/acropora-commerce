import { Suspense } from "react"

import { listNonEmptyRootCategories } from "@lib/data/categories"
import { getRegion } from "@lib/data/regions"
import { fejlecMenuPontok } from "@lib/util/fejlec-menu-pontok"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CartButton from "@modules/layout/components/cart-button"
import { KosarLink } from "@modules/layout/components/cart-dropdown/kosar-link"
import { MobilMenu } from "@modules/layout/templates/nav/mobil-menu"
import MintaJelzo from "@modules/kezdolap/components/minta-jelzo"
import type { Szovegek } from "@modules/kezdolap/szovegek"
import { menuPontok } from "./menu-adat"
import { KezdolapMenu } from "./menu"

const SAV_KULCSOK = [
  "fejlec.sav.1",
  "fejlec.sav.2",
  "fejlec.sav.3",
  "fejlec.sav.4",
]

/**
 * A KEZDOLAP FEJLECE A CLAUDE DESIGN TERV SZERINT (Balazs, 2026-10-20: "a menu
 * az legyen amit a design csinalt"): felso info-sav, logo, a fo pontok a
 * lenyilo panellel, kereso, Fiokom es Kosar.
 *
 * A TARTALOM A MI ADATUNK: a lenyilo oszlopai es linkjei a valodi Medusa
 * kategoriakbol jonnek (`menu-adat.ts`), az info-sav, a menupontok feliratai es
 * a kartyak szovege szerkesztheto, mint a kezdolap tobbi szovege. A kosar a
 * valodi kosar (a meglevo `CartButton`), a mobil menu a meglevo `MobilMenu`
 * ugyanazokkal a kategoriakkal.
 *
 * A fejlec a kezdolap sajat elrendezeseben all (`(kezdolap)/layout.tsx`); a
 * tobbi lap a regi fejlecet kapja, amig Balazs mast nem mond.
 */
export default async function KezdolapFejlec({
  s,
  countryCode,
}: {
  s: Szovegek
  countryCode: string
}) {
  const region = await getRegion(countryCode)
  const menuAdat = region
    ? await listNonEmptyRootCategories(region.id)
    : { gyokerek: [], nevek: new Map<string, string>() }
  const pontok = menuPontok(s, menuAdat.gyokerek, menuAdat.nevek)
  const mobilPontok = fejlecMenuPontok(menuAdat.gyokerek)
  const mintaSav = SAV_KULCSOK.some((k) => s.minta(k))
  const kereso = s.szoveg("fejlec.kereso")

  return (
    <div
      className="sticky inset-x-0 top-0 z-50"
      style={{ background: "var(--kl-lap)" }}
    >
      <header
        className="relative font-acr-sans"
        style={{ color: "var(--kl-szoveg)", background: "var(--kl-lap)" }}
        data-testid="kl-fejlec"
      >
        <div
          className="hidden text-[13px] tracking-[0.01em] small:block"
          style={{ background: "var(--kl-navy-mely)", color: "#DCE7EF" }}
          data-testid="kl-info-sav"
        >
          <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-6 px-16 py-[10px]">
            <div className="flex gap-7">
              <span>{s.szoveg("fejlec.sav.1")}</span>
              <span>{s.szoveg("fejlec.sav.2")}</span>
            </div>
            <div className="flex items-center gap-6">
              <span>{s.szoveg("fejlec.sav.3")}</span>
              <span
                className="font-semibold"
                style={{ color: "var(--kl-lap)" }}
              >
                {s.szoveg("fejlec.sav.4")}
              </span>
              {mintaSav ? <MintaJelzo mit="info-sáv" /> : null}
            </div>
          </div>
        </div>

        <div className="border-b" style={{ borderColor: "var(--kl-keret)" }}>
          <div className="mx-auto flex h-[84px] w-full max-w-[1440px] items-stretch gap-6 px-4 small:gap-12 small:px-16">
            <div className="flex items-center small:hidden">
              <MobilMenu
                pontok={mobilPontok}
                keresoCel={`/${countryCode}/store`}
              />
            </div>
            <LocalizedClientLink
              href="/"
              className="flex shrink-0 items-center"
              data-testid="kl-logo"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/acropora-logo.svg"
                alt="Acropora"
                className="block h-[58px] w-auto"
              />
            </LocalizedClientLink>
            <nav className="hidden small:flex" aria-label="Fő menü">
              <KezdolapMenu pontok={pontok} />
            </nav>
            <div className="ml-auto flex items-center gap-4 small:gap-[22px]">
              <form
                action={`/${countryCode}/store`}
                method="get"
                role="search"
                className="hidden h-11 w-[300px] items-center gap-[10px] overflow-hidden whitespace-nowrap rounded-full border px-[18px] text-[14px] small:flex"
                style={{
                  background: "var(--kl-feher)",
                  borderColor: "var(--kl-keret)",
                  color: "var(--kl-halvany)",
                }}
                data-testid="kl-kereso"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  aria-hidden="true"
                  className="shrink-0"
                >
                  <circle cx="7" cy="7" r="5.2" />
                  <path d="M11 11l3.5 3.5" />
                </svg>
                <label className="sr-only" htmlFor="kl-kereso-mezo">
                  {kereso}
                </label>
                <input
                  id="kl-kereso-mezo"
                  type="search"
                  name="q"
                  placeholder={kereso}
                  className="h-full w-full bg-transparent outline-none"
                  style={{ color: "var(--kl-szoveg)" }}
                />
              </form>
              <LocalizedClientLink
                href="/account"
                className="hidden min-h-6 items-center gap-2 text-[14px] font-medium small:flex"
                style={{ color: "var(--kl-szoveg)" }}
                data-testid="kl-fiok"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  aria-hidden="true"
                >
                  <circle cx="10" cy="7" r="3.6" />
                  <path d="M3.5 17.5c1-3.4 3.6-5 6.5-5s5.5 1.6 6.5 5" />
                </svg>
                Fiókom
              </LocalizedClientLink>
              {/*
                A KOSAR A TERV "KOSAR" GOMBJA (sotet tabletta), A MEGLEVO,
                VALODI KOSAR-LINKBOL. A link maga 13 pixeles szoveg 17 pixeles
                sormagassaggal, vagyis 17 pixel magas celpont: a CI akadaly-
                mentesseg-ellenorzese (`target-size`, WCAG 2.5.8) a kezdolapon
                ezt buktatta. A tabletta 44 pixel magas, tehat a celpont is.
              */}
              <div
                data-testid="kl-kosar"
                className="[&_a]:flex [&_a]:h-11 [&_a]:min-w-11 [&_a]:items-center [&_a]:justify-center [&_a]:rounded-full [&_a]:bg-[color:var(--kl-navy)] [&_a]:px-[18px] [&_a]:text-[color:var(--kl-lap)]"
              >
                <Suspense fallback={<KosarLink darab={0} />}>
                  <CartButton />
                </Suspense>
              </div>
            </div>
          </div>
        </div>
      </header>
    </div>
  )
}
