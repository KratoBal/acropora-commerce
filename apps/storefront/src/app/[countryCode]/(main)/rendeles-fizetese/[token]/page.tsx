import { linkOsszegzes } from "@lib/data/rendeles-fizetese"
import { convertToLocale } from "@lib/util/money"
import {
  LINK_ALLAPOT_SZOVEG,
  type LinkOsszegzes,
} from "@lib/util/rendeles-fizetese"
import LinkFizetes from "@modules/rendeles-fizetese/components/link-fizetes"
import { Metadata } from "next"
import { notFound } from "next/navigation"

type Props = { params: Promise<{ countryCode: string; token: string }> }

export const metadata: Metadata = {
  title: "Rendelés fizetése",
  // a link a vevo levelebol jon: ne keruljon keresobe
  robots: { index: false, follow: false },
}

const ft = (osszeg: number) =>
  convertToLocale({ amount: osszeg, currency_code: "huf" })

const hatarnap = (iso: string) =>
  new Intl.DateTimeFormat("hu-HU", {
    timeZone: "Europe/Budapest",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(iso))

/**
 * „RENDELÉS FIZETÉSE” (a lejaro zarolas terve, 2.2; Balazs „1”-e a link
 * celjara): fent a rendeles szama, tetelei es a fizetendo osszeg, alatta
 * ugyanaz a fizetesi resz, mint a penztarban. Lejart, kifizetett vagy
 * lecserelt linknel a lap ezt mondja ki, a vevo teendojevel.
 */
export default async function RendelesFizetesePage(props: Props) {
  const { countryCode, token } = await props.params
  const osszegzes = await linkOsszegzes(token)
  if (!osszegzes) return notFound()

  return (
    <div
      className="content-container flex justify-center py-10 small:py-16"
      data-testid="rendeles-fizetese"
    >
      <div className="flex w-full max-w-[640px] flex-col gap-y-8">
        <Fejlec osszegzes={osszegzes} />
        <Rendelesek osszegzes={osszegzes} />
        {osszegzes.state === "open" ? (
          <section className="flex flex-col gap-y-4">
            <h2 className="text-[18px] font-semibold text-acr-ink">Fizetés</h2>
            <LinkFizetes
              token={token}
              osszeg={osszegzes.amount}
              countryCode={countryCode}
            />
          </section>
        ) : null}
      </div>
    </div>
  )
}

function Fejlec({ osszegzes }: { osszegzes: LinkOsszegzes }) {
  const szamok = osszegzes.orders
    .map((rendeles) => `#${rendeles.display_id}`)
    .join(" és ")
  if (osszegzes.state !== "open") {
    const { cim, szoveg } = LINK_ALLAPOT_SZOVEG[osszegzes.state]
    return (
      <header
        className="flex flex-col gap-y-2"
        data-testid={`link-allapot-${osszegzes.state}`}
      >
        <p className="text-[11px] font-bold tracking-[0.08em] text-acr-heritage">
          RENDELÉS FIZETÉSE
        </p>
        <h1 className="text-[26px] font-semibold text-acr-ink">{cim}</h1>
        {szamok && <p className="text-acr-slate">Rendelés: {szamok}</p>}
        <p className="text-acr-ink">{szoveg}</p>
      </header>
    )
  }
  return (
    <header className="flex flex-col gap-y-2">
      <p className="text-[11px] font-bold tracking-[0.08em] text-acr-heritage">
        RENDELÉS FIZETÉSE
      </p>
      <h1 className="text-[26px] font-semibold text-acr-ink">
        Kifizetheted a rendelésedet
      </h1>
      <p className="text-acr-slate">Rendelés: {szamok}</p>
      <div className="mt-2 border border-acr-heritage bg-[color-mix(in_srgb,var(--acr-color-heritage)_8%,transparent)] px-4 py-3">
        <p className="text-[11px] font-bold tracking-[0.08em] text-acr-heritage">
          FIZETENDŐ
        </p>
        <p
          className="mt-1 text-[22px] font-bold text-acr-ink"
          data-testid="link-osszeg"
        >
          {ft(osszegzes.amount)}
        </p>
      </div>
      <p className="text-[13px] text-acr-slate">
        A link {hatarnap(osszegzes.expires_at)} végéig érvényes. A csomagot a
        fizetés után indítjuk.
      </p>
    </header>
  )
}

function Rendelesek({ osszegzes }: { osszegzes: LinkOsszegzes }) {
  return (
    <section className="flex flex-col gap-y-6">
      {osszegzes.orders.map((rendeles, index) => (
        <div
          key={String(rendeles.display_id)}
          className="flex flex-col gap-y-2"
        >
          <h2 className="text-[16px] font-semibold text-acr-ink">
            {index === 0 ? "A rendelésed" : "Bolti átvételes rendelésed"} (#
            {rendeles.display_id})
          </h2>
          <ul className="flex flex-col gap-y-1 text-[14px] text-acr-ink">
            {rendeles.items.map((tetel, sor) => (
              <li key={sor} className="flex justify-between gap-x-4">
                <span>
                  {tetel.title} × {tetel.quantity}
                </span>
                <span className="whitespace-nowrap">{ft(tetel.total)}</span>
              </li>
            ))}
            {rendeles.shipping.map((mod, sor) => (
              <li
                key={`sz${sor}`}
                className="flex justify-between gap-x-4 text-acr-slate"
              >
                <span>Szállítás: {mod.name}</span>
                <span className="whitespace-nowrap">{ft(mod.amount)}</span>
              </li>
            ))}
            <li className="flex justify-between gap-x-4 border-t border-acr-slate/30 pt-1 font-semibold">
              <span>Végösszeg</span>
              <span className="whitespace-nowrap">{ft(rendeles.total)}</span>
            </li>
          </ul>
        </div>
      ))}
    </section>
  )
}
