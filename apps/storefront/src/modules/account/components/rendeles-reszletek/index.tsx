import { HttpTypes } from "@medusajs/types"

import { cimSor } from "@lib/util/cim"
import { convertToLocale } from "@lib/util/money"
import {
  fizetesiMod,
  osszesitoSorok,
  termekTetelek,
  vegosszegCimke,
} from "@lib/util/rendeles-reszletek"
import {
  fizetesiAllapot,
  rendelesDatum,
  rendelesDatumRovid,
  rendelesSzam,
  type UzletiAllapot,
} from "@lib/util/rendelesek"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { CEG } from "@modules/layout/templates/footer/hivatkozasok"

import { AllapotCimke } from "../rendelesek"

type Rendeles = HttpTypes.StoreOrder

const Kartya = ({
  children,
  className = "",
  ...props
}: React.HTMLAttributes<HTMLElement>) => (
  <section
    className={
      "flex flex-col border border-acr-line bg-acr-white p-[14px] small:p-[18px] " +
      className
    }
    {...props}
  >
    {children}
  </section>
)

const Sor = ({ cimke, ertek }: { cimke: string; ertek: string }) => (
  <div className="flex items-center justify-between gap-3 text-[12.5px] leading-[16px] small:text-[13px] small:leading-[17px]">
    <span className="text-acr-slate">{cimke}</span>
    <span className="font-medium text-acr-ink">{ertek}</span>
  </div>
)

/**
 * A RENDELES RESZLETEI (P5, 249:96; mobilon 249:252).
 *
 * Fej: "RENDELÉSEM", a rendelesszam (600/36, mobilon 24) az allapot
 * cimkejevel, alatta datum, fizetesi mod, vegosszeg es fizetesi allapot.
 * Balra (872) Teljesítés es Tételek, jobbra (404) Összesítés, Számlázás es a
 * "Kérdésed van?" doboz. Mobilon a keret fizetesi dobozzal indit (249:262), es
 * a kerdes gomb (249:303).
 *
 * Ami nem epul (docs/P5-LEFT-OUT.md): a szallitasi csoportok (P4), a
 * csomagkovetes, a "Számla letöltése" (nincs szamla-adat).
 */
