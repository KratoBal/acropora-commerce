import Image from "next/image"

import { STORE_NAME } from "@lib/store"
import { GLS_LOGO } from "@lib/util/gls"
import { FOXPOST_LOGO_UT } from "@modules/checkout/components/foxpost-logo"
import { STRIPE_LOGO_UT } from "@modules/checkout/components/stripe-logo"
import { Text } from "@modules/common/components/ui"

import LocalizedClientLink from "@modules/common/components/localized-client-link"

import { CEG, FIZETESI_OPCIOK_KEP } from "./hivatkozasok"
import type { LablecAdat } from "./lablec-adat"

export type LablecKeretProps = {
  lablec: LablecAdat
}

/**
 * A FIX ALSO SOR (Balazs, 2026-10-27, kirakat-lablec-kep): a szallitok, a
 * fizetesi szolgaltato es a kartyak. NEM szerkesztheto, az OS nem kuldi. Az
 * Arukereso, az Olcsobbat es a SimplePay a regi boltban itt allt, de ide nem
 * kerul (a SimplePay kikerult, csak Stripe van).
 *
 * A meret a magassagot rogziti, a szelesseg a logo sajat aranyabol jon.
 */
const ALSO_LOGOK = [
  {
    src: FOXPOST_LOGO_UT,
    alt: "FOXPOST – Packeta Group",
    w: 889,
    h: 335,
    mag: "h-12",
  },
  { src: GLS_LOGO.altalanos, alt: "GLS", w: 260, h: 88, mag: "h-6" },
  { src: STRIPE_LOGO_UT, alt: "Stripe", w: 360, h: 150, mag: "h-10" },
  { ...FIZETESI_OPCIOK_KEP, mag: "h-12" },
] as const

/**
 * A LABLEC MAGA, ADATBOL. Szerveroldalon a `Footer` hivja (lekeri a kezdolap
 * rekordjat), az OS elo elonezete kliensoldalon, a KAPOTT (mentetlen)
 * rekordbol: ugyanaz a komponens, nincs masolat.
 *
 * A SZERKEZET A REGI BOLT LABLECE (exchange/marka-sav-2026-10-27/
 * referencia-lablec.png): harom link-oszlop es a ceges oszlop egy sorban,
 * alattuk a fix logosor. A Kollekciok oszlop es a bolt nevevel nyito bal oszlop
 * ezzel kikerult; a bemutatkozas es a kozossegi linkek csak akkor kapnak sort,
 * ha az OS-ben ki vannak toltve.
 */
