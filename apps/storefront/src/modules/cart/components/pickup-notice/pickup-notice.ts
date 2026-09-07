import { uniquePieceOf } from "@modules/products/components/stock-state/availability"

/**
 * MIKOR CSAK SZEMÉLYES ÁTVÉTEL VÁLASZTHATÓ (Balázs szabálya, 2026-08-31).
 *
 * Ha a kosárban ÉLŐ ÁLLAT van, akkor az EGÉSZ kosárra csak a személyes átvétel
 * marad. Nem bontjuk két rendelésre, és nem kérdezzük meg, hogy a többit
 * postázzuk-e.
 *
 * === EGY HATÁR, AMI MA EGYBEESIK, DE NEM UGYANAZ ===
 *
 * Amink van, az az EGYEDI PÉLDÁNY jelzője (`unique_piece`, a WYSIWYG
 * kategória-részfából). Amiről a szabály szól, az az ÉLŐ ÁLLAT. A mai
 * katalógusban a kettő egybeesik: a WYSIWYG termékeink korallok.
 *
 * DE NEM UGYANAZ A KÉRDÉS. Egy használt eszköz is lehet egyedi darab anélkül,
 * hogy élne -- és ha valaha ilyen kerül a boltba, ez a szabály tévedésből
 * kötné bolti átvételhez. A helyes megoldás akkor egy ÉLŐ ÁLLAT jelző lesz (az
 * OS-ben létezik: `ProductType.LIVESTOCK`), és ez a függvény azt fogja olvasni.
 *
 * Addig a jelző a legjobb, ami van, és acrobot döntése (2026-09-07), hogy erre
 * épüljön. Ezért áll itt KIMONDVA, nem elrejtve egy `uniquePieceOf` hívás
 * mögé: aki a szabályt keresi, itt megtalálja a korlátját is.
 */
export interface PickupLine {
  /** A tétel neve, ahogy a vevő látja: a magyarázat MEGNEVEZI. */
  title: string;
  /** A termék metaadata a boltból. */
  productMetadata: unknown;
}

/**
 * AZOK A TÉTELEK, AMIK MIATT CSAK BOLTI ÁTVÉTEL VAN -- névvel.
 *
 * NEM logikai értéket ad vissza, és ez a lényeg: a terv kikötése az, hogy a
 * vevő lássa, MELYIK tétel miatt. Egy `true` érték elrejtené pont azt, amit meg
 * kell mutatni, és a hívó kénytelen lenne másodszor is végigmenni a listán.
 */
export function pickupOnlyLines(lines: readonly PickupLine[]): string[] {
  return lines
    .filter((line) => uniquePieceOf(line.productMetadata))
    .map((line) => line.title);
}

/** A sáv címe. Ténykozlés, nem tiltás. */
export const PICKUP_TITLE = "Élő állat a kosárban";

/** A mondat, ami megmondja, mi történik. */
export const PICKUP_LEAD = "Ezt a rendelést a boltban adjuk át.";

/**
 * A MAGYARÁZAT, ÉS EZ NEM UDVARIASSÁG.
 *
 * A terv kikötése: a vevőnek EL KELL MAGYARÁZNI, a kosárban, nem a fizetésnél,
 * és nem hibaüzenetként. Egy élő állatot nem adunk fel csomagként -- ha ez nincs
 * kimondva, a korlátozás önkényesnek látszik.
 */
export const PICKUP_REASON =
  "Egy élő példányt nem adunk fel csomagként, ezért a rendelés többi tételét is a boltban adjuk át.";

/** A bolt címe és nyitvatartása, a tervből. */
export const SHOP_ADDRESS = "1106 Budapest, Pesti Gábor utca 35";
export const SHOP_HOURS = "Kedd–Péntek 10–18, Szombat 10–14";

/** Meddig tartjuk fenn a példányt. A tervben álló ígéret. */
export const HOLD_PROMISE = "Az élő példányt 5 munkanapig tartjuk fenn.";
