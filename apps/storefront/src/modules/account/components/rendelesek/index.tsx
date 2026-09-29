import { HttpTypes } from "@medusajs/types"

import { convertToLocale } from "@lib/util/money"
import {
  allapotFajta,
  fizetesiAllapot,
  kapcsoltFelirat,
  kapcsoltRendeles,
  rendelesCsoportok,
  rendelesDatum,
  rendelesDatumRovid,
  rendelesSzam,
  type RendelesSor,
  type UzletiAllapot,
} from "@lib/util/rendelesek"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

type Rendeles = HttpTypes.StoreOrder

const osszeg = (r: Rendeles) =>
  convertToLocale({ amount: r.total ?? 0, currency_code: r.currency_code })

const reszletek = (r: Rendeles) => `/account/orders/details/${r.id}`

const tetelSzam = (r: Rendeles) =>
  (r.items ?? []).reduce((db, t) => db + (t.quantity ?? 0), 0)

/**
 * Az allapot cimkeje (249:41; mobilon 249:220). A keret szovegstilusa
 * nagybetus (`textCase: UPPER`, 0.5 px betukoz); a szoveg maga a bolt neve.
 */
export function AllapotCimke({ allapot }: { allapot: UzletiAllapot }) {
  const fajta = allapotFajta(allapot.status)
  return (
    <span
      className={
        "inline-flex h-[24px] shrink-0 items-center border bg-acr-mist px-2 text-[9.5px] font-semibold uppercase leading-[12px] tracking-[0.5px] small:h-[26px] small:px-[9px] small:text-[10.5px] small:leading-[14px] " +
        (fajta === "nyitott"
          ? "border-acr-heritage text-acr-heritage"
          : fajta === "teljesitve"
            ? "border-[#2fa85f] text-acr-ink"
            : "border-acr-line text-acr-slate")
      }
      data-testid="rendeles-allapot"
      data-fajta={fajta}
    >
      {allapot.label}
    </span>
  )
}

/**
 * A NYITOTT RENDELES KARTYAJA (249:38; mobilon 249:217). A keret szallitasi
 * csoportjai (249:46) es a "Számla" gomb (249:68) nem epulnek: az elso a P4
 * hattere, a masodikhoz nincs szamla-adat (docs/P5-LEFT-OUT.md).
 */
function NyitottKartya({
  sor,
  kapcsolt,
}: {
  sor: RendelesSor<Rendeles>
  /** P4-2: "Egy leadásból: #13, bolti átvétel", ha van pár. */
  kapcsolt?: string | null
}) {
  const { rendeles, allapot } = sor
  const fizetes = fizetesiAllapot(rendeles.payment_status)
  return (
    <article
      className="flex flex-col gap-[10px] border border-acr-line bg-acr-white p-[14px] small:gap-[14px] small:p-5"
      data-testid="rendeles-nyitott"
    >
      <div className="flex items-center gap-2 small:gap-3">
        <h3
          className="text-[15px] font-semibold leading-[20px] text-acr-ink small:text-[18px] small:leading-[23px]"
          data-testid="rendeles-szam"
        >
          {rendelesSzam(rendeles.display_id)}
        </h3>
        {allapot ? <AllapotCimke allapot={allapot} /> : null}
        <span
          className="ml-auto hidden text-[20px] font-bold leading-[26px] text-acr-ink small:inline"
          data-testid="rendeles-osszeg"
        >
          {osszeg(rendeles)}
        </span>
      </div>
      <p className="text-[11.8px] leading-[15px] text-acr-slate small:text-[12.5px] small:leading-[16px]">
        <span className="small:hidden">
          {rendelesDatumRovid(rendeles.created_at)}
        </span>
        <span className="hidden small:inline">
          {rendelesDatum(rendeles.created_at)}
        </span>
        {fizetes ? ` · ${fizetes}` : ""}
      </p>
      {kapcsolt ? (
        <p
          className="text-[12.5px] leading-[16px] text-acr-ink"
          data-testid="rendeles-kapcsolt"
        >
          {kapcsolt}
        </p>
      ) : null}
      <p className="text-[20px] font-bold leading-[26px] text-acr-ink small:hidden">
        {osszeg(rendeles)}
      </p>
      <LocalizedClientLink
        href={reszletek(rendeles)}
        className="flex h-[44px] w-full items-center justify-center bg-acr-heritage text-[13.5px] font-semibold text-acr-white small:h-[42px] small:w-[150px]"
        data-testid="rendeles-reszletek"
      >
        Rendelés részletei
      </LocalizedClientLink>
    </article>
  )
}

