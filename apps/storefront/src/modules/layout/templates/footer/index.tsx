import {
  listCategories,
  listNonEmptyRootCategories,
} from "@lib/data/categories"
import { getRegion } from "@lib/data/regions"
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

export default async function Footer({
  countryCode,
}: {
  /**
   * AZ ORSZAGKOD A GYOKEREK SZURESEHEZ KELL, es ugyanabbol az okbol, mint a
   * fejlecnek: a "van-e benne termek" kerdes REGIO-fuggo. Nelkule nem
   * talalgatunk -- ures listat adunk, es a kategoria-szakasz kimarad.
   */
  countryCode?: string
}) {
  const { collections } = await listCollections({
    fields: "*products",
  })
  const productCategories = await listCategories()
  const region = countryCode ? await getRegion(countryCode) : null
  const gyokerOszlopok = region
    ? await listNonEmptyRootCategories(region.id)
    : []

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
      className="border-t border-ui-border-base w-full"
      style={{ background: "var(--terv-hatter)" }}
      data-testid="lablec-sik"
    >
      <div className="content-container flex flex-col w-full">
        {/*
          A KATEGORIA-OSZLOPOK: GYOKERENKENT EGY, ES A RACS A DARABSZAMRA VAN
          HUZALOZVA, NEM ROGZITETT NEGYRE.

          Forras: `agents/picasso/lablec-spec-2026-09-08.md`. Amit ez lecserel:
          egyetlen oszlop, amiben mind az 53 kategoria-link egymas alatt futott
          (2067 pixel, picasso merese 22:07-kor).

          === MIERT NEM ROGZITETT NEGY (acrobot kikotese) ===

          Ma negy gyoker all, mert ketto (Shop 'n the Shop, Edesvizi
          akvarisztika) kiesik. Ha az a dontes megfordul (73038a32 kartya,
          Balazsnal), a lablecnek NEM kell atirodnia: az oszlopszam a halmaz
          merete, egy CSS-valtozon at.

          === ES EGY KULONBSEG, AMIT KI KELL MONDANI ===

          A spec a NEM REJTETT gyokerekrol beszel (a bolt `Display.Menu`
          mezoje), a kirakat viszont a Medusat olvassa, es ott ilyen mezo
          NINCS. Amit valojaban szurunk, az a NEM URES gyoker
          (`listNonEmptyRootCategories`).

          A KETTO MA UGYANAZT A NEGYET ADJA -- ez a fuggveny sajat fejleceben
          merve all --, de NEM ugyanaz a szabaly. Ha egyszer egy rejtett
          gyokerbe termek kerul, a lablecben megjelenne, a fomenuben nem. Ezt
          nem javitom talalgatasbol: a jelolo hianya adat-kerdes, nem
          elrendezes.

          === A SORREND ADAT, NEM LISTA ===

          A `rank` mezobol jon, amit a boltos allitott be, es pontosan azt a
          sorrendet adja, amit a spec atmenetikent felsorolt (Termekek,
          Gerinctelenek, Halak, Korallok). Nem kellett kulon dontes.

          === A FUGGOLEGES BELSO MARGO: NEM UJ ERTEK ===

          A spec ezt az EGY erteket hagyta rám, mert a tervben nincs lablec, es
          a legkozelebbi nagy szekcio-terkozt (160px) javasolta kiindulasnak.
          Megmertem: a starter `py-40`-je PONTOSAN 160 pixel, tehat az ertek
          mar itt all, es egyezik a javaslattal. Nem veszek fel ujat.
        */}
        {gyokerOszlopok.length > 0 && (
          <section
            className="grid grid-cols-2 gap-x-[44px] gap-y-[24px] pt-40 lg:grid-cols-[repeat(var(--lablec-oszlopok),minmax(0,1fr))]"
            style={
              {
                "--lablec-oszlopok": gyokerOszlopok.length,
              } as React.CSSProperties
            }
            data-testid="lablec-kategoria-racs"
          >
            {gyokerOszlopok.map((gyoker) => {
              const gyerekek =
                productCategories?.find((c) => c.id === gyoker.id)
                  ?.category_children ?? []

              return (
                <div className="flex flex-col gap-y-2" key={gyoker.id}>
                  <LocalizedClientLink
                    href={`/categories/${gyoker.handle}`}
                    className="text-[14px] font-semibold hover:text-terv-kiemel-tinta"
                    style={{ color: "var(--terv-szoveg)" }}
                    data-testid="lablec-oszlopcim"
                  >
                    {gyoker.name}
                  </LocalizedClientLink>
                  <ul className="grid grid-cols-1 gap-2">
                    {gyerekek.map((gyerek) => (
                      <li key={gyerek.id}>
                        <LocalizedClientLink
                          href={`/categories/${gyerek.handle}`}
                          className="text-[13.5px] hover:text-terv-kiemel-tinta"
                          style={{ color: "var(--terv-szoveg-halvany)" }}
                          data-testid="category-link"
                        >
                          {gyerek.name}
                        </LocalizedClientLink>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </section>
        )}
        <div className="flex flex-col gap-y-6 xsmall:flex-row items-start justify-between py-40">
          <div>
            <LocalizedClientLink
              href="/"
              className="txt-compact-xlarge-plus text-ui-fg-subtle hover:text-ui-fg-base uppercase"
            >
              {STORE_NAME}
            </LocalizedClientLink>
          </div>
          <div className="text-small-regular gap-10 md:gap-x-16 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
            {collections && collections.length > 0 && (
              <div className="flex flex-col gap-y-2">
                <span className="txt-small-plus txt-ui-fg-base">
                  Kollekciók
                </span>
                <ul
                  className={clx(
                    "grid grid-cols-1 gap-2 text-ui-fg-subtle txt-small",
                    {
                      "grid-cols-2": (collections?.length || 0) > 3,
                    },
                  )}
                >
                  {collections?.slice(0, 6).map((c) => (
                    <li key={c.id}>
                      <LocalizedClientLink
                        className="hover:text-ui-fg-base"
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
                  <span className="txt-small-plus txt-ui-fg-base uppercase tracking-wide">
                    {OSZLOP_CIMEK[oszlop]}
                  </span>
                  <ul
                    className="grid grid-cols-1 gap-2 text-ui-fg-subtle txt-small"
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
                            className="hover:text-ui-fg-base"
                            href={t.cim}
                            data-testid="footer-sajat-link"
                          >
                            {t.cimke}
                          </LocalizedClientLink>
                        ) : (
                          <a
                            className="hover:text-ui-fg-base"
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
              <span className="txt-small-plus txt-ui-fg-base uppercase tracking-wide">
                {CEG.nev}
              </span>
              <address className="not-italic text-ui-fg-subtle txt-small flex flex-col gap-y-1">
                <span>{CEG.cim}</span>
                <a
                  className="hover:text-ui-fg-base"
                  href={`tel:${CEG.telefon.replace(/[^+\d]/g, "")}`}
                >
                  {CEG.telefon}
                </a>
                <a
                  className="hover:text-ui-fg-base"
                  href={`mailto:${CEG.email}`}
                >
                  {CEG.email}
                </a>
              </address>
              <div
                className="text-ui-fg-subtle txt-small flex flex-col gap-y-1"
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
        <div className="flex w-full mb-16 justify-between text-ui-fg-muted">
          <Text className="txt-compact-small">
            © {new Date().getFullYear()} {STORE_NAME}. Minden jog fenntartva.
          </Text>
        </div>
      </div>
    </footer>
  )
}
