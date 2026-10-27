import type { Marka } from "@lib/data/brands"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Konteiner from "@modules/kezdolap/components/konteiner"
import CimLink from "@modules/kezdolap/components/cim-link"
import MintaJelzo from "@modules/kezdolap/components/minta-jelzo"
import { biztonsagosCim, type Szovegek } from "@modules/kezdolap/szovegek"

const MARKAK = [1, 2, 3, 4]

/** Egy marka a logosavon: amit a sav rajzol belole. */
export type SavMarka = Pick<Marka, "name" | "handle" | "logo_url">

/**
 * A SAV MARKAI, AZ OS LISTAJANAK SORRENDJEBEN.
 *
 * A `kinalat` a bolt termekkel rendelkezo markai (`GET /store/brands`): egy
 * marka, aminek nincs termeke, ott nem szerepel, mert a markaoldala 404 lenne,
 * tehat a sav sem mutatja. A sorrend a `handles` listae, nem a bolte; ami
 * nincs a kinalatban, az kimarad.
 */
export function savMarkai(
  handles: readonly string[] | null | undefined,
  kinalat: readonly SavMarka[],
): SavMarka[] {
  if (!handles?.length) return []
  const byHandle = new Map(kinalat.map((m) => [m.handle, m]))
  return handles.flatMap((h) => {
    const m = byHandle.get(h)
    return m ? [m] : []
  })
}

/**
 * Ennyi logonak kell lennie a lista egy feleben, hogy egy szeles kepernyon se
 * latsszon a sor vege: keves markanal a lista ismetlodik a felen belul.
 */
const FEL_LEGALABB = 10
/** Egy logo ennyi masodperc alatt halad at a helyen: lassu, olvashato sav. */
const MP_LOGONKENT = 4

/**
 * EGY LOGO A SAVON: fekete-feher, kurzor (vagy billentyu-fokusz) folott
 * szines, a markaoldalra visz. Logo nelkul a marka neve all a helyen,
 * ugyanabban a linkben. A kep cime a `biztonsagosCim`-en megy at, mint a
 * kezdolap tobbi kepe: csak `http(s)` vagy bolti ut.
 */
const Logo = ({ marka, rejtett }: { marka: SavMarka; rejtett: boolean }) => {
  const kep = marka.logo_url ? biztonsagosCim(marka.logo_url)?.href : null
  return (
    <LocalizedClientLink
      href={`/marka/${encodeURIComponent(marka.handle)}`}
      tabIndex={rejtett ? -1 : undefined}
      aria-label={kep ? marka.name : undefined}
      data-testid="marka-logo"
      className="group/logo flex h-16 items-center px-8 small:px-10"
    >
      {kep ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={kep}
          alt=""
          loading="lazy"
          className="max-h-12 w-auto max-w-[160px] object-contain opacity-70 grayscale transition duration-300 group-hover/logo:opacity-100 group-hover/logo:grayscale-0 group-focus-visible/logo:opacity-100 group-focus-visible/logo:grayscale-0 motion-reduce:transition-none"
        />
      ) : (
        <span
          className="whitespace-nowrap text-[22px] font-semibold tracking-[0.02em] transition-colors group-hover/logo:text-[color:var(--kl-kek)] motion-reduce:transition-none"
          style={{ color: "var(--kl-halvany)" }}
        >
          {marka.name}
        </span>
      )}
    </LocalizedClientLink>
  )
}

/**
 * A LOGOSAV (Balazs, 2026-10-27): a logok lassan jobbrol balra gorgnek,
 * fekete-feherben; kurzor folott szinesek, es a markaoldalra visznek.
 *
 * A gorgetes a lista ket azonos felebol all, a fel szelessegenel ugrik vissza
 * (`animate-marka-sav`), tehat a varrat nem latszik. A masodik fel csak
 * diszlet: a felolvaso nem hallja, a Tab nem all meg rajta. Kurzor vagy
 * fokusz alatt a sav megall, hogy a logo eltalalhato legyen.
 *
 * MOZGAS-CSOKKENTESNEL (`prefers-reduced-motion`) a sav ALL: nincs animacio,
 * a masodik fel eltunik, a logok tordelt sorban, kozepre igazitva allnak.
 */