/**
 * A KORABBI RENDELES KARTYAJA (249:71; mobilon 249:236). Asztalon: szam,
 * cimke, osszeg, alatta datum es tetelszam a "megtekintés" linkkel. Mobilon
 * az egesz kartya link: szam es allapot bal oldalt, osszeg jobbra.
 */
function KorabbiKartya({
  sor,
  kapcsolt,
}: {
  sor: RendelesSor<Rendeles>
  kapcsolt?: string | null
}) {
  const { rendeles, allapot } = sor
  return (
    <article
      className="border border-acr-line bg-acr-white"
      data-testid="rendeles-korabbi"
    >
      <LocalizedClientLink
        href={reszletek(rendeles)}
        className="flex h-[62px] items-center justify-between px-3 small:hidden"
      >
        <span className="flex flex-col gap-[2px]">
          <span className="text-[13.5px] font-semibold leading-[18px] text-acr-ink">
            {rendelesSzam(rendeles.display_id)}
          </span>
          <span className="text-[11.5px] leading-[15px] text-acr-slate">
            {allapot?.label ?? ""}
          </span>
        </span>
        <span className="text-[13.5px] font-medium leading-[18px] text-acr-ink">
          {osszeg(rendeles)}
        </span>
      </LocalizedClientLink>
      <div className="hidden flex-col gap-[10px] px-[18px] py-4 small:flex">
        <div className="flex items-center gap-[10px]">
          <h3 className="text-[15px] font-semibold leading-[20px] text-acr-ink">
            {rendelesSzam(rendeles.display_id)}
          </h3>
          {allapot ? <AllapotCimke allapot={allapot} /> : null}
          <span className="ml-auto text-[16px] font-bold leading-[21px] text-acr-ink">
            {osszeg(rendeles)}
          </span>
        </div>
        <p className="text-[12.5px] leading-[16px] text-acr-slate">
          {rendelesDatum(rendeles.created_at)} · {tetelSzam(rendeles)} tétel ·{" "}
          {kapcsolt ? (
            <span data-testid="rendeles-kapcsolt">{kapcsolt} · </span>
          ) : null}
          <LocalizedClientLink
            href={reszletek(rendeles)}
            className="underline underline-offset-2 hover:text-acr-ink"
          >
            megtekintés
          </LocalizedClientLink>
        </p>
      </div>
    </article>
  )
}

/**
 * A RENDELESEIM LAP TARTALMA (P5, 249:37; mobilon 249:216). Felul a nyitott
 * rendelesek nagy kartyan, alatta "Korábbi rendelések" a lezartakkal.
 */
export default function Rendelesek({
  rendelesek,
  allapotok,
}: {
  rendelesek: Rendeles[]
  allapotok: UzletiAllapot[]
}) {
  if (rendelesek.length === 0) {
    return (
      <div
        className="flex flex-col items-start gap-3 font-acr-sans"
        data-testid="no-orders-container"
      >
        <p className="text-[13.5px] leading-[19px] text-acr-slate">
          Még nincs rendelésed.
        </p>
        <LocalizedClientLink
          href="/store"
          className="flex h-[44px] items-center justify-center bg-acr-heritage px-6 text-[13.5px] font-semibold text-acr-white"
          data-testid="continue-shopping-button"
        >
          Vásárlás
        </LocalizedClientLink>
      </div>
    )
  }

  const { nyitott, korabbi } = rendelesCsoportok(rendelesek, allapotok)
  // P4-2: a pár száma a listából jön; ha a pár nincs a listán (lapozás), nincs
  // mit megnevezni, és a sor elmarad.
  const szamok = new Map(rendelesek.map((r) => [r.id, r.display_id]))
  const kapcsolt = (r: Rendeles) => {
    const par = kapcsoltRendeles(r.metadata)
    return par && szamok.has(par.id)
      ? kapcsoltFelirat(szamok.get(par.id), par.bolti)
      : null
  }
  return (
    <div className="flex flex-col gap-3 font-acr-sans small:gap-[18px]">
      {nyitott.map((sor) => (
        <NyitottKartya
          key={sor.rendeles.id}
          sor={sor}
          kapcsolt={kapcsolt(sor.rendeles)}
        />
      ))}
      {korabbi.length > 0 ? (
        <section className="flex flex-col gap-3 small:gap-[18px]">
          <h2 className="text-[18px] font-semibold leading-[23px] text-acr-ink small:text-[22px] small:leading-[29px]">
            Korábbi rendelések
          </h2>
          {korabbi.map((sor) => (
            <KorabbiKartya
              key={sor.rendeles.id}
              sor={sor}
              kapcsolt={kapcsolt(sor.rendeles)}
            />
          ))}
        </section>
      ) : null}
    </div>
  )
}