export default function RendelesReszletek({
  rendeles,
  allapot,
  par = null,
}: {
  rendeles: Rendeles
  allapot: UzletiAllapot | null
  /**
   * P4-2: a rendelés párja ugyanabból a leadásból (a vegyes kosár kiszállított
   * és bolti átvételes rendelése), a felirattal és a részletei azonosítójával.
   */
  par?: { id: string; felirat: string } | null
}) {
  const penz = (osszeg: number | null | undefined) =>
    convertToLocale({
      amount: osszeg ?? 0,
      currency_code: rendeles.currency_code,
    })
  const mod = fizetesiMod(rendeles)
  const fizetes = fizetesiAllapot(rendeles.payment_status)
  const szam = rendelesSzam(rendeles.display_id)
  const tetelek = termekTetelek(rendeles)
  const szallitas = rendeles.shipping_methods?.[0]
  const szallitasiCim = rendeles.shipping_address
  const szamlazasi = rendeles.billing_address
  const levelCim = `mailto:${CEG.email}?subject=${encodeURIComponent(`Rendelés ${szam}`)}`
  const adoszam =
    typeof szamlazasi?.metadata?.tax_id === "string"
      ? (szamlazasi.metadata.tax_id as string)
      : ""

  return (
    <div
      className="flex flex-col gap-3 font-acr-sans small:gap-[18px]"
      data-testid="rendeles-reszletek-lap"
    >
      <LocalizedClientLink
        href="/account/orders"
        className="self-start text-[12.5px] leading-[16px] text-acr-slate underline underline-offset-2 hover:text-acr-ink"
        data-testid="vissza-rendelesekhez"
      >
        ‹ Rendeléseim
      </LocalizedClientLink>

      {/* FEJ (249:110; mobilon 249:257) */}
      <header className="flex flex-col gap-[6px] small:gap-[7px]">
        <p className="text-[10.5px] font-semibold uppercase leading-[14px] tracking-[1.1px] text-acr-heritage">
          Rendelésem
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <h1
            className="text-[24px] font-semibold leading-[31px] text-acr-ink small:text-[36px] small:leading-[47px]"
            data-testid="rendeles-szam"
          >
            {szam}
          </h1>
          {/* Mobilon (249:257) a fejben nincs cimke: az allapot a Teljesítés dobozban all. */}
          {allapot ? (
            <span className="hidden small:inline-flex">
              <AllapotCimke allapot={allapot} />
            </span>
          ) : null}
        </div>
        <p
          className="text-[12.5px] leading-[16px] text-acr-slate small:text-[14px] small:leading-[18px]"
          data-testid="rendeles-fej-sor"
        >
          <span className="small:hidden">
            {rendelesDatumRovid(rendeles.created_at)}
          </span>
          <span className="hidden small:inline">
            {rendelesDatum(rendeles.created_at)}
          </span>
          {mod ? (
            <span className="hidden small:inline">{` · ${mod}`}</span>
          ) : null}
          {` · ${penz(rendeles.total)}`}
          {fizetes ? ` · ${fizetes}` : ""}
        </p>
        {par ? (
          <LocalizedClientLink
            href={`/account/orders/details/${par.id}`}
            className="self-start text-[12.5px] leading-[16px] text-acr-ink underline underline-offset-2 hover:text-acr-heritage small:text-[14px] small:leading-[18px]"
            data-testid="rendeles-kapcsolt"
          >
            {par.felirat}
          </LocalizedClientLink>
        ) : null}
      </header>

      {/* MOBIL FIZETESI DOBOZ (249:262) */}
      <div className="flex flex-col gap-2 border border-acr-line bg-acr-mist p-[14px] small:hidden">
        <p className="text-[16px] font-semibold leading-[21px] text-acr-ink first-letter:uppercase">
          {fizetes || "Fizetés"}
        </p>
        <p className="text-[12.5px] leading-[16px] text-acr-slate">
          {[mod, penz(rendeles.total)].filter(Boolean).join(" · ")}
        </p>
      </div>

      <div className="flex flex-col gap-3 small:grid small:grid-cols-[minmax(0,872fr)_minmax(0,404fr)] small:items-start small:gap-7">
        <div className="flex flex-col gap-3 small:gap-[18px]">
          {/* TELJESITES (249:119) */}
          <Kartya
            className="gap-[10px] small:gap-3"
            data-testid="rendeles-teljesites"
          >
            <h2 className="text-[18px] font-semibold leading-[23px] text-acr-ink small:text-[23px] small:leading-[30px]">
              Teljesítés
            </h2>
            <div className="flex flex-col gap-1 small:gap-[7px] small:border small:border-acr-line small:bg-acr-mist small:p-[14px]">
              <div className="flex items-center gap-[10px]">
                <p className="text-[10px] font-semibold uppercase leading-[13px] text-acr-heritage">
                  Szállítás
                </p>
                {allapot ? (
                  <span className="hidden small:inline-flex">
                    <AllapotCimke allapot={allapot} />
                  </span>
                ) : null}
              </div>
              <p className="text-[13.5px] font-semibold leading-[18px] text-acr-ink small:text-[15px] small:leading-[20px]">
                {szallitas?.name ?? "Szállítási mód nincs megadva"}
              </p>
              {allapot ? (
                <p className="text-[11.8px] leading-[15px] text-acr-slate small:hidden">
                  {allapot.label}
                </p>
              ) : null}
              <p className="hidden text-[12.5px] leading-[16px] text-acr-slate small:block">
                {tetelek.map((t) => t.product_title ?? t.title).join(" + ")}
              </p>
              {szallitasiCim ? (
                <p className="hidden text-[12.3px] leading-[19px] text-acr-slate small:block">
                  Szállítási cím: {cimSor(szallitasiCim)}
                </p>
              ) : null}
            </div>
          </Kartya>

          {/* TETELEK (249:145) */}
          <Kartya className="gap-3" data-testid="rendeles-tetelek">
            <h2 className="text-[18px] font-semibold leading-[23px] text-acr-ink small:text-[23px] small:leading-[30px]">
              Tételek
            </h2>
            <ul className="flex flex-col">
              {tetelek.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center gap-[10px] border-b border-acr-line py-[15px] last:border-b-0"
                >
                  <span className="min-w-0 flex-1 text-[14px] font-semibold leading-[18px] text-acr-ink">
                    {t.product_title ?? t.title}
                  </span>
                  <span className="shrink-0 text-[12.5px] leading-[16px] text-acr-slate">
                    {t.quantity} db
                  </span>
                  <span className="shrink-0 text-[14px] font-medium leading-[18px] text-acr-ink">
                    {penz(t.total)}
                  </span>
                </li>
              ))}
            </ul>
          </Kartya>
        </div>

        <div className="flex flex-col gap-3 small:gap-[14px]">
          {/* OSSZESITES (249:172) */}
          <Kartya
            className="gap-2 small:gap-3"
            data-testid="rendeles-osszesites"
          >
            <h2 className="text-[18px] font-semibold leading-[23px] text-acr-ink small:text-[22px] small:leading-[29px]">
              Összesítés
            </h2>
            {osszesitoSorok(rendeles).map((s) => (
              <Sor key={s.cimke} cimke={s.cimke} ertek={penz(s.osszeg)} />
            ))}
            <div className="h-px bg-acr-line" />
            <Sor
              cimke={vegosszegCimke(rendeles.payment_status)}
              ertek={penz(rendeles.total)}
            />
            <div className="hidden small:block">
              <Sor
                cimke="Fizetés"
                ertek={[mod, fizetes].filter(Boolean).join(" · ")}
              />
            </div>
          </Kartya>

          {/* SZAMLAZAS (249:193) */}
          {szamlazasi ? (
            <Kartya className="gap-2" data-testid="rendeles-szamlazas">
              <h2 className="text-[18px] font-semibold leading-[23px] text-acr-ink small:text-[20px] small:leading-[26px]">
                Számlázás
              </h2>
              <p className="text-[13.5px] font-semibold leading-[18px] text-acr-ink">
                {szamlazasi.company ||
                  [szamlazasi.last_name, szamlazasi.first_name]
                    .filter(Boolean)
                    .join(" ")}
              </p>
              <p className="text-[12.5px] leading-[16px] text-acr-slate">
                {cimSor(szamlazasi)}
              </p>
              {adoszam ? (
                <p className="text-[12.5px] leading-[16px] text-acr-slate">
                  {adoszam}
                </p>
              ) : null}
            </Kartya>
          ) : null}

          {/* KERDES (249:200; mobilon gomb, 249:303) */}
          <section className="hidden flex-col gap-2 border border-acr-line bg-acr-mist p-[18px] small:flex">
            <h2 className="text-[15px] font-semibold leading-[20px] text-acr-ink">
              Kérdésed van a rendelésről?
            </h2>
            <p className="text-[12.5px] leading-[16px] text-acr-slate">
              Írj nekünk a rendelési számmal:{" "}
              <a
                href={levelCim}
                className="underline underline-offset-2 hover:text-acr-ink"
              >
                {CEG.email}
              </a>
            </p>
          </section>
          <a
            href={levelCim}
            className="flex h-[44px] items-center justify-center bg-acr-heritage text-[13px] font-semibold text-acr-white small:hidden"
            data-testid="rendeles-kerdes"
          >
            Kérdés a rendeléssel kapcsolatban
          </a>
        </div>
      </div>
    </div>
  )
}