export function LablecKeret({ lablec }: LablecKeretProps) {
  return (
    /*
      A LABLEC SIKJA A TERV TOKENJEN ALL, NEM A STARTER OSZTALYAN.

      === MIERT NEM EGY BEEGETETT SOTET ERTEK ===

      acrobot 2026-09-08 22:21-kor a SOTET valtozatot dontotte el
      (`oklch(0.17 0.016 250)`), es az indoka a KOVETKEZETESSEG volt: a
      fejlec-sav mar sotet, tehat a lap ket vege ne kulonbozzon ugyanabban a
      szerepben (navigacio).

      A PREMISSZAT LEMERTEM AZ ELO LAPON (2026-09-08 22:34, staging,
      `agents/murena/scripts/sikok.cjs`), es MA NEM ALL:

          FEJLEC   rgb(255, 255, 255)   -- feher
          a fejlec osei kozott NINCS data-vilag
          a `data-vilag="sotet"` csak a lapon BELUL all

      A fejlec sajat fejlece ugyanezt mondja: "MA A FEJLEC MINDIG VILAGOS...
      a `data-vilag` jelolot a vaz teszi ki a lapon BELUL, a fejlec pedig a
      `(main)` elrendezesben all, a lap FOLOTT."

      Vagyis egy beegetett sotet lablec MA a feher fejlec ala kerulne, es a lap
      ket vege epp attol kulonbozne, amit a dontes el akart kerulni.

      === EZERT AMIT EZ A KOR CSINAL: A SIKOT VILAG-FUGGOVE TESZI ===

      A `--terv-hatter` vilagonkent MAS erteket vesz fel (0.99 vilagosban,
      0.17 sotetben), es a fejlec is PONTOSAN ezt hasznalja. Ugyanaz a token,
      ugyanaz a mechanizmus: ha a lablec valaha sotet vilagba kerul, magatol
      sotet lesz -- egy szam beegetese nelkul.

      MA EZ NEM VALTOZTAT SEMMIT LATHATOAN, es ez merve van, nem feltetelezve:
      a `globals.css` `body` szabalya MAR `background: var(--terv-hatter)`, es a
      lablec sajat hattere eddig atlatszo volt (merve az elo lapon:
      `rgba(0, 0, 0, 0)`). Vagyis pontosan ezt a szint mutatta at eddig is --
      most csak sajat jogan viseli, ahelyett hogy a body-tol orokolne.

      A KULONBSEG AKKOR JON ELO, amikor a lablec sotet vilagba kerul: a body
      globalis, a lablec pedig sajat hatokort kaphat. A sotetre allitas ezutan
      EGY jelolo, nem egy atiras.
    */
    <footer
      className="w-full border-t"
      style={{
        background: "var(--terv-hatter)",
        borderColor: "var(--terv-keret)",
      }}
      data-testid="lablec-sik"
    >
      <div
        className="mx-auto flex w-full max-w-[1440px] flex-col px-4 lg:px-16"
        data-testid="lablec-konteiner"
      >
        {lablec.bemutatkozo || lablec.kozossegi.length > 0 ? (
          <div
            className="flex flex-col gap-y-3 pt-16"
            style={{ color: "var(--terv-szoveg-halvany)" }}
            data-testid="lablec-bemutatkozo-sor"
          >
            {lablec.bemutatkozo ? (
              <div
                className="txt-small flex max-w-3xl flex-col gap-y-2 [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                data-testid="footer-bemutatkozo"
                dangerouslySetInnerHTML={{ __html: lablec.bemutatkozo }}
              />
            ) : null}
            {lablec.kozossegi.length > 0 ? (
              <ul
                className="txt-small flex flex-wrap gap-x-4 gap-y-1"
                data-testid="footer-kozossegi"
              >
                {lablec.kozossegi.map((k) => (
                  <li key={k.nev}>
                    <a
                      className="hover:text-terv-szoveg"
                      href={k.href}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      {k.nev}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
        {/*
          A KATEGORIA-RACS 2026-09-09 OTA NINCS A LABLECBEN (Balazs: "ez nem
          legordul ez ott van. nem kell"): a kategoriak a fejlec menujeben
          allnak. A lablec ezert sem a regiot, sem a kategoria-fat nem kerdezi.
        */}
        <div
          className="grid w-full min-w-0 grid-cols-1 gap-10 py-16 text-small-regular xsmall:grid-cols-2 lg:grid-cols-4"
          data-testid="lablec-oszlopok"
        >
          {lablec.oszlopok.map((oszlop) => (
            <div className="flex flex-col gap-y-3" key={oszlop.azonosito}>
              {/*
                AZ OSZLOPCIMEK NAGYBETUSEK, ES EZT CSAK A KEP MUTATTA MEG: a bolt
                HTML-jeben vegyes kisbetusek, a stiluslapja alakitja at oket.
                A referencia-kepen a linkek is nagybetusek.
              */}
              <span
                className="txt-small-plus uppercase tracking-wide"
                style={{ color: "var(--terv-szoveg)" }}
              >
                {oszlop.cim}
              </span>
              <ul
                className="grid grid-cols-1 gap-2 txt-small uppercase tracking-wide"
                style={{ color: "var(--terv-szoveg-halvany)" }}
                data-testid={`footer-oszlop-${oszlop.azonosito}`}
              >
                {oszlop.linkek.map((t) => (
                  <li key={`${oszlop.azonosito}-${t.cimke}-${t.href}`}>
                    {/*
                      A SAJAT UTVONAL `LocalizedClientLink`-et kap, mert az
                      teszi ele az orszagkodot. A KULSO cim TELJES, es egy
                      sima horgony viszi.
                    */}
                    {t.sajat ? (
                      <LocalizedClientLink
                        className="hover:text-terv-szoveg"
                        href={t.href}
                        data-testid="footer-sajat-link"
                      >
                        {t.cimke}
                      </LocalizedClientLink>
                    ) : (
                      <a
                        className="hover:text-terv-szoveg"
                        href={t.href}
                        data-testid="footer-regi-bolt-link"
                      >
                        {t.cimke}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {/*
            A CEGES OSZLOP FIX (Balazs, 2026-10-27: "ha valtozik, mi irjuk at"):
            a `CEG`-bol, az OS nem irja felul.
          */}
          <div className="flex flex-col gap-y-3" data-testid="footer-ceg">
            <span
              className="txt-small-plus uppercase tracking-wide"
              style={{ color: "var(--terv-szoveg)" }}
            >
              {CEG.nev}
            </span>
            <address
              className="not-italic txt-small flex flex-col gap-y-1"
              style={{ color: "var(--terv-szoveg-halvany)" }}
            >
              <span>{CEG.cim}</span>
              <a
                className="hover:text-terv-szoveg"
                href={`tel:${CEG.telefon.replace(/[^+\d]/g, "")}`}
              >
                {CEG.telefon}
              </a>
              <a
                className="hover:text-terv-szoveg"
                href={`mailto:${CEG.email}`}
              >
                {CEG.email}
              </a>
            </address>
            <div
              className="txt-small flex flex-col gap-y-1"
              style={{ color: "var(--terv-szoveg-halvany)" }}
              data-testid="footer-nyitvatartas"
            >
              <span>Nyitvatartás: {CEG.nyitvatartas[0]}</span>
              {CEG.nyitvatartas.slice(1).map((sor) => (
                <span key={sor}>{sor}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div
        className="w-full border-t"
        style={{ borderColor: "var(--terv-keret)" }}
        data-testid="lablec-also-sav"
      >
        <div className="mx-auto flex w-full max-w-[1440px] flex-col items-center gap-y-4 px-4 py-6 lg:px-16">
          <ul
            className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4"
            data-testid="lablec-logosor"
          >
            {ALSO_LOGOK.map((logo) => (
              <li key={logo.src}>
                <Image
                  src={logo.src}
                  alt={logo.alt}
                  width={logo.w}
                  height={logo.h}
                  className={`${logo.mag} w-auto`}
                />
              </li>
            ))}
          </ul>
          <Text
            className="txt-compact-small"
            style={{ color: "var(--terv-szoveg-halvany)" }}
            data-testid="footer-also-sor"
          >
            {lablec.alsoSor ??
              `© ${new Date().getFullYear()} ${STORE_NAME}. Minden jog fenntartva.`}
          </Text>
        </div>
      </div>
    </footer>
  )
}