const LogoSav = ({ markak }: { markak: readonly SavMarka[] }) => {
  const ismetles = Math.max(1, Math.ceil(FEL_LEGALABB / markak.length))
  const fel = Array.from({ length: ismetles }, () => markak).flat()
  const sor = [...fel, ...fel]
  return (
    <div
      className="group/sav mt-6 overflow-hidden"
      data-testid="marka-sav"
      style={{
        maskImage:
          "linear-gradient(to right, transparent, black 6%, black 94%, transparent)",
      }}
    >
      <ul
        aria-label="Márkák"
        className="flex w-max animate-marka-sav group-hover/sav:[animation-play-state:paused] group-focus-within/sav:[animation-play-state:paused] motion-reduce:w-auto motion-reduce:animate-none motion-reduce:flex-wrap motion-reduce:justify-center"
        style={{ animationDuration: `${fel.length * MP_LOGONKENT}s` }}
      >
        {sor.map((marka, i) => {
          // csak az elso elofordulas valodi; az ismetles es a masodik fel diszlet
          const rejtett = i >= markak.length
          return (
            <li
              key={`${marka.handle}-${i}`}
              aria-hidden={rejtett ? true : undefined}
              data-rejtett={rejtett ? "" : undefined}
              className={rejtett ? "motion-reduce:hidden" : undefined}
            >
              <Logo marka={marka} rejtett={rejtett} />
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/**
 * A MARKAK BLOKK. Ha az OS kijelolt markakat, es a bolt kozuluk legalabb egyet
 * termekkel ismer, a logosav all a helyen (`markak`, a `savMarkai` kimenete).
 * Egyebkent a regi sor: negy szerkesztheto nev. Mindket esetben a felirat es
 * az "Osszes marka" hivatkozas (ha van celja) a blokk fejeben all.
 */
const Markak = ({
  s,
  markak = [],
}: {
  s: Szovegek
  markak?: readonly SavMarka[]
}) => {
  const osszes = s.link("markak.osszes.link")
  const osszesFelirat = s.szoveg("markak.osszes.felirat")
  const sav = markak.length > 0
  const osszesLink =
    osszes && osszesFelirat ? (
      <CimLink
        cim={osszes}
        className="text-[15px] font-semibold"
        style={{ color: "var(--kl-kek)" }}
      >
        {osszesFelirat}
      </CimLink>
    ) : null
  return (
    <section
      data-testid="markak"
      className="border-y py-10"
      style={{ borderColor: "var(--kl-keret)" }}
    >
      {sav ? (
        <>
          <Konteiner className="flex items-center justify-between gap-6">
            <span
              className="text-[14px]"
              style={{ color: "var(--kl-halvany)" }}
            >
              {s.szoveg("markak.felirat")}
            </span>
            {osszesLink}
          </Konteiner>
          <LogoSav markak={markak} />
        </>
      ) : (
        <Konteiner className="flex flex-col gap-6 small:flex-row small:items-center small:justify-between">
          <span className="text-[14px]" style={{ color: "var(--kl-halvany)" }}>
            {s.szoveg("markak.felirat")}
            {MARKAK.some((n) => s.minta(`markak.${n}`)) ? (
              <span className="ml-3 inline-block">
                <MintaJelzo mit="márkák" />
              </span>
            ) : null}
          </span>
          <div
            className="flex flex-wrap gap-x-[72px] gap-y-3 text-[22px] font-semibold tracking-[0.02em]"
            style={{ color: "var(--kl-halvany)" }}
          >
            {MARKAK.map((n) => {
              const nev = s.szoveg(`markak.${n}`)
              return nev ? <span key={n}>{nev}</span> : null
            })}
          </div>
          {osszesLink}
        </Konteiner>
      )}
    </section>
  )
}

export default Markak
