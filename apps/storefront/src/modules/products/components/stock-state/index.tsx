import { Button } from "@modules/common/components/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

import {
  availabilityLabel,
  SIMILAR_ITEMS_LABEL,
  SOLD_OUT_EXPLANATION,
  type Availability,
} from "./availability"

/**
 * A KÉSZLET-ÁLLAPOT MEGJELENÍTÉSE, HÁROM ÁLLAPOTTAL.
 *
 * TISZTA MEGJELENÍTÉS: a döntés az `availabilityOf`-ban áll, itt csak a
 * kirajzolás. Így a műszaki lap ugyanezt a dobozt használhatja -- ott az
 * `uniquePiece` mindig hamis, tehát két állapotot lát, nem hármat.
 */
export default function StockState({
  availability,
  similarHref,
  onAddToCart,
  isAdding = false,
  disabled = false,
  testId = "add-product-button",
}: {
  availability: Availability
  /** Hová visz az "Eladva" állapot továbbvivő gombja. */
  similarHref: string
  onAddToCart: () => void
  isAdding?: boolean
  disabled?: boolean
  /**
   * A KOSÁR-GOMB AZONOSÍTÓJA. Azért paraméter, mert a lap KÉT helyen rajzolja
   * ki ezt a dobozt (a lapon és a lebegő sávon), és két azonos azonosító
   * kétértelművé tenné a végponti keresést.
   */
  testId?: string
}) {
  /*
    AZ ELADVA NEM LETILTOTT GOMB, HANEM MÁSIK GOMB.

    Egy szürke, letiltott "Kosárba" ugyanazt a zsákutcát adná, mint a mai "Out of
    stock": a vevő látja, hogy nem kaphatja meg, és nem kap semmit helyette.
  */
  if (availability === "ELADVA") {
    return (
      <div className="flex flex-col gap-2" data-testid={testId + "-eladva"}>
        {/*
          SEMLEGES SZÜRKE, SZÁNDÉKOSAN NEM PIROS (picasso terve, 2026-09-07):
          az "Eladva" ténykozlés, nem hibaüzenet. A délelőtti vörösesbe hajló
          változat helyére ez került.
        */}
        {/*
          A SZIN TOKENBOL JON, NEM BEIRT SZURKEBOL -- ES EZ MOST MAR NEM
          KOVETKEZETESSEG, HANEM OLVASHATOSAG.

          A koltozes-kapcsolo bekapcsolasa (#103) ota ez a komponens a SOTET
          vilagon is megjelenik. Ott a lap hattere `oklch(0.17 0.016 250)`, a
          beirt `text-neutral-700` pedig sotet szurke: sotet szurke majdnem
          feketen. A `--terv-szoveg` mindket vilagban helyes (vilagosban
          `oklch(0.2 ...)`, sotetben `oklch(0.95 ...)`), mert epp ezert token.

          A "semleges szurke, szandekosan nem piros" dontes VALTOZATLAN: az
          Eladva tenykozles, nem hibauzenet. Csak a szurke forrasa lett a
          token.
        */}
        <span
          className="text-sm font-semibold"
          style={{ color: "var(--terv-szoveg)" }}
        >
          {availabilityLabel.ELADVA}
        </span>
        <span
          className="text-xs leading-relaxed"
          style={{ color: "var(--terv-szoveg-halvany)" }}
        >
          {SOLD_OUT_EXPLANATION}
        </span>
        <LocalizedClientLink href={similarHref}>
          <Button variant="secondary" className="h-10 w-full">
            {SIMILAR_ITEMS_LABEL}
          </Button>
        </LocalizedClientLink>
      </div>
    )
  }

  /**
   * A FO CSELEKVES REZ -- MERVE A TERVBOL, NEM A TOKEN NEVEBOL KOVETKEZTETVE.
   *
   * === HELYESBITVE 2026-09-08: AZ ELSO MERESEM A ROSSZ LAPRA SZOLT ===
   *
   * Eloszor EGYETLEN gombot mertem meg (`y=640`, 402x54), es nem neztem meg,
   * MELYIK VALTOZAT lapjan all. A tervfajl HAROM lapot tartalmaz egymas alatt
   * (`2a` sotet korall, `1a` es `1b` vilagos lampa), es az a gomb a SOTET
   * lapon volt. Szakaszonkent ujramerve, mindket szakaszban kilenc rez elem,
   * szakaszon belul NULLA kivetel:
   *
   *   2a (sotet)        hatter oklch(0.62 0.13 45)   szoveg oklch(0.15 0.014 45)
   *   1a + 1b (vilagos) hatter oklch(0.55 0.13 45)   szoveg FEHER
   *
   * A tokenjeink szerint (`globals.css`) a vilagos vilagban a 0.55 es a sotet
   * vilagban a 0.62 UGYANAZON a valtozon all: `--terv-kiemel-sotet`. Vagyis a
   * terv fo cselekvese MINDKET vilagban azt keri -- azt a valtozot, aminek a
   * NEVE a lenyomott arnyalatot jeloli. Ugyanezt adta murena kosar-merese is
   * (a kosar akcent alapja 0.55), harmadik fuggetlen forraskent.
   *
   * A `--terv-kiemel` HASZNALATA ITT HIBAS VOLT: a vilagos lapon 0.62-t adott
   * a tervbeli 0.55 helyett, a soteten pedig 0.55-ot a 0.62 helyett -- vagyis
   * MINDKET vilagban tevedett, csak ellentetes iranyba.
   *
   * ES A SZOVEG-KERDES AZOTA LEZARULT (acrobot dontese, msg_id 14690): a
   * terv VILAGOS lapjain a rezen allo felirat FEHER, tehat a
   * `--terv-kiemel-szoveg` vilagos erteke `oklch(1 0 0)` lett, a soteten
   * pedig valtozatlanul `oklch(0.15 0.014 45)`. Ez nem a kilences keszlet
   * felulirasa, hanem annak a meresnek a javitasa, ami a keszletet elohozta:
   * a "mind az ot rez-hatteru elem ugyanezt hasznalja" levezetes a SOTET (2a)
   * lapon keszult, es onnan kerult at a vilagos vilagra is.
   *
   * ES AMI UGYANEBBOL A MERESBOL KIDERULT, ES EPP ILYEN FONTOS: a "Köteg
   * kosárba" gomb NEM rez (`oklch(0.95 0.006 250)`), es az ELADVA agunk
   * tovabbvivo gombja sem az. A rez a FO cselekvest jeloli, nem minden gombot
   * -- ha mindegyik azt viselne, egyik sem jelolne semmit.
   *
   * === A LETILTOTT GOMB SZANDEKOSAN NEM REZ ===
   *
   * ELFOGYOTT allapotban a gomb ott all, de le van tiltva. Egy rez hatteru
   * letiltott gomb KATTINTHATONAK latszik: a szin a fo cselekvest igeri, a
   * viselkedes megtagadja. Ilyenkor a keszlet sajat letiltott stilusa marad,
   * es a rez elmarad -- a felirat pedig amugy is megmondja, mi az allapot.
   *
   * === KET ELTERES, AMIT MERTEM ES NEM VALTOZTATOK MEG ===
   *
   * A tervben a gomb 402x54 es a sugara 0px; nalunk 40 magas, es a sugarat a
   * keszlet adja. Mindketto kulon kerdes (a magassag a jobb oszlop egeszet
   * erinti, a sugar a keszlet gomb-stilusat), es egy szin-javitas nem viheti
   * el oket csendben. Ezert allnak itt leirva.
   */
  const letiltva = disabled || availability === "ELFOGYOTT"

  return (
    <Button
      onClick={onAddToCart}
      disabled={letiltva}
      variant="primary"
      className="h-10 w-full"
      isLoading={isAdding}
      data-testid={testId}
      style={
        letiltva
          ? undefined
          : {
              background: "var(--terv-kiemel-sotet)",
              color: "var(--terv-kiemel-szoveg)",
            }
      }
    >
      {availabilityLabel[availability]}
    </Button>
  )
}
