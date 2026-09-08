import { clx } from "@modules/common/components/ui"

import { getProductPrice } from "@lib/util/get-product-price"
import { HttpTypes } from "@medusajs/types"

export default function ProductPrice({
  product,
  variant,
}: {
  product: HttpTypes.StoreProduct
  variant?: HttpTypes.StoreProductVariant
}) {
  const { cheapestPrice, variantPrice } = getProductPrice({
    product,
    variantId: variant?.id,
  })

  const selectedPrice = variant ? variantPrice : cheapestPrice

  /**
   * A "-TOL" ALAK KET FELTETELHEZ KOTOTT, ES A MASODIK AZ UJ.
   *
   * Eddig `!variant && "From "` allt itt: angol szo egy magyar lapon, ES a
   * feltetel csak azt nezte, kaptunk-e valtozatot -- nem azt, hogy VAN-E
   * TOBB. Merve az elo lapon (2026-09-07): a muszaki termeklapon
   * "From 319 000 Ft" jelent meg, egyetlen valtozatu ("Alap") termeken.
   *
   * Ket baj egyszerre: a felirat angol, es egyetlen ar mellett a "-tol"
   * FELREVEZETO -- azt igeri, hogy van olcsobb valtozat is.
   *
   * A katalogusban 1884 terméknek EGYALTALAN nincs valtozata es 9-nek van
   * (korabbi meresem), tehat a regi alak a termekek tulnyomo tobbsegen
   * allitott valotlant.
   *
   * A magyar alak SUFFIX, nem prefix: "319 000 Ft-tol", nem "-tol 319 000 Ft".
   *
   * ES MIKOR LESZ LATHATO A "-TOL" AG: amikor az elso TOBBVALTOZATOS termek
   * webshoposra kerul. Merve (2026-09-07): a torzsadatban kilenc ilyen termek
   * all, es MIND A KILENC ki van szurve a webshopbol -- tehat a Medusaban ma
   * minden termek pontosan egy valtozatot visel.
   *
   * Ez NEM azt jelenti, hogy az ag folosleges: a kepesseg letezik, csak ma nem
   * lathato. Az elso webshoposra allitott Reef Factory lampanal azonnal el.
   */
  const tolAlak = !variant && (product.variants?.length ?? 0) > 1

  if (!selectedPrice) {
    /**
     * A HELYKITOLTO SZINE TOKENBOL JON, MERT A SOTET LAPON IS MEGJELENIK.
     *
     * Itt `bg-gray-100` allt, egy VILAGOSSZURKE tomb. A koltozes-kapcsolo
     * bekapcsolasa ota ez a komponens a sotet vilagon is renderelodik --
     * ket helyen: a vaz ardobozaban (`vasarlas/dobozok.tsx`) es a ragados
     * savban (`templates/index.tsx`). Ott egy vilagos tomb allt a sotet
     * lapon, valahanyszor az ar meg nem erkezett meg.
     *
     * A `--terv-hatter-halvany` MINDKET vilagban letezik (vilagos
     * `oklch(0.955 0.004 250)`, ami gyakorlatilag ugyanaz a szurke, mint
     * eddig; sotet `oklch(0.205 0.018 249)`), tehat a vilagos lap kepe nem
     * valtozik, csak a sotete javul.
     *
     * AMIT EZ NEM ALLIT: hogy gyakran latszik. Csak akkor all elo, ha nincs
     * szamolt ar -- de akkor a sotet lapon feltuno volt.
     */
    return (
      <div
        data-testid="product-price-helykitolto"
        className="block w-32 h-9 animate-pulse"
        style={{ background: "var(--terv-hatter-halvany)" }}
      />
    )
  }

  /**
   * AZ AR SZINE TOKENBOL JON, MERT A SOTET LAPON IS MEGJELENIK (415f455c).
   *
   * === A MERT HIBA (picasso talalta, acrobot merte vissza, 2026-09-08) ===
   *
   * Itt `text-ui-fg-base` allt, ami ROGZITETT `rgb(24, 24, 27)`. A
   * koltozes-kapcsolo ota ez a komponens a sotet vilagon is renderelodik, es a
   * doboz hattere ott `oklch(0.17 0.016 250)`. Vagyis sotet szoveg allt sotet
   * feluleten, KET helyen egyszerre: a vasarlasi oldalsavban es a ragados
   * savban. A vilagos lapon ugyanez az ertek helyes volt, ezert nem tunt fel.
   *
   * A `--terv-szoveg` MINDKET vilagban letezik (vilagos `oklch(0.2 ...)`,
   * sotet `oklch(0.95 ...)`), es a vilagos lap kepe gyakorlatilag nem valtozik.
   *
   * === MIERT NEM EGY MASIK OSZTALY ===
   *
   * A `text-ui-fg-*` csalad a Medusa sajat szotara: nem ismeri a
   * `data-vilag` kapcsolonkat, tehat barmelyik tagja ugyanezt a hibat adja. A
   * ket rendszert nem osszehangolni kell, hanem a lap sajat tokenjeit
   * hasznalni ott, ahol a lap rajzol.
   *
   * UGYANEZ MAR MEGTORTENT egyszer, a keszlet-allapot dobozaban
   * (`text-neutral-700` -> `--terv-szoveg`). Ez a MASODIK elofordulas, tehat a
   * mintat erdemes kulon keresni, nem esetenkent javitani -- a mereset a
   * 415f455c kartyara irtam.
   */
  return (
    <div
      data-testid="product-price-doboz"
      className="flex flex-col"
      style={{ color: "var(--terv-szoveg)" }}
    >
      {/*
        AZ AKCIOS AR NEM REZ, ES AZ INDOK NEM SZINIZLES (picasso dontese,
        acrobot msg 15302).

        Itt `text-ui-fg-interactive` allt az akcios agon: rogzitett szin, ami
        ugyanugy nem ismeri a `data-vilag` kapcsolot, mint a mellette allo
        `text-ui-fg-base` (415f455c). De a javitas NEM az, hogy a rez akcens
        (`--terv-kiemel`) kerul a helyere.

        A rez EGY dolgot jeloljon egy lapon: hogy HOVA KATTINTS. A Kosarba gomb
        es a jelveny mar ezt a szerepet toltik be. Ha az ar is rez lenne, ket
        egyenrangu hangos pont versenyezne ugyanazon a panelen, es epp az veszne
        el, amiert a rez ott all.

        Ezert az akcios ar ugyanazt a szoveg-tokent viseli, mint a nem-akcios --
        a FELKOVER szedes es a mellette allo athuzott regi ar hordozza az
        "akcios" jelentest, nem a szin.
      */}
      <span
        className={clx("text-xl-semi", {
          "font-bold": selectedPrice.price_type === "sale",
        })}
      >
        <span
          data-testid="product-price"
          data-value={selectedPrice.calculated_price_number}
        >
          {selectedPrice.calculated_price}
        </span>
        {tolAlak ? <span data-testid="product-price-tol">-tól</span> : null}
      </span>
      {selectedPrice.price_type === "sale" && (
        <>
          <p>
            {/*
              MAGYARUL, MERT A BOLT MAGYAR. Itt "Original: " allt, angolul, es
              EGYETLEN allitas sem latta: a keszlet "sehol nem jelenik meg angol
              felirat az ar mellett" allitasa egy NEM AKCIOS termeket renderel,
              tehat ez az ag soha nem futott le benne. Az allitas igaz volt --
              csak szukebb hatokoron, mint amit a szovege igert.
            */}
            <span style={{ color: "var(--terv-szoveg-halvany)" }}>
              Eredeti ár:{" "}
            </span>
            <span
              className="line-through"
              data-testid="original-product-price"
              data-value={selectedPrice.original_price_number}
            >
              {selectedPrice.original_price}
            </span>
          </p>
          {/*
            A SZAZALEK IS HALVANY, ES EZ A DONTES CSENDESEBB FELE.

            picasso azt mondta, hogy HA a athuzott regi ar keves, akkor egy
            KICSI kulon jelveny kaphat rezet -- NEM az ar. A szazalek pontosan
            az a kicsi jelveny, tehat a rez ITT lenne a helyen, ha kell.

            Megsem azt teszem ide, mert a mondat FELTETELES volt ("ha ez
            keves"), es a feltetel eldontese nem az en dolgom. Az alapertelmezes
            az, ami a fenti indokbol kovetkezik: egy rez pont a panelen.

            HA PICASSO TUL CSENDESNEK TALALJA, egyetlen sor cserel:
            var(--terv-szoveg-halvany) helyett var(--terv-kiemel-tinta).
          */}
          <span
            data-testid="product-price-szazalek"
            style={{ color: "var(--terv-szoveg-halvany)" }}
          >
            -{selectedPrice.percentage_diff}%
          </span>
        </>
      )}
    </div>
  )
}
