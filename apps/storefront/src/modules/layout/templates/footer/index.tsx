import { listCategories } from "@lib/data/categories"
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
  const productCategories = await listCategories()

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
            {productCategories && productCategories?.length > 0 && (
              <div className="flex flex-col gap-y-2">
                <span className="txt-small-plus txt-ui-fg-base">
                  Kategóriák
                </span>
                <ul
                  className="grid grid-cols-1 gap-2"
                  data-testid="footer-categories"
                >
                  {/*
                    EZ AZ OSZLOP MARAD, ES A FELTETELT KIMONDJUK, HOGY NE
                    KELLJEN VISSZAKERESNI (acrobot dontese, 2026-09-08).

                    A lablec TARTALMA a shop.acropora.hu-bol jon, es az eles
                    bolt lableceben nincs kategoria-oszlop. Huseg alapjan
                    tehat torlendo lenne. MEGSEM toroljuk, es az indok nem az,
                    hogy senki nem kerte:

                    A KIRAKATBAN MA EZ AZ EGYETLEN UT A KATEGORIAKHOZ, amit a
                    VEVO tenylegesen lat. A fejlec kategoria-savja MEGEPULT es
                    a fo agon all, de a kitelepitett lapon meg NINCS kint --
                    merve 2026-09-08 este: a nyitolapon nulla kategoria-link
                    all a `<footer>` ELOTT, es 53 a lableceben. Amig ez igy
                    van, a torles nulla utat hagyna a bongeszesnek.

                    A FELTETEL, AMIKOR A KERDES UJRA ELOJON: amikor a
                    fejlec-menu KITELEPITVE is all. Attol kezdve ez az oszlop
                    mar nem az egyetlen ut, es a torles valoban csak
                    huseg-kerdes lesz. Addig nem az.

                    ELOSZOR SZURUNK GYOKERRE, AZUTAN VAGUNK.

                    A starterben forditva allt: `slice(0, 6)` a NYERS listan,
                    es a szures utana. Merve 2026-09-07 a teszt bolton: a lista
                    elso hat eleme kozott PONTOSAN EGY gyoker van ("Termékek"),
                    a masik ot az O leszarmazottja -- azokat a szures eldobta.
                    A lablec igy 219 kategoriabol 24 linket mutatott, es a bolt
                    ot masik gyokere (Halak, Korallok, Gerinctelenek, Édesvízi
                    akvarisztika, Shop 'n the Shop) SEHOL nem jelent meg.

                    Vagyis a hiba nem a darabszamban volt, hanem a SORRENDBEN:
                    ugyanaz a hat, mast jelent a szures elott es utana.
                    Szures utan vagva: 6 gyoker, 53 link.
                  */}
                  {productCategories
                    ?.filter((c) => !c.parent_category)
                    .slice(0, 6)
                    .map((c) => {
                      const children =
                        c.category_children?.map((child) => ({
                          name: child.name,
                          handle: child.handle,
                          id: child.id,
                        })) || null

                      return (
                        <li
                          className="flex flex-col gap-2 text-ui-fg-subtle txt-small"
                          key={c.id}
                        >
                          <LocalizedClientLink
                            className={clx(
                              "hover:text-ui-fg-base",
                              children && "txt-small-plus",
                            )}
                            href={`/categories/${c.handle}`}
                            data-testid="category-link"
                          >
                            {c.name}
                          </LocalizedClientLink>
                          {children && (
                            <ul className="grid grid-cols-1 ml-3 gap-2">
                              {children &&
                                children.map((child) => (
                                  <li key={child.id}>
                                    <LocalizedClientLink
                                      className="hover:text-ui-fg-base"
                                      href={`/categories/${child.handle}`}
                                      data-testid="category-link"
                                    >
                                      {child.name}
                                    </LocalizedClientLink>
                                  </li>
                                ))}
                            </ul>
                          )}
                        </li>
                      )
                    })}
                </ul>
              </div>
            )}
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
