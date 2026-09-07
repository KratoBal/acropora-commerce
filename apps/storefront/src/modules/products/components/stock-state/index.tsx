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

  return (
    <Button
      onClick={onAddToCart}
      disabled={disabled || availability === "ELFOGYOTT"}
      variant="primary"
      className="h-10 w-full"
      isLoading={isAdding}
      data-testid={testId}
    >
      {availabilityLabel[availability]}
    </Button>
  )
}
