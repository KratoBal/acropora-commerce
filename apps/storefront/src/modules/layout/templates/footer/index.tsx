import { STORE_NAME } from "@lib/store"
import { listCollections } from "@lib/data/collections"
import { Text, clx } from "@modules/common/components/ui"

import LocalizedClientLink from "@modules/common/components/localized-client-link"

import {
  CEG,
  OSZLOP_CIMEK,
  OSZLOP_SORREND,
  REGI_BOLT_HIVATKOZASOK,
  SAJAT_HIVATKOZASOK,
} from "./hivatkozasok"

export default async function Footer() {
  const { collections } = await listCollections({
    fields: "*products",
  })

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
      {/*
        A LABLEC TELJES SZELESSEGBEN ALL, NEM KOZEPRE ZART SAVBAN.

        Balazs kerese (2026-09-09 07:43): "a lablec a teljes szelessegben
        latszodjon". A `content-container` osztaly `max-w-[1440px] mx-auto
        px-6` -- vagyis szeles kepernyon a lablec TARTALMA egy kozepre zart
        savban allt, mikozben a SIKJA (a `<footer>` hattere) mar eddig is
        szeltol szelig ert. A kettot konnyu osszekeverni: a hatter teljes
        szelessegu volt, a tartalom nem.

        A vizszintes belso margo MEGMARAD (`px-6`), kulonben a szoveg a
        kepernyo szelehez tapadna. Csak a felso korlat kerul le.
      */}
      <div className="flex w-full flex-col px-6">
        {/*
          A KATEGORIA-RACS KIKERULT, ES EZ NEM EGYSZERUSITES, HANEM DONTES.

          2026-09-08 este epult meg: negy oszlop, gyokerenkent egy, alattuk
          negyvenhat alkategoria-link. 2026-09-09-en Balazs kepernyokepet
          kuldott rola, es azt mondta ra: "ez nem legordul ez ott van. nem
          kell". A racsot harom kitelepitett lapon merve azonositottuk (50
          link, 917 pixel, a fooldalon a 581. pixelen, tehat gorgetes nelkul
          lathato) -- egyetlen elem felelt meg a leirasnak. A dontes ezutan:
          "az a utat kerem", vagyis a racs TELJESEN eltunik.

          AMI VELE MENT, ES AMIERT TOBB EGY TORLESNEL: a lablecnek ezzel nem
          kell tobbe sem a regio, sem a kategoria-fa. Harom halozati hivas
          szunt meg MINDEN lapbetolteskor (`listCategories`, `getRegion`,
          `listNonEmptyRootCategories`), es a komponens `countryCode` propja
          feleslegesse valt -- a hivo (`(main)/layout.tsx`) sem adja at.

          AMI MARAD: a kollekciok, a sajat es a bolti hivatkozasok, es a
          ceg-adatok. A kategoriak a FEJLEC menujeben allnak, ahol Balazs
          kerte, hogy nyiljanak.
        */}
        <div className="flex flex-col gap-y-6 xsmall:flex-row items-start justify-between py-40">
          <div>
            <LocalizedClientLink
              href="/"
              className="txt-compact-xlarge-plus hover:text-terv-szoveg uppercase"
              style={{ color: "var(--terv-szoveg-halvany)" }}
            >
              {STORE_NAME}
            </LocalizedClientLink>
          </div>
          <div className="text-small-regular gap-10 md:gap-x-16 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
            {collections && collections.length > 0 && (
              <div className="flex flex-col gap-y-2">
                <span
                  className="txt-small-plus"
                  style={{ color: "var(--terv-szoveg)" }}
                >
                  Kollekciók
                </span>
                <ul
                  className={clx("grid grid-cols-1 gap-2 txt-small", {
                    "grid-cols-2": (collections?.length || 0) > 3,
                  })}
                >
                  {collections?.slice(0, 6).map((c) => (
                    <li key={c.id}>
                      <LocalizedClientLink
                        className="hover:text-terv-szoveg"
                        href={`/collections/${c.handle}`}
                      >
                        {c.title}
                      </LocalizedClientLink>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {/*
              A starter itt sajat linkeket tartott (GitHub, Documentation,
              Source code). Azok a MEDUSA projektjere mutattak, es a mi
              vevonknek jelentek volna meg -- ezert kikerultek.

              EZ A BEKEZDES KORABBAN AZT IGERTE, hogy a helyukre a bolti
              tajekoztatok kerulnek. AZ MOST MEGTORTENT, ezert at van irva es
              nem kiegeszitve: egy megjegyzes, ami egy mar elvegzett munkat
              igér, ugyanolyan felrevezeto, mint egy elavult korlat.

              A harom oszlop a MAI ELO BOLT lablecebol jon (a szerkezet es a
              feliratok is), a cimek forrasa a `hivatkozasok.ts`. Ami odakerult
              es itt NEM latszik: a het kulso cim feltetele, vagyis hogy az
              elesites elott mindnek sajat lapra kell mutatnia.
            */}
            {OSZLOP_SORREND.map((oszlop) => {
              const tetelek = [
                ...SAJAT_HIVATKOZASOK.filter((h) => h.oszlop === oszlop).map(
                  (h) => ({ ...h, sajat: true }),
                ),
                ...REGI_BOLT_HIVATKOZASOK.filter(
                  (h) => h.oszlop === oszlop,
                ).map((h) => ({ ...h, sajat: false })),
              ]

              if (tetelek.length === 0) {
                return null
              }

              return (
                <div className="flex flex-col gap-y-2" key={oszlop}>
                  {/*
                    AZ OSZLOPCIMEK NAGYBETUSEK, ES EZT CSAK A KEP MUTATTA MEG.

                    A lablec szerkezetet es tartalmat a bolt HTML-jebol fejtettem
                    ki -- ott a cimek VEGYES kisbetusek ("Oldaltérkép"). A
                    kepernyokepen viszont NAGYBETUVEL allnak, tehat a bolt
                    stiluslapja alakitja at oket, es a vevo azt latja.

                    KET KIOLVASAS UGYANARROL A FORRASROL, KET KULONBOZO
                    VALASZ: a HTML a szoveget mondja meg, a kep azt, ami
                    megjelenik. Egy CSS-transzformaciot a forras-szoveg
                    szerkezetileg nem tud elarulni.
                  */}
                  <span
                    className="txt-small-plus uppercase tracking-wide"
                    style={{ color: "var(--terv-szoveg)" }}
                  >
                    {OSZLOP_CIMEK[oszlop]}
                  </span>
                  <ul
                    className="grid grid-cols-1 gap-2 txt-small"
                    style={{ color: "var(--terv-szoveg-halvany)" }}
                    data-testid={`footer-oszlop-${oszlop}`}
                  >
                    {tetelek.map((t) => (
                      <li key={`${oszlop}-${t.cimke}`}>
                        {/*
                          A SAJAT UTVONAL `LocalizedClientLink`-et kap, mert az
                          teszi ele az orszagkodot. A REGI BOLT cime TELJES, es
                          egy sima horgony viszi -- egy lokalizalt link ele
                          orszagkodot tenne, es a cim ertelmetlenne valna.
                        */}
                        {t.sajat ? (
                          <LocalizedClientLink
                            className="hover:text-terv-szoveg"
                            href={t.cim}
                            data-testid="footer-sajat-link"
                          >
                            {t.cimke}
                          </LocalizedClientLink>
                        ) : (
                          <a
                            className="hover:text-terv-szoveg"
                            href={t.cim}
                            data-testid="footer-regi-bolt-link"
                          >
                            {t.cimke}
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
            {/*
              A NEGYEDIK OSZLOP: a ceg adatai. Ez az egyetlen, amiben nincs
              hivatkozas-lista, ezert szelesebb helyet kap nagy kepernyon.
            */}
            <div
              className="flex flex-col gap-y-2 lg:col-span-2"
              data-testid="footer-ceg"
            >
              {/* A negyedik oszlop cime ugyanugy nagybetus a mintan. */}
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
                <span>Nyitvatartás:</span>
                {CEG.nyitvatartas.map((sor) => (
                  <span key={sor}>{sor}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div
          className="flex w-full mb-16 justify-between"
          style={{ color: "var(--terv-szoveg-halvany)" }}
        >
          <Text className="txt-compact-small">
            © {new Date().getFullYear()} {STORE_NAME}. Minden jog fenntartva.
          </Text>
        </div>
      </div>
    </footer>
  )
}
